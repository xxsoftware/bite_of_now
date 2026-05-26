import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Key, Globe, Cpu, Zap, Eye, EyeOff, Trash2,
  Download, Upload, AlertTriangle, Heart, Target, Bolt,
  ChevronRight, Save, Sparkles, Lock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
}

const fadeInUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, bounce: 0.2, duration: 0.5 } },
}

const bodyGoals = [
  { value: 'lose', label: '减脂', icon: Target, color: 'bg-blossom/15 text-blossom-dark' },
  { value: 'maintain', label: '维持', icon: Heart, color: 'bg-sage/15 text-sage-dark' },
  { value: 'gain', label: '增肌', icon: Bolt, color: 'bg-honey/15 text-honey-dark' },
]

const tasteOptions = [
  { value: 'light', label: '清淡' },
  { value: 'heavy', label: '重口' },
  { value: 'spicy', label: '嗜辣' },
]

export default function Settings() {
  const [showKey, setShowKey] = useState(false)
  const [aiConfig, setAiConfig] = useState({
    apiKey: '',
    baseUrl: '',
    modelName: '',
  })
  const [testingConnection, setTestingConnection] = useState(false)
  const [testResult, setTestResult] = useState<'idle' | 'success' | 'error'>('idle')
  const [preferences, setPreferences] = useState({
    avoidIngredients: [] as string[],
    bodyGoal: 'maintain',
    tastePreference: 'light',
    spiceLevel: 3,
  })
  const [avoidInput, setAvoidInput] = useState('')

  const handleTestConnection = useCallback(() => {
    if (!aiConfig.apiKey) return
    setTestingConnection(true)
    setTestResult('idle')
    setTimeout(() => {
      setTestingConnection(false)
      setTestResult(Math.random() > 0.3 ? 'success' : 'error')
    }, 1500)
  }, [aiConfig.apiKey])

  const addAvoidIngredient = useCallback(() => {
    if (!avoidInput.trim()) return
    setPreferences((prev) => ({
      ...prev,
      avoidIngredients: [...prev.avoidIngredients, avoidInput.trim()],
    }))
    setAvoidInput('')
  }, [avoidInput])

  const removeAvoidIngredient = useCallback((idx: number) => {
    setPreferences((prev) => ({
      ...prev,
      avoidIngredients: prev.avoidIngredients.filter((_, i) => i !== idx),
    }))
  }, [])

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={staggerContainer}
      className="px-4 pt-5 safe-top pb-8"
    >
      <motion.div variants={fadeInUp} className="mb-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-[1.75rem] text-charcoal leading-tight">设置</h1>
            <p className="text-stone text-xs mt-0.5">个性化你的饮食推荐</p>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-sky/15 to-honey/15 rounded-[1.125rem] flex items-center justify-center card-shadow">
            <Sparkles size={22} className="text-sky-dark" />
          </div>
        </div>
      </motion.div>

      {/* AI Configuration */}
      <motion.div variants={fadeInUp} className="mb-5">
        <div className="flex items-center gap-2 mb-2.5">
          <div className="w-7 h-7 bg-sage/12 rounded-xl flex items-center justify-center">
            <Cpu size={14} className="text-sage-dark" />
          </div>
          <h2 className="font-display text-base text-charcoal">AI 模型配置</h2>
        </div>

        <Card className="border-0">
          <CardContent className="p-3.5 space-y-3.5">
            <div>
              <label className="text-[10px] font-bold text-stone uppercase tracking-wider mb-1 block">
                API Key
              </label>
              <div className="relative">
                <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone/50" />
                <input
                  type={showKey ? 'text' : 'password'}
                  placeholder="输入你的大模型 API Key"
                  value={aiConfig.apiKey}
                  onChange={(e) => setAiConfig((prev) => ({ ...prev, apiKey: e.target.value }))}
                  className="w-full h-11 pl-9 pr-10 bg-cream-dark/30 rounded-2xl border-2 border-transparent focus:border-sage/40 outline-none text-sm transition-colors"
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone/50 hover:text-stone transition-colors"
                >
                  {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <div className="flex items-center gap-1 mt-1">
                <Lock size={9} className="text-stone/40" />
                <p className="text-[10px] text-stone/60">密钥将加密存储于本地，不会上传至任何服务器</p>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-stone uppercase tracking-wider mb-1 block">
                Base URL (可选)
              </label>
              <div className="relative">
                <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone/50" />
                <input
                  type="text"
                  placeholder="https://api.example.com/v1"
                  value={aiConfig.baseUrl}
                  onChange={(e) => setAiConfig((prev) => ({ ...prev, baseUrl: e.target.value }))}
                  className="w-full h-11 pl-9 pr-4 bg-cream-dark/30 rounded-2xl border-2 border-transparent focus:border-sage/40 outline-none text-sm transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-stone uppercase tracking-wider mb-1 block">
                Model Name (可选)
              </label>
              <div className="relative">
                <Cpu size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone/50" />
                <input
                  type="text"
                  placeholder="例如: gpt-4, qwen-turbo"
                  value={aiConfig.modelName}
                  onChange={(e) => setAiConfig((prev) => ({ ...prev, modelName: e.target.value }))}
                  className="w-full h-11 pl-9 pr-4 bg-cream-dark/30 rounded-2xl border-2 border-transparent focus:border-sage/40 outline-none text-sm transition-colors"
                />
              </div>
            </div>

            <Button
              variant="outline"
              className={cn(
                'w-full h-10 rounded-2xl text-sm',
                testResult === 'success' && 'border-sage text-sage-dark bg-sage/8',
                testResult === 'error' && 'border-blossom text-blossom-dark bg-blossom/8'
              )}
              onClick={handleTestConnection}
              disabled={testingConnection || !aiConfig.apiKey}
            >
              <Zap size={14} className="mr-1.5" />
              {testingConnection
                ? '测试中...'
                : testResult === 'success'
                  ? '连接成功'
                  : testResult === 'error'
                    ? '连接失败'
                    : '测试连接'}
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Preferences */}
      <motion.div variants={fadeInUp} className="mb-5">
        <div className="flex items-center gap-2 mb-2.5">
          <div className="w-7 h-7 bg-blossom/12 rounded-xl flex items-center justify-center">
            <Heart size={14} className="text-blossom-dark" />
          </div>
          <h2 className="font-display text-base text-charcoal">偏好设置</h2>
        </div>

        <Card className="border-0">
          <CardContent className="p-3.5 space-y-4">
            <div>
              <label className="text-[10px] font-bold text-stone uppercase tracking-wider mb-1.5 block">
                忌口食材
              </label>
              <div className="flex gap-2 mb-1.5">
                <input
                  type="text"
                  placeholder="添加忌口食材..."
                  value={avoidInput}
                  onChange={(e) => setAvoidInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addAvoidIngredient()}
                  className="flex-1 h-10 px-3.5 bg-cream-dark/30 rounded-xl border-2 border-transparent focus:border-sage/40 outline-none text-sm transition-colors"
                />
                <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl shrink-0" onClick={addAvoidIngredient}>
                  <ChevronRight size={16} />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {preferences.avoidIngredients.map((ing, idx) => (
                  <motion.button
                    key={ing}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    onClick={() => removeAvoidIngredient(idx)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-blossom/10 text-blossom-dark rounded-full text-[11px] font-medium"
                  >
                    {ing}
                    <span className="text-blossom-dark/50 text-[10px]">×</span>
                  </motion.button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-stone uppercase tracking-wider mb-1.5 block">
                身体目标
              </label>
              <div className="grid grid-cols-3 gap-2">
                {bodyGoals.map((goal) => {
                  const Icon = goal.icon
                  const isSelected = preferences.bodyGoal === goal.value
                  return (
                    <button
                      key={goal.value}
                      onClick={() => setPreferences((prev) => ({ ...prev, bodyGoal: goal.value }))}
                      className={cn(
                        'flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all',
                        isSelected ? 'bg-charcoal text-paper' : 'bg-cream-dark/30 text-stone'
                      )}
                    >
                      <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', isSelected ? 'bg-white/15' : goal.color)}>
                        <Icon size={14} />
                      </div>
                      <span className="text-[11px] font-semibold">{goal.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-stone uppercase tracking-wider mb-1.5 block">
                口味偏好
              </label>
              <div className="flex gap-2">
                {tasteOptions.map((taste) => (
                  <button
                    key={taste.value}
                    onClick={() => setPreferences((prev) => ({ ...prev, tastePreference: taste.value }))}
                    className={cn(
                      'flex-1 py-2.5 rounded-2xl text-sm font-semibold transition-all',
                      preferences.tastePreference === taste.value
                        ? 'bg-charcoal text-paper'
                        : 'bg-cream-dark/30 text-stone'
                    )}
                  >
                    {taste.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-stone uppercase tracking-wider mb-1.5 block">
                辣度 {preferences.spiceLevel}/5
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={5}
                  value={preferences.spiceLevel}
                  onChange={(e) => setPreferences((prev) => ({ ...prev, spiceLevel: parseInt(e.target.value) }))}
                  className="flex-1 h-1.5 bg-cream-dark rounded-full appearance-none cursor-pointer accent-sage"
                />
                <span className="text-xs font-bold text-charcoal w-6 text-right tabular-nums">
                  {preferences.spiceLevel}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Data Management */}
      <motion.div variants={fadeInUp} className="mb-5">
        <div className="flex items-center gap-2 mb-2.5">
          <div className="w-7 h-7 bg-honey/15 rounded-xl flex items-center justify-center">
            <Save size={14} className="text-earth-dark" />
          </div>
          <h2 className="font-display text-base text-charcoal">数据管理</h2>
        </div>

        <Card className="border-0">
          <CardContent className="p-3.5 space-y-1.5">
            <button className="w-full flex items-center gap-3 p-2.5 rounded-2xl bg-cream-dark/25 hover:bg-cream-dark/40 transition-colors text-left">
              <div className="w-8 h-8 bg-sage/12 rounded-xl flex items-center justify-center shrink-0">
                <Download size={14} className="text-sage-dark" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-charcoal">导出数据</p>
                <p className="text-[10px] text-stone">备份食谱和饮食记录</p>
              </div>
              <ChevronRight size={14} className="text-stone/40 shrink-0" />
            </button>

            <button className="w-full flex items-center gap-3 p-2.5 rounded-2xl bg-cream-dark/25 hover:bg-cream-dark/40 transition-colors text-left">
              <div className="w-8 h-8 bg-sky/12 rounded-xl flex items-center justify-center shrink-0">
                <Upload size={14} className="text-sky-dark" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-charcoal">导入数据</p>
                <p className="text-[10px] text-stone">从备份文件恢复数据</p>
              </div>
              <ChevronRight size={14} className="text-stone/40 shrink-0" />
            </button>

            <button className="w-full flex items-center gap-3 p-2.5 rounded-2xl bg-blossom/8 hover:bg-blossom/12 transition-colors text-left">
              <div className="w-8 h-8 bg-blossom/12 rounded-xl flex items-center justify-center shrink-0">
                <Trash2 size={14} className="text-blossom-dark" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-blossom-dark">清除所有数据</p>
                <p className="text-[10px] text-blossom-dark/50">此操作不可恢复</p>
              </div>
              <AlertTriangle size={14} className="text-blossom-dark/40 shrink-0" />
            </button>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={fadeInUp} className="text-center pb-2">
        <p className="text-[11px] text-stone/50">咬一口春天 v0.1.0</p>
        <p className="text-[10px] text-stone/35 mt-0.5">所有数据仅保存在本地设备</p>
      </motion.div>
    </motion.div>
  )
}
