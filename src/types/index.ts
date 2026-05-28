export interface VideoInfo {
  platform: 'local' | 'youtube' | 'bilibili' | 'douyin'
  videoId: string
  originalUrl: string
  embedUrl?: string
}

export interface RegionConfig {
  region: string
  lastVerifiedDate: string
  lastSystemTime: number
}

export interface SeasonCheckResult {
  isValid: boolean
  changed: boolean
  daysDiff: number
}

export interface Recipe {
  id: string
  name: string
  cuisine: string
  flavor: string
  difficulty: 'easy' | 'medium' | 'hard'
  time: number
  calories: number
  bestSeason: string[]
  ingredients: Ingredient[]
  steps: Step[]
  coverImage?: string
  video?: string | VideoInfo
  tips?: string
}

export interface Ingredient {
  name: string
  amount: string
}

export interface Step {
  order: number
  description: string
  image?: string
  timestamp?: number
}

export interface DailyRecommendation {
  breakfast: Recipe
  lunch: Recipe
  dinner: Recipe
  snack?: Recipe
  totalCalories: number
  macros: {
    carbs: number
    protein: number
    fat: number
  }
  seasonTag: string
  cuisineTag: string
}

export interface DietRecord {
  id: string
  date: string
  recipe: Recipe
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  fullness: 'hungry' | 'comfortable' | 'full'
  mood: string
}

export interface ShoppingItem {
  id: string
  name: string
  category: string
  checked: boolean
  sourceRecipe?: string
}

export interface AIConfig {
  apiKey: string
  baseUrl?: string
  modelName?: string
}

export interface UserPreferences {
  avoidIngredients: string[]
  bodyGoal: 'lose' | 'gain' | 'maintain'
  tastePreference: 'light' | 'heavy' | 'spicy'
  spiceLevel: number
}

export interface AppData {
  version: string
  exportDate: string
  recipes: Recipe[]
  dietRecords: DietRecord[]
  shoppingItems: ShoppingItem[]
  aiConfig: AIConfig
  userPreferences: UserPreferences
  dislikedRecipes: string[]
  regionConfig?: RegionConfig
}

export interface DislikedRecipeEntry {
  name: string
  createdAt: string
  count: number
  type: 'soft' | 'hard'
  dimension?: string | null
  expiresAt: string
}

export interface Rating {
  id: string
  recipeId: string
  score: number
  date: string
}

export interface TunePreferences {
  lighter?: number
  heavier?: number
  spicier?: number
  changeIngredient?: number
  changeMethod?: number
  lastTuneDate: string
}

export interface LocalStreak {
  count: number
  lastDate: string
}

export interface WeeklyReport {
  nutritionScore: number
  cuisineDiversity: number
  seasonScore: number
  suggestion: string
}

export interface CustomDailyMenu {
  date: string
  breakfastId?: string
  lunchId?: string
  dinnerId?: string
  snackId?: string
}

export interface SpecialDayMark {
  date: string
  markType: 'outing' | 'party' | 'fasting' | 'custom'
  note?: string
}
