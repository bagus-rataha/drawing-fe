/**
 * @file App.tsx
 * @description Main application component with routing configuration
 *
 * Routes:
 * - / : Home page with event list
 * - /event/new : Create new event wizard
 * - /event/:id : Event detail page (FIX Rev 18)
 * - /event/:id/edit : Edit existing event wizard
 * - /event/:id/history : Winner history page
 * - /event/:id/draw : Draw screen with 3D animation
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/toaster'
import Home from '@/pages/Home'
import EventWizard from '@/pages/EventWizard'
import EventDetail from '@/pages/EventDetail'
import History from '@/pages/History'
import DrawScreen from '@/pages/DrawScreen'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-background">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/event/new" element={<EventWizard />} />
            {/* FIX (Rev 18): Event detail page - more specific routes first */}
            <Route path="/event/:id/edit" element={<EventWizard />} />
            <Route path="/event/:id/history" element={<History />} />
            <Route path="/event/:id/draw" element={<DrawScreen />} />
            <Route path="/event/:id" element={<EventDetail />} />
          </Routes>
          <Toaster />
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
