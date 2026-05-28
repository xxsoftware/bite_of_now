import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sunrise, Sun, Sunset, Moon, Smile, Frown, CalendarDays, TrendingUp, Trash2, Plus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { getDietRecords, deleteDietRecord } from '@/lib/db'
import type { DietRecord } from '@/types'

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
}

const fadeInUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, bounce: 0.2, duration: 0.5 } },
}

const mealConfig = {
  breakfast: { icon: Sunrise, label: '早餐', bg: 'bg-honey/15', iconColor: 'text-honey-dark' },
  lunch: { icon: Sun, label: '午餐', bg: 'bg-blossom/12', iconColor: 'text-blossom-dark' },
  dinner: { icon: Sunset, label: '晚餐', bg: 'bg-sage/12', iconColor: 'text-sage-dark' },
  snack: { icon: Moon, label: '加餐', bg: 'bg-sky/10', iconColor: 'text-sky-dark' },
}

const fullnessConfig = {
  hungry: { icon: Frown, label: '没吃饱', color: 'text-blossom-dark' },
  comfortable: { icon: Smile, label: '刚刚好', color: 'text-sage-dark' },
  full: { icon: Smile, label: '好满足', color: 'text-honey-dark' },
}

function RecordCard({ record, index, onDelete }: { record: DietRecord; index: number; onDelete: (id: string) => void }) {
  const meal = mealConfig[record.mealType]
  const MealIcon = meal.icon
  const full = fullnessConfig[record.fullness]
  const FullIcon = full.icon
  const isOdd = index % 2 === 1

  return (
    <motion.div
      variants={fadeInUp}
      className={cn(isOdd && 'ml-5')}
    >
      <Card className="overflow-hidden border-0">
        <CardContent className="p-3.5">
          <div className="flex items-start gap-3">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', meal.bg)}>
              <MealIcon size={16} className={meal.iconColor} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="font-display text-sm text-charcoal truncate">{record.recipe.name}</h3>
                <Badge variant="outline" className="text-[9px] shrink-0 border-stone/15">
                  {meal.label}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-stone">
                <span className="flex items-center gap-1">
                  <FullIcon size={11} className={full.color} />
                  {full.label}
                </span>
                <span className="w-0.5 h-0.5 rounded-full bg-stone/30" />
                <span>{record.mood}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1.5">
                <Badge variant="default" className="text-[9px]">{record.recipe.cuisine}</Badge>
                <Badge variant="sky" className="text-[9px]">{record.recipe.flavor}</Badge>
              </div>
            </div>
            <button
              onClick={() => onDelete(record.id)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-stone/30 hover:text-blossom-dark hover:bg-blossom/8 transition-all shrink-0"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function CalendarPicker({
  year,
  month,
  onSelect,
  onClose,
  markedDates,
}: {
  year: number
  month: number
  onSelect: (date: string) => void
  onClose: () => void
  markedDates: Set<string>
}) {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = new Date(year, month, 1).getDay()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-paper rounded-3xl p-5 max-w-sm w-full card-shadow"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg text-charcoal">
            {year}年{month + 1}月
          </h3>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((d) => (
            <div key={d} className="text-center text-[10px] text-stone font-medium py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }, (_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {days.map((day) => {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const hasRecords = markedDates.has(dateStr)
            const isToday = dateStr === new Date().toISOString().split('T')[0]
            return (
              <motion.button
                key={day}
                whileTap={{ scale: 0.9 }}
                onClick={() => { onSelect(dateStr); onClose() }}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-medium transition-all ${
                  isToday
                    ? 'bg-charcoal text-paper'
                    : hasRecords
                      ? 'bg-sage/15 text-sage-dark'
                      : 'text-charcoal hover:bg-cream-dark/40'
                }`}
              >
                {day}
                {hasRecords && !isToday && <div className="w-1 h-1 rounded-full bg-sage mt-0.5" />}
              </motion.button>
            )
          })}
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function DietRecords() {
  const [selectedDate, setSelectedDate] = useState(0)
  const [records, setRecords] = useState<DietRecord[]>([])
  const [showAddHint, setShowAddHint] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)

  useEffect(() => {
    async function loadRecords() {
      const data = await getDietRecords()
      setRecords(data)
    }
    loadRecords()
  }, [])

  const groupedRecords = useMemo(() => {
    return records.reduce((acc, record) => {
      if (!acc[record.date]) acc[record.date] = []
      acc[record.date].push(record)
      return acc
    }, {} as Record<string, DietRecord[]>)
  }, [records])

  const dates = useMemo(() => Object.keys(groupedRecords).sort().reverse(), [groupedRecords])
  const currentDate = dates[selectedDate] || dates[0]
  const currentRecords = groupedRecords[currentDate] || []
  const markedDates = useMemo(() => new Set(dates), [dates])

  const stats = useMemo(() => {
    const uniqueCuisines = new Set(records.map((r) => r.recipe.cuisine)).size
    const avgMood = records.filter((r) => r.mood === '满足' || r.mood === '幸福').length
    return { uniqueCuisines, avgMood }
  }, [records])

  const handleDelete = async (id: string) => {
    await deleteDietRecord(id)
    const updated = await getDietRecords()
    setRecords(updated)
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={staggerContainer}
      className="px-4 pt-5 safe-top pb-4"
    >
      <motion.div variants={fadeInUp} className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-[1.75rem] text-charcoal leading-tight">饮食日记</h1>
            <p className="text-stone text-xs mt-0.5">记录每一餐的美好时光</p>
          </div>
          <button
            onClick={() => setShowAddHint(true)}
            className="w-10 h-10 bg-sage/12 rounded-[0.875rem] flex items-center justify-center card-shadow press-scale"
          >
            <Plus size={18} className="text-sage-dark" />
          </button>
        </div>
      </motion.div>

      {/* Add Hint */}
      <AnimatePresence>
        {showAddHint && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 overflow-hidden"
          >
            <div className="bg-sage/8 border border-sage/20 rounded-2xl p-3.5">
              <p className="text-xs text-charcoal font-medium mb-1">如何添加记录</p>
              <p className="text-[11px] text-stone leading-relaxed">
                前往「首页」，点击推荐菜品的「我吃了」按钮，即可自动记录到饮食日记中。
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Date Strip */}
      <motion.div variants={fadeInUp} className="mb-4 -mx-4 px-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {dates.map((date, idx) => {
            const isSelected = idx === selectedDate
            const d = new Date(date)
            const dayLabel = d.toLocaleDateString('zh-CN', { weekday: 'short' })
            const dayNum = d.getDate()

            return (
              <motion.button
                key={date}
                whileTap={{ scale: 0.92 }}
                onClick={() => setSelectedDate(idx)}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-3.5 py-2 rounded-2xl transition-all flex-shrink-0 min-w-[3.5rem]',
                  isSelected ? 'bg-charcoal text-paper' : 'bg-paper text-stone card-shadow'
                )}
              >
                <span className="text-[10px] font-medium opacity-80">{dayLabel}</span>
                <span className={cn('font-display text-lg', isSelected && 'text-paper')}>{dayNum}</span>
              </motion.button>
            )
          })}
          <button
            onClick={() => setShowCalendar(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl bg-paper text-stone card-shadow flex-shrink-0 min-w-[3rem]"
          >
            <CalendarDays size={14} />
            <span className="text-[10px]">更多</span>
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={fadeInUp} className="mb-4">
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-paper rounded-2xl p-3 text-center card-shadow">
            <div className="flex items-center justify-center gap-1 mb-1">
              <CalendarDays size={12} className="text-sage-dark" />
              <p className="font-display text-xl text-sage-dark leading-none">{dates.length}</p>
            </div>
            <p className="text-[10px] text-stone font-medium">记录天数</p>
          </div>
          <div className="bg-paper rounded-2xl p-3 text-center card-shadow">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp size={12} className="text-blossom-dark" />
              <p className="font-display text-xl text-blossom-dark leading-none">{records.length}</p>
            </div>
            <p className="text-[10px] text-stone font-medium">总餐数</p>
          </div>
          <div className="bg-paper rounded-2xl p-3 text-center card-shadow">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Smile size={12} className="text-honey-dark" />
              <p className="font-display text-xl text-honey-dark leading-none">{stats.uniqueCuisines}</p>
            </div>
            <p className="text-[10px] text-stone font-medium">菜系数</p>
          </div>
        </div>
      </motion.div>

      {/* Current Date Records */}
      {currentDate && (
        <div>
          <motion.div variants={fadeInUp} className="flex items-center gap-2 mb-2.5">
            <div className="w-1.5 h-1.5 rounded-full bg-sage" />
            <h2 className="font-display text-base text-charcoal">
              {new Date(currentDate).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}
            </h2>
            <span className="text-[11px] text-stone">
              {new Date(currentDate).toLocaleDateString('zh-CN', { weekday: 'long' })}
            </span>
          </motion.div>
          <div className="space-y-2.5 relative">
            <div className="absolute left-[1.125rem] top-3 bottom-3 w-px bg-gradient-to-b from-sage/15 via-blossom/10 to-transparent" />
            {currentRecords.map((record, idx) => (
              <RecordCard key={record.id} record={record} index={idx} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}

      {/* Calendar Picker Modal */}
      <AnimatePresence>
        {showCalendar && (
          <CalendarPicker
            year={new Date().getFullYear()}
            month={new Date().getMonth()}
            markedDates={markedDates}
            onSelect={(dateStr) => {
              const idx = dates.indexOf(dateStr)
              if (idx >= 0) setSelectedDate(idx)
            }}
            onClose={() => setShowCalendar(false)}
          />
        )}
      </AnimatePresence>

      {currentRecords.length === 0 && (
        <motion.div variants={fadeInUp} className="text-center py-12">
          <div className="w-14 h-14 bg-cream-dark/40 rounded-full flex items-center justify-center mx-auto mb-3">
            <Sun size={24} className="text-stone/40" />
          </div>
          <p className="text-stone text-sm">这一天还没有记录</p>
          <p className="text-stone/60 text-xs mt-1">从首页推荐中点击"我吃了"来记录饮食</p>
        </motion.div>
      )}
    </motion.div>
  )
}
