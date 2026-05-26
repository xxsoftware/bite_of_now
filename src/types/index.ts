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
  image?: string
  video?: string
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
