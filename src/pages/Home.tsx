import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { RefreshCw, Check, ChefHat, Flame, Droplets, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getCurrentXun, formatDate, cn } from '@/lib/utils'
import { mockDailyRecommendation, mockRecipes } from '@/data/mock'
import type { Recipe } from '@/types'

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
  onRefresh,
  onAte,
  isRefreshing,
  index,
}: {
  mealType: string
  recipe: Recipe
  onRefresh: () => void
  onAte: () => void
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
          <div className="flex flex-wrap gap-1.5 mb-3">
            <Badge variant="default" className="text-[10px]">
              {mockDailyRecommendation.seasonTag}
            </Badge>
            <Badge variant="sky" className="text-[10px]">
              {recipe.cuisine}·{recipe.flavor}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-9 text-xs rounded-xl"
              onClick={(e) => { e.stopPropagation(); onRefresh() }}
              disabled={isRefreshing}
            >
              <RefreshCw size={13} className={cn('mr-1', isRefreshing && 'animate-spin')} />
              换一换
            </Button>
            <Button
              variant="default"
              size="sm"
              className="flex-1 h-9 text-xs rounded-xl"
              onClick={(e) => { e.stopPropagation(); onAte() }}
            >
              <Check size={13} className="mr-1" />
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
  const [recommendation, setRecommendation] = useState(mockDailyRecommendation)
  const [refreshing, setRefreshing] = useState<Record<string, boolean>>({})

  const handleRefresh = useCallback((mealType: string) => {
    setRefreshing(prev => ({ ...prev, [mealType]: true }))
    setTimeout(() => {
      const randomRecipe = mockRecipes[Math.floor(Math.random() * mockRecipes.length)]
      setRecommendation(prev => ({ ...prev, [mealType]: randomRecipe }))
      setRefreshing(prev => ({ ...prev, [mealType]: false }))
    }, 600)
  }, [])

  const handleAte = useCallback(() => {
    // Would save to diet records
  }, [])

  const meals = [
    { type: 'breakfast', recipe: recommendation.breakfast },
    { type: 'lunch', recipe: recommendation.lunch },
    { type: 'dinner', recipe: recommendation.dinner },
    { type: 'snack', recipe: recommendation.snack },
  ].filter(m => m.recipe) as { type: string; recipe: Recipe }[]

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={staggerContainer}
      className="px-4 pt-5 safe-top pb-4"
    >
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
            当前时令 · {getCurrentXun()}
          </span>
        </motion.div>
      </motion.div>

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
                onRefresh={() => handleRefresh(meal.type)}
                onAte={handleAte}
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
