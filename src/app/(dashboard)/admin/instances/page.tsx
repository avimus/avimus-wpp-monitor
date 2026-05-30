import { createClient } from "@/lib/supabase/server"
import { InstanceAssignForm } from "@/components/admin/InstanceAssignForm"
import { InstancesTableClient } from "@/components/admin/InstancesTableClient"
import type { Instance, Profile } from "@/types"

export default async function AdminInstancesPage() {
  const supabase = createClient()

  const [{ data: instances }, { data: contractors }] = await Promise.all([
    supabase.from("instances").select("*").order("name"),
    supabase
      .from("profiles")
      .select("id, name")
      .eq("role", "contractor")
      .order("name"),
  ])

  const contractorList = (contractors as Pick<Profile, "id" | "name">[] | null) ?? []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Gerenciar Instâncias</h1>
        <p className="text-sm text-gray-500 mt-1">
          Crie e atribua instâncias WhatsApp aos contratantes.
        </p>
      </div>

      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Nova Instância</h2>
        <InstanceAssignForm contractors={contractorList} />
      </div>

      <InstancesTableClient
        initialInstances={(instances as Instance[]) ?? []}
        contractors={contractorList}
      />
    </div>
  )
}
