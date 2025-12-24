/**
 * @file components/wizard/import/ImportUpload.tsx
 * @description Upload phase component for file selection
 */

import { useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, FileSpreadsheet } from 'lucide-react'
import { formatFileSize } from '@/utils/helpers'
import { isValidExcelFile, isValidFileSize } from '@/services/excelService'
import { MAX_IMPORT_FILE_SIZE } from '@/utils/constants'

interface ImportUploadProps {
  onFileSelect: (file: File) => void
  onError: (message: string) => void
}

/**
 * Upload phase component for selecting Excel file
 */
export function ImportUpload({ onFileSelect, onError }: ImportUploadProps) {
  const handleFileSelect = useCallback(
    (file: File) => {
      // Validate file type
      if (!isValidExcelFile(file)) {
        onError('Please select a valid Excel file (.xlsx or .xls)')
        return
      }

      // Validate file size
      if (!isValidFileSize(file)) {
        onError(`File size exceeds maximum limit of ${formatFileSize(MAX_IMPORT_FILE_SIZE)}`)
        return
      }

      onFileSelect(file)
    },
    [onFileSelect, onError]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile) {
        handleFileSelect(droppedFile)
      }
    },
    [handleFileSelect]
  )

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      handleFileSelect(selectedFile)
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div
          className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors hover:border-primary"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <FileSpreadsheet className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="mb-2 text-lg font-medium">Upload Excel File</p>
          <p className="mb-4 text-sm text-muted-foreground">
            Drag and drop or click to browse
          </p>
          <Input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileInputChange}
            className="hidden"
            id="file-upload"
          />
          <Label htmlFor="file-upload" className="cursor-pointer">
            <Button variant="outline" asChild>
              <span>
                <Upload className="mr-2 h-4 w-4" />
                Choose File
              </span>
            </Button>
          </Label>
        </div>
      </CardContent>
    </Card>
  )
}

export default ImportUpload
