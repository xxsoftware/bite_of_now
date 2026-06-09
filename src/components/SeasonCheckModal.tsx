import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Check, MapPin, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getCurrentXun, cn } from '@/lib/utils'
import type { RegionConfig } from '@/types'

const regions = [
  { value: 'cn', label: '中国', flag: '🇨🇳' },
  { value: 'au', label: '澳大利亚', flag: '🇦🇺' },
  { value: 'us', label: '美国', flag: '🇺🇸' },
  { value: 'jp', label: '日本', flag: '🇯🇵' },
  { value: 'kr', label: '韩国', flag: '🇰🇷' },
  { value: 'sg', label: '新加坡', flag: '🇸🇬' },
]

const monthOptions = [
  '1月', '2月', '3月', '4月', '5月', '6月',
  '7月', '8月', '9月', '10月', '11月', '12月',
]
const xunParts = ['上旬', '中旬', '下旬']

interface SeasonCheckModalProps {
  isOpen: boolean
  onClose: (config?: RegionConfig) => void
  initialConfig?: RegionConfig
  isFirstTime?: boolean
  daysDiff?: number
}

export default function SeasonCheckModal({
  isOpen,
  onClose,
  initialConfig,
  isFirstTime = false,
  daysDiff = 0,
}: SeasonCheckModalProps) {
  const currentXun = getCurrentXun()
  const currentMonth = currentXun.match(/(\d+)月/)?.[1] || '1'
  const currentPart = currentXun.match(/(上|中|下)旬/)?.[0] || '上旬'

  const [region, setRegion] = useState(initialConfig?.region || 'cn')
  const [selectedMonth, setSelectedMonth] = useState(`${currentMonth}月`)
  const [selectedXun, setSelectedXun] = useState(currentPart)
  const [_step, setStep] = useState<'region' | 'confirm'>('region')

  const manualXun = `${selectedMonth}${selectedXun}`

  const handleConfirm = () => {
    const now = new Date()
    const config: RegionConfig = {
      region,
      lastVerifiedDate: now.toISOString().split('T')[0],
      lastSystemTime: now.getTime(),
    }
    onClose(config)
  }

  const handleSkip = () => {
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={handleSkip}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-paper rounded-3xl p-5 max-w-sm w-full card-shadow"
            onClick={(e) => e.stopPropagation()}
          >
            {step === 'region' && (
              <>
                <div className="w-12 h-12 bg-honey/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  {isFirstTime ? (
                    <MapPin size={24} className="text-earth-dark" />
                  ) : (
                    <AlertTriangle size={24} className="text-honey-dark" />
                  )}
                </div>

                <h3 className="font-display text-lg text-charcoal text-center mb-1">
                  {isFirstTime ? '选择你的地区' : '时令校验'}
                </h3>

                {!isFirstTime && daysDiff > 7 && (
                  <p className="text-xs text-blossom-dark text-center mb-3 bg-blossom/8 rounded-xl px-3 py-2">
                    检测到系统时间发生较大变化（约 {Math.round(daysDiff)} 天）
                  </p>
                )}

                <p className="text-xs text-stone text-center mb-4">
                  {isFirstTime
                    ? '地区用于确定当地的时令食材和推荐'
                    : '请确认你所在的地区和当前时令'}
                </p>

                {/* Region Selection */}
                <div className="mb-4">
                  <label className="text-[10px] font-bold text-stone uppercase tracking-wider mb-2 block">
                    所在地区
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {regions.map((r) => (
                      <button
                        key={r.value}
                        onClick={() => setRegion(r.value)}
                        className={`flex items-center justify-center gap-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                          region === r.value
                            ? 'bg-charcoal text-paper'
                            : 'bg-cream-dark/30 text-stone hover:bg-cream-dark/50'
                        }`}
                      >
                        <span>{r.flag}</span>
                        <span className="text-xs">{r.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Manual Xun Calibration */}
                <div className="mb-5">
                  <label className="text-[10px] font-bold text-stone uppercase tracking-wider mb-2 block flex items-center gap-1">
                    <Calendar size={10} />
                    当前时令校准
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="flex-1 h-11 px-3 bg-cream-dark/30 rounded-xl border-2 border-transparent focus:border-sage/40 outline-none text-sm"
                    >
                      {monthOptions.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <div className="flex gap-1">
                      {xunParts.map((part) => (
                        <button
                          key={part}
                          onClick={() => setSelectedXun(part)}
                          className={cn(
                            'h-11 px-3 rounded-xl text-sm font-medium transition-all',
                            selectedXun === part
                              ? 'bg-charcoal text-paper'
                              : 'bg-cream-dark/30 text-stone hover:bg-cream-dark/50'
                          )}
                        >
                          {part}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-[10px] text-stone/60 mt-1.5">
                    系统检测：{getCurrentXun()}，当前选择：{manualXun}
                  </p>
                </div>

                <div className="flex gap-2">
                  {!isFirstTime && (
                    <Button
                      variant="outline"
                      className="flex-1 h-11 rounded-2xl"
                      onClick={handleSkip}
                    >
                      跳过
                    </Button>
                  )}
                  <Button
                    className="flex-1 h-11 rounded-2xl bg-charcoal text-paper"
                    onClick={handleConfirm}
                  >
                    <Check size={14} className="mr-1.5" />
                    确认
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
