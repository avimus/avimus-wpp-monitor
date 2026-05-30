import { createClient } from "@/lib/supabase/server"
import { AdminOverviewClient } from "@/components/admin/AdminOverviewClient"
import type { Instance } from "@/types"

export default async function AdminOverviewPage() {
  const supabase = createClient()

  const [{ data: instances }, { data: contractors }] = await Promise.all([
    supabase.from("instances").select("*").order("name"),
    supabase
      .from("profiles")
      .select("id, name")
      .eq("role", "contractor")
      .order("name"),
  ])

  const contractorMap: Record<string, string> = {}
  for (const c of contractors ?? []) {
    contractorMap[c.id] = c.name
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Visão Geral — Admin</h1>
        <p className="text-sm text-gray-500 mt-1">
          Todas as instâncias de todos os contratantes
        </p>
      </div>

      <AdminOverviewClient
        initialInstances={(instances ?? []) as Instance[]}
        contractorMap={contractorMap}
      />
    </div>
  )
}
