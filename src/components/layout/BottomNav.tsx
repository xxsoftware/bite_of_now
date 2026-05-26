import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, Search, BookOpen, ShoppingCart, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { path: '/', icon: Home, label: '首页' },
  { path: '/explore', icon: Search, label: '探索' },
  { path: '/records', icon: BookOpen, label: '记录' },
  { path: '/shopping', icon: ShoppingCart, label: '清单' },
  { path: '/settings', icon: Settings, label: '设置' },
]

export function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-bottom">
      <div className="mx-auto max-w-md">
        <div className="flex items-center justify-around bg-paper/85 backdrop-blur-xl border-t border-cream-dark/60 px-2 py-2 pb-5">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            const Icon = item.icon

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  'relative flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl transition-colors duration-200',
                  isActive ? 'text-sage-dark' : 'text-stone/70'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-sage/12 rounded-2xl"
                    transition={{ type: 'spring' as const, bounce: 0.15, duration: 0.45 }}
                  />
                )}
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  className="relative z-10"
                />
                <span
                  className={cn(
                    'relative z-10 text-[10px] font-bold leading-none',
                    isActive ? 'opacity-100' : 'opacity-70'
                  )}
                >
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
