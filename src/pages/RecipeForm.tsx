import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Plus, Trash2, ChefHat, Clock, Flame, GripVertical,
  Save, X, Video, AlertCircle, Leaf, ImageIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn, getCurrentXun } from '@/lib/utils'
import { getRecipes, saveRecipe } from '@/lib/db'
import { cuisineOptions, flavorOptions } from '@/data/mock'
import { parseVideoUrl, getPlatformLabel } from '@/lib/videoParser'
import type { Recipe, Ingredient, Step } from '@/types'

const fadeInUp = {
  hidden: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { type: 'spring' as const, bounce: 0.15, duration: 0.45 } },
}

const difficultyOptions = [
  { value: 'easy', label: '简单' },
  { value: 'medium', label: '中等' },
  { value: 'hard', label: '困难' },
] as const

const xunGroups = [
  { label: '春', months: ['3月', '4月', '5月'] },
  { label: '夏', months: ['6月', '7月', '8月'] },
  { label: '秋', months: ['9月', '10月', '11月'] },
  { label: '冬', months: ['12月', '1月', '2月'] },
]

export default function RecipeForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [existing, setExisting] = useState<Recipe | undefined>(undefined)
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState('')
  const [cuisine, setCuisine] = useState('家常菜')
  const [flavor, setFlavor] = useState('鲜香')
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy')
  const [time, setTime] = useState('30')
  const [calories, setCalories] = useState('300')
  const [bestSeason, setBestSeason] = useState<string[]>([getCurrentXun()])
  const [ingredients, setIngredients] = useState<Ingredient[]>([{ name: '', amount: '' }])
  const [steps, setSteps] = useState<Step[]>([{ order: 1, description: '' }])
  const [tips, setTips] = useState('')
  const [video, setVideo] = useState('')
  const [videoInfo, setVideoInfo] = useState<import('@/types').VideoInfo | null>(null)
  const [coverImage, setCoverImage] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  // Load recipe data on mount
  useEffect(() => {
    async function loadRecipe() {
      if (id) {
        const recipes = await getRecipes()
        const found = recipes.find((r) => r.id === id)
        if (found) {
          setExisting(found)
          setName(found.name || '')
          setCuisine(found.cuisine || '家常菜')
          setFlavor(found.flavor || '鲜香')
          setDifficulty(found.difficulty || 'easy')
          setTime(found.time?.toString() || '30')
          setCalories(found.calories?.toString() || '300')
          setBestSeason(found.bestSeason || [getCurrentXun()])
          setIngredients(found.ingredients?.length ? found.ingredients : [{ name: '', amount: '' }])
          setSteps(found.steps?.length ? found.steps : [{ order: 1, description: '' }])
          setTips(found.tips || '')
          setVideo(found.video || '')
        if (found.video && typeof found.video === 'object' && found.video.platform) {
          setVideoInfo(found.video as import('@/types').VideoInfo)
        } else if (found.video) {
          // Try to parse old string format
          const parsed = parseVideoUrl(found.video)
          setVideoInfo(parsed)
        }
          setCoverImage(found.coverImage || '')
        }
      }
      setLoading(false)
    }
    loadRecipe()
  }, [id])

  const isEdit = !!existing

  const toggleSeason = useCallback((xun: string) => {
    setBestSeason((prev) => {
      if (prev.includes(xun)) return prev.filter((s) => s !== xun)
      return [...prev, xun]
    })
  }, [])

  const toggleYearRound = useCallback(() => {
    setBestSeason((prev) => {
      if (prev.includes('全年')) return prev.filter((s) => s !== '全年')
      return ['全年']
    })
  }, [])

  const addIngredient = useCallback(() => {
    setIngredients((prev) => [...prev, { name: '', amount: '' }])
  }, [])

  const updateIngredient = useCallback((index: number, field: keyof Ingredient, value: string) => {
    setIngredients((prev) =>
      prev.map((ing, i) => (i === index ? { ...ing, [field]: value } : ing))
    )
  }, [])

  const removeIngredient = useCallback((index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const addStep = useCallback(() => {
    setSteps((prev) => [...prev, { order: prev.length + 1, description: '' }])
  }, [])

  const updateStep = useCallback((index: number, value: string) => {
    setSteps((prev) =>
      prev.map((step, i) => (i === index ? { ...step, description: value } : step))
    )
  }, [])

  const removeStep = useCallback((index: number) => {
    setSteps((prev) => {
      const filtered = prev.filter((_, i) => i !== index)
      return filtered.map((step, i) => ({ ...step, order: i + 1 }))
    })
  }, [])

  const moveStep = useCallback((index: number, direction: 'up' | 'down') => {
    setSteps((prev) => {
      if (direction === 'up' && index === 0) return prev
      if (direction === 'down' && index === prev.length - 1) return prev
      const next = [...prev]
      const swapIndex = direction === 'up' ? index - 1 : index + 1
      ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
      return next.map((step, i) => ({ ...step, order: i + 1 }))
    })
  }, [])

  const handleVideoChange = useCallback((value: string) => {
    setVideo(value)
    if (value.trim()) {
      const parsed = parseVideoUrl(value.trim())
      setVideoInfo(parsed)
    } else {
      setVideoInfo(null)
    }
  }, [])

  const handleCoverImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setError('图片大小不能超过 2MB')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      setCoverImage((ev.target?.result as string) || '')
      setError('')
    }
    reader.readAsDataURL(file)
  }, [])

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      setError('请输入菜名')
      return
    }
    const validIngredients = ingredients.filter((ing) => ing.name.trim() && ing.amount.trim())
    if (validIngredients.length === 0) {
      setError('请至少添加一种食材')
      return
    }
    const validSteps = steps.filter((step) => step.description.trim())
    if (validSteps.length === 0) {
      setError('请至少添加一个步骤')
      return
    }
    if (bestSeason.length === 0) {
      setError('请至少选择一个时令')
      return
    }

    const recipe: Recipe = {
      id: existing?.id || `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
      cuisine,
      flavor,
      difficulty,
      time: parseInt(time) || 30,
      calories: parseInt(calories) || 300,
      bestSeason: bestSeason.includes('全年') ? ['全年'] : [...bestSeason],
      ingredients: validIngredients,
      steps: validSteps.map((s, i) => ({ ...s, order: i + 1 })),
      tips: tips.trim() || undefined,
      video: videoInfo || video.trim() || undefined,
      coverImage: coverImage.trim() || undefined,
    }

    await saveRecipe(recipe)
    setSaved(true)
    setError('')
    setTimeout(() => navigate('/explore'), 1200)
  }, [name, cuisine, flavor, difficulty, time, calories, bestSeason, ingredients, steps, tips, video, coverImage, existing, navigate])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-sage border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-cream grain gradient-mesh"
    >
      <div className="mx-auto max-w-md">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-5 safe-top pb-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 bg-paper/85 backdrop-blur-md rounded-full flex items-center justify-center card-shadow press-scale"
          >
            <ArrowLeft size={18} className="text-charcoal" />
          </button>
          <div className="flex-1">
            <h1 className="font-display text-[1.5rem] text-charcoal leading-tight">
              {isEdit ? '编辑食谱' : '添加食谱'}
            </h1>
          </div>
        </div>

        <div className="px-4 pb-8 space-y-5">
          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-blossom/10 border border-blossom/20 rounded-2xl p-3 flex gap-2 items-start"
              >
                <AlertCircle size={14} className="text-blossom-dark flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blossom-dark">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Saved */}
          <AnimatePresence>
            {saved && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-sage/10 border border-sage/20 rounded-2xl p-3 flex gap-2 items-center"
              >
                <Save size={14} className="text-sage-dark" />
                <p className="text-xs text-sage-dark font-medium">{isEdit ? '食谱已更新' : '食谱已保存'}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Basic Info */}
          <motion.div variants={fadeInUp} initial="hidden" animate="animate" className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 bg-sage/12 rounded-lg flex items-center justify-center">
                <ChefHat size={12} className="text-sage-dark" />
              </div>
              <h2 className="font-display text-base text-charcoal">基础信息</h2>
            </div>

            <div className="bg-paper rounded-2xl p-3.5 space-y-3 card-shadow">
              <div>
                <label className="text-[10px] font-bold text-stone uppercase tracking-wider mb-1 block">菜名 *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError('') }}
                  placeholder="例如：番茄炒蛋"
                  className="w-full h-11 px-3.5 bg-cream-dark/30 rounded-xl border-2 border-transparent focus:border-sage/40 outline-none text-sm transition-colors"
                />
              </div>

              {/* Cover Image */}
              <div>
                <label className="text-[10px] font-bold text-stone uppercase tracking-wider mb-1 block">封面图</label>
                {coverImage ? (
                  <div className="relative rounded-xl overflow-hidden">
                    <img src={coverImage} alt="封面" className="w-full h-32 object-cover" />
                    <button
                      onClick={() => setCoverImage('')}
                      className="absolute top-2 right-2 w-7 h-7 bg-charcoal/60 rounded-lg flex items-center justify-center text-white"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-24 bg-cream-dark/30 rounded-xl border-2 border-dashed border-stone/20 cursor-pointer hover:border-sage/40 transition-colors">
                    <ImageIcon size={20} className="text-stone/40 mb-1" />
                    <span className="text-[11px] text-stone/60">点击上传封面图</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleCoverImageSelect}
                    />
                  </label>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-stone uppercase tracking-wider mb-1 block">菜系</label>
                  <select
                    value={cuisine}
                    onChange={(e) => setCuisine(e.target.value)}
                    className="w-full h-11 px-3 bg-cream-dark/30 rounded-xl border-2 border-transparent focus:border-sage/40 outline-none text-sm"
                  >
                    {cuisineOptions.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-stone uppercase tracking-wider mb-1 block">味型</label>
                  <select
                    value={flavor}
                    onChange={(e) => setFlavor(e.target.value)}
                    className="w-full h-11 px-3 bg-cream-dark/30 rounded-xl border-2 border-transparent focus:border-sage/40 outline-none text-sm"
                  >
                    {flavorOptions.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-stone uppercase tracking-wider mb-1 block">难度</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                    className="w-full h-11 px-3 bg-cream-dark/30 rounded-xl border-2 border-transparent focus:border-sage/40 outline-none text-sm"
                  >
                    {difficultyOptions.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-stone uppercase tracking-wider mb-1 block">耗时(分)</label>
                  <input
                    type="number"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    min={1}
                    className="w-full h-11 px-3 bg-cream-dark/30 rounded-xl border-2 border-transparent focus:border-sage/40 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-stone uppercase tracking-wider mb-1 block">卡路里</label>
                  <input
                    type="number"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    min={1}
                    className="w-full h-11 px-3 bg-cream-dark/30 rounded-xl border-2 border-transparent focus:border-sage/40 outline-none text-sm"
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Best Season */}
          <motion.div variants={fadeInUp} initial="hidden" animate="animate" transition={{ delay: 0.05 }} className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 bg-honey/12 rounded-lg flex items-center justify-center">
                <Leaf size={12} className="text-earth-dark" />
              </div>
              <h2 className="font-display text-base text-charcoal">最佳赏味期 *</h2>
            </div>

            <div className="bg-paper rounded-2xl p-3.5 card-shadow">
              <button
                onClick={toggleYearRound}
                className={cn(
                  'mb-3 px-3 py-1.5 rounded-xl text-xs font-medium transition-all',
                  bestSeason.includes('全年') ? 'bg-charcoal text-paper' : 'bg-cream-dark/30 text-stone'
                )}
              >
                全年
              </button>

              {!bestSeason.includes('全年') && (
                <div className="space-y-2">
                  {xunGroups.map((group) => (
                    <div key={group.label} className="flex items-center gap-2">
                      <span className="font-display text-xs text-stone w-4">{group.label}</span>
                      <div className="flex flex-wrap gap-1">
                        {group.months.map((month) =>
                          ['上旬', '中旬', '下旬'].map((xun) => {
                            const fullXun = `${month}${xun}`
                            const isSelected = bestSeason.includes(fullXun)
                            return (
                              <button
                                key={fullXun}
                                onClick={() => toggleSeason(fullXun)}
                                className={cn(
                                  'px-1.5 py-0.5 rounded-md text-[10px] font-medium transition-all',
                                  isSelected
                                    ? 'bg-charcoal text-paper'
                                    : 'bg-cream-dark/30 text-stone hover:bg-cream-dark/50'
                                )}
                              >
                                {fullXun}
                              </button>
                            )
                          })
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Ingredients */}
          <motion.div variants={fadeInUp} initial="hidden" animate="animate" transition={{ delay: 0.1 }} className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blossom/10 rounded-lg flex items-center justify-center">
                  <Flame size={12} className="text-blossom-dark" />
                </div>
                <h2 className="font-display text-base text-charcoal">食材清单 *</h2>
              </div>
              <Button variant="outline" size="sm" className="h-8 rounded-xl text-xs" onClick={addIngredient}>
                <Plus size={12} className="mr-1" />添加
              </Button>
            </div>

            <div className="bg-paper rounded-2xl p-3.5 space-y-2 card-shadow">
              {ingredients.map((ing, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    value={ing.name}
                    onChange={(e) => updateIngredient(idx, 'name', e.target.value)}
                    placeholder="食材名"
                    className="flex-1 h-10 px-3 bg-cream-dark/30 rounded-xl border-2 border-transparent focus:border-sage/40 outline-none text-sm"
                  />
                  <input
                    type="text"
                    value={ing.amount}
                    onChange={(e) => updateIngredient(idx, 'amount', e.target.value)}
                    placeholder="用量"
                    className="w-24 h-10 px-3 bg-cream-dark/30 rounded-xl border-2 border-transparent focus:border-sage/40 outline-none text-sm"
                  />
                  <button
                    onClick={() => removeIngredient(idx)}
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-stone/40 hover:text-blossom-dark hover:bg-blossom/8 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Steps */}
          <motion.div variants={fadeInUp} initial="hidden" animate="animate" transition={{ delay: 0.15 }} className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-sky/10 rounded-lg flex items-center justify-center">
                  <Clock size={12} className="text-sky-dark" />
                </div>
                <h2 className="font-display text-base text-charcoal">烹饪步骤 *</h2>
              </div>
              <Button variant="outline" size="sm" className="h-8 rounded-xl text-xs" onClick={addStep}>
                <Plus size={12} className="mr-1" />添加
              </Button>
            </div>

            <div className="bg-paper rounded-2xl p-3.5 space-y-2 card-shadow">
              {steps.map((step, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <div className="flex flex-col gap-0.5 pt-1">
                    <button
                      onClick={() => moveStep(idx, 'up')}
                      disabled={idx === 0}
                      className="w-6 h-5 flex items-center justify-center text-stone/30 hover:text-stone disabled:opacity-20"
                    >
                      <GripVertical size={12} />
                    </button>
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-cream-dark/40 flex items-center justify-center flex-shrink-0 mt-1.5">
                    <span className="text-xs font-bold text-stone">{step.order}</span>
                  </div>
                  <textarea
                    value={step.description}
                    onChange={(e) => updateStep(idx, e.target.value)}
                    placeholder={`步骤 ${step.order} 的描述...`}
                    rows={2}
                    className="flex-1 px-3 py-2 bg-cream-dark/30 rounded-xl border-2 border-transparent focus:border-sage/40 outline-none text-sm resize-none"
                  />
                  <button
                    onClick={() => removeStep(idx)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-stone/40 hover:text-blossom-dark hover:bg-blossom/8 transition-all mt-1"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Extra Info */}
          <motion.div variants={fadeInUp} initial="hidden" animate="animate" transition={{ delay: 0.2 }} className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 bg-honey/10 rounded-lg flex items-center justify-center">
                <Video size={12} className="text-earth-dark" />
              </div>
              <h2 className="font-display text-base text-charcoal">其他信息</h2>
            </div>

            <div className="bg-paper rounded-2xl p-3.5 space-y-3 card-shadow">
              <div>
                <label className="text-[10px] font-bold text-stone uppercase tracking-wider mb-1 block">小贴士（可选）</label>
                <textarea
                  value={tips}
                  onChange={(e) => setTips(e.target.value)}
                  placeholder="分享一些烹饪小窍门..."
                  rows={2}
                  className="w-full px-3 py-2 bg-cream-dark/30 rounded-xl border-2 border-transparent focus:border-sage/40 outline-none text-sm resize-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-stone uppercase tracking-wider mb-1 block">视频链接（支持 B站 / 抖音 / YouTube）</label>
                <input
                  type="text"
                  value={video}
                  onChange={(e) => handleVideoChange(e.target.value)}
                  placeholder="粘贴视频链接..."
                  className="w-full h-11 px-3 bg-cream-dark/30 rounded-xl border-2 border-transparent focus:border-sage/40 outline-none text-sm"
                />
                {videoInfo && videoInfo.platform !== 'local' && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-1.5 flex items-center gap-1.5"
                  >
                    <span className={cn(
                      'text-[10px] font-medium px-2 py-0.5 rounded-full',
                      videoInfo.platform === 'youtube' && 'bg-blossom/15 text-blossom-dark',
                      videoInfo.platform === 'bilibili' && 'bg-sky/15 text-sky-dark',
                      videoInfo.platform === 'douyin' && 'bg-charcoal/10 text-charcoal',
                    )}>
                      {getPlatformLabel(videoInfo.platform)} · {videoInfo.videoId}
                    </span>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Save Button */}
          <motion.div variants={fadeInUp} initial="hidden" animate="animate" transition={{ delay: 0.25 }}>
            <Button
              className="w-full h-12 rounded-2xl text-base bg-charcoal text-paper"
              onClick={handleSave}
              disabled={saved}
            >
              <Save size={16} className="mr-2" />
              {saved ? '已保存' : isEdit ? '保存修改' : '添加食谱'}
            </Button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}
