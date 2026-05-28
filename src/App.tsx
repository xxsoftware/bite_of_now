import { useState, useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { BottomNav } from '@/components/layout/BottomNav'
import { ToastProvider } from '@/components/ToastProvider'
import ErrorBoundary from '@/components/ErrorBoundary'
import SeasonCheckModal from '@/components/SeasonCheckModal'
import Home from '@/pages/Home'
import Explore from '@/pages/Explore'
import RecipeDetail from '@/pages/RecipeDetail'
import RecipeForm from '@/pages/RecipeForm'
import DietRecords from '@/pages/DietRecords'
import ShoppingList from '@/pages/ShoppingList'
import Settings from '@/pages/Settings'
import { getDarkMode, getRegionConfig, saveRegionConfig } from '@/lib/db'
import { checkSeasonIntegrity } from '@/lib/utils'
import type { RegionConfig } from '@/types'

const pageTransition = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] as const },
}

function AnimatedPage({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <motion.div
        initial={pageTransition.initial}
        animate={pageTransition.animate}
        exit={pageTransition.exit}
        transition={pageTransition.transition}
      >
        {children}
      </motion.div>
    </ErrorBoundary>
  )
}

function App() {
  const location = useLocation()
  const isDetailPage = location.pathname.startsWith('/recipe/')
  const isFormPage = location.pathname === '/recipe/new' || location.pathname.endsWith('/edit')

  // Initialize dark mode on app load
  useEffect(() => {
    getDarkMode().then((dark) => {
      if (dark) document.documentElement.classList.add('dark')
    })
  }, [])

  // Season check state
  const [showSeasonModal, setShowSeasonModal] = useState(false)
  const [seasonModalProps, setSeasonModalProps] = useState<{
    isFirstTime: boolean
    daysDiff: number
    config: RegionConfig
  }>({ isFirstTime: false, daysDiff: 0, config: { region: 'cn', lastVerifiedDate: '', lastSystemTime: 0 } })

  // Season integrity check on app startup
  useEffect(() => {
    async function checkSeason() {
      const config = await getRegionConfig()

      // First time: no region config yet
      if (!config.lastSystemTime) {
        setSeasonModalProps({ isFirstTime: true, daysDiff: 0, config })
        setShowSeasonModal(true)
        return
      }

      const result = checkSeasonIntegrity(config)
      if (result.changed && result.daysDiff > 7) {
        setSeasonModalProps({ isFirstTime: false, daysDiff: result.daysDiff, config })
        setShowSeasonModal(true)
      }
    }
    checkSeason()
  }, [])

  const handleSeasonModalClose = async (newConfig?: RegionConfig) => {
    if (newConfig) {
      await saveRegionConfig(newConfig)
    }
    setShowSeasonModal(false)
  }

  return (
    <ToastProvider>
    <div className="min-h-screen bg-cream grain gradient-mesh">
      <main className="mx-auto max-w-md">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route
              path="/"
              element={
                <AnimatedPage>
                  <Home />
                </AnimatedPage>
              }
            />
            <Route
              path="/explore"
              element={
                <AnimatedPage>
                  <Explore />
                </AnimatedPage>
              }
            />
            <Route
              path="/recipe/:id"
              element={
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <RecipeDetail />
                </motion.div>
              }
            />
            <Route
              path="/recipe/new"
              element={
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <RecipeForm />
                </motion.div>
              }
            />
            <Route
              path="/recipe/:id/edit"
              element={
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <RecipeForm />
                </motion.div>
              }
            />
            <Route
              path="/records"
              element={
                <AnimatedPage>
                  <DietRecords />
                </AnimatedPage>
              }
            />
            <Route
              path="/shopping"
              element={
                <AnimatedPage>
                  <ShoppingList />
                </AnimatedPage>
              }
            />
            <Route
              path="/settings"
              element={
                <AnimatedPage>
                  <Settings />
                </AnimatedPage>
              }
            />
          </Routes>
        </AnimatePresence>
      </main>
      {!isDetailPage && !isFormPage && <BottomNav />}

      {/* Season Check Modal */}
      <SeasonCheckModal
        isOpen={showSeasonModal}
        onClose={handleSeasonModalClose}
        initialConfig={seasonModalProps.config}
        isFirstTime={seasonModalProps.isFirstTime}
        daysDiff={seasonModalProps.daysDiff}
      />
    </div>
    </ToastProvider>
  )
}

export default App
