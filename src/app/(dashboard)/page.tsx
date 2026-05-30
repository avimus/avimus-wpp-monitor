import { createClient } from "@/lib/supabase/server"
import { DashboardClient } from "@/components/instances/DashboardClient"
import type { Instance } from "@/types"

export default async function DashboardPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: instances } = await supabase
    .from("instances")
    .select("*")
    .order("name")

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">
          Minhas Instâncias WhatsApp
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Status em tempo real das suas instâncias
        </p>
      </div>

      <DashboardClient
        initialInstances={(instances as Instance[]) ?? []}
        userId={user!.id}
      />
    </div>
  )
}
