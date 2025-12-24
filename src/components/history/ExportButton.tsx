/**
 * @file components/history/ExportButton.tsx
 * @description Export to Excel button component
 */

import { useState } from 'react'
import type { Winner, Prize } from '@/types'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import { exportWinnersToExcel } from '@/services/excelService'
import { useToast } from '@/components/ui/use-toast'

interface ExportButtonProps {
  winners: Winner[]
  prizes: Prize[]
  eventName: string
  disabled?: boolean
}

/**
 * Button to export winners to Excel file
 */
export function ExportButton({
  winners,
  prizes,
  eventName,
  disabled = false,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  const { toast } = useToast()

  const handleExport = async () => {
    if (winners.length === 0) {
      toast({
        title: 'No Data',
        description: 'There are no winners to export.',
        variant: 'destructive',
      })
      return
    }

    setIsExporting(true)

    try {
      exportWinnersToExcel(winners, prizes, eventName)
      toast({
        title: 'Export Successful',
        description: 'Winners have been exported to Excel.',
      })
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: `Failed to export: ${error}`,
        variant: 'destructive',
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button
      onClick={handleExport}
      disabled={disabled || isExporting || winners.length === 0}
    >
      {isExporting ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      Export Excel
    </Button>
  )
}

export default ExportButton
