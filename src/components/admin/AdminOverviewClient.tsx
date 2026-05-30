"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { InstanceCard } from "@/components/instances/InstanceCard"
import type { Instance } from "@/types"

interface AdminOverviewClientProps {
  initialInstances: Instance[]
  contractorMap: Record<string, string>
}

export function AdminOverviewClient({
  initialInstances,
  contractorMap,
}: AdminOverviewClientProps) {
  const [instances, setInstances] = useState<Instance[]>(initialInstances)

  // Realtime — subscribe to ALL instance updates (no contractor filter for admin)
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel("admin-instances-status")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "instances" },
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
  }, [])

  if (instances.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-8 text-center">
        Nenhuma instância cadastrada.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {instances.map((inst) => (
        <div key={inst.id}>
          {contractorMap[inst.contractor_id] && (
            <p className="text-xs text-gray-400 px-1 mb-1 truncate">
              {contractorMap[inst.contractor_id]}
            </p>
          )}
          <InstanceCard instance={inst} />
        </div>
      ))}
    </div>
  )
}
