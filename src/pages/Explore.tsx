import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Search, Clock, ChefHat, SlidersHorizontal, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { mockRecipes, cuisineOptions } from '@/data/mock'
import type { Recipe } from '@/types'

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
}

const fadeInUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, bounce: 0.2, duration: 0.5 } },
}

const difficultyConfig = {
  easy: { bg: 'bg-sage/20', text: 'text-sage-dark', label: '简单' },
  medium: { bg: 'bg-honey/30', text: 'text-earth-dark', label: '中等' },
  hard: { bg: 'bg-blossom/20', text: 'text-blossom-dark', label: '困难' },
}

const cuisineAccent: Record<string, { bg: string; border: string; icon: string }> = {
  '川菜': { bg: 'bg-blossom/12', border: 'border-blossom/30', icon: 'text-blossom-dark' },
  '鲁菜': { bg: 'bg-earth/12', border: 'border-earth/30', icon: 'text-earth-dark' },
  '粤菜': { bg: 'bg-sage/12', border: 'border-sage/30', icon: 'text-sage-dark' },
  '苏菜': { bg: 'bg-sky/12', border: 'border-sky/30', icon: 'text-sky-dark' },
  '浙菜': { bg: 'bg-honey/20', border: 'border-honey/30', icon: 'text-earth-dark' },
  '闽菜': { bg: 'bg-sage/10', border: 'border-sage/25', icon: 'text-sage-dark' },
  '湘菜': { bg: 'bg-blossom/15', border: 'border-blossom/30', icon: 'text-blossom-dark' },
  '徽菜': { bg: 'bg-earth/10', border: 'border-earth/25', icon: 'text-earth-dark' },
  '家常菜': { bg: 'bg-honey/15', border: 'border-honey/25', icon: 'text-earth-dark' },
  '异国料理': { bg: 'bg-sky/10', border: 'border-sky/25', icon: 'text-sky-dark' },
  '甜品': { bg: 'bg-blossom/10', border: 'border-blossom/25', icon: 'text-blossom-dark' },
}

const xunGroups = [
  { label: '春', months: ['3月', '4月', '5月'], color: 'text-sage-dark', bg: 'bg-sage/10' },
  { label: '夏', months: ['6月', '7月', '8月'], color: 'text-blossom-dark', bg: 'bg-blossom/10' },
  { label: '秋', months: ['9月', '10月', '11月'], color: 'text-earth-dark', bg: 'bg-earth/10' },
  { label: '冬', months: ['12月', '1月', '2月'], color: 'text-sky-dark', bg: 'bg-sky/10' },
]

function RecipeCard({ recipe, index }: { recipe: Recipe; index: number }) {
  const navigate = useNavigate()
  const diff = difficultyConfig[recipe.difficulty]
  const accent = cuisineAccent[recipe.cuisine] || cuisineAccent['家常菜']
  const isLarge = index % 3 === 0
  const gradientPair = index % 2 === 0
    ? 'from-sage/15 via-blossom/5 to-sky/10'
    : 'from-honey/15 via-sage/5 to-blossom/10'

  return (
    <motion.div variants={fadeInUp}>
      <Card
        className={cn(
          'overflow-hidden cursor-pointer transition-all duration-300 hover:card-shadow-hover press-scale border-0',
          isLarge ? 'rounded-[1.75rem]' : 'rounded-[1.25rem]'
        )}
        onClick={() => navigate(`/recipe/${recipe.id}`)}
      >
        <div className={cn(
          'relative bg-gradient-to-br flex items-center justify-center overflow-hidden',
          isLarge ? 'h-44' : 'h-28',
          gradientPair
        )}>
          <div className="absolute inset-0 opacity-[0.06]">
            <svg width="100%" height="100%">
              <defs>
                <pattern id={`explore-pat-${recipe.id}`} x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
                  <circle cx="8" cy="8" r="0.8" fill="currentColor" className="text-charcoal" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill={`url(#explore-pat-${recipe.id})`} />
            </svg>
          </div>
          <ChefHat
            size={isLarge ? 44 : 28}
            className={cn('opacity-20 transition-transform duration-300 group-hover:scale-110', accent.icon)}
            strokeWidth={1}
          />
          <div className="absolute top-2.5 right-2.5">
            <span className={cn('px-2 py-0.5 rounded-lg text-[10px] font-bold', diff.bg, diff.text)}>
              {diff.label}
            </span>
          </div>
        </div>
        <CardContent className={cn('p-3', isLarge && 'p-4')}>
          <h3 className={cn('font-display text-charcoal mb-1 leading-snug', isLarge ? 'text-base' : 'text-sm')}>
            {recipe.name}
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('px-1.5 py-0.5 rounded-md text-[10px] font-semibold', accent.bg, accent.icon)}>
              {recipe.cuisine}
            </span>
            <span className="flex items-center gap-0.5 text-[10px] text-stone">
              <Clock size={10} />
              {recipe.time}分钟
            </span>
            <span className="flex items-center gap-0.5 text-[10px] text-stone">
              <ChefHat size={10} />
              {recipe.calories}kcal
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default function Explore() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCuisine, setSelectedCuisine] = useState<string | null>(null)
  const [selectedXun, setSelectedXun] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const filteredRecipes = useMemo(() => mockRecipes.filter((recipe: Recipe) => {
    const q = searchQuery.trim().toLowerCase()
    const matchesSearch = !q || recipe.name.toLowerCase().includes(q) || recipe.cuisine.includes(q)
    const matchesCuisine = !selectedCuisine || recipe.cuisine === selectedCuisine
    const matchesXun = !selectedXun || recipe.bestSeason.includes(selectedXun) || recipe.bestSeason.includes('全年')
    return matchesSearch && matchesCuisine && matchesXun
  }), [searchQuery, selectedCuisine, selectedXun])

  const clearFilters = useCallback(() => {
    setSelectedCuisine(null)
    setSelectedXun(null)
    setSearchQuery('')
  }, [])

  const activeFilterCount = (selectedCuisine ? 1 : 0) + (selectedXun ? 1 : 0)

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={staggerContainer}
      className="px-4 pt-5 safe-top pb-4"
    >
      <motion.div variants={fadeInUp} className="mb-4">
        <h1 className="font-display text-[1.75rem] text-charcoal leading-tight">食谱库</h1>
        <p className="text-stone text-xs mt-0.5">探索时令美味，发现烹饪灵感</p>
      </motion.div>

      <motion.div variants={fadeInUp} className="relative mb-3">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone/60" />
        <input
          type="text"
          placeholder="搜索菜名或菜系..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-11 pl-10 pr-11 bg-paper rounded-2xl border-2 border-transparent focus:border-sage/40 outline-none text-sm transition-colors card-shadow"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-11 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-cream-dark/60 flex items-center justify-center"
          >
            <X size={12} className="text-stone" />
          </button>
        )}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
            showFilters ? 'bg-sage/20 text-sage-dark' : 'bg-cream-dark/40 text-stone'
          )}
        >
          <SlidersHorizontal size={14} />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-blossom-dark text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </motion.div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="mb-4 overflow-hidden"
          >
            <div className="space-y-3 bg-paper/60 rounded-2xl p-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-bold text-stone uppercase tracking-wider">菜系</p>
                  {activeFilterCount > 0 && (
                    <button onClick={clearFilters} className="text-[10px] text-blossom-dark font-medium">
                      清除筛选
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setSelectedCuisine(null)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all',
                      !selectedCuisine ? 'bg-charcoal text-paper' : 'bg-cream-dark/40 text-stone hover:bg-cream-dark/60'
                    )}
                  >
                    全部
                  </button>
                  {cuisineOptions.map((cuisine) => (
                    <button
                      key={cuisine}
                      onClick={() => setSelectedCuisine(cuisine === selectedCuisine ? null : cuisine)}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all',
                        selectedCuisine === cuisine
                          ? 'bg-charcoal text-paper'
                          : 'bg-cream-dark/40 text-stone hover:bg-cream-dark/60'
                      )}
                    >
                      {cuisine}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-stone uppercase tracking-wider mb-1.5">时令日历</p>
                <div className="space-y-1.5">
                  {xunGroups.map((group) => (
                    <div key={group.label} className="flex items-center gap-2">
                      <span className={cn('font-display text-xs w-5', group.color)}>{group.label}</span>
                      <div className="flex flex-wrap gap-1">
                        {group.months.map((month) =>
                          ['上旬', '中旬', '下旬'].map((xun) => {
                            const fullXun = `${month}${xun}`
                            const isSelected = selectedXun === fullXun
                            return (
                              <button
                                key={fullXun}
                                onClick={() => setSelectedXun(isSelected ? null : fullXun)}
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
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div variants={fadeInUp}>
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="font-display text-base text-charcoal">
            {selectedCuisine || selectedXun || searchQuery ? '搜索结果' : '全部食谱'}
          </h2>
          <span className="text-[10px] text-stone">{filteredRecipes.length} 道</span>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 gap-2.5">
        {filteredRecipes.map((recipe, index) => (
          <div key={recipe.id} className={cn(index % 3 === 0 && index < filteredRecipes.length - 1 && 'col-span-2')}>
            <RecipeCard recipe={recipe} index={index} />
          </div>
        ))}
      </div>

      {filteredRecipes.length === 0 && (
        <motion.div
          variants={fadeInUp}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16"
        >
          <div className="w-16 h-16 bg-cream-dark/40 rounded-full flex items-center justify-center mx-auto mb-3">
            <ChefHat size={28} className="text-stone/40" />
          </div>
          <p className="text-stone text-sm">没有找到匹配的食谱</p>
          <p className="text-stone/60 text-xs mt-1">试试调整筛选条件</p>
        </motion.div>
      )}
    </motion.div>
  )
}
