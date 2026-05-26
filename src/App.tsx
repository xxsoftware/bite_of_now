import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { BottomNav } from '@/components/layout/BottomNav'
import Home from '@/pages/Home'
import Explore from '@/pages/Explore'
import RecipeDetail from '@/pages/RecipeDetail'
import DietRecords from '@/pages/DietRecords'
import ShoppingList from '@/pages/ShoppingList'
import Settings from '@/pages/Settings'

const pageTransition = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] as const },
}

function AnimatedPage({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={pageTransition.initial}
      animate={pageTransition.animate}
      exit={pageTransition.exit}
      transition={pageTransition.transition}
    >
      {children}
    </motion.div>
  )
}

function App() {
  const location = useLocation()
  const isDetailPage = location.pathname.startsWith('/recipe/')

  return (
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
      {!isDetailPage && <BottomNav />}
    </div>
  )
}

export default App
