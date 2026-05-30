import { createClient } from "@/lib/supabase/server"
import { ContractorsClient } from "@/components/admin/ContractorsClient"
import type { Profile } from "@/types"

type ContractorRow = Pick<Profile, "id" | "name" | "email" | "phone" | "has_auth" | "created_at">

export default async function ContractorsPage() {
  const supabase = createClient()

  const { data: contractors } = await supabase
    .from("profiles")
    .select("id, name, email, phone, has_auth, created_at")
    .eq("role", "contractor")
    .order("name")

  return (
    <ContractorsClient
      initialContractors={(contractors as ContractorRow[]) ?? []}
    />
  )
}
