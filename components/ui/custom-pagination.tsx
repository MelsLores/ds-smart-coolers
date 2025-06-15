import React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface CustomPaginationProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

export const CustomPagination: React.FC<CustomPaginationProps> = ({ page, pageSize, total, onPageChange }) => {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center gap-2">
      <button
        className="px-2 py-1 rounded border bg-white disabled:opacity-50"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
      >
        <ChevronLeft className="inline w-4 h-4" />
      </button>
      <span className="text-sm">
        Página {page} de {totalPages}
      </span>
      <button
        className="px-2 py-1 rounded border bg-white disabled:opacity-50"
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
      >
        <ChevronRight className="inline w-4 h-4" />
      </button>
    </div>
  )
}
