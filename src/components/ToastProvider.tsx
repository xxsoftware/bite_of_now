import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, Info, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: string
  message: string
  type: ToastType
}

interface ToastContextValue {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const iconMap: Record<ToastType, LucideIcon> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
}

const styleMap: Record<ToastType, string> = {
  success: 'bg-sage text-white',
  error: 'bg-blossom text-white',
  info: 'bg-sky-dark text-white',
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const show = useCallback((message: string, type: ToastType) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 5)}`
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 2000)
  }, [])

  const success = useCallback((message: string) => show(message, 'success'), [show])
  const error = useCallback((message: string) => show(message, 'error'), [show])
  const info = useCallback((message: string) => show(message, 'info'), [show])

  return (
    <ToastContext.Provider value={{ success, error, info }}>
      {children}
      {createPortal(
        <div className="fixed top-4 left-0 right-0 z-[100] flex flex-col items-center gap-2 pointer-events-none">
          <AnimatePresence mode="popLayout">
            {toasts.map((toast) => {
              const Icon = iconMap[toast.type]
              return (
                <motion.div
                  key={toast.id}
                  layout
                  initial={{ opacity: 0, y: -20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  transition={{ type: 'spring', bounce: 0.3, duration: 0.4 }}
                  className={cn(
                    'px-4 py-2.5 rounded-2xl text-sm font-medium shadow-lg flex items-center gap-2 pointer-events-auto',
                    styleMap[toast.type]
                  )}
                >
                  <Icon size={16} />
                  <span>{toast.message}</span>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  )
}
