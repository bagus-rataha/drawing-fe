/**
 * @file components/draw/PrizeWinnersModal.tsx
 * @description Modal showing confirmed winners and cancelled/void winners for a prize
 */

import { useEffect, useState, useMemo } from 'react'
import { format } from 'date-fns'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { getPrize } from '@/services/api/prizeApi'
import type { WinnerResponse } from '@/types/api'
import type { Prize } from '@/types'

interface PrizeWinnersModalProps {
  isOpen: boolean
  onClose: () => void
  prize: Prize | null
}

const ITEMS_PER_PAGE = 10

function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
}: {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
}) {
  if (totalPages <= 1) return null
  const startIndex = (currentPage - 1) * itemsPerPage
  return (
    <div className="px-6 py-3 border-t border-[#e2e8f0] flex items-center justify-between">
      <p className="text-sm text-[#64748b]">
        Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, totalItems)} of {totalItems}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="p-2 rounded-lg hover:bg-[#f6f9fc] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-[#64748b]" />
        </button>
        <span className="text-sm text-[#0a2540] min-w-[80px] text-center">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg hover:bg-[#f6f9fc] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-[#64748b]" />
        </button>
      </div>
    </div>
  )
}

export function PrizeWinnersModal({
  isOpen,
  onClose,
  prize,
}: PrizeWinnersModalProps) {
  const [allWinners, setAllWinners] = useState<WinnerResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [confirmedPage, setConfirmedPage] = useState(1)
  const [voidPage, setVoidPage] = useState(1)

  useEffect(() => {
    if (isOpen) {
      setConfirmedPage(1)
      setVoidPage(1)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen && prize) {
      setLoading(true)
      getPrize(prize.id)
        .then((prizeData) => {
          setAllWinners(prizeData.winners || [])
        })
        .catch(console.error)
        .finally(() => setLoading(false))
    }
  }, [isOpen, prize])

  const confirmedWinners = useMemo(
    () => allWinners.filter(w => w.status === 'active' && w.confirmed_at),
    [allWinners]
  )

  const voidWinners = useMemo(
    () => allWinners.filter(w => w.status === 'void'),
    [allWinners]
  )

  if (!isOpen || !prize) return null

  const confirmedTotalPages = Math.ceil(confirmedWinners.length / ITEMS_PER_PAGE)
  const confirmedStartIndex = (confirmedPage - 1) * ITEMS_PER_PAGE
  const paginatedConfirmed = confirmedWinners.slice(confirmedStartIndex, confirmedStartIndex + ITEMS_PER_PAGE)

  const voidTotalPages = Math.ceil(voidWinners.length / ITEMS_PER_PAGE)
  const voidStartIndex = (voidPage - 1) * ITEMS_PER_PAGE
  const paginatedVoid = voidWinners.slice(voidStartIndex, voidStartIndex + ITEMS_PER_PAGE)

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#0a2540]">{prize.name}</h2>
            <p className="text-sm text-[#64748b]">
              {confirmedWinners.length} / {prize.quantity} confirmed
              {voidWinners.length > 0 && (
                <span className="text-red-500 ml-2">({voidWinners.length} cancelled)</span>
              )}
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
        <div className="overflow-auto max-h-[calc(85vh-80px)]">
          {loading ? (
            <div className="py-8 text-center text-[#64748b]">Loading...</div>
          ) : confirmedWinners.length === 0 && voidWinners.length === 0 ? (
            <div className="py-8 text-center text-[#64748b]">
              No winners yet
            </div>
          ) : (
            <>
              {/* Confirmed Winners Table */}
              {confirmedWinners.length > 0 && (
                <div>
                  <div className="px-6 py-3 bg-green-50 border-b border-green-100">
                    <h3 className="text-sm font-semibold text-green-800">
                      Confirmed Winners ({confirmedWinners.length})
                    </h3>
                  </div>
                  <table className="w-full">
                    <thead className="bg-[#f6f9fc] sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#64748b] uppercase">Batch</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#64748b] uppercase">Line</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#64748b] uppercase">Coupon</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#64748b] uppercase">Participant</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#64748b] uppercase">Confirmed At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e2e8f0]">
                      {paginatedConfirmed.map((winner) => (
                        <tr key={winner.id} className="hover:bg-[#f6f9fc]">
                          <td className="px-4 py-3 text-sm text-[#64748b]">
                            {winner.batch_number}
                          </td>
                          <td className="px-4 py-3 text-sm text-[#64748b]">
                            {winner.line_number}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-[#0a2540]">
                            {winner.coupon?.coupon_import_identifier || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-[#0a2540]">
                            <div>{winner.coupon?.participant?.name || '-'}</div>
                            <div className="text-xs text-[#64748b]">
                              {winner.coupon?.participant?.participant_import_identifier || '-'}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-[#64748b]">
                            {winner.confirmed_at
                              ? format(new Date(winner.confirmed_at), 'dd MMM HH:mm:ss')
                              : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <Pagination
                    currentPage={confirmedPage}
                    totalPages={confirmedTotalPages}
                    totalItems={confirmedWinners.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setConfirmedPage}
                  />
                </div>
              )}

              {/* Cancelled/Void Winners Table */}
              {voidWinners.length > 0 && (
                <div>
                  <div className="px-6 py-3 bg-red-50 border-b border-red-100 border-t border-t-[#e2e8f0]">
                    <h3 className="text-sm font-semibold text-red-800">
                      Cancelled / Void ({voidWinners.length})
                    </h3>
                  </div>
                  <table className="w-full">
                    <thead className="bg-[#f6f9fc] sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#64748b] uppercase">Batch</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#64748b] uppercase">Line</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#64748b] uppercase">Coupon</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#64748b] uppercase">Participant</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#64748b] uppercase">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e2e8f0]">
                      {paginatedVoid.map((winner) => (
                        <tr key={winner.id} className="hover:bg-red-50/50">
                          <td className="px-4 py-3 text-sm text-[#64748b]">
                            {winner.batch_number}
                          </td>
                          <td className="px-4 py-3 text-sm text-[#64748b]">
                            {winner.line_number}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-[#0a2540]">
                            {winner.coupon?.coupon_import_identifier || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-[#0a2540]">
                            <div>{winner.coupon?.participant?.name || '-'}</div>
                            <div className="text-xs text-[#64748b]">
                              {winner.coupon?.participant?.participant_import_identifier || '-'}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-red-600">
                            {winner.cancel_reason || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <Pagination
                    currentPage={voidPage}
                    totalPages={voidTotalPages}
                    totalItems={voidWinners.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setVoidPage}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default PrizeWinnersModal
