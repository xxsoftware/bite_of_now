import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Key, Globe, Cpu, Zap, Eye, EyeOff, Trash2,
  Download, Upload, AlertTriangle, Heart, Target, Bolt,
  ChevronRight, Save, Sparkles, Lock, Moon, Sun, FileUp, CheckCircle2, XCircle,
  Copy, Layers, ArrowRight, Shield, Share2, MapPin, Ban, Clock, Calendar, X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  getAIConfig, saveAIConfig, getUserPreferences, saveUserPreferences,
  exportAllData, importAllData, clearAllData, getDarkMode, setDarkMode,
  getRecipes, importRecipes, getRegionConfig, saveRegionConfig,
  getDislikedRecipesFull, removeDislikedRecipe, cleanupExpiredDislikes,
  getLocalStreak
} from '@/lib/db'
import { getDaysUntil } from '@/lib/utils'
import { saveEncryptedKey, getEncryptedKey } from '@/lib/stronghold'
import { testAIConnection } from '@/lib/ai'
import type { AppData, Recipe } from '@/types'

// Tauri APIs (graceful fallback if not in Tauri context)
async function pickSavePath(defaultName: string): Promise<string | null> {
  try {
    const { save } = await import('@tauri-apps/plugin-dialog')
    const path = await save({
      defaultPath: defaultName,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })
    return path
  } catch {
    return null
  }
}

async function pickOpenPath(): Promise<string | null> {
  try {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const path = await open({
      multiple: false,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    })
    return path
  } catch {
    return null
  }
}

async function writeFileTauri(path: string, content: string): Promise<void> {
  try {
    const { writeTextFile } = await import('@tauri-apps/plugin-fs')
    await writeTextFile(path, content)
  } catch (e) {
    throw new Error(`写入文件失败: ${e}`)
  }
}

async function readFileTauri(path: string): Promise<string> {
  try {
    const { readTextFile } = await import('@tauri-apps/plugin-fs')
    return await readTextFile(path)
  } catch (e) {
    throw new Error(`读取文件失败: ${e}`)
  }
}

function isTauri(): boolean {
  return !!(window as any).__TAURI__
}

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

type ConflictStrategy = 'overwrite' | 'skip' | 'keepBoth'

export default function Settings() {
  const [showKey, setShowKey] = useState(false)
  const [aiConfig, setAiConfig] = useState<{ apiKey: string; baseUrl?: string; modelName?: string }>({ apiKey: '', baseUrl: '', modelName: '' })
  const [testingConnection, setTestingConnection] = useState(false)
  const [testResult, setTestResult] = useState<'idle' | 'success' | 'error'>('idle')
  const [testMessage, setTestMessage] = useState('')
  const [preferences, setPreferences] = useState({ avoidIngredients: [] as string[], bodyGoal: 'maintain' as 'lose' | 'gain' | 'maintain', tastePreference: 'light' as 'light' | 'heavy' | 'spicy', spiceLevel: 3 })
  const [avoidInput, setAvoidInput] = useState('')
  const [darkMode, setDarkModeState] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [exportStatus, setExportStatus] = useState<string | null>(null)
  const [encryptEnabled, setEncryptEnabled] = useState(false)
  const [loading, setLoading] = useState(true)

  // Region config
  const [regionConfig, setRegionConfig] = useState({ region: 'cn', lastVerifiedDate: '', lastSystemTime: 0 })

  // Local streak for red dot
  const [localStreak, setLocalStreak] = useState(0)

  // Disliked recipes blacklist
  const [dislikedList, setDislikedList] = useState<import('@/types').DislikedRecipeEntry[]>([])
  const [showBlacklist, setShowBlacklist] = useState(false)
  const [blacklistLoading, setBlacklistLoading] = useState(false)

  // Conflict resolution state
  const [pendingImport, setPendingImport] = useState<AppData | null>(null)
  const [conflictRecipes, setConflictRecipes] = useState<Recipe[]>([])
  const [conflictStrategy, setConflictStrategy] = useState<ConflictStrategy>('skip')

  // Load settings on mount
  useEffect(() => {
    async function loadSettings() {
      const [loadedAIConfig, loadedPrefs, loadedDarkMode, loadedRegion, loadedDisliked, streak] = await Promise.all([
        getAIConfig(),
        getUserPreferences(),
        getDarkMode(),
        getRegionConfig(),
        getDislikedRecipesFull(),
        getLocalStreak(),
      ])

      // Try to get encrypted key from Stronghold
      try {
        const encryptedKey = await getEncryptedKey('api_key')
        if (encryptedKey) {
          setAiConfig({ ...loadedAIConfig, apiKey: encryptedKey })
          setEncryptEnabled(true)
        } else {
          setAiConfig(loadedAIConfig)
        }
      } catch {
        setAiConfig(loadedAIConfig)
      }

      setPreferences(loadedPrefs)
      setDarkModeState(loadedDarkMode)
      setRegionConfig(loadedRegion)
      setDislikedList(loadedDisliked)
      setLocalStreak(streak.count)
      setLoading(false)
    }
    loadSettings()
  }, [])

  // Persist AI config on change
  useEffect(() => {
    if (loading) return
    async function persistAIConfig() {
      await saveAIConfig(aiConfig)
      if (encryptEnabled && aiConfig.apiKey) {
        try {
          await saveEncryptedKey('api_key', aiConfig.apiKey)
        } catch {
          // ignore stronghold errors
        }
      }
    }
    persistAIConfig()
  }, [aiConfig, encryptEnabled, loading])

  // Persist preferences on change
  useEffect(() => {
    if (loading) return
    async function persistPrefs() {
      await saveUserPreferences(preferences)
    }
    persistPrefs()
  }, [preferences, loading])

  const handleTestConnection = useCallback(async () => {
    if (!aiConfig.apiKey) return
    setTestingConnection(true)
    setTestResult('idle')
    setTestMessage('')
    const result = await testAIConnection()
    setTestingConnection(false)
    setTestResult(result.success ? 'success' : 'error')
    setTestMessage(result.message)
  }, [aiConfig.apiKey])

  const toggleEncryption = useCallback(async () => {
    const next = !encryptEnabled
    setEncryptEnabled(next)
    if (next && aiConfig.apiKey) {
      try {
        await saveEncryptedKey('api_key', aiConfig.apiKey)
      } catch {
        // ignore
      }
    }
  }, [encryptEnabled, aiConfig.apiKey])

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

  const handleExport = useCallback(async () => {
    try {
      const data = await exportAllData()
      const jsonStr = JSON.stringify(data, null, 2)
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '')
      const defaultName = `DietApp_Backup_${dateStr}.json`

      if (isTauri()) {
        const path = await pickSavePath(defaultName)
        if (!path) return
        await writeFileTauri(path, jsonStr)
      } else {
        // Browser fallback
        const blob = new Blob([jsonStr], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = defaultName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
      setExportStatus('导出成功')
      setTimeout(() => setExportStatus(null), 3000)
    } catch (e) {
      setExportStatus(`导出失败: ${e}`)
      setTimeout(() => setExportStatus(null), 3000)
    }
  }, [])

  const handleFileSelect = useCallback(async (fileOrPath: File | string) => {
    try {
      let content: string
      if (typeof fileOrPath === 'string') {
        content = await readFileTauri(fileOrPath)
      } else {
        content = await fileOrPath.text()
      }

      const data = JSON.parse(content) as AppData
      if (!data.version || !data.recipes) {
        setImportStatus('文件格式不正确')
        setTimeout(() => setImportStatus(null), 3000)
        return
      }

      // Check for conflicts
      const existing = await getRecipes()
      const conflicts = data.recipes.filter((r) =>
        existing.some((er) => er.name === r.name)
      )

      if (conflicts.length > 0) {
        setPendingImport(data)
        setConflictRecipes(conflicts)
      } else {
        // No conflicts, import directly
        const result = await importAllData(data)
        setImportStatus(result.message)
        setTimeout(() => {
          setImportStatus(null)
          window.location.reload()
        }, 2000)
      }
    } catch {
      setImportStatus('文件解析失败')
      setTimeout(() => setImportStatus(null), 3000)
    }
  }, [])

  const executeImportWithStrategy = useCallback(async () => {
    if (!pendingImport) return

    if (conflictStrategy === 'overwrite' || conflictStrategy === 'skip' || conflictStrategy === 'keepBoth') {
      // Import recipes with strategy
      const result = await importRecipes(pendingImport.recipes, conflictStrategy)

      // Import other data directly
      if (pendingImport.dietRecords) {
        for (const rec of pendingImport.dietRecords) {
          const { addDietRecord } = await import('@/lib/db')
          await addDietRecord(rec)
        }
      }
      if (pendingImport.shoppingItems) {
        for (const item of pendingImport.shoppingItems) {
          const { addShoppingItem } = await import('@/lib/db')
          await addShoppingItem(item)
        }
      }
      if (pendingImport.aiConfig) await saveAIConfig(pendingImport.aiConfig)
      if (pendingImport.userPreferences) await saveUserPreferences(pendingImport.userPreferences)
      if (pendingImport.dislikedRecipes) {
        const { addDislikedRecipe } = await import('@/lib/db')
        for (const name of pendingImport.dislikedRecipes) await addDislikedRecipe(name)
      }
      if (pendingImport.regionConfig) await saveRegionConfig(pendingImport.regionConfig)

      setImportStatus(`导入成功：${result.imported} 道新食谱${result.overwritten > 0 ? `，${result.overwritten} 道覆盖` : ''}${result.skipped > 0 ? `，${result.skipped} 道跳过` : ''}`)
      setPendingImport(null)
      setConflictRecipes([])
      setTimeout(() => {
        setImportStatus(null)
        window.location.reload()
      }, 2500)
    }
  }, [pendingImport, conflictStrategy])

  const cancelImport = useCallback(() => {
    setPendingImport(null)
    setConflictRecipes([])
  }, [])

  const handleClearData = useCallback(async () => {
    await clearAllData()
    setShowClearConfirm(false)
    window.location.reload()
  }, [])

  const toggleDarkMode = useCallback(async () => {
    const next = !darkMode
    setDarkModeState(next)
    await setDarkMode(next)
    if (next) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  const handleRegionChange = useCallback(async (region: string) => {
    const next = { ...regionConfig, region }
    setRegionConfig(next)
    await saveRegionConfig(next)
  }, [regionConfig])

  const handleVerifySeason = useCallback(async () => {
    const now = new Date()
    const next = {
      ...regionConfig,
      lastVerifiedDate: now.toISOString().split('T')[0],
      lastSystemTime: now.getTime(),
    }
    setRegionConfig(next)
    await saveRegionConfig(next)
  }, [regionConfig])

  const loadBlacklist = useCallback(async () => {
    setBlacklistLoading(true)
    const list = await getDislikedRecipesFull()
    setDislikedList(list)
    setBlacklistLoading(false)
  }, [])

  const handleRemoveDisliked = useCallback(async (name: string) => {
    await removeDislikedRecipe(name)
    await loadBlacklist()
  }, [loadBlacklist])

  const handleCleanupExpired = useCallback(async () => {
    await cleanupExpiredDislikes()
    await loadBlacklist()
  }, [loadBlacklist])

  const toggleBlacklist = useCallback(() => {
    const next = !showBlacklist
    setShowBlacklist(next)
    if (next) loadBlacklist()
  }, [showBlacklist, loadBlacklist])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3">
        <div className="w-8 h-8 border-2 border-sage border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={staggerContainer}
      className="px-4 pt-5 safe-top pb-8"
    >
      {/* Status Toast */}
      <AnimatePresence>
        {(importStatus || exportStatus) && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-0 right-0 z-50 flex justify-center pointer-events-none"
          >
            <div className={cn(
              'px-4 py-2 rounded-2xl text-sm font-medium shadow-lg',
              (importStatus?.includes('成功') || exportStatus?.includes('成功')) ? 'bg-sage text-white' : 'bg-blossom text-white'
            )}>
              {importStatus || exportStatus}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* Dark Mode Toggle */}
      <motion.div variants={fadeInUp} className="mb-5">
        <Card className="border-0">
          <CardContent className="p-3.5">
            <button
              onClick={toggleDarkMode}
              className="w-full flex items-center gap-3 p-2.5 rounded-2xl bg-cream-dark/25 hover:bg-cream-dark/40 transition-colors text-left"
            >
              <div className={cn(
                'w-8 h-8 rounded-xl flex items-center justify-center shrink-0',
                darkMode ? 'bg-charcoal text-paper' : 'bg-honey/15 text-earth-dark'
              )}>
                {darkMode ? <Moon size={14} /> : <Sun size={14} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-charcoal">深色模式</p>
                <p className="text-[10px] text-stone">{darkMode ? '已开启' : '已关闭'}</p>
              </div>
              <div className={cn(
                'w-10 h-6 rounded-full transition-colors relative shrink-0',
                darkMode ? 'bg-charcoal' : 'bg-cream-dark/60'
              )}>
                <div className={cn(
                  'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                  darkMode ? 'translate-x-[18px]' : 'translate-x-0.5'
                )} />
              </div>
            </button>
          </CardContent>
        </Card>
      </motion.div>

      {/* AI Configuration */}
      <motion.div variants={fadeInUp} className="mb-5">
        <div className="flex items-center gap-2 mb-2.5">
          <div className="w-7 h-7 bg-sage/12 rounded-xl flex items-center justify-center">
            <Cpu size={14} className="text-sage-dark" />
          </div>
          <h2 className="font-display text-base text-charcoal">AI 模型配置</h2>
          {localStreak >= 3 && (
            <span className="w-2 h-2 bg-blossom rounded-full" title="已连续使用本地推荐3天以上，建议配置API Key" />
          )}
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
                <p className="text-[10px] text-stone/60">密钥将存储于本地，不会上传至任何服务器</p>
              </div>
            </div>

            {/* Encryption Toggle */}
            <button
              onClick={toggleEncryption}
              className={cn(
                'w-full flex items-center gap-3 p-2.5 rounded-2xl transition-colors text-left',
                encryptEnabled ? 'bg-sage/8 border border-sage/20' : 'bg-cream-dark/25 hover:bg-cream-dark/40'
              )}
            >
              <div className={cn(
                'w-8 h-8 rounded-xl flex items-center justify-center shrink-0',
                encryptEnabled ? 'bg-sage/15 text-sage-dark' : 'bg-stone/8 text-stone'
              )}>
                <Shield size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-charcoal">启用加密存储</p>
                <p className="text-[10px] text-stone">
                  {encryptEnabled ? 'API Key 已使用 Stronghold 加密存储' : '使用 Stronghold 加密保护 API Key'}
                </p>
              </div>
              <div className={cn(
                'w-10 h-6 rounded-full transition-colors relative shrink-0',
                encryptEnabled ? 'bg-sage' : 'bg-cream-dark/60'
              )}>
                <div className={cn(
                  'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                  encryptEnabled ? 'translate-x-[18px]' : 'translate-x-0.5'
                )} />
              </div>
            </button>

            <div>
              <label className="text-[10px] font-bold text-stone uppercase tracking-wider mb-1 block">
                Base URL (可选)
              </label>
              <div className="relative">
                <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone/50" />
                <input
                  type="text"
                  placeholder="https://api.openai.com/v1"
                  value={aiConfig.baseUrl || ''}
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
                  placeholder="例如: gpt-4o-mini, qwen-turbo"
                  value={aiConfig.modelName || ''}
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
              {testingConnection ? (
                <Zap size={14} className="mr-1.5 animate-pulse" />
              ) : testResult === 'success' ? (
                <CheckCircle2 size={14} className="mr-1.5 text-sage-dark" />
              ) : testResult === 'error' ? (
                <XCircle size={14} className="mr-1.5 text-blossom-dark" />
              ) : (
                <Zap size={14} className="mr-1.5" />
              )}
              {testingConnection
                ? '测试中...'
                : testResult === 'success'
                  ? `连接成功${testMessage ? `: ${testMessage}` : ''}`
                  : testResult === 'error'
                    ? testMessage || '连接失败'
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
                      onClick={() => setPreferences((prev) => ({ ...prev, bodyGoal: goal.value as 'lose' | 'gain' | 'maintain' }))}
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
                    onClick={() => setPreferences((prev) => ({ ...prev, tastePreference: taste.value as 'light' | 'heavy' | 'spicy' }))}
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

      {/* Region & Season */}
      <motion.div variants={fadeInUp} className="mb-5">
        <div className="flex items-center gap-2 mb-2.5">
          <div className="w-7 h-7 bg-sky/12 rounded-xl flex items-center justify-center">
            <MapPin size={14} className="text-sky-dark" />
          </div>
          <h2 className="font-display text-base text-charcoal">地区与时令</h2>
        </div>

        <Card className="border-0">
          <CardContent className="p-3.5 space-y-3.5">
            <div>
              <label className="text-[10px] font-bold text-stone uppercase tracking-wider mb-1.5 block">
                所在地区
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'cn', label: '中国', flag: '🇨🇳' },
                  { value: 'au', label: '澳大利亚', flag: '🇦🇺' },
                  { value: 'us', label: '美国', flag: '🇺🇸' },
                  { value: 'jp', label: '日本', flag: '🇯🇵' },
                  { value: 'kr', label: '韩国', flag: '🇰🇷' },
                  { value: 'sg', label: '新加坡', flag: '🇸🇬' },
                ].map((r) => (
                  <button
                    key={r.value}
                    onClick={() => handleRegionChange(r.value)}
                    className={cn(
                      'flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-medium transition-all',
                      regionConfig.region === r.value
                        ? 'bg-charcoal text-paper'
                        : 'bg-cream-dark/30 text-stone hover:bg-cream-dark/50'
                    )}
                  >
                    <span>{r.flag}</span>
                    <span>{r.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-cream-dark/25">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-stone" />
                <div>
                  <p className="text-xs text-charcoal font-medium">时令校验</p>
                  <p className="text-[10px] text-stone">
                    {regionConfig.lastVerifiedDate
                      ? `上次确认: ${regionConfig.lastVerifiedDate}`
                      : '尚未确认时令'}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-xl text-xs"
                onClick={handleVerifySeason}
              >
                <CheckCircle2 size={12} className="mr-1" />
                确认
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Taste Blacklist */}
      <motion.div variants={fadeInUp} className="mb-5">
        <div className="flex items-center gap-2 mb-2.5">
          <div className="w-7 h-7 bg-blossom/12 rounded-xl flex items-center justify-center">
            <Ban size={14} className="text-blossom-dark" />
          </div>
          <h2 className="font-display text-base text-charcoal">口味黑名单</h2>
        </div>

        <Card className="border-0">
          <CardContent className="p-3.5">
            <button
              onClick={toggleBlacklist}
              className="w-full flex items-center gap-3 p-2.5 rounded-2xl bg-cream-dark/25 hover:bg-cream-dark/40 transition-colors text-left"
            >
              <div className="w-8 h-8 bg-blossom/10 rounded-xl flex items-center justify-center shrink-0">
                <Ban size={14} className="text-blossom-dark" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-charcoal">
                  {dislikedList.length > 0 ? `${dislikedList.length} 条黑名单记录` : '暂无黑名单记录'}
                </p>
                <p className="text-[10px] text-stone">
                  {dislikedList.filter(d => d.type === 'hard').length > 0
                    ? `${dislikedList.filter(d => d.type === 'hard').length} 条硬拉黑`
                    : 'soft 不喜欢 7 天后自动解除'}
                </p>
              </div>
              <ChevronRight
                size={14}
                className={cn(
                  'text-stone/40 shrink-0 transition-transform',
                  showBlacklist && 'rotate-90'
                )}
              />
            </button>

            <AnimatePresence>
              {showBlacklist && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 space-y-2">
                    {blacklistLoading ? (
                      <div className="flex justify-center py-4">
                        <div className="w-6 h-6 border-2 border-sage border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : dislikedList.length === 0 ? (
                      <p className="text-xs text-stone text-center py-4">黑名单为空，推荐池不受限制</p>
                    ) : (
                      <>
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-[10px] font-bold text-stone uppercase tracking-wider">菜品名 · 类型 · 剩余天数</p>
                          <button
                            onClick={handleCleanupExpired}
                            className="text-[10px] text-blossom-dark hover:text-blossom-dark/70 transition-colors"
                          >
                            清理已过期
                          </button>
                        </div>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-hide">
                          {dislikedList.map((entry) => (
                            <motion.div
                              key={entry.name}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="flex items-center gap-2 px-2.5 py-2 bg-cream-dark/25 rounded-xl"
                            >
                              <span
                                className={cn(
                                  'text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0',
                                  entry.type === 'hard'
                                    ? 'bg-blossom/15 text-blossom-dark'
                                    : 'bg-honey/15 text-earth-dark'
                                )}
                              >
                                {entry.type === 'hard' ? '硬' : '软'}
                              </span>
                              <span className="text-xs text-charcoal font-medium flex-1 truncate">
                                {entry.name}
                              </span>
                              <div className="flex items-center gap-1 text-stone shrink-0">
                                <Clock size={10} />
                                <span className="text-[10px]">
                                  {getDaysUntil(entry.expiresAt)}天
                                </span>
                              </div>
                              <button
                                onClick={() => handleRemoveDisliked(entry.name)}
                                className="w-6 h-6 rounded-lg flex items-center justify-center text-stone/40 hover:text-blossom-dark hover:bg-blossom/8 transition-colors shrink-0"
                              >
                                <X size={12} />
                              </button>
                            </motion.div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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
            <button
              onClick={handleExport}
              className="w-full flex items-center gap-3 p-2.5 rounded-2xl bg-cream-dark/25 hover:bg-cream-dark/40 transition-colors text-left"
            >
              <div className="w-8 h-8 bg-sage/12 rounded-xl flex items-center justify-center shrink-0">
                <Download size={14} className="text-sage-dark" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-charcoal">导出数据</p>
                <p className="text-[10px] text-stone">备份食谱和饮食记录</p>
              </div>
              <ChevronRight size={14} className="text-stone/40 shrink-0" />
            </button>

            <button
              onClick={async () => {
                if (isTauri()) {
                  const path = await pickOpenPath()
                  if (path) await handleFileSelect(path)
                } else {
                  // Browser fallback: trigger hidden file input
                  document.getElementById('settings-import-input')?.click()
                }
              }}
              className="w-full flex items-center gap-3 p-2.5 rounded-2xl bg-cream-dark/25 hover:bg-cream-dark/40 transition-colors text-left cursor-pointer"
            >
              <div className="w-8 h-8 bg-sky/12 rounded-xl flex items-center justify-center shrink-0">
                <Upload size={14} className="text-sky-dark" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-charcoal">导入数据</p>
                <p className="text-[10px] text-stone">{isTauri() ? '从备份文件恢复数据' : '从备份文件恢复数据'}</p>
              </div>
              <FileUp size={14} className="text-stone/40 shrink-0" />
              <input
                id="settings-import-input"
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileSelect(file)
                  e.target.value = ''
                }}
              />
            </button>

            {/* Share Panel */}
            {'share' in navigator && (
              <button
                onClick={async () => {
                  try {
                    const data = await exportAllData()
                    const jsonStr = JSON.stringify(data, null, 2)
                    const blob = new Blob([jsonStr], { type: 'application/json' })
                    const file = new File([blob], `DietApp_Backup_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.json`, { type: 'application/json' })
                    await (navigator as any).share({
                      title: '咬一口春天 - 数据备份',
                      files: [file],
                    })
                  } catch {
                    // User cancelled or share failed
                  }
                }}
                className="w-full flex items-center gap-3 p-2.5 rounded-2xl bg-cream-dark/25 hover:bg-cream-dark/40 transition-colors text-left"
              >
                <div className="w-8 h-8 bg-honey/15 rounded-xl flex items-center justify-center shrink-0">
                  <Share2 size={14} className="text-earth-dark" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-charcoal">分享备份</p>
                  <p className="text-[10px] text-stone">通过系统分享面板发送</p>
                </div>
                <ChevronRight size={14} className="text-stone/40 shrink-0" />
              </button>
            )}

            <button
              onClick={() => setShowClearConfirm(true)}
              className="w-full flex items-center gap-3 p-2.5 rounded-2xl bg-blossom/8 hover:bg-blossom/12 transition-colors text-left"
            >
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

      {/* Conflict Resolution Modal */}
      <AnimatePresence>
        {pendingImport && conflictRecipes.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={cancelImport}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-paper rounded-3xl p-5 max-w-sm w-full card-shadow max-h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 bg-honey/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Layers size={24} className="text-earth-dark" />
              </div>
              <h3 className="font-display text-lg text-charcoal text-center mb-1">发现 {conflictRecipes.length} 道同名食谱</h3>
              <p className="text-xs text-stone text-center mb-4">
                导入文件中的以下食谱与本地已有食谱重名，请选择处理方式：
              </p>

              {/* Conflict list */}
              <div className="flex-1 overflow-y-auto mb-4 space-y-1.5 max-h-32">
                {conflictRecipes.map((r) => (
                  <div key={r.id} className="flex items-center gap-2 px-2.5 py-1.5 bg-cream-dark/25 rounded-xl">
                    <AlertTriangle size={12} className="text-honey-dark flex-shrink-0" />
                    <span className="text-xs text-charcoal font-medium">{r.name}</span>
                    <span className="text-[10px] text-stone">({r.cuisine})</span>
                  </div>
                ))}
              </div>

              {/* Strategy options */}
              <div className="space-y-1.5 mb-4">
                <button
                  onClick={() => setConflictStrategy('overwrite')}
                  className={cn(
                    'w-full flex items-center gap-3 p-2.5 rounded-2xl text-left transition-all',
                    conflictStrategy === 'overwrite' ? 'bg-blossom/10 border border-blossom/20' : 'bg-cream-dark/25'
                  )}
                >
                  <div className="w-7 h-7 bg-blossom/10 rounded-lg flex items-center justify-center shrink-0">
                    <Copy size={13} className="text-blossom-dark" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-charcoal">覆盖本地版本</p>
                    <p className="text-[10px] text-stone">用导入文件的版本替换本地数据</p>
                  </div>
                  {conflictStrategy === 'overwrite' && <CheckCircle2 size={14} className="text-blossom-dark ml-auto" />}
                </button>

                <button
                  onClick={() => setConflictStrategy('skip')}
                  className={cn(
                    'w-full flex items-center gap-3 p-2.5 rounded-2xl text-left transition-all',
                    conflictStrategy === 'skip' ? 'bg-sky/10 border border-sky/20' : 'bg-cream-dark/25'
                  )}
                >
                  <div className="w-7 h-7 bg-sky/10 rounded-lg flex items-center justify-center shrink-0">
                    <ArrowRight size={13} className="text-sky-dark" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-charcoal">跳过冲突项</p>
                    <p className="text-[10px] text-stone">保留本地版本，不导入同名食谱</p>
                  </div>
                  {conflictStrategy === 'skip' && <CheckCircle2 size={14} className="text-sky-dark ml-auto" />}
                </button>

                <button
                  onClick={() => setConflictStrategy('keepBoth')}
                  className={cn(
                    'w-full flex items-center gap-3 p-2.5 rounded-2xl text-left transition-all',
                    conflictStrategy === 'keepBoth' ? 'bg-sage/10 border border-sage/20' : 'bg-cream-dark/25'
                  )}
                >
                  <div className="w-7 h-7 bg-sage/10 rounded-lg flex items-center justify-center shrink-0">
                    <Layers size={13} className="text-sage-dark" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-charcoal">保留两者</p>
                    <p className="text-[10px] text-stone">导入为新食谱，本地版本也保留</p>
                  </div>
                  {conflictStrategy === 'keepBoth' && <CheckCircle2 size={14} className="text-sage-dark ml-auto" />}
                </button>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 h-11 rounded-2xl"
                  onClick={cancelImport}
                >
                  取消
                </Button>
                <Button
                  className="flex-1 h-11 rounded-2xl bg-charcoal text-paper"
                  onClick={executeImportWithStrategy}
                >
                  确认导入
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clear Data Confirm Modal */}
      <AnimatePresence>
        {showClearConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowClearConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-paper rounded-3xl p-5 max-w-xs w-full card-shadow"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 bg-blossom/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <AlertTriangle size={24} className="text-blossom-dark" />
              </div>
              <h3 className="font-display text-lg text-charcoal text-center mb-1">确认清除所有数据？</h3>
              <p className="text-xs text-stone text-center mb-5">
                此操作将删除所有食谱、饮食记录、购物清单和设置，且不可恢复。
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 h-11 rounded-2xl"
                  onClick={() => setShowClearConfirm(false)}
                >
                  取消
                </Button>
                <Button
                  variant="default"
                  className="flex-1 h-11 rounded-2xl bg-blossom text-white hover:bg-blossom-dark"
                  onClick={handleClearData}
                >
                  确认清除
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Privacy */}
      <motion.div variants={fadeInUp} className="mb-5">
        <Card className="border-0 bg-sage/5">
          <CardContent className="p-3.5">
            <div className="flex items-start gap-3">
              <Lock size={16} className="text-sage-dark flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-charcoal mb-1">隐私声明</p>
                <p className="text-[11px] text-stone leading-relaxed">
                  所有数据（包括饮食记录、API Key、偏好设置）仅保存在你的本地设备中，不会上传至任何第三方服务器。AI 推荐时，仅将菜名和偏好信息发送至你配置的大模型 API。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={fadeInUp} className="text-center pb-2">
        <p className="text-[11px] text-stone/50">咬一口春天 v1.0.0</p>
        <p className="text-[10px] text-stone/35 mt-0.5">所有数据仅保存在本地设备</p>
      </motion.div>
    </motion.div>
  )
}
