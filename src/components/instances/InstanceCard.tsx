"use client"

import { useState } from "react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { AlertCircle, History, Wifi, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { StatusBadge } from "./StatusBadge"
import { QRCodeModal } from "./QRCodeModal"
import type { Instance, InstanceStatus } from "@/types"

interface InstanceCardProps {
  instance: Instance
}

export function InstanceCard({ instance }: InstanceCardProps) {
  const [currentStatus, setCurrentStatus] = useState<InstanceStatus>(
    instance.current_status
  )
  const [lastSyncAt, setLastSyncAt] = useState(instance.last_sync_at)
  const [qrcode, setQrcode] = useState<string | null>(null)
  const [loadingQr, setLoadingQr] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState(false)

  const lastSync = lastSyncAt ? new Date(lastSyncAt) : null
  const stale = lastSync ? Date.now() - lastSync.getTime() > 60_000 : true

  async function handleCheckStatus() {
    setLoadingStatus(true)
    try {
      const res = await fetch(`/api/instances/${instance.id}/status`)
      const data = await res.json()

      if (!res.ok) {
        toast.error("Não foi possível verificar o status.")
        return
      }

      setCurrentStatus(data.status as InstanceStatus)
      setLastSyncAt(data.last_sync_at)

      if (data.stale) {
        toast.warning("Status pode estar desatualizado — sem sincronização recente.")
      } else {
        toast.success(`Status: ${statusLabel(data.status)}`)
      }
    } catch {
      toast.error("Erro de conexão ao verificar status.")
    } finally {
      setLoadingStatus(false)
    }
  }

  async function handleReconnect() {
    setLoadingQr(true)
    try {
      const res = await fetch(`/api/instances/${instance.id}/qrcode`, {
        method: "POST",
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? "Erro ao gerar QR Code. Tente novamente.")
        return
      }

      setQrcode(data.qrcode)
    } catch {
      toast.error("Erro de conexão. Tente novamente.")
    } finally {
      setLoadingQr(false)
    }
  }

  async function handleRegenerate() {
    setQrcode(null)
    await handleReconnect()
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-3 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">
              {instance.name}
            </h3>
            {lastSync && (
              <p
                className={`text-xs mt-0.5 flex items-center gap-1 ${
                  stale ? "text-orange-500" : "text-gray-400"
                }`}
              >
                {stale && <AlertCircle className="w-3 h-3" />}
                Sync{" "}
                {formatDistanceToNow(lastSync, {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={currentStatus} />
            <button
              onClick={handleCheckStatus}
              disabled={loadingStatus}
              title="Verificar status"
              className="text-gray-400 hover:text-gray-700 disabled:opacity-40 transition-colors"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loadingStatus ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
          {currentStatus === "disconnected" && (
            <button
              onClick={handleReconnect}
              disabled={loadingQr}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Wifi className="w-3.5 h-3.5" />
              {loadingQr ? "Gerando..." : "Reconectar"}
            </button>
          )}
          <Link
            href={`/instances/${instance.id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-gray-500 text-xs hover:text-gray-900 transition-colors ml-auto"
          >
            <History className="w-3.5 h-3.5" />
            Ver histórico
          </Link>
        </div>
      </div>

      {qrcode && (
        <QRCodeModal
          instanceId={instance.id}
          qrcode={qrcode}
          onClose={() => setQrcode(null)}
          onRegenerate={handleRegenerate}
        />
      )}
    </>
  )
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    connected: "Conectada",
    disconnected: "Desconectada",
    delivery_failure: "Falha na Entrega",
    reconnecting: "Reconectando",
  }
  return labels[status] ?? status
}
