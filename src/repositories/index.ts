/**
 * @file repositories/index.ts
 * @description Export active repository implementations
 *
 * This file controls which repository implementation is used.
 * For Phase 1, we use Dexie.js (IndexedDB).
 * For Phase 2, switch to REST API implementations.
 *
 * Migration Guide:
 * 1. Create API implementations in ./api/ folder
 * 2. Change imports below from './dexie' to './api'
 * 3. All hooks and components will automatically use new implementation
 */

// Export interfaces
export * from './interfaces'

// Export Dexie implementations (Phase 1)
export {
  db,
  clearDatabase,
  deleteDatabase,
  eventRepository,
  prizeRepository,
  participantRepository,
  couponRepository,
  winnerRepository,
} from './dexie'

// Phase 2: Uncomment below and comment above to switch to API
// export {
//   eventRepository,
//   prizeRepository,
//   participantRepository,
//   couponRepository,
//   winnerRepository,
// } from './api'
