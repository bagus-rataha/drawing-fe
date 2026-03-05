/**
 * @file pages/ImportParticipants.tsx
 * @description Import participants page with 3 phases: Upload → Progress → Result
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Users,
  Ticket,
  Loader2,
} from 'lucide-react'
import { useEvent, useImportParticipants } from '@/hooks'
import { eventKeys } from '@/hooks/useEvents'
import { getEvent } from '@/services/api/eventApi'
import { formatNumber } from '@/utils/helpers'

type ImportPhase = 'upload' | 'progress' | 'result'

export default function ImportParticipants() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Fetch event
  const { data: event, isLoading } = useEvent(id)
  const importMutation = useImportParticipants()

  // State
  const [phase, setPhase] = useState<ImportPhase>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Progress polling state
  const [importProgress, setImportProgress] = useState(0)
  const [importMessage, setImportMessage] = useState('')
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Result state
  const [resultSuccess, setResultSuccess] = useState(false)
  const [resultParticipants, setResultParticipants] = useState(0)
  const [resultCoupons, setResultCoupons] = useState(0)
  const [resultError, setResultError] = useState<string | null>(null)

  // Guard: redirect if import is already done or in_progress
  useEffect(() => {
    if (event) {
      if (event.import_status === 'done') {
        navigate(`/events/${id}`, { replace: true })
      } else if (event.import_status === 'in_progress') {
        // Resume polling if import is already in progress
        setPhase('progress')
        startPolling()
      }
    }
  }, [event, id, navigate])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [])

  // Start polling for import progress
  const startPolling = useCallback(() => {
    if (!id) return

    if (pollingRef.current) clearInterval(pollingRef.current)

    pollingRef.current = setInterval(async () => {
      try {
        const eventData = await getEvent(id)
        setImportProgress(eventData.import_progress || 0)
        setImportMessage(eventData.import_message || 'Processing...')

        if (eventData.import_status === 'done') {
          clearInterval(pollingRef.current!)
          pollingRef.current = null
          queryClient.invalidateQueries({ queryKey: eventKeys.detail(id) })
          setResultSuccess(true)
          setResultParticipants(eventData.total_participants)
          setResultCoupons(eventData.total_coupons)
          setPhase('result')
        } else if (eventData.import_status === 'fail') {
          clearInterval(pollingRef.current!)
          pollingRef.current = null
          queryClient.invalidateQueries({ queryKey: eventKeys.detail(id) })
          setResultSuccess(false)
          setResultError(eventData.import_message || 'Import failed')
          setPhase('result')
        }
      } catch {
        // Keep polling on transient errors
      }
    }, 150)
  }, [id])

  // Handle file selection
  const handleFileSelect = (selectedFile: File) => {
    setUploadError(null)

    // Validate .xlsx only
    if (!selectedFile.name.endsWith('.xlsx')) {
      setUploadError('Only .xlsx files are accepted')
      return
    }

    // Validate file size (10MB max)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setUploadError('File size must be less than 10MB')
      return
    }

    setFile(selectedFile)
  }

  // Handle upload
  const handleUpload = async () => {
    if (!file || !id) return

    setPhase('progress')
    setImportProgress(0)
    setImportMessage('Uploading file...')

    try {
      await importMutation.mutateAsync({ id, file })
      // Start polling after upload succeeds
      startPolling()
    } catch {
      setPhase('upload')
      setUploadError('Failed to upload file. Please try again.')
    }
  }

  // Handle drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files?.[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  // Handle re-upload (reset to upload phase)
  const handleReUpload = () => {
    setFile(null)
    setUploadError(null)
    setResultError(null)
    setPhase('upload')
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-alt">
        <Header />
        <main className="container py-8 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[600px]">
            <Skeleton className="mb-4 h-8 w-48" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </main>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-surface-alt">
        <Header />
        <main className="container py-8 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[600px] text-center">
            <p className="text-muted-foreground">Event not found</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-alt">
      <Header />

      <main className="container py-4 sm:py-6 lg:py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[600px]">
          {/* Header */}
          <Button variant="ghost" className="mb-2 -ml-2 sm:-ml-4" asChild>
            <Link to={`/events/${id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Event
            </Link>
          </Button>
          <h1 className="mb-2 text-2xl sm:text-3xl font-bold text-navy">Import Participants</h1>
          <p className="mb-6 text-sm text-muted-foreground">{event.name}</p>

          {/* Phase: Upload */}
          {phase === 'upload' && (
            <Card>
              <CardContent className="p-6 space-y-6">
                {/* Dropzone */}
                <div
                  className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 transition-colors ${
                    dragActive
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <FileSpreadsheet className="mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="mb-2 text-center font-medium">
                    {file ? file.name : 'Drag & drop your .xlsx file here'}
                  </p>
                  <p className="mb-4 text-center text-sm text-muted-foreground">
                    {file
                      ? `${(file.size / 1024).toFixed(1)} KB`
                      : 'Only .xlsx files are accepted (max 10MB)'}
                  </p>
                  <input
                    type="file"
                    accept=".xlsx"
                    className="hidden"
                    id="import-file"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFileSelect(e.target.files[0])
                    }}
                  />
                  <label htmlFor="import-file">
                    <Button variant="outline" asChild>
                      <span>
                        <Upload className="mr-2 h-4 w-4" />
                        {file ? 'Change File' : 'Browse Files'}
                      </span>
                    </Button>
                  </label>
                </div>

                {/* Error */}
                {uploadError && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800">
                    <XCircle className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm">{uploadError}</span>
                  </div>
                )}

                {/* Upload Button */}
                {file && !uploadError && (
                  <Button className="w-full" onClick={handleUpload} disabled={importMutation.isPending}>
                    {importMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload & Import
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Phase: Progress */}
          {phase === 'progress' && (
            <Card>
              <CardContent className="p-6 space-y-6">
                <div className="flex flex-col items-center text-center">
                  <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
                  <h3 className="mb-2 text-lg font-semibold">Importing Data...</h3>
                  <p className="mb-4 text-sm text-muted-foreground">{importMessage}</p>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${importProgress}%` }}
                  />
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  {importProgress}% complete
                </p>
              </CardContent>
            </Card>
          )}

          {/* Phase: Result */}
          {phase === 'result' && (
            <Card>
              <CardContent className="p-6 space-y-6">
                {resultSuccess ? (
                  <>
                    <div className="flex flex-col items-center text-center">
                      <CheckCircle2 className="mb-4 h-12 w-12 text-green-600" />
                      <h3 className="mb-2 text-lg font-semibold text-green-800">Import Successful</h3>
                      <p className="text-sm text-muted-foreground">
                        Participants have been imported successfully
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-3 rounded-lg border p-4">
                        <Users className="h-8 w-8 text-primary" />
                        <div>
                          <p className="text-2xl font-bold text-navy">
                            {formatNumber(resultParticipants)}
                          </p>
                          <p className="text-sm text-muted-foreground">Participants</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-lg border p-4">
                        <Ticket className="h-8 w-8 text-primary" />
                        <div>
                          <p className="text-2xl font-bold text-navy">
                            {formatNumber(resultCoupons)}
                          </p>
                          <p className="text-sm text-muted-foreground">Coupons</p>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex flex-col items-center text-center">
                      <XCircle className="mb-4 h-12 w-12 text-red-600" />
                      <h3 className="mb-2 text-lg font-semibold text-red-800">Import Failed</h3>
                      <p className="text-sm text-muted-foreground">
                        {resultError || 'An error occurred during import'}
                      </p>
                    </div>

                    <Button variant="outline" className="w-full" onClick={handleReUpload}>
                      Try Again
                    </Button>
                  </>
                )}

                <Button className="w-full" asChild>
                  <Link to={`/events/${id}`}>Back to Event</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
