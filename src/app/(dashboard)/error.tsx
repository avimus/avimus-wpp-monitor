"use client"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <p className="text-sm text-gray-500">
        Ocorreu um erro ao carregar o painel.
      </p>
      <p className="text-xs text-gray-400">{error.message}</p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition-colors"
      >
        Tentar novamente
      </button>
    </div>
  )
}
