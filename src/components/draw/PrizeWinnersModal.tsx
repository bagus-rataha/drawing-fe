/**
 * @file components/draw/PrizeWinnersModal.tsx
 * @description Modal showing confirmed winners for a prize
 */

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { winnerService } from '@/services'
import type { Winner, Prize } from '@/types'

interface PrizeWinnersModalProps {
  isOpen: boolean
  onClose: () => void
  prize: Prize | null
}

export function PrizeWinnersModal({
  isOpen,
  onClose,
  prize,
}: PrizeWinnersModalProps) {
  const [winners, setWinners] = useState<Winner[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && prize) {
      setLoading(true)
      winnerService
        .getConfirmedByPrizeId(prize.id)
        .then(setWinners)
        .finally(() => setLoading(false))
    }
  }, [isOpen, prize])

  if (!prize) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{prize.name} - Winners</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-[#64748b]">Loading...</div>
        ) : winners.length === 0 ? (
          <div className="py-8 text-center text-[#64748b]">
            No confirmed winners yet
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No</TableHead>
                <TableHead>Participant ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Coupon ID</TableHead>
                <TableHead>Confirmed At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {winners.map((winner, index) => (
                <TableRow key={winner.id}>
                  <TableCell className="text-[#64748b]">{index + 1}</TableCell>
                  <TableCell>{winner.participantId}</TableCell>
                  <TableCell className="font-medium">
                    {winner.participantName || '-'}
                  </TableCell>
                  <TableCell className="text-[#64748b]">
                    {winner.couponId}
                  </TableCell>
                  <TableCell className="text-[#64748b]">
                    {winner.confirmedAt
                      ? format(new Date(winner.confirmedAt), 'dd MMM HH:mm:ss')
                      : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default PrizeWinnersModal
