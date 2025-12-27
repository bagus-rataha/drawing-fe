/**
 * @file utils/textureAtlas.ts
 * @description Texture atlas generator for displaying coupon info on 3D sphere cards
 *
 * Creates a single canvas texture containing a grid of text cells.
 * Each card on the sphere uses UV offsets to display different coupon info from the atlas.
 * Supports multiple display modes: coupon-only, coupon+ID, coupon+name
 */

import * as THREE from 'three'
import { SPHERE_CONFIG } from './constants'
import type { WinnerDisplayMode } from '@/types'

/** Coupon data for atlas generation */
export interface CouponForAtlas {
  id: string
  participantId: string
  participantName?: string
}

interface AtlasConfig {
  /** Array of coupons to render in the atlas */
  coupons: CouponForAtlas[]
  /** Display mode determines what text to show */
  displayMode: WinnerDisplayMode
  /** Number of columns in the grid */
  cols?: number
  /** Width of each cell in pixels */
  cellWidth?: number
  /** Height of each cell in pixels */
  cellHeight?: number
  /** Font size in pixels */
  fontSize?: number
  /** Font family */
  fontFamily?: string
  /** Text color (CSS color) */
  textColor?: string
  /** Background color (CSS color) */
  bgColor?: string
}

interface AtlasResult {
  /** The generated Three.js texture */
  texture: THREE.CanvasTexture
  /** Number of columns in atlas */
  cols: number
  /** Number of rows in atlas */
  rows: number
  /** UV width of each cell (0-1) */
  cellUVWidth: number
  /** UV height of each cell (0-1) */
  cellUVHeight: number
  /** Total number of coupons in atlas */
  couponCount: number
}

/**
 * Creates a texture atlas from an array of coupons
 *
 * Display modes:
 * - coupon-only: Shows coupon ID only
 * - coupon-participant-id: Shows coupon ID + participant ID (2 lines)
 * - coupon-participant-name: Shows coupon ID + participant name (2 lines)
 */
export function createTextureAtlas(config: AtlasConfig): AtlasResult {
  const {
    coupons,
    displayMode,
    cols = SPHERE_CONFIG.atlasColumns,
    cellWidth = SPHERE_CONFIG.atlasCellWidth,
    cellHeight = SPHERE_CONFIG.atlasCellHeight,
    fontSize = 14,
    fontFamily = 'Plus Jakarta Sans, Arial, sans-serif',
    textColor = '#0a2540',
    bgColor = '#fdf4f7',
  } = config

  // Calculate grid dimensions
  const rows = Math.ceil(coupons.length / cols)
  const canvasWidth = cols * cellWidth
  const canvasHeight = rows * cellHeight

  // Create canvas
  const canvas = document.createElement('canvas')
  canvas.width = canvasWidth
  canvas.height = canvasHeight

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Failed to get 2D canvas context')
  }

  // Fill background
  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  // Configure text rendering
  ctx.fillStyle = textColor
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // Draw each coupon cell
  coupons.forEach((coupon, index) => {
    const col = index % cols
    const row = Math.floor(index / cols)

    const x = col * cellWidth + cellWidth / 2
    const y = row * cellHeight + cellHeight / 2

    // Generate display lines based on mode
    const lines: string[] = []

    switch (displayMode) {
      case 'coupon-only':
        lines.push(coupon.id)
        break
      case 'coupon-participant-id':
        lines.push(coupon.id)
        lines.push(coupon.participantId)
        break
      case 'coupon-participant-name':
        lines.push(coupon.id)
        lines.push(coupon.participantName || coupon.participantId)
        break
      default:
        lines.push(coupon.id)
    }

    // Calculate line positioning
    const lineHeight = fontSize + 4
    const totalTextHeight = lines.length * lineHeight
    const startY = y - totalTextHeight / 2 + lineHeight / 2

    // Draw each line
    lines.forEach((line, lineIndex) => {
      // First line (coupon ID) - smaller font
      if (lineIndex === 0 && lines.length > 1) {
        ctx.font = `${fontSize * 0.75}px ${fontFamily}`
      } else {
        // Second line (ID or name) - bold, larger
        ctx.font = `bold ${fontSize}px ${fontFamily}`
      }

      // Truncate if too long
      const maxChars = Math.floor(cellWidth / (fontSize * 0.5))
      const displayText = line.length > maxChars ? line.substring(0, maxChars - 2) + '..' : line

      ctx.fillText(displayText, x, startY + lineIndex * lineHeight)
    })
  })

  // Create Three.js texture
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true

  // Use linear filtering for better text quality
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter

  return {
    texture,
    cols,
    rows,
    cellUVWidth: 1 / cols,
    cellUVHeight: 1 / rows,
    couponCount: coupons.length,
  }
}

/**
 * Get UV offset for a specific coupon index
 * @param couponIndex - Index of the coupon in the atlas
 * @param cols - Number of columns in atlas
 * @param cellUVWidth - UV width of each cell
 * @param cellUVHeight - UV height of each cell
 * @returns UV offset [x, y]
 */
export function getUVOffset(
  couponIndex: number,
  cols: number,
  cellUVWidth: number,
  cellUVHeight: number
): [number, number] {
  const col = couponIndex % cols
  const row = Math.floor(couponIndex / cols)
  return [col * cellUVWidth, row * cellUVHeight]
}
