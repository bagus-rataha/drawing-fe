/**
 * @file components/draw/PrizeWinnersModal.tsx
 * @description Modal showing confirmed winners for a prize with pagination
 */

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { winnerService } from '@/services'
import type { Winner, Prize } from '@/types'

interface PrizeWinnersModalProps {
  isOpen: boolean
  onClose: () => void
  prize: Prize | null
}

const ITEMS_PER_PAGE = 10

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    valid: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    skipped: 'bg-amber-100 text-amber-700',
  }

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.valid}`}>
      {status}
    </span>
  )
}

export function PrizeWinnersModal({
  isOpen,
  onClose,
  prize,
}: PrizeWinnersModalProps) {
  const [winners, setWinners] = useState<Winner[]>([])
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  // Reset page when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentPage(1)
    }
  }, [isOpen])

  // Load winners data
  useEffect(() => {
    if (isOpen && prize) {
      setLoading(true)
      winnerService
        .getConfirmedByPrizeId(prize.id)
        .then(setWinners)
        .finally(() => setLoading(false))
    }
  }, [isOpen, prize])

  if (!isOpen || !prize) return null

  // Pagination calculations
  const totalPages = Math.ceil(winners.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedWinners = winners.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#0a2540]">{prize.name}</h2>
            <p className="text-sm text-[#64748b]">
              {winners.length} / {prize.quantity} winners
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#f6f9fc] rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-[#64748b]" />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-8 text-center text-[#64748b]">Loading...</div>
        ) : winners.length === 0 ? (
          <div className="py-8 text-center text-[#64748b]">
            No confirmed winners yet
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="overflow-auto max-h-[50vh]">
              <table className="w-full">
                <thead className="bg-[#f6f9fc] sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#64748b] uppercase">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#64748b] uppercase">
                      Coupon
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#64748b] uppercase">
                      Participant
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#64748b] uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#64748b] uppercase">
                      Confirmed At
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0]">
                  {paginatedWinners.map((winner, index) => (
                    <tr key={winner.id} className="hover:bg-[#f6f9fc]">
                      <td className="px-4 py-3 text-sm text-[#64748b]">
                        {startIndex + index + 1}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-[#0a2540]">
                        {winner.couponId}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#0a2540]">
                        <div>{winner.participantName || '-'}</div>
                        <div className="text-xs text-[#64748b]">{winner.participantId}</div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={winner.status} />
                      </td>
                      <td className="px-4 py-3 text-sm text-[#64748b]">
                        {winner.confirmedAt
                          ? format(new Date(winner.confirmedAt), 'dd MMM HH:mm:ss')
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-[#e2e8f0] flex items-center justify-between">
                <p className="text-sm text-[#64748b]">
                  Showing {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, winners.length)} of {winners.length}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg hover:bg-[#f6f9fc] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-[#64748b]" />
                  </button>
                  <span className="text-sm text-[#0a2540] min-w-[80px] text-center">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg hover:bg-[#f6f9fc] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-[#64748b]" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default PrizeWinnersModal
