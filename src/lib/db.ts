import Database from '@tauri-apps/plugin-sql'
import type { Recipe, DietRecord, ShoppingItem, AIConfig, UserPreferences } from '@/types'
import { mockRecipes } from '@/data/mock'

let dbInstance: Database | null = null

async function getDb(): Promise<Database> {
  if (!dbInstance) {
    dbInstance = await Database.load('sqlite:bite_of_now.db')
  }
  return dbInstance
}

// ========== Data Migration ==========

let migrationDone = false

export async function migrateFromLocalStorage(): Promise<void> {
  if (migrationDone) return
  migrationDone = true

  const migrated = localStorage.getItem('bon_migrated_to_sqlite')
  if (migrated === 'true') return

  const db = await getDb()

  // Migrate recipes
  const recipesData = localStorage.getItem('bon_recipes')
  if (recipesData) {
    try {
      const recipes: Recipe[] = JSON.parse(recipesData)
      for (const r of recipes) {
        await db.execute(
          `INSERT OR IGNORE INTO recipes (id, name, cuisine, flavor, difficulty, time, calories, best_season, ingredients, steps, tips, video, cover_image)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [r.id, r.name, r.cuisine, r.flavor, r.difficulty, r.time, r.calories,
           JSON.stringify(r.bestSeason), JSON.stringify(r.ingredients), JSON.stringify(r.steps),
           r.tips ?? null, r.video ?? null, r.coverImage ?? null]
        )
      }
    } catch { /* ignore */ }
  } else {
    // First-time: seed with mock data
    for (const r of mockRecipes) {
      await db.execute(
        `INSERT OR IGNORE INTO recipes (id, name, cuisine, flavor, difficulty, time, calories, best_season, ingredients, steps, tips, video)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [r.id, r.name, r.cuisine, r.flavor, r.difficulty, r.time, r.calories,
         JSON.stringify(r.bestSeason), JSON.stringify(r.ingredients), JSON.stringify(r.steps),
         r.tips ?? null, r.video ?? null]
      )
    }
  }

  // Migrate diet records
  const recordsData = localStorage.getItem('bon_diet_records')
  if (recordsData) {
    try {
      const records: DietRecord[] = JSON.parse(recordsData)
      for (const rec of records) {
        // Save the full recipe into recipes table if not exists
        await db.execute(
          `INSERT OR IGNORE INTO recipes (id, name, cuisine, flavor, difficulty, time, calories, best_season, ingredients, steps, tips, video, cover_image)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [rec.recipe.id, rec.recipe.name, rec.recipe.cuisine, rec.recipe.flavor,
           rec.recipe.difficulty, rec.recipe.time, rec.recipe.calories,
           JSON.stringify(rec.recipe.bestSeason), JSON.stringify(rec.recipe.ingredients),
           JSON.stringify(rec.recipe.steps), rec.recipe.tips ?? null, rec.recipe.video ?? null,
           rec.recipe.coverImage ?? null]
        )
        await db.execute(
          `INSERT OR IGNORE INTO diet_records (id, date, recipe_id, meal_type, fullness, mood)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [rec.id, rec.date, rec.recipe.id, rec.mealType, rec.fullness, rec.mood]
        )
      }
    } catch { /* ignore */ }
  }

  // Migrate shopping items
  const itemsData = localStorage.getItem('bon_shopping_items')
  if (itemsData) {
    try {
      const items: ShoppingItem[] = JSON.parse(itemsData)
      for (const item of items) {
        await db.execute(
          `INSERT OR IGNORE INTO shopping_items (id, name, category, checked, source_recipe)
           VALUES (?, ?, ?, ?, ?)`,
          [item.id, item.name, item.category, item.checked ? 1 : 0, item.sourceRecipe ?? null]
        )
      }
    } catch { /* ignore */ }
  }

  // Migrate disliked recipes (old format: string[])
  const dislikedData = localStorage.getItem('bon_disliked_recipes')
  if (dislikedData) {
    try {
      const disliked: string[] = JSON.parse(dislikedData)
      for (const name of disliked) {
        await db.execute(
          `INSERT OR IGNORE INTO disliked_recipes (name, created_at, count, type, dimension, expires_at)
           VALUES (?, datetime('now'), 1, 'soft', NULL, datetime('now', '+7 days'))`,
          [name]
        )
      }
    } catch { /* ignore */ }
  }

  // Migrate settings
  const aiConfigData = localStorage.getItem('bon_ai_config')
  if (aiConfigData) {
    await db.execute(`INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)`, ['ai_config', aiConfigData])
  }
  const prefsData = localStorage.getItem('bon_user_preferences')
  if (prefsData) {
    await db.execute(`INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)`, ['user_preferences', prefsData])
  }
  const darkModeData = localStorage.getItem('bon_dark_mode')
  if (darkModeData) {
    await db.execute(`INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)`, ['dark_mode', darkModeData])
  }

  localStorage.setItem('bon_migrated_to_sqlite', 'true')
}

// ========== Recipes ==========

export async function getRecipes(): Promise<Recipe[]> {
  await migrateFromLocalStorage()
  const db = await getDb()
  const rows = await db.select<Array<{
    id: string; name: string; cuisine: string; flavor: string; difficulty: string;
    time: number; calories: number; best_season: string; ingredients: string;
    steps: string; tips: string | null; video: string | null; cover_image: string | null
  }>>('SELECT * FROM recipes ORDER BY name')

  return rows.map((r) => {
    // Parse video field with backward compatibility
    let video: string | import('@/types').VideoInfo | undefined
    if (r.video) {
      try {
        const parsed = JSON.parse(r.video)
        if (parsed && typeof parsed === 'object' && parsed.platform) {
          video = parsed as import('@/types').VideoInfo
        } else {
          video = r.video
        }
      } catch {
        video = r.video
      }
    }
    return {
      id: r.id,
      name: r.name,
      cuisine: r.cuisine,
      flavor: r.flavor,
      difficulty: r.difficulty as 'easy' | 'medium' | 'hard',
      time: r.time,
      calories: r.calories,
      bestSeason: JSON.parse(r.best_season),
      ingredients: JSON.parse(r.ingredients),
      steps: JSON.parse(r.steps),
      tips: r.tips ?? undefined,
      video,
      coverImage: r.cover_image ?? undefined,
    }
  })
}

export async function saveRecipe(recipe: Recipe): Promise<void> {
  const db = await getDb()
  // Serialize video: VideoInfo object -> JSON string, plain string -> as-is
  let videoValue: string | null = null
  if (recipe.video) {
    if (typeof recipe.video === 'object') {
      videoValue = JSON.stringify(recipe.video)
    } else {
      videoValue = recipe.video
    }
  }
  await db.execute(
    `INSERT OR REPLACE INTO recipes (id, name, cuisine, flavor, difficulty, time, calories, best_season, ingredients, steps, tips, video, cover_image)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [recipe.id, recipe.name, recipe.cuisine, recipe.flavor, recipe.difficulty, recipe.time, recipe.calories,
     JSON.stringify(recipe.bestSeason), JSON.stringify(recipe.ingredients), JSON.stringify(recipe.steps),
     recipe.tips ?? null, videoValue, recipe.coverImage ?? null]
  )
}

export async function deleteRecipe(id: string): Promise<void> {
  const db = await getDb()
  await db.execute('DELETE FROM recipes WHERE id = ?', [id])
}

export async function getRecipeById(id: string): Promise<Recipe | null> {
  const db = await getDb()
  const rows = await db.select<Array<{
    id: string; name: string; cuisine: string; flavor: string; difficulty: string;
    time: number; calories: number; best_season: string; ingredients: string;
    steps: string; tips: string | null; video: string | null; cover_image: string | null
  }>>('SELECT * FROM recipes WHERE id = ?', [id])

  if (rows.length === 0) return null
  const r = rows[0]

  let video: string | import('@/types').VideoInfo | undefined
  if (r.video) {
    try {
      const parsed = JSON.parse(r.video)
      if (parsed && typeof parsed === 'object' && parsed.platform) {
        video = parsed as import('@/types').VideoInfo
      } else {
        video = r.video
      }
    } catch {
      video = r.video
    }
  }

  return {
    id: r.id,
    name: r.name,
    cuisine: r.cuisine,
    flavor: r.flavor,
    difficulty: r.difficulty as 'easy' | 'medium' | 'hard',
    time: r.time,
    calories: r.calories,
    bestSeason: JSON.parse(r.best_season),
    ingredients: JSON.parse(r.ingredients),
    steps: JSON.parse(r.steps),
    tips: r.tips ?? undefined,
    video,
    coverImage: r.cover_image ?? undefined,
  }
}

export async function importRecipes(
  newRecipes: Recipe[],
  conflictStrategy: 'overwrite' | 'skip' | 'keepBoth'
): Promise<{ imported: number; skipped: number; overwritten: number }> {
  const existing = await getRecipes()
  let imported = 0
  let skipped = 0
  let overwritten = 0

  for (const recipe of newRecipes) {
    const existingIndex = existing.findIndex((r) => r.name === recipe.name)
    if (existingIndex >= 0) {
      if (conflictStrategy === 'skip') {
        skipped++
        continue
      } else if (conflictStrategy === 'overwrite') {
        await saveRecipe(recipe)
        overwritten++
      } else {
        const newId = `${recipe.id}_${Date.now()}`
        await saveRecipe({ ...recipe, id: newId })
        imported++
      }
    } else {
      await saveRecipe(recipe)
      imported++
    }
  }

  return { imported, skipped, overwritten }
}

// ========== Diet Records ==========

async function getRecipeForRecord(recipeId: string | null, recipeName?: string | null): Promise<Recipe> {
  if (recipeId) {
    const recipe = await getRecipeById(recipeId)
    if (recipe) return recipe
  }
  if (recipeName) {
    // Return a placeholder recipe for deleted recipes
    return {
      id: `deleted_${Date.now()}`,
      name: recipeName,
      cuisine: '未知',
      flavor: '未知',
      difficulty: 'easy',
      time: 0,
      calories: 0,
      bestSeason: ['全年'],
      ingredients: [],
      steps: [],
    }
  }
  // Fallback: return first mock recipe
  return mockRecipes[0]
}

export async function getDietRecords(): Promise<DietRecord[]> {
  await migrateFromLocalStorage()
  const db = await getDb()
  const rows = await db.select<Array<{
    id: string; date: string; recipe_id: string | null; recipe_name: string | null;
    meal_type: string; fullness: string; mood: string
  }>>('SELECT * FROM diet_records ORDER BY date DESC, id DESC')

  const records: DietRecord[] = []
  for (const row of rows) {
    const recipe = await getRecipeForRecord(row.recipe_id, row.recipe_name)
    records.push({
      id: row.id,
      date: row.date,
      recipe,
      mealType: row.meal_type as 'breakfast' | 'lunch' | 'dinner' | 'snack',
      fullness: row.fullness as 'hungry' | 'comfortable' | 'full',
      mood: row.mood,
    })
  }
  return records
}

export async function addDietRecord(record: Omit<DietRecord, 'id'>): Promise<DietRecord> {
  const db = await getDb()
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

  // Ensure recipe exists in DB
  await saveRecipe(record.recipe)

  await db.execute(
    `INSERT INTO diet_records (id, date, recipe_id, recipe_name, meal_type, fullness, mood)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, record.date, record.recipe.id, record.recipe.name, record.mealType, record.fullness, record.mood]
  )

  return { ...record, id }
}

export async function deleteDietRecord(id: string): Promise<void> {
  const db = await getDb()
  await db.execute('DELETE FROM diet_records WHERE id = ?', [id])
}

export async function getRecentCuisineHistory(days: number = 7): Promise<Array<{ cuisine: string; flavor: string; date: string }>> {
  const records = await getDietRecords()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return records
    .filter((r) => new Date(r.date) >= cutoff)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map((r) => ({ cuisine: r.recipe.cuisine, flavor: r.recipe.flavor, date: r.date }))
}

export async function getRecentRecipeNames(days: number = 7): Promise<string[]> {
  const records = await getDietRecords()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return records
    .filter((r) => new Date(r.date) >= cutoff)
    .map((r) => r.recipe.name)
}

// ========== Shopping Items ==========

export async function getShoppingItems(): Promise<ShoppingItem[]> {
  await migrateFromLocalStorage()
  const db = await getDb()
  const rows = await db.select<Array<{
    id: string; name: string; category: string; checked: number; source_recipe: string | null
  }>>('SELECT * FROM shopping_items ORDER BY checked ASC, category, name')

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category,
    checked: r.checked === 1,
    sourceRecipe: r.source_recipe ?? undefined,
  }))
}

export async function addShoppingItem(item: Omit<ShoppingItem, 'id'>): Promise<ShoppingItem> {
  const db = await getDb()
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  await db.execute(
    `INSERT INTO shopping_items (id, name, category, checked, source_recipe)
     VALUES (?, ?, ?, ?, ?)`,
    [id, item.name, item.category, item.checked ? 1 : 0, item.sourceRecipe ?? null]
  )
  return { ...item, id }
}

export async function addShoppingItems(items: Omit<ShoppingItem, 'id'>[]): Promise<ShoppingItem[]> {
  const result: ShoppingItem[] = []
  for (const item of items) {
    result.push(await addShoppingItem(item))
  }
  return result
}

export async function updateShoppingItem(id: string, updates: Partial<ShoppingItem>): Promise<void> {
  const db = await getDb()
  if (updates.checked !== undefined) {
    await db.execute('UPDATE shopping_items SET checked = ? WHERE id = ?', [updates.checked ? 1 : 0, id])
  }
  if (updates.name !== undefined) {
    await db.execute('UPDATE shopping_items SET name = ? WHERE id = ?', [updates.name, id])
  }
  if (updates.category !== undefined) {
    await db.execute('UPDATE shopping_items SET category = ? WHERE id = ?', [updates.category, id])
  }
}

export async function deleteShoppingItem(id: string): Promise<void> {
  const db = await getDb()
  await db.execute('DELETE FROM shopping_items WHERE id = ?', [id])
}

// ========== AI Config (SQLite fallback, prefer Stronghold) ==========

export async function getAIConfig(): Promise<AIConfig> {
  await migrateFromLocalStorage()
  const db = await getDb()
  const rows = await db.select<Array<{ value: string }>>('SELECT value FROM app_settings WHERE key = ?', ['ai_config'])
  if (rows.length > 0) {
    try {
      return JSON.parse(rows[0].value)
    } catch {
      return { apiKey: '', baseUrl: '', modelName: '' }
    }
  }
  return { apiKey: '', baseUrl: '', modelName: '' }
}

export async function saveAIConfig(config: AIConfig): Promise<void> {
  const db = await getDb()
  await db.execute(
    'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
    ['ai_config', JSON.stringify(config)]
  )
}

// ========== User Preferences ==========

const defaultPreferences: UserPreferences = {
  avoidIngredients: [],
  bodyGoal: 'maintain',
  tastePreference: 'light',
  spiceLevel: 3,
}

export async function getUserPreferences(): Promise<UserPreferences> {
  await migrateFromLocalStorage()
  const db = await getDb()
  const rows = await db.select<Array<{ value: string }>>('SELECT value FROM app_settings WHERE key = ?', ['user_preferences'])
  if (rows.length > 0) {
    try {
      return { ...defaultPreferences, ...JSON.parse(rows[0].value) }
    } catch {
      return { ...defaultPreferences }
    }
  }
  return { ...defaultPreferences }
}

export async function saveUserPreferences(prefs: UserPreferences): Promise<void> {
  const db = await getDb()
  await db.execute(
    'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
    ['user_preferences', JSON.stringify(prefs)]
  )
}

// ========== Disliked Recipes (with expiry) ==========

export async function getDislikedRecipes(): Promise<string[]> {
  await migrateFromLocalStorage()
  const db = await getDb()
  // Auto-filter expired soft dislikes
  const rows = await db.select<Array<{ name: string }>>(
    `SELECT name FROM disliked_recipes
     WHERE type = 'hard' OR (type = 'soft' AND (expires_at IS NULL OR expires_at > datetime('now')))`
  )
  return rows.map((r) => r.name)
}

export async function addDislikedRecipe(
  recipeName: string,
  dimension?: 'cuisine' | 'flavor' | 'method' | null
): Promise<void> {
  const db = await getDb()

  // Check if already exists
  const existing = await db.select<Array<{ count: number; type: string }>>(
    'SELECT count, type FROM disliked_recipes WHERE name = ?',
    [recipeName]
  )

  if (existing.length > 0) {
    const { count, type } = existing[0]
    const newCount = count + 1
    // Upgrade to hard after 3 counts
    const newType = newCount >= 3 ? 'hard' : type
    const expiryDays = newType === 'hard' ? 30 : 7
    await db.execute(
      `UPDATE disliked_recipes
       SET count = ?, type = ?, dimension = ?, expires_at = datetime('now', '+${expiryDays} days')
       WHERE name = ?`,
      [newCount, newType, dimension ?? null, recipeName]
    )
  } else {
    await db.execute(
      `INSERT INTO disliked_recipes (name, created_at, count, type, dimension, expires_at)
       VALUES (?, datetime('now'), 1, 'soft', ?, datetime('now', '+7 days'))`,
      [recipeName, dimension ?? null]
    )
  }
}

export async function removeDislikedRecipe(recipeName: string): Promise<void> {
  const db = await getDb()
  await db.execute('DELETE FROM disliked_recipes WHERE name = ?', [recipeName])
}

export async function getDislikedRecipesFull(): Promise<import('@/types').DislikedRecipeEntry[]> {
  await migrateFromLocalStorage()
  const db = await getDb()
  const rows = await db.select<Array<{
    name: string; created_at: string; count: number; type: string; dimension: string | null; expires_at: string
  }>>(
    `SELECT name, created_at, count, type, dimension, expires_at FROM disliked_recipes
     WHERE type = 'hard' OR (type = 'soft' AND (expires_at IS NULL OR expires_at > datetime('now')))
     ORDER BY created_at DESC`
  )
  return rows.map((r) => ({
    name: r.name,
    createdAt: r.created_at,
    count: r.count,
    type: r.type as 'soft' | 'hard',
    dimension: r.dimension,
    expiresAt: r.expires_at,
  }))
}

export async function cleanupExpiredDislikes(): Promise<void> {
  const db = await getDb()
  await db.execute(
    `DELETE FROM disliked_recipes
     WHERE type = 'soft' AND expires_at IS NOT NULL AND expires_at <= datetime('now')`
  )
}

// ========== Daily Recommendation (full cache) ==========

export interface CachedRecommendation {
  recommendation: Record<string, Recipe>
  date: string
  seasonTag: string
  cuisineTag: string
  totalCalories: number
  macros: { carbs: number; protein: number; fat: number }
  reasons?: Record<string, string>
}

export async function getDailyRecommendation(): Promise<CachedRecommendation | null> {
  const db = await getDb()
  const rows = await db.select<Array<{
    breakfast_id: string; lunch_id: string; dinner_id: string; snack_id: string | null;
    season_tag: string; cuisine_tag: string; total_calories: number; macros: string; reasons: string | null; date: string
  }>>('SELECT * FROM daily_recommendation WHERE id = 1')

  if (rows.length === 0) return null
  const row = rows[0]

  const breakfast = await getRecipeById(row.breakfast_id)
  const lunch = await getRecipeById(row.lunch_id)
  const dinner = await getRecipeById(row.dinner_id)
  const snack = row.snack_id ? await getRecipeById(row.snack_id) : null

  if (!breakfast || !lunch || !dinner) return null

  const rec: Record<string, Recipe> = { breakfast, lunch, dinner }
  if (snack) rec.snack = snack

  let macros = { carbs: 45, protein: 25, fat: 30 }
  try {
    if (row.macros) macros = JSON.parse(row.macros)
  } catch { /* ignore */ }

  let reasons: Record<string, string> | undefined
  try {
    if (row.reasons) reasons = JSON.parse(row.reasons)
  } catch { /* ignore */ }

  return {
    recommendation: rec,
    date: row.date,
    seasonTag: row.season_tag || '',
    cuisineTag: row.cuisine_tag || '',
    totalCalories: row.total_calories || 0,
    macros,
    reasons,
  }
}

export async function saveDailyRecommendation(
  recommendation: Record<string, Recipe>,
  meta?: {
    seasonTag?: string
    cuisineTag?: string
    totalCalories?: number
    macros?: { carbs: number; protein: number; fat: number }
    reasons?: Record<string, string>
  }
): Promise<void> {
  const db = await getDb()
  const today = new Date().toISOString().split('T')[0]
  await db.execute(
    `INSERT OR REPLACE INTO daily_recommendation
     (id, breakfast_id, lunch_id, dinner_id, snack_id, season_tag, cuisine_tag, total_calories, macros, reasons, date)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      recommendation.breakfast?.id ?? null,
      recommendation.lunch?.id ?? null,
      recommendation.dinner?.id ?? null,
      recommendation.snack?.id ?? null,
      meta?.seasonTag ?? null,
      meta?.cuisineTag ?? null,
      meta?.totalCalories ?? null,
      meta?.macros ? JSON.stringify(meta.macros) : null,
      meta?.reasons ? JSON.stringify(meta.reasons) : null,
      today,
    ]
  )
}

export async function getLastGeneratedDate(): Promise<string | null> {
  const db = await getDb()
  const rows = await db.select<Array<{ date: string }>>('SELECT date FROM daily_recommendation WHERE id = 1')
  return rows.length > 0 ? rows[0].date : null
}

export async function setLastGeneratedDate(date: string): Promise<void> {
  const db = await getDb()
  await db.execute(
    'INSERT OR REPLACE INTO daily_recommendation (id, date) VALUES (1, ?)',
    [date]
  )
}

// ========== Data Export / Import ==========

export interface AppData {
  version: string
  exportDate: string
  recipes: Recipe[]
  dietRecords: DietRecord[]
  shoppingItems: ShoppingItem[]
  aiConfig: AIConfig
  userPreferences: UserPreferences
  dislikedRecipes: string[]
}

export async function exportAllData(): Promise<AppData> {
  const config = await getAIConfig()
  return {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    recipes: await getRecipes(),
    dietRecords: await getDietRecords(),
    shoppingItems: await getShoppingItems(),
    aiConfig: { ...config, apiKey: '' },  // Skip API key for security
    userPreferences: await getUserPreferences(),
    dislikedRecipes: await getDislikedRecipes(),
  }
}

export async function importAllData(data: AppData): Promise<{ success: boolean; message: string }> {
  try {
    if (data.recipes) {
      for (const r of data.recipes) await saveRecipe(r)
    }
    if (data.dietRecords) {
      for (const rec of data.dietRecords) await addDietRecord(rec)
    }
    if (data.shoppingItems) {
      for (const item of data.shoppingItems) await addShoppingItem(item)
    }
    if (data.aiConfig) await saveAIConfig(data.aiConfig)
    if (data.userPreferences) await saveUserPreferences(data.userPreferences)
    if (data.dislikedRecipes) {
      for (const name of data.dislikedRecipes) await addDislikedRecipe(name)
    }
    if (data.regionConfig) await saveRegionConfig(data.regionConfig)
    return { success: true, message: '数据导入成功' }
  } catch (e) {
    return { success: false, message: `导入失败: ${e}` }
  }
}

export async function clearAllData(): Promise<void> {
  const db = await getDb()
  await db.execute('DELETE FROM recipes')
  await db.execute('DELETE FROM diet_records')
  await db.execute('DELETE FROM shopping_items')
  await db.execute('DELETE FROM app_settings')
  await db.execute('DELETE FROM disliked_recipes')
  await db.execute('DELETE FROM daily_recommendation')
  await db.execute('DELETE FROM favorites')
  await db.execute('DELETE FROM ratings')
  await db.execute('DELETE FROM custom_daily_menu')
  await db.execute('DELETE FROM special_day_marks')
  localStorage.clear()
}

// ========== Favorites ==========

export async function isFavorite(recipeId: string): Promise<boolean> {
  const db = await getDb()
  const rows = await db.select<Array<{ recipe_id: string }>>('SELECT recipe_id FROM favorites WHERE recipe_id = ?', [recipeId])
  return rows.length > 0
}

export async function toggleFavorite(recipeId: string): Promise<boolean> {
  const db = await getDb()
  const exists = await isFavorite(recipeId)
  if (exists) {
    await db.execute('DELETE FROM favorites WHERE recipe_id = ?', [recipeId])
    return false
  } else {
    await db.execute('INSERT INTO favorites (recipe_id) VALUES (?)', [recipeId])
    return true
  }
}

export async function getFavoriteRecipes(): Promise<Recipe[]> {
  const db = await getDb()
  const rows = await db.select<Array<{ recipe_id: string }>>('SELECT recipe_id FROM favorites ORDER BY created_at DESC')
  const recipes: Recipe[] = []
  for (const row of rows) {
    const recipe = await getRecipeById(row.recipe_id)
    if (recipe) recipes.push(recipe)
  }
  return recipes
}

// ========== Ratings ==========

export async function addRating(recipeId: string, score: number): Promise<void> {
  const db = await getDb()
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  await db.execute(
    'INSERT INTO ratings (id, recipe_id, score, date) VALUES (?, ?, ?, ?)',
    [id, recipeId, score, new Date().toISOString().split('T')[0]]
  )
}

export async function getRatings(): Promise<Array<{ recipeId: string; score: number; date: string }>> {
  const db = await getDb()
  const rows = await db.select<Array<{ recipe_id: string; score: number; date: string }>>(
    'SELECT recipe_id, score, date FROM ratings ORDER BY date DESC'
  )
  return rows.map((r) => ({ recipeId: r.recipe_id, score: r.score, date: r.date }))
}

export async function getHighRatedRecipes(minScore: number = 4): Promise<Array<{ name: string; score: number }>> {
  const db = await getDb()
  const rows = await db.select<Array<{ recipe_id: string; avg_score: number }>>(
    `SELECT recipe_id, AVG(score) as avg_score FROM ratings
     GROUP BY recipe_id
     HAVING avg_score >= ?
     ORDER BY avg_score DESC`,
    [minScore]
  )
  const result: Array<{ name: string; score: number }> = []
  for (const row of rows) {
    const recipe = await getRecipeById(row.recipe_id)
    if (recipe) {
      result.push({ name: recipe.name, score: Math.round(row.avg_score * 10) / 10 })
    }
  }
  return result
}

// ========== Local Streak ==========

const defaultStreak: import('@/types').LocalStreak = { count: 0, lastDate: '' }

export async function getLocalStreak(): Promise<import('@/types').LocalStreak> {
  const db = await getDb()
  const rows = await db.select<Array<{ value: string }>>('SELECT value FROM app_settings WHERE key = ?', ['local_streak'])
  if (rows.length > 0) {
    try {
      return { ...defaultStreak, ...JSON.parse(rows[0].value) }
    } catch {
      return { ...defaultStreak }
    }
  }
  return { ...defaultStreak }
}

export async function incrementLocalStreak(): Promise<void> {
  const today = new Date().toISOString().split('T')[0]
  const streak = await getLocalStreak()
  if (streak.lastDate === today) return // Already counted today
  const next: import('@/types').LocalStreak = {
    count: streak.lastDate && isConsecutiveDay(streak.lastDate, today) ? streak.count + 1 : 1,
    lastDate: today,
  }
  await saveLocalStreak(next)
}

export async function resetLocalStreak(): Promise<void> {
  await saveLocalStreak({ count: 0, lastDate: '' })
}

async function saveLocalStreak(streak: import('@/types').LocalStreak): Promise<void> {
  const db = await getDb()
  await db.execute(
    'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
    ['local_streak', JSON.stringify(streak)]
  )
}

function isConsecutiveDay(prevDate: string, today: string): boolean {
  const prev = new Date(prevDate)
  const now = new Date(today)
  const diffMs = now.getTime() - prev.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
  return diffDays === 1
}

// ========== Tune Preferences ==========

const defaultTunePrefs: import('@/types').TunePreferences = { lastTuneDate: '' }

export async function getTunePreferences(): Promise<import('@/types').TunePreferences> {
  const db = await getDb()
  const rows = await db.select<Array<{ value: string }>>('SELECT value FROM app_settings WHERE key = ?', ['tune_preferences'])
  if (rows.length > 0) {
    try {
      return { ...defaultTunePrefs, ...JSON.parse(rows[0].value) }
    } catch {
      return { ...defaultTunePrefs }
    }
  }
  return { ...defaultTunePrefs }
}

export async function saveTunePreferences(prefs: import('@/types').TunePreferences): Promise<void> {
  const db = await getDb()
  await db.execute(
    'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
    ['tune_preferences', JSON.stringify(prefs)]
  )
}

// ========== Delete Recipe with Cascade ==========

export async function getDeleteImpact(recipeId: string): Promise<{
  dietRecordsKept: number
  shoppingItemsToRemove: number
  isInRecommendation: boolean
}> {
  const db = await getDb()

  // Count diet records referencing this recipe
  const dietRows = await db.select<Array<{ cnt: number }>>(
    'SELECT COUNT(*) as cnt FROM diet_records WHERE recipe_id = ?', [recipeId]
  )

  // Count unchecked shopping items from this recipe
  const shopRows = await db.select<Array<{ cnt: number }>>(
    'SELECT COUNT(*) as cnt FROM shopping_items WHERE source_recipe = ? AND checked = 0', [recipeId]
  )

  // Check if recipe is in today's recommendation
  const recRows = await db.select<Array<{ cnt: number }>>(
    `SELECT COUNT(*) as cnt FROM daily_recommendation WHERE id = 1
     AND (breakfast_id = ? OR lunch_id = ? OR dinner_id = ? OR snack_id = ?)`,
    [recipeId, recipeId, recipeId, recipeId]
  )

  return {
    dietRecordsKept: dietRows[0]?.cnt || 0,
    shoppingItemsToRemove: shopRows[0]?.cnt || 0,
    isInRecommendation: (recRows[0]?.cnt || 0) > 0,
  }
}

export async function deleteRecipeWithCascade(recipeId: string): Promise<void> {
  const db = await getDb()

  // Remove unchecked shopping items from this recipe
  await db.execute(
    'DELETE FROM shopping_items WHERE source_recipe = ? AND checked = 0',
    [recipeId]
  )

  // Clear daily recommendation if this recipe is in it
  const impact = await getDeleteImpact(recipeId)
  if (impact.isInRecommendation) {
    await db.execute('DELETE FROM daily_recommendation WHERE id = 1')
  }

  // Delete the recipe itself
  await db.execute('DELETE FROM recipes WHERE id = ?', [recipeId])
}

// ========== Region Config ==========

const defaultRegionConfig: import('@/types').RegionConfig = {
  region: 'cn',
  lastVerifiedDate: '',
  lastSystemTime: 0,
}

export async function getRegionConfig(): Promise<import('@/types').RegionConfig> {
  await migrateFromLocalStorage()
  const db = await getDb()
  const rows = await db.select<Array<{ value: string }>>('SELECT value FROM app_settings WHERE key = ?', ['region_config'])
  if (rows.length > 0) {
    try {
      return { ...defaultRegionConfig, ...JSON.parse(rows[0].value) }
    } catch {
      return { ...defaultRegionConfig }
    }
  }
  return { ...defaultRegionConfig }
}

export async function saveRegionConfig(config: import('@/types').RegionConfig): Promise<void> {
  const db = await getDb()
  await db.execute(
    'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
    ['region_config', JSON.stringify(config)]
  )
}

// ========== Dark Mode ==========

export async function getDarkMode(): Promise<boolean> {
  await migrateFromLocalStorage()
  const db = await getDb()
  const rows = await db.select<Array<{ value: string }>>('SELECT value FROM app_settings WHERE key = ?', ['dark_mode'])
  return rows.length > 0 ? rows[0].value === 'true' : false
}

export async function setDarkMode(enabled: boolean): Promise<void> {
  const db = await getDb()
  await db.execute(
    'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
    ['dark_mode', enabled ? 'true' : 'false']
  )
}

// ========== Custom Daily Menu ==========

export async function getCustomDailyMenu(date: string): Promise<import('@/types').CustomDailyMenu | null> {
  const db = await getDb()
  const rows = await db.select<Array<{
    date: string; breakfast_id: string | null; lunch_id: string | null;
    dinner_id: string | null; snack_id: string | null
  }>>('SELECT * FROM custom_daily_menu WHERE date = ?', [date])
  if (rows.length === 0) return null
  const r = rows[0]
  return {
    date: r.date,
    breakfastId: r.breakfast_id ?? undefined,
    lunchId: r.lunch_id ?? undefined,
    dinnerId: r.dinner_id ?? undefined,
    snackId: r.snack_id ?? undefined,
  }
}

export async function saveCustomDailyMenu(menu: import('@/types').CustomDailyMenu): Promise<void> {
  const db = await getDb()
  await db.execute(
    `INSERT OR REPLACE INTO custom_daily_menu (date, breakfast_id, lunch_id, dinner_id, snack_id)
     VALUES (?, ?, ?, ?, ?)`,
    [menu.date, menu.breakfastId ?? null, menu.lunchId ?? null, menu.dinnerId ?? null, menu.snackId ?? null]
  )
}

export async function deleteCustomDailyMenu(date: string): Promise<void> {
  const db = await getDb()
  await db.execute('DELETE FROM custom_daily_menu WHERE date = ?', [date])
}

// ========== Special Day Marks ==========

export async function getSpecialDayMark(date: string): Promise<import('@/types').SpecialDayMark | null> {
  const db = await getDb()
  const rows = await db.select<Array<{ date: string; mark_type: string; note: string | null }>>(
    'SELECT * FROM special_day_marks WHERE date = ?', [date]
  )
  if (rows.length === 0) return null
  const r = rows[0]
  return {
    date: r.date,
    markType: r.mark_type as 'outing' | 'party' | 'fasting' | 'custom',
    note: r.note ?? undefined,
  }
}

export async function getAllSpecialDayMarks(): Promise<import('@/types').SpecialDayMark[]> {
  const db = await getDb()
  const rows = await db.select<Array<{ date: string; mark_type: string; note: string | null }>>(
    'SELECT * FROM special_day_marks ORDER BY date DESC'
  )
  return rows.map((r) => ({
    date: r.date,
    markType: r.mark_type as 'outing' | 'party' | 'fasting' | 'custom',
    note: r.note ?? undefined,
  }))
}

export async function saveSpecialDayMark(mark: import('@/types').SpecialDayMark): Promise<void> {
  const db = await getDb()
  await db.execute(
    'INSERT OR REPLACE INTO special_day_marks (date, mark_type, note) VALUES (?, ?, ?)',
    [mark.date, mark.markType, mark.note ?? null]
  )
}

export async function deleteSpecialDayMark(date: string): Promise<void> {
  const db = await getDb()
  await db.execute('DELETE FROM special_day_marks WHERE date = ?', [date])
}

// ========== Weekly Report ==========

export async function getWeeklyReport(weekStart: string): Promise<import('@/types').WeeklyReport> {
  const db = await getDb()
  const prefs = await getUserPreferences()

  // Calculate week end (7 days from start)
  const start = new Date(weekStart)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const endStr = end.toISOString().split('T')[0]

  // Get diet records for the week
  const rows = await db.select<Array<{
    recipe_id: string | null; recipe_name: string | null; meal_type: string; date: string
  }>>(
    `SELECT recipe_id, recipe_name, meal_type, date FROM diet_records
     WHERE date >= ? AND date <= ?`,
    [weekStart, endStr]
  )

  if (rows.length === 0) {
    return {
      nutritionScore: 0,
      cuisineDiversity: 0,
      seasonScore: 0,
      suggestion: '本周还没有饮食记录，开始记录吧！',
    }
  }

  // Nutrition score: count meals with valid recipes
  const validMeals = rows.filter((r) => r.recipe_id)
  const nutritionScore = Math.round((validMeals.length / rows.length) * 100)

  // Cuisine diversity
  const cuisines = new Set<string>()
  for (const row of validMeals) {
    if (row.recipe_id) {
      const recipe = await getRecipeById(row.recipe_id)
      if (recipe) cuisines.add(recipe.cuisine)
    }
  }
  const cuisineDiversity = Math.min(100, Math.round((cuisines.size / 5) * 100))

  // Season score
  const currentXun = getCurrentXun()
  let seasonalCount = 0
  for (const row of validMeals) {
    if (row.recipe_id) {
      const recipe = await getRecipeById(row.recipe_id)
      if (recipe && (recipe.bestSeason.includes(currentXun) || recipe.bestSeason.includes('全年'))) {
        seasonalCount++
      }
    }
  }
  const seasonScore = validMeals.length > 0 ? Math.round((seasonalCount / validMeals.length) * 100) : 0

  // Generate suggestion
  const suggestion = generateWeeklySuggestion(nutritionScore, cuisineDiversity, seasonScore, prefs.bodyGoal)

  return { nutritionScore, cuisineDiversity, seasonScore, suggestion }
}

function generateWeeklySuggestion(
  nutrition: number, diversity: number, season: number, bodyGoal: string
): string {
  if (nutrition < 50) return '本周记录还不够完整，坚持记录才能看到变化哦~'
  if (season >= 80 && diversity < 60) return '时令吃得不错，建议多尝试不同菜系，丰富味蕾体验！'
  if (season < 60 && diversity >= 60) return '菜系很丰富，但可以多吃些时令食材，更新鲜更营养~'
  if (bodyGoal === 'lose' && nutrition >= 70) return '本周饮食控制不错，继续保持，记得多喝水！'
  if (bodyGoal === 'gain' && nutrition >= 70) return '本周营养摄入充足，配合适量运动效果更佳！'
  if (nutrition >= 80 && diversity >= 60 && season >= 60) {
    return '本周饮食表现很棒！营养均衡、种类丰富、时令到位~'
  }
  return '饮食记录很认真，继续保持，逐步优化每一餐~'
}

// ========== Cuisine Options ==========

export const cuisineOptions = ['川菜', '鲁菜', '粤菜', '苏菜', '浙菜', '闽菜', '湘菜', '徽菜', '家常菜', '异国料理']

export const monthXunList = [
  '1月上旬', '1月中旬', '1月下旬',
  '2月上旬', '2月中旬', '2月下旬',
  '3月上旬', '3月中旬', '3月下旬',
  '4月上旬', '4月中旬', '4月下旬',
  '5月上旬', '5月中旬', '5月下旬',
  '6月上旬', '6月中旬', '6月下旬',
  '7月上旬', '7月中旬', '7月下旬',
  '8月上旬', '8月中旬', '8月下旬',
  '9月上旬', '9月中旬', '9月下旬',
  '10月上旬', '10月中旬', '10月下旬',
  '11月上旬', '11月中旬', '11月下旬',
  '12月上旬', '12月中旬', '12月下旬',
]
