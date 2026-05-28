import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Clock, Flame, ChefHat, ShoppingCart,
  BookOpen, Play, Check, AlertCircle, Sparkles, Leaf,
  Volume2, VolumeX, Minimize2, BookMarked, Sunrise, Sun, Sunset, Moon,
  Heart
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn, getCurrentXun } from '@/lib/utils'
import { getRecipes, addShoppingItems, addDietRecord, isFavorite, toggleFavorite } from '@/lib/db'
import { useToast } from '@/components/ToastProvider'
import { autoCategorize } from '@/lib/smartCategory'
import VideoPlayer from '@/components/VideoPlayer'
import type { Recipe } from '@/types'

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

function isOutOfSeason(bestSeason: string[]): boolean {
  if (bestSeason.includes('全年')) return false
  const current = getCurrentXun()
  return !bestSeason.includes(current)
}

// ========== Cooking Mode ==========

const FONT_SIZES = [
  { label: '小', size: '1.125rem' },
  { label: '中', size: '1.5rem' },
  { label: '大', size: '1.875rem' },
  { label: '特大', size: '2.25rem' },
]

function CookingMode({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [speaking, setSpeaking] = useState(false)
  const [fontSizeIndex, setFontSizeIndex] = useState(1)
  const wakeLockRef = useRef<any>(null)

  useEffect(() => {
    if ('wakeLock' in navigator) {
      (navigator as any).wakeLock.request('screen').then((lock: any) => {
        wakeLockRef.current = lock
      }).catch(() => {})
    }
    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {})
      }
      window.speechSynthesis?.cancel()
    }
  }, [])

  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.9
    utterance.onstart = () => setSpeaking(true)
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)
    window.speechSynthesis.speak(utterance)
  }, [])

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel()
    setSpeaking(false)
  }, [])

  const step = recipe.steps[currentStep]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-charcoal flex flex-col"
    >
      <div className="flex items-center justify-between px-4 py-3 safe-top">
        <button onClick={onClose} className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
          <Minimize2 size={18} className="text-white" />
        </button>
        <h2 className="text-white font-display text-lg">{recipe.name}</h2>
        <div className="flex items-center gap-2">
          {/* Font size toggle */}
          <div className="flex items-center bg-white/10 rounded-full px-1 py-0.5">
            {FONT_SIZES.map((fs, idx) => (
              <button
                key={fs.label}
                onClick={() => setFontSizeIndex(idx)}
                className={cn(
                  'px-2 py-0.5 rounded-full text-[10px] font-medium transition-all',
                  fontSizeIndex === idx ? 'bg-sage text-charcoal' : 'text-white/60'
                )}
              >
                {fs.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => speaking ? stopSpeaking() : speak(`步骤${step.order}：${step.description}`)}
            className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center"
          >
            {speaking ? <VolumeX size={18} className="text-white" /> : <Volume2 size={18} className="text-white" />}
          </button>
        </div>
      </div>

      <div className="px-4 mb-4">
        <div className="flex gap-1">
          {recipe.steps.map((s, idx) => (
            <div
              key={s.order}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors',
                idx <= currentStep ? 'bg-sage' : 'bg-white/15'
              )}
            />
          ))}
        </div>
        <p className="text-white/50 text-xs mt-2 text-center">
          步骤 {currentStep + 1} / {recipe.steps.length}
        </p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-center"
        >
          <div className="w-16 h-16 bg-sage/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="text-sage text-3xl font-display">{step.order}</span>
          </div>
          <p
            className="text-white leading-relaxed font-medium"
            style={{ fontSize: FONT_SIZES[fontSizeIndex].size, lineHeight: 1.6 }}
          >
            {step.description}
          </p>
        </motion.div>
      </div>

      <div className="px-4 pb-6 safe-bottom">
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 h-14 rounded-2xl text-base bg-white/10 border-white/20 text-white"
            onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
            disabled={currentStep === 0}
          >
            上一步
          </Button>
          <Button
            className="flex-1 h-14 rounded-2xl text-base bg-sage text-charcoal"
            onClick={() => {
              if (currentStep < recipe.steps.length - 1) {
                setCurrentStep(prev => prev + 1)
              } else {
                onClose()
              }
            }}
          >
            {currentStep < recipe.steps.length - 1 ? '下一步' : '完成'}
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

// ========== Record to Diary Modal ==========

const mealOptions = [
  { type: 'breakfast', label: '早餐', icon: Sunrise, color: 'bg-honey/15 text-honey-dark' },
  { type: 'lunch', label: '午餐', icon: Sun, color: 'bg-blossom/12 text-blossom-dark' },
  { type: 'dinner', label: '晚餐', icon: Sunset, color: 'bg-sage/12 text-sage-dark' },
  { type: 'snack', label: '加餐', icon: Moon, color: 'bg-sky/10 text-sky-dark' },
] as const

const fullnessOptions = [
  { value: 'hungry', label: '有点饿', emoji: '😋' },
  { value: 'comfortable', label: '刚刚好', emoji: '😊' },
  { value: 'full', label: '好满足', emoji: '😌' },
] as const

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex items-center justify-center gap-1.5"
      onMouseLeave={() => setHover(0)}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          className="w-10 h-10 flex items-center justify-center transition-transform active:scale-90"
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill={star <= (hover || value) ? '#F5D491' : 'none'}
            stroke={star <= (hover || value) ? '#F5D491' : '#C4A882'}
            strokeWidth="1.5"
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>
      ))}
    </div>
  )
}

function RecordModal({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) {
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('lunch')
  const [fullness, setFullness] = useState<'hungry' | 'comfortable' | 'full'>('comfortable')
  const [mood, setMood] = useState('满足')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [saved, setSaved] = useState(false)
  const [ratingStep, setRatingStep] = useState(false)
  const [rating, setRating] = useState(0)
  const toast = useToast()

  const handleSave = async () => {
    await addDietRecord({
      date,
      recipe,
      mealType,
      fullness,
      mood,
    })
    setSaved(true)
    setTimeout(() => {
      setRatingStep(true)
    }, 800)
  }

  const handleSkipRating = () => {
    onClose()
  }

  const handleSubmitRating = async () => {
    if (rating > 0) {
      const { addRating } = await import('@/lib/db')
      await addRating(recipe.id, rating)
      toast.success(`已评分 ${rating} 星`)
    }
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
        className="bg-paper rounded-3xl p-5 max-w-sm w-full card-shadow"
        onClick={(e) => e.stopPropagation()}
      >
        {saved ? (
          ratingStep ? (
            <div className="text-center py-4">
              <p className="font-display text-base text-charcoal mb-1">这道菜怎么样？</p>
              <p className="text-xs text-stone mb-4">{recipe.name}</p>
              <StarRating value={rating} onChange={setRating} />
              <div className="flex gap-2 mt-5">
                <Button variant="outline" className="flex-1 h-10 rounded-2xl text-xs" onClick={handleSkipRating}>
                  跳过
                </Button>
                <Button className="flex-1 h-10 rounded-2xl text-xs bg-sage text-charcoal" onClick={handleSubmitRating}>
                  确认评分
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="w-14 h-14 bg-sage/15 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check size={28} className="text-sage-dark" />
              </div>
              <p className="font-display text-lg text-charcoal">已记录到饮食日记</p>
            </div>
          )
        ) : (
          <>
            <h3 className="font-display text-lg text-charcoal mb-4">记录到饮食日记</h3>
            <p className="text-sm text-charcoal font-medium mb-2">{recipe.name}</p>

            {/* Date */}
            <div className="mb-4">
              <label className="text-[10px] font-bold text-stone uppercase tracking-wider mb-1.5 block">日期</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-10 px-3 bg-cream-dark/30 rounded-xl border-2 border-transparent focus:border-sage/40 outline-none text-sm"
              />
            </div>

            {/* Meal Type */}
            <div className="mb-4">
              <label className="text-[10px] font-bold text-stone uppercase tracking-wider mb-1.5 block">用餐类型</label>
              <div className="grid grid-cols-4 gap-2">
                {mealOptions.map((opt) => {
                  const Icon = opt.icon
                  const isSelected = mealType === opt.type
                  return (
                    <button
                      key={opt.type}
                      onClick={() => setMealType(opt.type)}
                      className={cn(
                        'flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all',
                        isSelected ? 'bg-charcoal text-paper' : 'bg-cream-dark/30 text-stone'
                      )}
                    >
                      <Icon size={14} />
                      <span className="text-[11px] font-medium">{opt.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Fullness */}
            <div className="mb-5">
              <label className="text-[10px] font-bold text-stone uppercase tracking-wider mb-1.5 block">饱腹感</label>
              <div className="flex gap-2">
                {fullnessOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setFullness(opt.value as 'hungry' | 'comfortable' | 'full')}
                    className={cn(
                      'flex-1 py-2.5 rounded-xl text-sm transition-all',
                      fullness === opt.value ? 'bg-charcoal text-paper' : 'bg-cream-dark/30 text-stone'
                    )}
                  >
                    <span className="mr-1">{opt.emoji}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mood */}
            <div className="mb-5">
              <label className="text-[10px] font-bold text-stone uppercase tracking-wider mb-1.5 block">心情</label>
              <div className="flex gap-1.5 flex-wrap">
                {['满足', '幸福', '清爽', '惬意', '愉悦', '温暖'].map((m) => (
                  <button
                    key={m}
                    onClick={() => setMood(m)}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-xs font-medium transition-all',
                      mood === m ? 'bg-sage/15 text-sage-dark' : 'bg-cream-dark/30 text-stone'
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 h-11 rounded-2xl" onClick={onClose}>取消</Button>
              <Button className="flex-1 h-11 rounded-2xl bg-sage text-charcoal" onClick={handleSave}>
                <BookMarked size={15} className="mr-1.5" />
                确认记录
              </Button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}

// ========== Main Component ==========

export default function RecipeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'text' | 'video'>('text')
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set())
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [addedToCart, setAddedToCart] = useState(false)
  const [cookingMode, setCookingMode] = useState(false)
  const [showRecordModal, setShowRecordModal] = useState(false)
  const [cartFeedback, setCartFeedback] = useState('')
  const [recordFeedback, setRecordFeedback] = useState('')
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [isFav, setIsFav] = useState(false)
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  useEffect(() => {
    async function loadRecipe() {
      if (!id) return
      const recipes = await getRecipes()
      const found = recipes.find((r) => r.id === id)
      setRecipe(found || null)
      if (found) {
        const fav = await isFavorite(found.id)
        setIsFav(fav)
      }
      setLoading(false)
    }
    loadRecipe()

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [id])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-sage border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

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

  const handleAddToCart = useCallback(async () => {
    const items = recipe.ingredients.map((ing) => ({
      name: ing.name,
      category: autoCategorize(ing.name),
      checked: false,
      sourceRecipe: recipe.name,
    }))
    await addShoppingItems(items)
    setAddedToCart(true)
    setCartFeedback(`已加入 ${items.length} 项食材`)
    setTimeout(() => {
      setAddedToCart(false)
      setCartFeedback('')
    }, 2000)
  }, [recipe])

  const handleRecordSuccess = useCallback(() => {
    setRecordFeedback('已记录到饮食日记')
    setTimeout(() => setRecordFeedback(''), 2000)
  }, [])

  const handleToggleFavorite = useCallback(async () => {
    if (!recipe) return
    const next = await toggleFavorite(recipe.id)
    setIsFav(next)
    toast.success(next ? '已收藏' : '已取消收藏')
  }, [recipe, toast])

  const seasonGradient = getSeasonGradient(recipe.bestSeason)
  const seasonIcon = getSeasonIcon(recipe.bestSeason)
  const outOfSeason = isOutOfSeason(recipe.bestSeason)

  return (
    <>
      <AnimatePresence>
        {cookingMode && (
          <CookingMode recipe={recipe} onClose={() => setCookingMode(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRecordModal && (
          <RecordModal recipe={recipe} onClose={() => {
            setShowRecordModal(false)
            handleRecordSuccess()
          }} />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
      >
        {/* Feedback Toasts */}
        <AnimatePresence>
          {cartFeedback && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-4 left-0 right-0 z-40 flex justify-center pointer-events-none"
            >
              <div className="bg-sage text-white px-4 py-2 rounded-2xl text-sm font-medium shadow-lg">
                {cartFeedback}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {recordFeedback && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-4 left-0 right-0 z-40 flex justify-center pointer-events-none"
            >
              <div className="bg-honey text-charcoal px-4 py-2 rounded-2xl text-sm font-medium shadow-lg">
                {recordFeedback}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hero */}
        <div className="relative">
          {recipe.coverImage ? (
            <div className="h-60 relative overflow-hidden">
              <img
                src={recipe.coverImage}
                alt={recipe.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal/40 to-transparent" />
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="absolute bottom-4 left-6"
              >
                <span className="text-3xl opacity-80">{seasonIcon}</span>
              </motion.div>
            </div>
          ) : (
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
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="absolute bottom-4 left-6"
              >
                <span className="text-3xl opacity-60">{seasonIcon}</span>
              </motion.div>
            </div>
          )}

          <button
            onClick={() => navigate(-1)}
            className="absolute top-4 left-4 w-10 h-10 bg-paper/85 backdrop-blur-md rounded-full flex items-center justify-center card-shadow press-scale"
          >
            <ArrowLeft size={18} className="text-charcoal" />
          </button>

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
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="default" className="text-[10px]">{recipe.cuisine}</Badge>
                <Badge variant="blossom" className="text-[10px]">{recipe.flavor}</Badge>
                <Badge variant="sky" className="text-[10px]">{recipe.difficulty === 'easy' ? '简单' : recipe.difficulty === 'medium' ? '中等' : '困难'}</Badge>
              </div>
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={handleToggleFavorite}
                className="w-9 h-9 rounded-full flex items-center justify-center bg-cream-dark/30 hover:bg-blossom/15 transition-colors"
              >
                <Heart
                  size={18}
                  className={cn(
                    'transition-colors',
                    isFav ? 'fill-blossom text-blossom' : 'text-stone'
                  )}
                />
              </motion.button>
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

          {/* Out of Season Warning */}
          {outOfSeason && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-4 bg-honey/12 border border-honey/20 rounded-2xl p-3.5 flex gap-3"
            >
              <AlertCircle size={16} className="text-honey-dark flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] font-bold text-earth-dark mb-0.5">过季提示</p>
                <p className="text-xs text-stone leading-relaxed">
                  当前是{getCurrentXun()}，这道菜的最佳赏味期为 {recipe.bestSeason.join('、')}。食材可能不是最应季的状态。
                </p>
              </div>
            </motion.div>
          )}

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
                onClick={() => isOnline && setMode('video')}
                disabled={!isOnline}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                  mode === 'video' ? 'bg-paper card-shadow text-charcoal' : 'text-stone hover:text-charcoal',
                  !isOnline && 'opacity-40 cursor-not-allowed'
                )}
                title={!isOnline ? '离线模式，视频暂不可用' : undefined}
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
              <VideoPlayer recipe={recipe} />
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="flex flex-col gap-2 mt-6"
          >
            <div className="flex gap-3">
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
              <Button variant="honey" className="flex-1 h-11 rounded-2xl text-sm" onClick={() => setCookingMode(true)}>
                <ChefHat size={15} className="mr-1.5" />
                烹饪模式
              </Button>
            </div>
            <Button
              variant="outline"
              className="w-full h-11 rounded-2xl text-sm border-sage/30 text-sage-dark hover:bg-sage/8"
              onClick={() => setShowRecordModal(true)}
            >
              <BookMarked size={15} className="mr-1.5" />
              记录到饮食日记
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </>
  )
}
