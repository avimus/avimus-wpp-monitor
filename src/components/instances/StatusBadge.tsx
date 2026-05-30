import { CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react"
import type { InstanceStatus } from "@/types"

const statusConfig: Record<
  InstanceStatus,
  { label: string; className: string; Icon: React.ElementType }
> = {
  connected: {
    label: "Conectada",
    className: "bg-green-100 text-green-800 border-green-200",
    Icon: CheckCircle,
  },
  disconnected: {
    label: "Desconectada",
    className: "bg-red-100 text-red-800 border-red-200",
    Icon: XCircle,
  },
  delivery_failure: {
    label: "Falha na Entrega",
    className: "bg-orange-100 text-orange-800 border-orange-200",
    Icon: AlertTriangle,
  },
  reconnecting: {
    label: "Reconectando",
    className: "bg-blue-100 text-blue-800 border-blue-200",
    Icon: Loader2,
  },
}

interface StatusBadgeProps {
  status: InstanceStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { label, className, Icon } = statusConfig[status]
  const isSpinning = status === "reconnecting"

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${className}`}
    >
      <Icon className={`w-3.5 h-3.5 ${isSpinning ? "animate-spin" : ""}`} />
      {label}
    </span>
  )
}
