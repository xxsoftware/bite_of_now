import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { RefreshCw, Check, ChefHat, Flame, Droplets, Sparkles, Loader2, Undo2, MapPin, SlidersHorizontal, Bot, Zap } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate, cn, getCurrentXunForRegion } from '@/lib/utils'
import {
  getRecipes, saveDailyRecommendation, getDailyRecommendation,
  addDietRecord, addDislikedRecipe, removeDislikedRecipe,
  getAIConfig, getRegionConfig, incrementLocalStreak, resetLocalStreak,
  getTunePreferences, saveTunePreferences
} from '@/lib/db'
import { useToast } from '@/components/ToastProvider'
import { fetchAIRecommendation, generateLocalRecommendation, matchAIRecipe } from '@/lib/ai'
import type { Recipe, DailyRecommendation, RegionConfig, TunePreferences } from '@/types'

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.15 },
  },
}

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, bounce: 0.2, duration: 0.55 } },
}

const mealLabels: Record<string, { label: string; icon: typeof ChefHat; color: string; bg: string; accent: string }> = {
  breakfast: { label: '早餐', icon: ChefHat, color: 'text-honey-dark', bg: 'from-honey/30 to-honey/10', accent: 'bg-honey-dark' },
  lunch: { label: '午餐', icon: Flame, color: 'text-blossom-dark', bg: 'from-blossom/25 to-blossom/5', accent: 'bg-blossom-dark' },
  dinner: { label: '晚餐', icon: Droplets, color: 'text-sage-dark', bg: 'from-sage/30 to-sage/10', accent: 'bg-sage-dark' },
  snack: { label: '加餐', icon: Sparkles, color: 'text-sky-dark', bg: 'from-sky/25 to-sky/5', accent: 'bg-sky-dark' },
}

function MealCard({
  mealType,
  recipe,
  seasonTag,
  reason,
  onRefresh,
  onAte,
  onTune,
  isRefreshing,
  index,
}: {
  mealType: string
  recipe: Recipe
  seasonTag: string
  reason?: string
  onRefresh: () => void
  onAte: () => void
  onTune?: () => void
  isRefreshing: boolean
  index: number
}) {
  const navigate = useNavigate()
  const meal = mealLabels[mealType]
  const Icon = meal.icon
  const isEven = index % 2 === 0

  return (
    <motion.div
      variants={fadeInUp}
      className={cn(
        'relative',
        isEven ? 'mr-6' : 'ml-6'
      )}
    >
      {/* Connector dot */}
      <div
        className={cn(
          'absolute top-20 w-3 h-3 rounded-full border-2 border-paper',
          meal.accent,
          isEven ? '-right-1.5' : '-left-1.5'
        )}
      />

      <Card
        className={cn(
          'overflow-hidden cursor-pointer transition-all duration-300 hover:card-shadow-hover press-scale',
          isEven ? 'rounded-tr-[2.5rem]' : 'rounded-tl-[2.5rem]'
        )}
        onClick={() => navigate(`/recipe/${recipe.id}`)}
      >
        <div className={cn(
          'relative h-36 bg-gradient-to-br flex items-center justify-center',
          meal.bg
        )}>
          <div className="absolute inset-0 opacity-[0.08]">
            <svg width="100%" height="100%">
              <defs>
                <pattern id={`pattern-${mealType}`} x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                  <circle cx="10" cy="10" r="1" fill="currentColor" className="text-charcoal" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill={`url(#pattern-${mealType})`} />
            </svg>
          </div>
          <Icon size={40} className={cn('opacity-30', meal.color)} strokeWidth={1.2} />
          <div className="absolute top-3 left-3">
            <Badge variant="outline" className="bg-paper/85 backdrop-blur-sm text-xs border-0">
              {meal.label}
            </Badge>
          </div>
          <div className="absolute top-3 right-3">
            <span className="bg-charcoal/70 text-paper text-[10px] font-bold px-2 py-1 rounded-lg backdrop-blur-sm">
              {recipe.calories} kcal
            </span>
          </div>
        </div>

        <CardContent className="p-4">
          <h3 className="font-display text-base text-charcoal mb-1.5 leading-snug">{recipe.name}</h3>

          {/* Reason text */}
          {reason && (
            <p className="text-[10px] text-stone/70 mb-2 leading-relaxed line-clamp-2">
              {reason}
            </p>
          )}

          <div className="flex flex-wrap gap-1.5 mb-3">
            <Badge variant="default" className="text-[10px]">
              {seasonTag}
            </Badge>
            <Badge variant="sky" className="text-[10px]">
              {recipe.cuisine}·{recipe.flavor}
            </Badge>
          </div>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-9 text-[11px] rounded-xl px-2"
              onClick={(e) => { e.stopPropagation(); onRefresh() }}
              disabled={isRefreshing}
            >
              <RefreshCw size={12} className={cn('mr-0.5', isRefreshing && 'animate-spin')} />
              换一换
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-9 text-[11px] rounded-xl px-2"
              onClick={(e) => { e.stopPropagation(); onTune?.() }}
            >
              <SlidersHorizontal size={12} className="mr-0.5" />
              不太对
            </Button>
            <Button
              variant="default"
              size="sm"
              className="flex-1 h-9 text-[11px] rounded-xl px-2"
              onClick={(e) => { e.stopPropagation(); onAte() }}
            >
              <Check size={12} className="mr-0.5" />
              我吃了
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function MacroBar({ label, value, color, delay }: { label: string; value: number; color: string; delay: number }) {
  return (
    <div className="flex flex-col gap-1.5 flex-1 min-w-0">
      <div className="flex justify-between text-xs">
        <span className="text-stone font-medium">{label}</span>
        <span className="text-charcoal font-bold tabular-nums">{value}%</span>
      </div>
      <div className="h-2 bg-cream-dark rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
          className={cn('h-full rounded-full', color)}
        />
      </div>
    </div>
  )
}

export default function Home() {
  const [recommendation, setRecommendation] = useState<DailyRecommendation | null>(null)
  const [refreshing, setRefreshing] = useState<Record<string, boolean>>({})
  const [generatingAI, setGeneratingAI] = useState(false)
  const [aiError, setAiError] = useState('')
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [aiConfig, setAiConfig] = useState<{ apiKey: string; baseUrl?: string; modelName?: string }>({ apiKey: '', baseUrl: '', modelName: '' })
  const [regionConfig, setRegionConfig] = useState<RegionConfig | null>(null)
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const [isLocalMode, setIsLocalMode] = useState(false)
  const [showTuneModal, setShowTuneModal] = useState(false)
  const [_tuneMealType, setTuneMealType] = useState('')
  const toast = useToast()

  // Undo state for dislike
  const undoRef = useRef<{
    recipeName: string
    timer: ReturnType<typeof setTimeout>
  } | null>(null)
  const [undoVisible, setUndoVisible] = useState(false)

  // Load recipes, aiConfig, regionConfig on mount
  useEffect(() => {
    async function loadData() {
      const [loadedRecipes, loadedAIConfig, loadedRegion] = await Promise.all([
        getRecipes(),
        getAIConfig(),
        getRegionConfig(),
      ])
      setRecipes(loadedRecipes)
      setAiConfig(loadedAIConfig)
      setRegionConfig(loadedRegion)
    }
    loadData()
  }, [])

  // Load or generate recommendation on mount
  useEffect(() => {
    if (recipes.length === 0) return

    async function loadOrGenerate() {
      const today = new Date().toISOString().split('T')[0]

      // Try SQLite cache first
      const cached = await getDailyRecommendation()
      if (cached && cached.date === today) {
        const rec = cached.recommendation
        const totalCalories = (rec.breakfast?.calories || 0) + (rec.lunch?.calories || 0) + (rec.dinner?.calories || 0) + (rec.snack?.calories || 0)
        setRecommendation({
          breakfast: rec.breakfast,
          lunch: rec.lunch,
          dinner: rec.dinner,
          snack: rec.snack,
          totalCalories: cached.totalCalories || totalCalories,
          macros: cached.macros || { carbs: 45, protein: 25, fat: 30 },
          seasonTag: cached.seasonTag || `${getCurrentXunForRegion(regionConfig?.region)}·时令美味`,
          cuisineTag: cached.cuisineTag || `${rec.lunch?.cuisine || '家常'}·${rec.lunch?.flavor || '清淡'}风味`,
        })
        if (cached.reasons) setReasons(cached.reasons)
        return
      }

      // No valid cache, generate new
      await generateRecommendation(false)
    }

    loadOrGenerate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipes])

  const generateRecommendation = useCallback(async (useAI = false) => {
    if (recipes.length === 0) return

    setGeneratingAI(true)
    setAiError('')

    try {
      let rec: DailyRecommendation
      let aiReasons: Record<string, string> = {}
      let usedLocal = false

      if (useAI && aiConfig.apiKey) {
        try {
          const aiResult = await fetchAIRecommendation(recipes)
          const breakfast = matchAIRecipe(aiResult.breakfast.name, recipes) || recipes[Math.floor(Math.random() * recipes.length)]
          const lunch = matchAIRecipe(aiResult.lunch.name, recipes) || recipes[Math.floor(Math.random() * recipes.length)]
          const dinner = matchAIRecipe(aiResult.dinner.name, recipes) || recipes[Math.floor(Math.random() * recipes.length)]
          const snack = aiResult.snack ? (matchAIRecipe(aiResult.snack.name, recipes) || recipes[Math.floor(Math.random() * recipes.length)]) : undefined

          rec = {
            breakfast,
            lunch,
            dinner,
            snack,
            totalCalories: aiResult.totalCalories || breakfast.calories + lunch.calories + dinner.calories + (snack?.calories || 0),
            macros: aiResult.macros || { carbs: 45, protein: 25, fat: 30 },
            seasonTag: aiResult.seasonTag || `${getCurrentXunForRegion(regionConfig?.region)}·时令美味`,
            cuisineTag: aiResult.cuisineTag || `${lunch.cuisine}·${lunch.flavor}风味`,
          }
          aiReasons = aiResult.reasons || {}
          await resetLocalStreak()
        } catch (e) {
          rec = await generateLocalRecommendation(recipes)
          setAiError('AI 推荐失败，已切换至本地推荐')
          usedLocal = true
        }
      } else {
        rec = await generateLocalRecommendation(recipes)
        usedLocal = true
      }

      setRecommendation(rec)
      setReasons(aiReasons)
      setIsLocalMode(usedLocal || !aiConfig.apiKey)

      if (usedLocal || !aiConfig.apiKey) {
        await incrementLocalStreak()
      }

      // Save to SQLite with full metadata
      const toSave: Record<string, Recipe> = {
        breakfast: rec.breakfast,
        lunch: rec.lunch,
        dinner: rec.dinner,
      }
      if (rec.snack) toSave.snack = rec.snack

      await saveDailyRecommendation(toSave, {
        seasonTag: rec.seasonTag,
        cuisineTag: rec.cuisineTag,
        totalCalories: rec.totalCalories,
        macros: rec.macros,
        reasons: aiReasons,
      })
    } catch {
      const fallback = await generateLocalRecommendation(recipes)
      setRecommendation(fallback)
    } finally {
      setGeneratingAI(false)
    }
  }, [recipes, aiConfig.apiKey, regionConfig?.region])

  const handleRefresh = useCallback(async (mealType: string) => {
    if (!recommendation) return
    setRefreshing(prev => ({ ...prev, [mealType]: true }))

    const currentRecipe = recommendation[mealType as keyof DailyRecommendation] as Recipe
    if (currentRecipe) {
      await addDislikedRecipe(currentRecipe.name)

      // Show undo toast
      setUndoVisible(true)
      if (undoRef.current) {
        clearTimeout(undoRef.current.timer)
      }
      undoRef.current = {
        recipeName: currentRecipe.name,
        timer: setTimeout(() => {
          setUndoVisible(false)
          undoRef.current = null
        }, 3000),
      }
    }

    setTimeout(async () => {
      // Build cuisine-aware pool: avoid same cuisine as other meals in this recommendation
      const usedIds = new Set([
        recommendation.breakfast?.id,
        recommendation.lunch?.id,
        recommendation.dinner?.id,
        recommendation.snack?.id,
      ].filter(Boolean))
      const usedCuisines = new Set(
        ['breakfast', 'lunch', 'dinner', 'snack']
          .filter((mt) => mt !== mealType)
          .map((mt) => (recommendation[mt as keyof DailyRecommendation] as Recipe | undefined)?.cuisine)
          .filter(Boolean)
      )

      let pool = recipes.filter((r) => !usedIds.has(r.id) && !usedCuisines.has(r.cuisine))
      if (pool.length === 0) {
        pool = recipes.filter((r) => !usedIds.has(r.id))
      }
      if (pool.length === 0) pool = recipes

      // Prefer seasonal recipes
      const currentXun = getCurrentXunForRegion(regionConfig?.region)
      const seasonal = pool.filter((r) => r.bestSeason.includes(currentXun) || r.bestSeason.includes('全年'))
      const finalPool = seasonal.length > 0 ? seasonal : pool

      // Score candidates
      const scored = finalPool.map((r) => {
        let score = Math.random() * 50
        if (r.bestSeason.includes(currentXun)) score += 30
        if (r.bestSeason.includes('全年')) score += 10
        return { recipe: r, score }
      }).sort((a, b) => b.score - a.score)

      const selected = scored[0]?.recipe || recipes[0]

      setRecommendation(prev => {
        if (!prev) return null
        const next = { ...prev, [mealType]: selected }
        const total = next.breakfast.calories + next.lunch.calories + next.dinner.calories + (next.snack?.calories || 0)
        return { ...next, totalCalories: total }
      })
      setRefreshing(prev => ({ ...prev, [mealType]: false }))
    }, 600)
  }, [recommendation, recipes, regionConfig?.region])

  const handleUndoDislike = useCallback(async () => {
    if (undoRef.current) {
      await removeDislikedRecipe(undoRef.current.recipeName)
      clearTimeout(undoRef.current.timer)
      undoRef.current = null
    }
    setUndoVisible(false)
  }, [])

  const handleTune = useCallback((mealType: string) => {
    setTuneMealType(mealType)
    setShowTuneModal(true)
  }, [])

  const handleTuneSubmit = useCallback(async (preference: keyof Omit<TunePreferences, 'lastTuneDate'>) => {
    setShowTuneModal(false)
    const today = new Date().toISOString().split('T')[0]
    const current = await getTunePreferences()
    const next: import('@/types').TunePreferences = {
      ...current,
      [preference]: (current[preference] || 0) + 1,
      lastTuneDate: today,
    }
    await saveTunePreferences(next)
    toast.success('反馈已记录，将用于优化下次推荐')
  }, [toast])

  const handleAte = useCallback(async (mealType: string, recipe: Recipe) => {
    const today = new Date().toISOString().split('T')[0]
    await addDietRecord({
      date: today,
      recipe,
      mealType: mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack',
      fullness: 'comfortable',
      mood: '满足',
    })
    toast.success(`${mealLabels[mealType]?.label || mealType}: ${recipe.name} 已记录`)
  }, [toast])

  const meals = useMemo(() => {
    if (!recommendation) return []
    return [
      { type: 'breakfast', recipe: recommendation.breakfast },
      { type: 'lunch', recipe: recommendation.lunch },
      { type: 'dinner', recipe: recommendation.dinner },
      { type: 'snack', recipe: recommendation.snack },
    ].filter((m): m is { type: string; recipe: Recipe } => !!m.recipe)
  }, [recommendation])

  if (!recommendation) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3">
        <Loader2 size={28} className="animate-spin text-sage-dark" />
        <p className="text-stone text-sm">正在生成今日推荐...</p>
      </div>
    )
  }

  const regionLabel = regionConfig?.region === 'cn' ? '中国' :
    regionConfig?.region === 'au' ? '澳大利亚' :
    regionConfig?.region === 'us' ? '美国' :
    regionConfig?.region === 'jp' ? '日本' :
    regionConfig?.region === 'kr' ? '韩国' :
    regionConfig?.region === 'sg' ? '新加坡' : '中国'

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={staggerContainer}
      className="px-4 pt-5 safe-top pb-4"
    >
      {/* Undo Dislike Toast */}
      <AnimatePresence>
        {undoVisible && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 left-0 right-0 z-50 flex justify-center"
          >
            <div className="bg-charcoal text-paper px-4 py-2.5 rounded-2xl text-sm font-medium shadow-lg flex items-center gap-3">
              <span className="text-xs">已标记不喜欢，7天后自动解除</span>
              <button
                onClick={handleUndoDislike}
                className="flex items-center gap-1 text-sage text-xs font-semibold hover:text-sage-dark transition-colors"
              >
                <Undo2 size={12} />
                撤销
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div variants={fadeInUp} className="mb-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-stone font-medium tracking-wide uppercase">{formatDate()}</p>
            <h1 className="font-display text-[1.75rem] text-charcoal mt-0.5 leading-tight">
              咬一口春天
            </h1>
          </div>
          <motion.div
            whileTap={{ rotate: [0, -15, 15, -8, 0] }}
            transition={{ duration: 0.5 }}
            className="w-12 h-12 bg-gradient-to-br from-sage/30 to-blossom/25 rounded-[1.125rem] flex items-center justify-center card-shadow"
          >
            <span className="font-display text-lg text-sage-dark">春</span>
          </motion.div>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25 }}
          className="mt-3 inline-flex items-center gap-1.5 bg-honey/25 px-3.5 py-1.5 rounded-full"
        >
          <Sparkles size={12} className="text-honey-dark" />
          <span className="text-xs font-bold text-earth-dark">
            当前时令 · {getCurrentXunForRegion(regionConfig?.region)}
          </span>
          {regionConfig?.region && regionConfig.region !== 'cn' && (
            <span className="text-[10px] text-stone/60 flex items-center gap-0.5 ml-1">
              <MapPin size={8} />
              {regionLabel}
            </span>
          )}
        </motion.div>

        {/* Recommendation Mode Banner */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className={cn(
            'mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium',
            isLocalMode
              ? 'bg-stone/10 text-stone'
              : 'bg-sage/15 text-sage-dark'
          )}
        >
          {isLocalMode ? (
            <>
              <Zap size={12} />
              <span>本地推荐 · 配置 API Key 获得更个性化推荐</span>
            </>
          ) : (
            <>
              <Bot size={12} />
              <span>AI 智能推荐 · 个性化定制</span>
            </>
          )}
        </motion.div>
      </motion.div>

      {/* AI Error */}
      {aiError && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 bg-blossom/10 border border-blossom/20 rounded-2xl px-3.5 py-2 text-xs text-blossom-dark"
        >
          {aiError}
        </motion.div>
      )}

      {/* Nutrition Overview */}
      <motion.div variants={fadeInUp} className="mb-5">
        <Card className="bg-gradient-to-br from-paper to-cream/60 overflow-hidden border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3.5">
              <h2 className="font-display text-base text-charcoal">今日营养</h2>
              <div className="flex items-center gap-1 text-sm">
                <Flame size={14} className="text-blossom-dark" />
                <span className="font-bold text-charcoal tabular-nums">{recommendation.totalCalories}</span>
                <span className="text-stone text-xs">kcal</span>
              </div>
            </div>
            <div className="flex gap-3">
              <MacroBar label="碳水" value={recommendation.macros.carbs} color="bg-honey-dark" delay={0.4} />
              <MacroBar label="蛋白质" value={recommendation.macros.protein} color="bg-blossom-dark" delay={0.55} />
              <MacroBar label="脂肪" value={recommendation.macros.fat} color="bg-sky-dark" delay={0.7} />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* AI Generate Button */}
      {aiConfig.apiKey && (
        <motion.div variants={fadeInUp} className="mb-4">
          <Button
            variant="outline"
            className="w-full h-10 rounded-2xl text-sm"
            onClick={() => generateRecommendation(true)}
            disabled={generatingAI}
          >
            {generatingAI ? (
              <>
                <Loader2 size={14} className="mr-1.5 animate-spin" />
                AI 推荐中...
              </>
            ) : (
              <>
                <Sparkles size={14} className="mr-1.5 text-honey-dark" />
                用 AI 重新推荐
              </>
            )}
          </Button>
        </motion.div>
      )}

      {/* Tune Preferences Modal */}
      <AnimatePresence>
        {showTuneModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowTuneModal(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
              className="bg-paper rounded-3xl p-5 max-w-sm w-full card-shadow"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-display text-lg text-charcoal mb-4 text-center">
                这道菜哪里不太对？
              </h3>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[
                  { key: 'lighter' as const, label: '太油腻了', icon: '🍃' },
                  { key: 'heavier' as const, label: '不够味', icon: '🌶️' },
                  { key: 'spicier' as const, label: '想吃点辣的', icon: '🔥' },
                  { key: 'changeIngredient' as const, label: '想换个食材', icon: '🥬' },
                  { key: 'changeMethod' as const, label: '做法不喜欢', icon: '👨‍🍳' },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => handleTuneSubmit(opt.key)}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-cream-dark/25 hover:bg-sage/10 transition-colors text-left"
                  >
                    <span className="text-lg">{opt.icon}</span>
                    <span className="text-xs font-medium text-charcoal">{opt.label}</span>
                  </button>
                ))}
              </div>
              <Button
                variant="outline"
                className="w-full h-11 rounded-2xl"
                onClick={() => setShowTuneModal(false)}
              >
                取消
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Meal Cards */}
      <motion.h2 variants={fadeInUp} className="font-display text-lg text-charcoal mb-3">
        今日推荐
      </motion.h2>

      <div className="space-y-4 relative">
        {/* Vertical timeline line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-sage/20 via-blossom/15 to-honey/20 -translate-x-1/2" />

        <AnimatePresence mode="popLayout">
          {meals.map((meal, index) => (
            <motion.div
              key={`${meal.type}-${meal.recipe.id}`}
              layout
              initial={{ opacity: 0, scale: 0.92, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -8 }}
              transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <MealCard
                mealType={meal.type}
                recipe={meal.recipe}
                seasonTag={recommendation.seasonTag}
                reason={reasons[meal.type]}
                onRefresh={() => handleRefresh(meal.type)}
                onAte={() => handleAte(meal.type, meal.recipe)}
                onTune={() => handleTune(meal.type)}
                isRefreshing={!!refreshing[meal.type]}
                index={index}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
