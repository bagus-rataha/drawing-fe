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
 * Truncate text to fit within maxWidth
 */
function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text

  let truncated = text
  while (ctx.measureText(truncated + '..').width > maxWidth && truncated.length > 0) {
    truncated = truncated.slice(0, -1)
  }
  return truncated + '..'
}

/**
 * Creates a texture atlas from an array of coupons
 *
 * Display modes:
 * - coupon-only: Shows coupon ID only (primary style)
 * - coupon-participant-id: Shows coupon ID (secondary) + participant ID (primary)
 * - coupon-participant-name: Shows coupon ID (secondary) + participant name (primary)
 */
export function createTextureAtlas(config: AtlasConfig): AtlasResult {
  const {
    coupons,
    displayMode,
    cols = SPHERE_CONFIG.atlasColumns,
    cellWidth = SPHERE_CONFIG.atlasCellWidth,
    cellHeight = SPHERE_CONFIG.atlasCellHeight,
    bgColor = '#fdf4f7',
  } = config

  const fontSettings = SPHERE_CONFIG.fontSettings

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
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // Draw each coupon cell
  coupons.forEach((coupon, index) => {
    const col = index % cols
    const row = Math.floor(index / cols)

    const x = col * cellWidth + cellWidth / 2
    const y = row * cellHeight + cellHeight / 2

    // Generate display text based on mode
    let primaryText = ''
    let secondaryText = ''

    switch (displayMode) {
      case 'coupon-only':
        primaryText = coupon.id
        break
      case 'coupon-participant-id':
        primaryText = coupon.participantId
        secondaryText = coupon.id
        break
      case 'coupon-participant-name':
        primaryText = coupon.participantName || coupon.participantId
        secondaryText = coupon.id
        break
      default:
        primaryText = coupon.id
    }

    const lineHeight = fontSettings.primarySize + 6
    const maxTextWidth = cellWidth - 10

    if (secondaryText) {
      // Two-line layout: secondary (coupon ID) on top, primary (name/ID) below
      // Draw secondary text (coupon ID) - top, smaller, muted
      ctx.font = `${fontSettings.secondarySize}px ${fontSettings.family}`
      ctx.fillStyle = fontSettings.secondaryColor
      const truncatedSecondary = truncateText(ctx, secondaryText, maxTextWidth)
      ctx.fillText(truncatedSecondary, x, y - lineHeight / 2)

      // Draw primary text (name/ID) - bottom, bold
      ctx.font = `${fontSettings.primaryWeight} ${fontSettings.primarySize}px ${fontSettings.family}`
      ctx.fillStyle = fontSettings.primaryColor
      const truncatedPrimary = truncateText(ctx, primaryText, maxTextWidth)
      ctx.fillText(truncatedPrimary, x, y + lineHeight / 2)
    } else {
      // Single line layout: primary text centered
      ctx.font = `${fontSettings.primaryWeight} ${fontSettings.primarySize}px ${fontSettings.family}`
      ctx.fillStyle = fontSettings.primaryColor
      const truncatedPrimary = truncateText(ctx, primaryText, maxTextWidth)
      ctx.fillText(truncatedPrimary, x, y)
    }
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
