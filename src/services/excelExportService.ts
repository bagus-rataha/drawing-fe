/**
 * @file services/excelExportService.ts
 * @description Excel export functions — extracted from excelService.ts
 */

import * as XLSX from 'xlsx'
import type { Winner, Prize } from '@/types'
import type { PrizesListResponse, WinnerResponse } from '@/types/api'

function formatDateTimeForExcel(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleString('id-ID')
  } catch {
    return dateStr
  }
}

function autoFitColumns(ws: XLSX.WorkSheet, data: Record<string, unknown>[]): void {
  if (data.length === 0) return
  const colWidths = Object.keys(data[0]).map((key) => ({
    wch: Math.max(
      key.length,
      ...data.map((row) => String(row[key] || '').length)
    ),
  }))
  ws['!cols'] = colWidths
}

function winnerToRow(w: WinnerResponse, index: number) {
  return {
    '#': index + 1,
    'Coupon ID': w.coupon?.coupon_import_identifier || '-',
    'Participant ID': w.coupon?.participant?.participant_import_identifier || '-',
    'Participant Name': w.coupon?.participant?.name || '-',
    'Batch': w.batch_number,
    'Line': w.line_number,
    'Confirmed At': formatDateTimeForExcel(w.confirmed_at),
  }
}

function voidWinnerToRow(w: WinnerResponse, index: number, prizeName: string) {
  return {
    '#': index + 1,
    'Prize': prizeName,
    'Coupon ID': w.coupon?.coupon_import_identifier || '-',
    'Participant ID': w.coupon?.participant?.participant_import_identifier || '-',
    'Participant Name': w.coupon?.participant?.name || '-',
    'Batch': w.batch_number,
    'Line': w.line_number,
    'Reason': w.cancel_reason || '-',
    'Drawn At': formatDateTimeForExcel(w.created_at),
  }
}

/**
 * Exports winners to Excel file
 */
export function exportWinnersToExcel(
  winners: Winner[],
  prizes: Prize[],
  eventName: string
): void {
  const prizeMap = new Map(prizes.map((p) => [p.id, p]))

  const exportData = winners.map((winner, index) => {
    const prize = prizeMap.get(winner.prizeId)
    return {
      '#': index + 1,
      Prize: prize?.name || 'Unknown',
      'Participant Name': winner.participantName || '',
      'Coupon ID': winner.couponId,
      'Participant ID': winner.participantId,
      Batch: winner.batchNumber,
      'Drawn At': new Date(winner.drawnAt).toLocaleString('id-ID'),
      ...winner.customFieldsSnapshot,
    }
  })

  const ws = XLSX.utils.json_to_sheet(exportData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Winners')

  const colWidths = Object.keys(exportData[0] || {}).map((key) => ({
    wch: Math.max(
      key.length,
      ...exportData.map((row) =>
        String((row as Record<string, unknown>)[key] || '').length
      )
    ),
  }))
  ws['!cols'] = colWidths

  const sanitizedName = eventName.replace(/[^a-zA-Z0-9]/g, '_')
  const timestamp = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `${sanitizedName}_winners_${timestamp}.xlsx`)
}

/**
 * Exports winners to Excel with separate sheets per prize + a cancelled sheet
 */
export function exportHistoryToExcel(
  prizes: PrizesListResponse[],
  eventName: string
): void {
  const wb = XLSX.utils.book_new()
  const allVoid: { winner: WinnerResponse; prizeName: string }[] = []

  for (const prize of prizes) {
    const confirmed = (prize.winners || []).filter(
      (w) => w.status === 'active' && w.confirmed_at
    )
    const voided = (prize.winners || []).filter((w) => w.status === 'void')

    for (const v of voided) {
      allVoid.push({ winner: v, prizeName: prize.name })
    }

    const rows = confirmed.map((w, i) => winnerToRow(w, i))

    if (rows.length > 0) {
      const ws = XLSX.utils.json_to_sheet(rows)
      autoFitColumns(ws, rows)
      XLSX.utils.book_append_sheet(wb, ws, prize.name.slice(0, 31))
    } else {
      const ws = XLSX.utils.json_to_sheet([], {
        header: ['#', 'Coupon ID', 'Participant ID', 'Participant Name', 'Batch', 'Line', 'Confirmed At'],
      })
      XLSX.utils.book_append_sheet(wb, ws, prize.name.slice(0, 31))
    }
  }

  if (allVoid.length > 0) {
    const voidRows = allVoid.map(({ winner, prizeName }, i) =>
      voidWinnerToRow(winner, i, prizeName)
    )
    const ws = XLSX.utils.json_to_sheet(voidRows)
    autoFitColumns(ws, voidRows)
    XLSX.utils.book_append_sheet(wb, ws, 'Cancelled')
  }

  const sanitizedName = eventName.replace(/[^a-zA-Z0-9]/g, '_')
  const timestamp = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `${sanitizedName}_winners_${timestamp}.xlsx`)
}
