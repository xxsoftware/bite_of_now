import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Clock, Flame, ChefHat, ShoppingCart,
  BookOpen, Play, Check, AlertCircle, Sparkles, Leaf
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { mockRecipes } from '@/data/mock'


const seasonGradients: Record<string, string> = {
  '春': 'from-sage/30 to-sage/10',
  '夏': 'from-blossom/25 to-blossom/8',
  '秋': 'from-earth/25 to-earth/8',
  '冬': 'from-sky/25 to-sky/10',
  '全': 'from-honey/20 to-honey/8',
}

function getSeasonGradient(bestSeason: string[]): string {
  const first = bestSeason[0] || ''
  if (first.includes('3') || first.includes('4') || first.includes('5')) return seasonGradients['春']
  if (first.includes('6') || first.includes('7') || first.includes('8')) return seasonGradients['夏']
  if (first.includes('9') || first.includes('10') || first.includes('11')) return seasonGradients['秋']
  if (first.includes('12') || first.includes('1') || first.includes('2')) return seasonGradients['冬']
  return seasonGradients['全']
}

function getSeasonIcon(bestSeason: string[]): string {
  const first = bestSeason[0] || ''
  if (first.includes('3') || first.includes('4') || first.includes('5')) return '🌱'
  if (first.includes('6') || first.includes('7') || first.includes('8')) return '☀️'
  if (first.includes('9') || first.includes('10') || first.includes('11')) return '🍂'
  if (first.includes('12') || first.includes('1') || first.includes('2')) return '❄️'
  return '🌿'
}

export default function RecipeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'text' | 'video'>('text')
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set())
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [addedToCart, setAddedToCart] = useState(false)

  const recipe = mockRecipes.find((r) => r.id === id)

  if (!recipe) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center h-screen px-8"
      >
        <div className="w-20 h-20 bg-cream-dark/40 rounded-full flex items-center justify-center mb-4">
          <ChefHat size={36} className="text-stone/40" />
        </div>
        <p className="text-charcoal font-display text-lg mb-1">食谱未找到</p>
        <p className="text-stone text-sm text-center mb-6">这道菜似乎不存在，试试其他美味吧</p>
        <Button variant="default" onClick={() => navigate('/explore')} className="rounded-2xl">
          去食谱库看看
        </Button>
      </motion.div>
    )
  }

  const toggleIngredient = useCallback((name: string) => {
    setCheckedIngredients((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }, [])

  const toggleStep = useCallback((order: number) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev)
      if (next.has(order)) next.delete(order)
      else next.add(order)
      return next
    })
  }, [])

  const handleAddToCart = useCallback(() => {
    setAddedToCart(true)
    setTimeout(() => setAddedToCart(false), 2000)
  }, [])

  const seasonGradient = getSeasonGradient(recipe.bestSeason)
  const seasonIcon = getSeasonIcon(recipe.bestSeason)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Hero */}
      <div className="relative">
        <div className={cn(
          'h-60 bg-gradient-to-br flex items-center justify-center relative overflow-hidden',
          seasonGradient
        )}>
          <div className="absolute inset-0 opacity-[0.06]">
            <svg width="100%" height="100%">
              <defs>
                <pattern id="detailPattern" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                  <circle cx="12" cy="12" r="0.8" fill="currentColor" className="text-charcoal" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#detailPattern)" />
            </svg>
          </div>
          <motion.div
            initial={{ scale: 0.75, rotate: -8 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring' as const, bounce: 0.25, duration: 0.7 }}
          >
            <ChefHat size={72} className="text-charcoal/12" strokeWidth={0.8} />
          </motion.div>
          {/* Decorative leaf */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="absolute bottom-4 left-6"
          >
            <span className="text-3xl opacity-60">{seasonIcon}</span>
          </motion.div>
        </div>

        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 w-10 h-10 bg-paper/85 backdrop-blur-md rounded-full flex items-center justify-center card-shadow press-scale"
        >
          <ArrowLeft size={18} className="text-charcoal" />
        </button>

        {/* Season Badge */}
        <motion.div
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.25, type: 'spring' as const, bounce: 0.3 }}
          className="absolute -bottom-4 right-4"
        >
          <div className="bg-paper card-shadow rounded-2xl px-3.5 py-2 flex items-center gap-2">
            <Leaf size={13} className="text-sage-dark" />
            <span className="text-[11px] font-bold text-earth-dark">
              {recipe.bestSeason.join(' · ')}
            </span>
          </div>
        </motion.div>
      </div>

      <div className="px-4 pt-8 pb-10">
        {/* Title & Meta */}
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge variant="default" className="text-[10px]">{recipe.cuisine}</Badge>
            <Badge variant="blossom" className="text-[10px]">{recipe.flavor}</Badge>
            <Badge variant="sky" className="text-[10px]">{recipe.difficulty === 'easy' ? '简单' : recipe.difficulty === 'medium' ? '中等' : '困难'}</Badge>
          </div>
          <h1 className="font-display text-[1.625rem] text-charcoal mb-3 leading-tight">{recipe.name}</h1>
          <div className="flex items-center gap-4 text-xs text-stone">
            <span className="flex items-center gap-1">
              <Clock size={13} />{recipe.time}分钟
            </span>
            <span className="flex items-center gap-1">
              <Flame size={13} />{recipe.calories}kcal
            </span>
            <span className="flex items-center gap-1">
              <Sparkles size={13} />{recipe.ingredients.length}种食材
            </span>
          </div>
        </motion.div>

        {/* Mode Switch */}
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.18, duration: 0.35 }}
          className="mt-5"
        >
          <div className="inline-flex bg-cream-dark/50 rounded-2xl p-1">
            <button
              onClick={() => setMode('text')}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                mode === 'text' ? 'bg-paper card-shadow text-charcoal' : 'text-stone hover:text-charcoal'
              )}
            >
              <BookOpen size={14} />图文
            </button>
            <button
              onClick={() => setMode('video')}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                mode === 'video' ? 'bg-paper card-shadow text-charcoal' : 'text-stone hover:text-charcoal'
              )}
            >
              <Play size={14} />视频
            </button>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {mode === 'text' ? (
            <motion.div
              key="text"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="space-y-5 mt-5"
            >
              {/* Ingredients */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-display text-lg text-charcoal">食材清单</h2>
                  <span className="text-[10px] text-stone">
                    {checkedIngredients.size}/{recipe.ingredients.length} 已备齐
                  </span>
                </div>
                <div className="space-y-1.5">
                  {recipe.ingredients.map((ing, idx) => (
                    <motion.div
                      key={ing.name}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.04, duration: 0.3 }}
                      onClick={() => toggleIngredient(ing.name)}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-colors duration-200',
                        checkedIngredients.has(ing.name)
                          ? 'bg-sage/8'
                          : 'bg-paper card-shadow'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <motion.div
                          animate={checkedIngredients.has(ing.name) ? { scale: [1, 1.15, 1] } : {}}
                          transition={{ duration: 0.25 }}
                          className={cn(
                            'w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all',
                            checkedIngredients.has(ing.name)
                              ? 'bg-sage border-sage'
                              : 'border-stone/25'
                          )}
                        >
                          {checkedIngredients.has(ing.name) && <Check size={13} className="text-white" />}
                        </motion.div>
                        <span className={cn(
                          'text-sm font-medium transition-all',
                          checkedIngredients.has(ing.name) && 'line-through text-stone/70'
                        )}>
                          {ing.name}
                        </span>
                      </div>
                      <span className="text-sm text-stone">{ing.amount}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Steps */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-display text-lg text-charcoal">烹饪步骤</h2>
                  <span className="text-[10px] text-stone">
                    {completedSteps.size}/{recipe.steps.length} 已完成
                  </span>
                </div>
                <div className="space-y-3.5">
                  {recipe.steps.map((step, idx) => {
                    const isDone = completedSteps.has(step.order)
                    const isOdd = idx % 2 === 1

                    return (
                      <motion.div
                        key={step.order}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 + idx * 0.06, duration: 0.35 }}
                        onClick={() => toggleStep(step.order)}
                        className={cn(
                          'flex gap-3 cursor-pointer',
                          isOdd && 'ml-5'
                        )}
                      >
                        <motion.div
                          whileTap={{ scale: 0.9 }}
                          className={cn(
                            'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-display text-sm transition-colors',
                            isDone
                              ? 'bg-sage text-white'
                              : 'bg-cream-dark/40 text-stone'
                          )}
                        >
                          {isDone ? <Check size={16} /> : step.order}
                        </motion.div>
                        <div className={cn(
                          'flex-1 p-3 rounded-2xl transition-colors',
                          isDone ? 'bg-sage/8' : 'bg-paper card-shadow'
                        )}>
                          <p className={cn(
                            'text-sm leading-relaxed',
                            isDone && 'line-through text-stone/60'
                          )}>
                            {step.description}
                          </p>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </div>

              {/* Tips */}
              {recipe.tips && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-honey/12 rounded-2xl p-4 flex gap-3 border border-honey/15"
                >
                  <AlertCircle size={18} className="text-honey-dark flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[11px] font-bold text-earth-dark mb-0.5">小贴士</p>
                    <p className="text-sm text-stone leading-relaxed">{recipe.tips}</p>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="video"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
              className="mt-5"
            >
              <div className="aspect-video bg-charcoal rounded-3xl flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                  <svg width="100%" height="100%">
                    <defs>
                      <pattern id="videoPat" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
                        <circle cx="16" cy="16" r="1" fill="white" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#videoPat)" />
                  </svg>
                </div>
                <div className="text-center relative">
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3 cursor-pointer backdrop-blur-sm border border-white/10"
                  >
                    <Play size={28} className="text-white ml-1" />
                  </motion.div>
                  <p className="text-white/60 text-sm">视频教程</p>
                  <p className="text-white/35 text-xs mt-1">支持倍速播放与关键步骤打点</p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {recipe.steps.map((step) => (
                  <motion.div
                    key={step.order}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 p-3 bg-paper rounded-xl cursor-pointer hover:bg-cream-dark/40 transition-colors"
                  >
                    <span className="text-[10px] font-bold text-stone bg-cream-dark/50 px-1.5 py-0.5 rounded">
                      {step.timestamp || `0${step.order}:00`}
                    </span>
                    <p className="text-sm">{step.description}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="flex gap-3 mt-6"
        >
          <Button
            variant={addedToCart ? 'default' : 'outline'}
            className="flex-1 h-11 rounded-2xl text-sm"
            onClick={handleAddToCart}
          >
            {addedToCart ? (
              <>
                <Check size={15} className="mr-1.5" />已加入购物清单
              </>
            ) : (
              <>
                <ShoppingCart size={15} className="mr-1.5" />加入购物清单
              </>
            )}
          </Button>
          <Button variant="honey" className="flex-1 h-11 rounded-2xl text-sm">
            <ChefHat size={15} className="mr-1.5" />
            烹饪模式
          </Button>
        </motion.div>
      </div>
    </motion.div>
  )
}
