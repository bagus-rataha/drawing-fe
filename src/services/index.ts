/**
 * @file services/index.ts
 * @description Export all services
 */

// Excel service
export {
  isValidExcelFile,
  isValidFileSize,
  parseExcelFile,
  detectCustomFields,
  importExcel,
  exportWinnersToExcel,
  getExcelPreview,
} from './excelService'

// Validation service
export {
  validateEventInfo,
  validatePrize,
  validatePrizes,
  canParticipantWin,
  shouldAutoCancel,
  validatePreDraw,
  checkDuplicateCoupons,
  isValidEmail,
  isValidPhone,
} from './validationService'

export type {
  ValidationResult,
  PreDrawValidationResult,
} from './validationService'

// Winner service
export { winnerService } from './winnerService'
export type { IWinnerService } from './winnerService'

// Draw service
export { drawService } from './drawService'
export type { IDrawService } from './drawService'
