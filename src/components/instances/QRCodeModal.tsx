"use client"

import { useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { X, RefreshCw } from "lucide-react"

const QR_TTL_SECONDS = 30

interface QRCodeModalProps {
  instanceId: string
  qrcode: string
  onClose: () => void
  onRegenerate: () => void
}

export function QRCodeModal({
  instanceId,
  qrcode,
  onClose,
  onRegenerate,
}: QRCodeModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(QR_TTL_SECONDS)
  const [expired, setExpired] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Countdown timer
  useEffect(() => {
    setSecondsLeft(QR_TTL_SECONDS)
    setExpired(false)

    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current!)
          setExpired(true)
          return 0
        }
        return s - 1
      })
    }, 1000)

    return () => clearInterval(intervalRef.current!)
  }, [qrcode])

  // Realtime: watch for status changes on this instance
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`instance-reconnect-${instanceId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "instances",
          filter: `id=eq.${instanceId}`,
        },
        (payload) => {
          const newStatus = payload.new.current_status as string
          setStatus(newStatus)

          if (newStatus === "connected") {
            toast.success("Instância reconectada com sucesso!")
            setTimeout(onClose, 1500)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [instanceId, onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Reconectar Instância</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center gap-4">
          {status === "reconnecting" ? (
            <div className="text-center py-4">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm font-medium text-blue-700">Reconectando...</p>
              <p className="text-xs text-gray-400 mt-1">
                QR Code escaneado. Aguarde a confirmação.
              </p>
            </div>
          ) : (
            <>
              {!expired ? (
                <>
                  <img
                    src={qrcode}
                    alt="QR Code para reconexão"
                    className="w-48 h-48 rounded-lg border border-gray-100"
                  />
                  <p className="text-sm text-gray-600 text-center">
                    Abra o WhatsApp no celular, vá em{" "}
                    <strong>Dispositivos conectados</strong> e escaneie o código.
                  </p>
                  <div className="text-xs text-gray-400">
                    Expira em{" "}
                    <span
                      className={
                        secondsLeft <= 10 ? "text-red-500 font-medium" : ""
                      }
                    >
                      {secondsLeft}s
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-center py-2">
                  <p className="text-sm text-gray-500 mb-4">
                    O QR Code expirou. Gere um novo para continuar.
                  </p>
                  <button
                    onClick={onRegenerate}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition-colors mx-auto"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Gerar novo QR Code
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
