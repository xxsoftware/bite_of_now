import { getAIConfig, getUserPreferences, getRecentCuisineHistory, getRecentRecipeNames, getDislikedRecipes, getHighRatedRecipes, getTunePreferences } from './db'
import { getCurrentXun } from './utils'
import type { Recipe, DailyRecommendation } from '@/types'

interface AIRecommendationResponse {
  breakfast: { name: string; reason: string }
  lunch: { name: string; reason: string }
  dinner: { name: string; reason: string }
  snack?: { name: string; reason: string }
  seasonTag: string
  cuisineTag: string
  totalCalories: number
  macros: { carbs: number; protein: number; fat: number }
  reasons?: Record<string, string>
}

function buildSystemPrompt(): string {
  return `你是一位专业的中国饮食营养师和美食推荐专家。你的任务是根据用户提供的时令、口味偏好、身体目标等信息，推荐适合的三餐及加餐。

要求：
1. 推荐的菜品必须是真实存在的中国家常菜或经典菜系菜品
2. 必须考虑时令性，优先推荐当季最新鲜的食材
3. 菜品名称要简洁（不超过8个字），符合中文菜名习惯
4. 回复必须是严格的 JSON 格式

JSON 格式要求：
{
  "breakfast": { "name": "菜名", "reason": "推荐理由（时令/营养相关）" },
  "lunch": { "name": "菜名", "reason": "推荐理由" },
  "dinner": { "name": "菜名", "reason": "推荐理由" },
  "snack": { "name": "菜名", "reason": "推荐理由" },
  "seasonTag": "时令描述（如：5月下旬·初夏尝鲜）",
  "cuisineTag": "菜系描述（如：粤菜·清淡滋补）",
  "totalCalories": 总热量估算数字,
  "macros": { "carbs": 碳水占比(0-100), "protein": 蛋白质占比(0-100), "fat": 脂肪占比(0-100) },
  "reasons": {
    "breakfast": "推荐理由（从时令/轮换/目标/避讳中选1-2条）",
    "lunch": "推荐理由",
    "dinner": "推荐理由",
    "snack": "推荐理由"
  }
}`
}

async function buildUserPrompt(availableRecipes: Recipe[]): Promise<string> {
  const currentXun = getCurrentXun()
  const prefs = await getUserPreferences()
  const recentHistory = await getRecentCuisineHistory(7)
  const recentNames = await getRecentRecipeNames(7)
  const disliked = await getDislikedRecipes()
  const highRated = await getHighRatedRecipes(4)
  const tunePrefs = await getTunePreferences()

  let prompt = `当前日期：${new Date().toLocaleDateString('zh-CN')}，当前时令：${currentXun}\n\n`

  // Available recipes
  prompt += `本地食谱库中的菜品（请从中选择或推荐类似的）：\n`
  const uniqueNames = [...new Set(availableRecipes.map((r) => r.name))]
  prompt += uniqueNames.join('、') + '\n\n'

  // User preferences
  prompt += `用户偏好：\n`
  prompt += `- 身体目标：${prefs.bodyGoal === 'lose' ? '减脂' : prefs.bodyGoal === 'gain' ? '增肌' : '维持'}\n`
  prompt += `- 口味偏好：${prefs.tastePreference === 'light' ? '清淡' : prefs.tastePreference === 'heavy' ? '重口' : '嗜辣'}\n`
  prompt += `- 辣度接受度：${prefs.spiceLevel}/5\n`

  if (prefs.avoidIngredients.length > 0) {
    prompt += `- 忌口食材：${prefs.avoidIngredients.join('、')}\n`
  }

  // High rated recipes as positive signal
  if (highRated.length > 0) {
    prompt += `\n用户高评分的菜品（可作为正向参考）：\n`
    highRated.slice(0, 5).forEach((r) => {
      prompt += `- ${r.name}（${r.score}分）\n`
    })
  }

  // Tune preferences
  const tuneEntries: string[] = []
  if (tunePrefs.lighter) tuneEntries.push(`更清淡（${tunePrefs.lighter}次）`)
  if (tunePrefs.heavier) tuneEntries.push(`更重口（${tunePrefs.heavier}次）`)
  if (tunePrefs.spicier) tuneEntries.push(`更辣（${tunePrefs.spicier}次）`)
  if (tunePrefs.changeIngredient) tuneEntries.push(`换食材（${tunePrefs.changeIngredient}次）`)
  if (tunePrefs.changeMethod) tuneEntries.push(`换做法（${tunePrefs.changeMethod}次）`)
  if (tuneEntries.length > 0) {
    prompt += `\n用户近期反馈偏好：${tuneEntries.join('、')}\n`
  }

  // Recent history for rotation
  if (recentHistory.length > 0) {
    prompt += `\n用户近7天饮食记录：\n`
    recentHistory.slice(0, 5).forEach((h) => {
      prompt += `- ${h.date}: ${h.cuisine}（${h.flavor}）\n`
    })
    prompt += `注意：请避免连续推荐同一菜系，实现口味多样化。\n`
  }

  // Recent names to avoid duplicates
  if (recentNames.length > 0) {
    prompt += `\n近7天已吃过的菜品（请避免重复）：${recentNames.join('、')}\n`
  }

  // Disliked recipes
  if (disliked.length > 0) {
    prompt += `\n用户标记"不喜欢"的菜品（请避免）：${disliked.join('、')}\n`
  }

  // Seasonal constraint
  prompt += `\n重要约束：\n`
  prompt += `- 当前是${currentXun}，请优先推荐当季最新鲜的食材\n`
  prompt += `- 推荐的总热量应符合用户的身体目标\n`
  prompt += `- 三大营养素比例应尽量均衡\n`

  return prompt
}

export async function fetchAIRecommendation(recipes: Recipe[]): Promise<AIRecommendationResponse> {
  const config = await getAIConfig()

  if (!config.apiKey) {
    throw new Error('请先配置 API Key')
  }

  const baseUrl = config.baseUrl?.trim() || 'https://api.openai.com/v1'
  const modelName = config.modelName?.trim() || 'gpt-4o-mini'

  const messages = [
    { role: 'system' as const, content: buildSystemPrompt() },
    { role: 'user' as const, content: await buildUserPrompt(recipes) },
  ]

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: modelName,
      messages,
      temperature: 0.7,
      max_tokens: 2000,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error?.message || `请求失败: ${response.status}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content || ''

  // Extract JSON from response
  let jsonStr = content
  const jsonMatch = content.match(/```json\n?([\s\S]*?)```/)
  if (jsonMatch) {
    jsonStr = jsonMatch[1]
  } else {
    // Try to find raw JSON object
    const rawMatch = content.match(/\{[\s\S]*\}/)
    if (rawMatch) {
      jsonStr = rawMatch[0]
    }
  }

  try {
    return JSON.parse(jsonStr)
  } catch {
    throw new Error('AI 返回格式解析失败')
  }
}

export async function testAIConnection(): Promise<{ success: boolean; message: string }> {
  const config = await getAIConfig()

  if (!config.apiKey) {
    return { success: false, message: 'API Key 未配置' }
  }

  const baseUrl = config.baseUrl?.trim() || 'https://api.openai.com/v1'
  const modelName = config.modelName?.trim() || 'gpt-4o-mini'

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'user', content: '你好' }],
        max_tokens: 10,
      }),
    })

    if (response.ok) {
      return { success: true, message: '连接成功' }
    } else {
      const errorData = await response.json().catch(() => ({}))
      return { success: false, message: errorData.error?.message || `连接失败: ${response.status}` }
    }
  } catch (e) {
    return { success: false, message: `网络错误: ${e}` }
  }
}

// Cuisine rotation: avoid same cuisine in consecutive meals
function pickBalancedMeals(
  pool: Recipe[],
  count: number,
  recentHistory: Array<{ cuisine: string; flavor: string }>
): Recipe[] {
  const recentCuisines = recentHistory.slice(0, 3).map((h) => h.cuisine)
  const recentFlavors = recentHistory.slice(0, 2).map((h) => h.flavor)

  const scored = pool.map((recipe) => {
    let score = Math.random() * 100
    // Penalize recent cuisines
    if (recentCuisines.includes(recipe.cuisine)) score -= 40 * recentCuisines.filter((c) => c === recipe.cuisine).length
    // Penalize similar flavors
    if (recentFlavors.some((f) => recipe.flavor.includes(f) || f.includes(recipe.flavor))) score -= 20
    // Prefer seasonal
    if (recipe.bestSeason.includes(getCurrentXun()) || recipe.bestSeason.includes('全年')) score += 30
    return { recipe, score }
  })

  scored.sort((a, b) => b.score - a.score)

  const picked: Recipe[] = []
  const usedCuisines = new Set<string>()

  for (const { recipe } of scored) {
    if (picked.length >= count) break
    // Try to pick different cuisines for variety
    if (picked.length < 3 && usedCuisines.has(recipe.cuisine) && picked.length < pool.length - 1) {
      // Find alternative with different cuisine
      const alt = scored.find((s) => !picked.includes(s.recipe) && !usedCuisines.has(s.recipe.cuisine))
      if (alt) {
        picked.push(alt.recipe)
        usedCuisines.add(alt.recipe.cuisine)
        continue
      }
    }
    if (!picked.includes(recipe)) {
      picked.push(recipe)
      usedCuisines.add(recipe.cuisine)
    }
  }

  return picked
}

const macrosMap: Record<string, { carbs: number; protein: number; fat: number }> = {
  lose: { carbs: 30, protein: 40, fat: 30 },
  gain: { carbs: 50, protein: 30, fat: 20 },
  maintain: { carbs: 45, protein: 25, fat: 30 },
}

// Fallback: generate recommendation locally using mock data
export async function generateLocalRecommendation(recipes: Recipe[]): Promise<DailyRecommendation> {
  const currentXun = getCurrentXun()
  const disliked = await getDislikedRecipes()
  const recentNames = await getRecentRecipeNames(7)
  const recentHistory = await getRecentCuisineHistory(7)
  const prefs = await getUserPreferences()

  // Filter out disliked and recent recipes
  let available = recipes.filter((r) => !disliked.includes(r.name) && !recentNames.includes(r.name))
  if (available.length < 4) {
    available = recipes.filter((r) => !disliked.includes(r.name))
  }
  if (available.length < 4) {
    available = recipes
  }

  // Try to find seasonal matches
  const seasonal = available.filter((r) => r.bestSeason.includes(currentXun) || r.bestSeason.includes('全年'))
  const pool = seasonal.length >= 4 ? seasonal : available

  // Pick balanced meals with cuisine rotation
  const [breakfast, lunch, dinner, snack] = pickBalancedMeals(pool, 4, recentHistory)

  const totalCalories = breakfast.calories + lunch.calories + dinner.calories + (snack?.calories || 0)

  // Build cuisine tag based on most interesting meal
  const mainMeal = lunch.cuisine !== breakfast.cuisine ? lunch : dinner

  // Dynamic macros based on body goal
  const macros = macrosMap[prefs.bodyGoal] || macrosMap.maintain

  return {
    breakfast,
    lunch,
    dinner,
    snack,
    totalCalories,
    macros,
    seasonTag: `${currentXun}·${getSeasonPhrase(currentXun)}`,
    cuisineTag: `${mainMeal.cuisine}·${mainMeal.flavor}风味`,
  }
}

function getSeasonPhrase(xun: string): string {
  const month = parseInt(xun.match(/(\d+)月/)?.[1] || '1')
  const phrases: Record<number, string> = {
    1: '冬令进补',
    2: '早春尝鲜',
    3: '春回大地',
    4: '暮春谷雨',
    5: '初夏尝鲜',
    6: '端午时令',
    7: '盛夏清凉',
    8: '立秋贴膘',
    9: '中秋团圆',
    10: '金秋丰收',
    11: '立冬进补',
    12: '冬至暖身',
  }
  return phrases[month] || '时令美味'
}

// Match AI response to local recipes
export function matchAIRecipe(name: string, recipes: Recipe[]): Recipe | undefined {
  // Exact match
  const exact = recipes.find((r) => r.name === name)
  if (exact) return exact

  // Partial match
  const partial = recipes.find((r) => name.includes(r.name) || r.name.includes(name))
  if (partial) return partial

  return undefined
}
