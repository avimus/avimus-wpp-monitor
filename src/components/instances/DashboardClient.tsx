"use client"

import { useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { InstanceCard } from "./InstanceCard"
import type { Instance } from "@/types"

const AUTO_CHECK_MS = 5 * 60 * 1000 // 5 minutes

interface DashboardClientProps {
  initialInstances: Instance[]
  userId: string
}

export function DashboardClient({ initialInstances, userId }: DashboardClientProps) {
  const [instances, setInstances] = useState<Instance[]>(initialInstances)

  // Always-fresh ref for the auto-check interval (avoids stale closures)
  const instancesRef = useRef(instances)
  instancesRef.current = instances

  // Supabase Realtime — live status updates pushed from webhook
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel("instances-status")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "instances",
          filter: `contractor_id=eq.${userId}`,
        },
        (payload) => {
          setInstances((prev) =>
            prev.map((inst) =>
              inst.id === payload.new.id
                ? { ...inst, ...(payload.new as Instance) }
                : inst
            )
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  // Auto-check — polls each instance status every 5 minutes as fallback
  useEffect(() => {
    const autoCheck = async () => {
      await Promise.allSettled(
        instancesRef.current.map(async (inst) => {
          try {
            const res = await fetch(`/api/instances/${inst.id}/status`)
            if (!res.ok) return
            const data = await res.json()
            if (data.status) {
              setInstances((prev) =>
                prev.map((i) =>
                  i.id === inst.id
                    ? {
                        ...i,
                        current_status: data.status,
                        last_sync_at: data.synced_at ?? i.last_sync_at,
                      }
                    : i
                )
              )
            }
          } catch {
            // Silently ignore — don't disrupt UI
          }
        })
      )
    }

    const interval = setInterval(autoCheck, AUTO_CHECK_MS)
    return () => clearInterval(interval)
  }, []) // Empty deps — reads from instancesRef.current at call time

  if (instances.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-sm">Nenhuma instância atribuída ainda.</p>
        <p className="text-xs mt-1">
          Entre em contato com o administrador para configurar suas instâncias.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {instances.map((instance) => (
        <InstanceCard key={instance.id} instance={instance} />
      ))}
    </div>
  )
}
