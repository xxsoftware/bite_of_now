import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Check, Trash2, Carrot, Milk, Fish, ShoppingBag, Apple, Package, Leaf } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getShoppingItems, addShoppingItem, updateShoppingItem, deleteShoppingItem } from '@/lib/db'
import { autoCategorize } from '@/lib/smartCategory'
import type { ShoppingItem } from '@/types'

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.1 },
  },
}

const fadeInUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, bounce: 0.2, duration: 0.45 } },
}

const categoryConfig: Record<string, { icon: typeof Carrot; color: string; bg: string }> = {
  '蔬菜': { icon: Carrot, color: 'text-sage-dark', bg: 'bg-sage/12' },
  '水果': { icon: Apple, color: 'text-blossom-dark', bg: 'bg-blossom/12' },
  '肉类': { icon: Package, color: 'text-earth-dark', bg: 'bg-earth/12' },
  '水产': { icon: Fish, color: 'text-sky-dark', bg: 'bg-sky/12' },
  '蛋奶': { icon: Milk, color: 'text-honey-dark', bg: 'bg-honey/15' },
  '粮油': { icon: Leaf, color: 'text-stone', bg: 'bg-stone/8' },
  '调料': { icon: Package, color: 'text-stone', bg: 'bg-stone/8' },
}

export default function ShoppingList() {
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [newItem, setNewItem] = useState('')
  const [newCategory, setNewCategory] = useState('蔬菜')
  const [autoCatEnabled, setAutoCatEnabled] = useState(true)

  useEffect(() => {
    async function loadItems() {
      const data = await getShoppingItems()
      setItems(data)
    }
    loadItems()
  }, [])

  const refreshItems = useCallback(async () => {
    const data = await getShoppingItems()
    setItems(data)
  }, [])

  const toggleItem = useCallback(async (id: string) => {
    const item = items.find((i) => i.id === id)
    if (item) {
      await updateShoppingItem(id, { checked: !item.checked })
      await refreshItems()
    }
  }, [items, refreshItems])

  const deleteItem = useCallback(async (id: string) => {
    await deleteShoppingItem(id)
    await refreshItems()
  }, [refreshItems])

  const addItem = useCallback(async () => {
    if (!newItem.trim()) return
    const category = autoCatEnabled ? autoCategorize(newItem.trim()) : newCategory
    await addShoppingItem({
      name: newItem.trim(),
      category,
      checked: false,
    })
    setNewItem('')
    await refreshItems()
  }, [newItem, newCategory, autoCatEnabled, refreshItems])

  const uncheckedItems = items.filter((i) => !i.checked)
  const checkedItems = items.filter((i) => i.checked)

  const groupedUnchecked = uncheckedItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, ShoppingItem[]>)

  const progress = items.length > 0 ? Math.round((checkedItems.length / items.length) * 100) : 0

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
            <h1 className="font-display text-[1.75rem] text-charcoal leading-tight">购物清单</h1>
            <p className="text-stone text-xs mt-0.5">
              {uncheckedItems.length} 项待购 · {checkedItems.length} 项已购
            </p>
          </div>
          <motion.div
            animate={{ rotate: [0, -5, 5, -3, 0] }}
            transition={{ repeat: Infinity, repeatDelay: 4, duration: 0.6 }}
            className="w-12 h-12 bg-gradient-to-br from-sage/15 to-honey/15 rounded-[1.125rem] flex items-center justify-center card-shadow"
          >
            <ShoppingBag size={24} className="text-sage-dark" />
          </motion.div>
        </div>

        {/* Progress bar */}
        {items.length > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-[10px] text-stone mb-1">
              <span>采购进度</span>
              <span className="font-bold text-charcoal">{progress}%</span>
            </div>
            <div className="h-1.5 bg-cream-dark rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="h-full rounded-full bg-sage"
              />
            </div>
          </div>
        )}
      </motion.div>

      {/* Add Item */}
      <motion.div variants={fadeInUp} className="mb-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="添加食材..."
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addItem()}
              className="w-full h-11 pl-4 pr-4 bg-paper rounded-2xl border-2 border-transparent focus:border-sage/40 outline-none text-sm transition-colors card-shadow"
            />
          </div>
          {!autoCatEnabled && (
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="h-11 px-2.5 bg-paper rounded-2xl border-2 border-transparent focus:border-sage/40 outline-none text-xs card-shadow text-stone"
            >
              {Object.keys(categoryConfig).map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          )}
          <Button
            variant="default"
            size="icon"
            className="h-11 w-11 rounded-2xl shrink-0"
            onClick={addItem}
          >
            <Plus size={18} />
          </Button>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={() => setAutoCatEnabled(!autoCatEnabled)}
            className={cn(
              'text-[10px] px-2 py-1 rounded-lg transition-all',
              autoCatEnabled ? 'bg-sage/15 text-sage-dark' : 'bg-cream-dark/40 text-stone'
            )}
          >
            {autoCatEnabled ? '智能分类开启' : '手动分类'}
          </button>
        </div>
      </motion.div>

      {/* Unchecked Items */}
      <div className="space-y-3.5 mb-5">
        {Object.entries(groupedUnchecked).map(([category, catItems]) => {
          const config = categoryConfig[category] || categoryConfig['蔬菜']
          const Icon = config.icon

          return (
            <motion.div key={category} variants={fadeInUp}>
              <div className="flex items-center gap-2 mb-1.5">
                <div className={cn('w-6 h-6 rounded-lg flex items-center justify-center', config.bg)}>
                  <Icon size={12} className={config.color} />
                </div>
                <h2 className="font-display text-sm text-charcoal">{category}</h2>
                <span className="text-[10px] text-stone">({catItems.length})</span>
              </div>
              <div className="space-y-1.5">
                <AnimatePresence>
                  {catItems.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center gap-2.5 p-2.5 bg-paper rounded-2xl card-shadow group"
                    >
                      <motion.button
                        whileTap={{ scale: 0.8 }}
                        onClick={() => toggleItem(item.id)}
                        className={cn(
                          'w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0',
                          item.checked
                            ? 'bg-sage border-sage'
                            : 'border-stone/25 group-hover:border-sage/40'
                        )}
                      >
                        {item.checked && <Check size={12} className="text-white" />}
                      </motion.button>
                      <div className="flex-1 min-w-0">
                        <span className={cn(
                          'text-sm font-medium',
                          item.checked && 'line-through text-stone/60'
                        )}>
                          {item.name}
                        </span>
                        {item.sourceRecipe && (
                          <p className="text-[10px] text-stone/60 mt-0.5">{item.sourceRecipe}</p>
                        )}
                      </div>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-stone/40 hover:text-blossom-dark hover:bg-blossom/8 transition-all opacity-0 group-hover:opacity-100 shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Checked Items */}
      <AnimatePresence>
        {checkedItems.length > 0 && (
          <motion.div
            variants={fadeInUp}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-6 h-6 rounded-lg bg-cream-dark/40 flex items-center justify-center">
                <Check size={12} className="text-stone/60" />
              </div>
              <h2 className="font-display text-sm text-stone">已购买</h2>
              <span className="text-[10px] text-stone">({checkedItems.length})</span>
            </div>
            <div className="space-y-1.5 opacity-55">
              {checkedItems.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  className="flex items-center gap-2.5 p-2.5 bg-paper/50 rounded-2xl"
                >
                  <button
                    onClick={() => toggleItem(item.id)}
                    className="w-6 h-6 rounded-lg bg-sage flex items-center justify-center shrink-0"
                  >
                    <Check size={12} className="text-white" />
                  </button>
                  <span className="text-sm font-medium line-through text-stone">{item.name}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {items.length === 0 && (
        <motion.div variants={fadeInUp} className="text-center py-14">
          <div className="w-14 h-14 bg-cream-dark/40 rounded-full flex items-center justify-center mx-auto mb-3">
            <ShoppingBag size={24} className="text-stone/40" />
          </div>
          <p className="text-stone text-sm">购物清单是空的</p>
          <p className="text-stone/60 text-xs mt-1">添加一些食材开始采购吧</p>
        </motion.div>
      )}
    </motion.div>
  )
}
