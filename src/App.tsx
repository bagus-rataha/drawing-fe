import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/toaster'
import ProtectedRoute from '@/components/layout/ProtectedRoute'
import Login from '@/pages/Login'
import Home from '@/pages/Home'

// Lazy load heavy pages
const EventWizard = lazy(() => import('@/pages/EventWizard'))
const EventDetail = lazy(() => import('@/pages/EventDetail'))
const EditEvent = lazy(() => import('@/pages/EditEvent'))
const ImportParticipants = lazy(() => import('@/pages/ImportParticipants'))
const History = lazy(() => import('@/pages/History'))
const DrawScreen = lazy(() => import('@/pages/DrawScreen'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-background">
          <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<Home />} />
                <Route path="/events/new" element={<EventWizard />} />
                <Route path="/events/:id/edit" element={<EditEvent />} />
                <Route path="/events/:id/import" element={<ImportParticipants />} />
                <Route path="/events/:id" element={<EventDetail />} />
                <Route path="/draw/:id" element={<DrawScreen />} />
                <Route path="/history/:id" element={<History />} />
              </Route>
            </Routes>
          </Suspense>
          <Toaster />
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
