/**
 * @file services/excelService.ts
 * @description Excel import/export service using SheetJS
 *
 * Handles:
 * - Excel file parsing (.xlsx, .xls)
 * - Column detection and mapping
 * - Data extraction to Participant and Coupon arrays
 * - Export winners to Excel
 */

import * as XLSX from 'xlsx'
import type {
  ImportResult,
  ImportStats,
  ImportError,
  Participant,
  Coupon,
  Winner,
  Prize,
} from '@/types'
import {
  REQUIRED_IMPORT_COLUMNS,
  OPTIONAL_IMPORT_COLUMNS,
  DEFAULT_COUPON_WEIGHT,
  MAX_IMPORT_FILE_SIZE,
  SUPPORTED_EXCEL_EXTENSIONS,
} from '@/utils/constants'
import { getFileExtension } from '@/utils/helpers'

/**
 * Raw row data from Excel file
 */
interface RawRow {
  [key: string]: string | number | undefined
}

/**
 * Parsed Excel data structure
 */
interface ParsedExcelData {
  headers: string[]
  rows: RawRow[]
}

/**
 * Validates if a file is a supported Excel format
 * @param file - File to validate
 * @returns True if valid Excel file
 */
export function isValidExcelFile(file: File): boolean {
  const extension = getFileExtension(file.name)
  return SUPPORTED_EXCEL_EXTENSIONS.includes(extension as '.xlsx' | '.xls')
}

/**
 * Validates file size
 * @param file - File to validate
 * @returns True if file size is within limit
 */
export function isValidFileSize(file: File): boolean {
  return file.size <= MAX_IMPORT_FILE_SIZE
}

/**
 * Parses an Excel file and returns headers and rows
 * @param file - Excel file to parse
 * @returns Parsed data with headers and rows
 */
export async function parseExcelFile(file: File): Promise<ParsedExcelData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'array' })

        // Get first sheet
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]

        // Convert to JSON with header row
        const jsonData = XLSX.utils.sheet_to_json<RawRow>(worksheet, {
          defval: '',
        })

        // Get headers from first row
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
        const headers: string[] = []

        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
          const cell = worksheet[cellAddress]
          headers.push(cell ? String(cell.v).trim() : `Column${col + 1}`)
        }

        resolve({
          headers,
          rows: jsonData,
        })
      } catch (error) {
        reject(new Error(`Failed to parse Excel file: ${error}`))
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsArrayBuffer(file)
  })
}

/**
 * Detects custom fields from Excel headers
 * @param headers - Excel headers
 * @returns Array of custom field names
 */
export function detectCustomFields(headers: string[]): string[] {
  const standardFields = [
    ...REQUIRED_IMPORT_COLUMNS,
    ...OPTIONAL_IMPORT_COLUMNS,
    'weight', // Optional weight column
  ]

  return headers.filter(
    (header) => !standardFields.includes(header.toLowerCase())
  )
}

/**
 * Imports participants and coupons from Excel file
 * @param file - Excel file to import
 * @param eventId - Event ID to associate data with
 * @returns Import result with stats, participants, and coupons
 */
export async function importExcel(
  file: File,
  eventId: string
): Promise<ImportResult> {
  // Validate file
  if (!isValidExcelFile(file)) {
    return {
      success: false,
      stats: createEmptyStats([`Unsupported file format. Please use .xlsx or .xls files.`]),
    }
  }

  if (!isValidFileSize(file)) {
    return {
      success: false,
      stats: createEmptyStats([`File size exceeds maximum limit of 10MB.`]),
    }
  }

  // Parse file
  const { headers, rows } = await parseExcelFile(file)

  // Validate required columns
  const lowerHeaders = headers.map((h) => h.toLowerCase())
  const missingColumns = REQUIRED_IMPORT_COLUMNS.filter(
    (col) => !lowerHeaders.includes(col)
  )

  if (missingColumns.length > 0) {
    return {
      success: false,
      stats: createEmptyStats([
        `Missing required columns: ${missingColumns.join(', ')}`,
      ]),
    }
  }

  // Find column indices
  const couponIdCol = headers.find(
    (h) => h.toLowerCase() === 'coupon_id'
  )!
  const participantIdCol = headers.find(
    (h) => h.toLowerCase() === 'participant_id'
  )!
  const nameCol = headers.find(
    (h) => h.toLowerCase() === 'participant_name'
  )
  const emailCol = headers.find((h) => h.toLowerCase() === 'email')
  const phoneCol = headers.find((h) => h.toLowerCase() === 'phone')
  const weightCol = headers.find((h) => h.toLowerCase() === 'weight')

  // Detect custom fields
  const customFields = detectCustomFields(headers)

  // Process rows
  const errors: ImportError[] = []
  const participantsMap = new Map<string, Participant>()
  const coupons: Coupon[] = []
  const couponIds = new Set<string>()
  // Track coupon count per participant for pre-computed couponCount
  const couponCountMap = new Map<string, number>()

  rows.forEach((row, index) => {
    const rowNum = index + 2 // +2 for header row and 1-indexed

    // Get coupon_id
    const couponId = String(row[couponIdCol] || '').trim()
    if (!couponId) {
      errors.push({
        row: rowNum,
        column: 'coupon_id',
        message: 'coupon_id is required',
      })
      return
    }

    // Check for duplicate coupon_id
    if (couponIds.has(couponId)) {
      errors.push({
        row: rowNum,
        column: 'coupon_id',
        message: 'Duplicate coupon_id',
        value: couponId,
      })
      return
    }
    couponIds.add(couponId)

    // Get participant_id
    const participantId = String(row[participantIdCol] || '').trim()
    if (!participantId) {
      errors.push({
        row: rowNum,
        column: 'participant_id',
        message: 'participant_id is required',
      })
      return
    }

    // Increment coupon count for this participant
    couponCountMap.set(participantId, (couponCountMap.get(participantId) || 0) + 1)

    // Get optional fields
    const name = nameCol ? String(row[nameCol] || '').trim() : undefined
    const email = emailCol ? String(row[emailCol] || '').trim() : undefined
    const phone = phoneCol ? String(row[phoneCol] || '').trim() : undefined
    const weight = weightCol
      ? parseFloat(String(row[weightCol])) || DEFAULT_COUPON_WEIGHT
      : DEFAULT_COUPON_WEIGHT

    // Build custom fields
    const customFieldsData: Record<string, string> = {}
    customFields.forEach((field) => {
      const value = row[field]
      if (value !== undefined && value !== '') {
        customFieldsData[field] = String(value).trim()
      }
    })

    // Create or update participant
    // Note: Same participant_id with different names is valid
    // We take the first occurrence for participant info
    if (!participantsMap.has(participantId)) {
      participantsMap.set(participantId, {
        id: participantId,
        eventId,
        name,
        email,
        phone,
        customFields: customFieldsData,
        couponCount: 0, // Will be set after all rows are processed
        winCount: 0,
        status: 'active',
      })
    }

    // Create coupon
    coupons.push({
      id: couponId,
      eventId,
      participantId,
      weight,
      status: 'active',
    })
  })

  // Set final couponCount for each participant (pre-computed)
  const participants = Array.from(participantsMap.values()).map((p) => ({
    ...p,
    couponCount: couponCountMap.get(p.id) || 0,
  }))

  // Create stats
  const stats: ImportStats = {
    totalRows: rows.length,
    validRows: coupons.length,
    invalidRows: errors.length,
    uniqueParticipants: participants.length,
    totalCoupons: coupons.length,
    customFields,
    errors,
  }

  // Return result
  if (errors.length > 0 && coupons.length === 0) {
    return {
      success: false,
      stats,
    }
  }

  return {
    success: true,
    stats,
    participants,
    coupons,
  }
}

/**
 * Creates empty stats with error messages
 */
function createEmptyStats(errorMessages: string[]): ImportStats {
  return {
    totalRows: 0,
    validRows: 0,
    invalidRows: 0,
    uniqueParticipants: 0,
    totalCoupons: 0,
    customFields: [],
    errors: errorMessages.map((message) => ({
      row: 0,
      column: '',
      message,
    })),
  }
}

/**
 * Exports winners to Excel file
 * @param winners - Winner data to export
 * @param prizes - Prize data for grouping
 * @param eventName - Event name for filename
 */
export function exportWinnersToExcel(
  winners: Winner[],
  prizes: Prize[],
  eventName: string
): void {
  // Create prize lookup
  const prizeMap = new Map(prizes.map((p) => [p.id, p]))

  // Prepare data for export
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

  // Create workbook and worksheet
  const ws = XLSX.utils.json_to_sheet(exportData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Winners')

  // Auto-fit column widths
  const colWidths = Object.keys(exportData[0] || {}).map((key) => ({
    wch: Math.max(
      key.length,
      ...exportData.map((row) =>
        String((row as Record<string, unknown>)[key] || '').length
      )
    ),
  }))
  ws['!cols'] = colWidths

  // Generate filename
  const sanitizedName = eventName.replace(/[^a-zA-Z0-9]/g, '_')
  const timestamp = new Date().toISOString().slice(0, 10)
  const filename = `${sanitizedName}_winners_${timestamp}.xlsx`

  // Download file
  XLSX.writeFile(wb, filename)
}

/**
 * Gets preview data from Excel file (first N rows)
 * @param file - Excel file
 * @param maxRows - Maximum rows to preview
 * @returns Preview data
 */
export async function getExcelPreview(
  file: File,
  maxRows = 10
): Promise<{ headers: string[]; rows: RawRow[] }> {
  const { headers, rows } = await parseExcelFile(file)
  return {
    headers,
    rows: rows.slice(0, maxRows),
  }
}

/**
 * Import Excel with progress callback for UI updates
 * @param file - Excel file to import
 * @param eventId - Event ID to associate data with
 * @param onProgress - Progress callback (0-100)
 * @returns Import result with stats, participants, and coupons
 */
export async function importExcelWithProgress(
  file: File,
  eventId: string,
  onProgress?: (progress: number, message?: string) => void
): Promise<ImportResult> {
  // Report initial progress
  onProgress?.(5, 'Validating file...')

  // Validate file
  if (!isValidExcelFile(file)) {
    return {
      success: false,
      stats: createEmptyStats([`Unsupported file format. Please use .xlsx or .xls files.`]),
    }
  }

  if (!isValidFileSize(file)) {
    return {
      success: false,
      stats: createEmptyStats([`File size exceeds maximum limit of 10MB.`]),
    }
  }

  onProgress?.(15, 'Parsing Excel file...')

  // Parse file
  const { headers, rows } = await parseExcelFile(file)

  onProgress?.(30, 'Validating columns...')

  // Validate required columns
  const lowerHeaders = headers.map((h) => h.toLowerCase())
  const missingColumns = REQUIRED_IMPORT_COLUMNS.filter(
    (col) => !lowerHeaders.includes(col)
  )

  if (missingColumns.length > 0) {
    return {
      success: false,
      stats: createEmptyStats([
        `Missing required columns: ${missingColumns.join(', ')}`,
      ]),
    }
  }

  onProgress?.(40, 'Processing rows...')

  // Find column indices
  const couponIdCol = headers.find(
    (h) => h.toLowerCase() === 'coupon_id'
  )!
  const participantIdCol = headers.find(
    (h) => h.toLowerCase() === 'participant_id'
  )!
  const nameCol = headers.find(
    (h) => h.toLowerCase() === 'participant_name'
  )
  const emailCol = headers.find((h) => h.toLowerCase() === 'email')
  const phoneCol = headers.find((h) => h.toLowerCase() === 'phone')
  const weightCol = headers.find((h) => h.toLowerCase() === 'weight')

  // Detect custom fields
  const customFields = detectCustomFields(headers)

  // Process rows with progress updates
  const errors: ImportError[] = []
  const participantsMap = new Map<string, Participant>()
  const coupons: Coupon[] = []
  const couponIds = new Set<string>()
  // Track coupon count per participant for pre-computed couponCount
  const couponCountMap = new Map<string, number>()

  const totalRows = rows.length
  const progressStart = 40
  const progressEnd = 90

  rows.forEach((row, index) => {
    const rowNum = index + 2 // +2 for header row and 1-indexed

    // Update progress every 1000 rows
    if (index % 1000 === 0) {
      const progressPercent = progressStart + ((progressEnd - progressStart) * index / totalRows)
      onProgress?.(progressPercent, `Processing row ${index + 1} of ${totalRows}...`)
    }

    // Get coupon_id
    const couponId = String(row[couponIdCol] || '').trim()
    if (!couponId) {
      errors.push({
        row: rowNum,
        column: 'coupon_id',
        message: 'coupon_id is required',
      })
      return
    }

    // Check for duplicate coupon_id
    if (couponIds.has(couponId)) {
      errors.push({
        row: rowNum,
        column: 'coupon_id',
        message: 'Duplicate coupon_id',
        value: couponId,
      })
      return
    }
    couponIds.add(couponId)

    // Get participant_id
    const participantId = String(row[participantIdCol] || '').trim()
    if (!participantId) {
      errors.push({
        row: rowNum,
        column: 'participant_id',
        message: 'participant_id is required',
      })
      return
    }

    // Increment coupon count for this participant
    couponCountMap.set(participantId, (couponCountMap.get(participantId) || 0) + 1)

    // Get optional fields
    const name = nameCol ? String(row[nameCol] || '').trim() : undefined
    const email = emailCol ? String(row[emailCol] || '').trim() : undefined
    const phone = phoneCol ? String(row[phoneCol] || '').trim() : undefined
    const weight = weightCol
      ? parseFloat(String(row[weightCol])) || DEFAULT_COUPON_WEIGHT
      : DEFAULT_COUPON_WEIGHT

    // Build custom fields
    const customFieldsData: Record<string, string> = {}
    customFields.forEach((field) => {
      const value = row[field]
      if (value !== undefined && value !== '') {
        customFieldsData[field] = String(value).trim()
      }
    })

    // Create or update participant
    if (!participantsMap.has(participantId)) {
      participantsMap.set(participantId, {
        id: participantId,
        eventId,
        name,
        email,
        phone,
        customFields: customFieldsData,
        couponCount: 0, // Will be set after all rows are processed
        winCount: 0,
        status: 'active',
      })
    }

    // Create coupon
    coupons.push({
      id: couponId,
      eventId,
      participantId,
      weight,
      status: 'active',
    })
  })

  onProgress?.(95, 'Finalizing...')

  // Set final couponCount for each participant (pre-computed)
  const participants = Array.from(participantsMap.values()).map((p) => ({
    ...p,
    couponCount: couponCountMap.get(p.id) || 0,
  }))

  // Create stats
  const stats: ImportStats = {
    totalRows: rows.length,
    validRows: coupons.length,
    invalidRows: errors.length,
    uniqueParticipants: participants.length,
    totalCoupons: coupons.length,
    customFields,
    errors,
  }

  onProgress?.(100, 'Complete!')

  // Return result
  if (errors.length > 0 && coupons.length === 0) {
    return {
      success: false,
      stats,
    }
  }

  return {
    success: true,
    stats,
    participants,
    coupons,
  }
}
