import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/toaster'
import ProtectedRoute from '@/components/layout/ProtectedRoute'
import Login from '@/pages/Login'
import Home from '@/pages/Home'
import EventWizard from '@/pages/EventWizard'
import EventDetail from '@/pages/EventDetail'
import EditEvent from '@/pages/EditEvent'
import ImportParticipants from '@/pages/ImportParticipants'
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
          <Toaster />
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
