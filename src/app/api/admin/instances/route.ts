import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

async function verifyAdmin(supabase: ReturnType<typeof createClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  return profile?.role === "admin" ? user : null
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const adminUser = await verifyAdmin(supabase)

  if (!adminUser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { contractor_id, name, worldmensage_instance_id, worldmensage_token } =
    await request.json()

  if (!contractor_id || !name || !worldmensage_instance_id || !worldmensage_token) {
    return NextResponse.json(
      {
        error:
          "contractor_id, name, worldmensage_instance_id and worldmensage_token are required",
      },
      { status: 400 }
    )
  }

  const { data: instance, error } = await supabase
    .from("instances")
    .insert({
      contractor_id,
      name,
      worldmensage_instance_id,
      worldmensage_token,
      current_status: "disconnected",
    })
    .select()
    .single()

  if (error) {
    console.log("SUPABASE INSERT ERROR:", error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ instance_id: instance.id, name }, { status: 201 })
}
