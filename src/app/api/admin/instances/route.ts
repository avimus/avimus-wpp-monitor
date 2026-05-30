import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createInstance } from "@/lib/evolution/client"

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

  const { contractor_id, name, evolution_instance_name } = await request.json()

  if (!contractor_id || !name || !evolution_instance_name) {
    return NextResponse.json(
      { error: "contractor_id, name and evolution_instance_name are required" },
      { status: 400 }
    )
  }

  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/evolution`

  try {
    await createInstance(evolution_instance_name, webhookUrl)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json(
      { error: `Failed to create instance in Evolution: ${message}` },
      { status: 502 }
    )
  }

  const { data: instance, error } = await supabase
    .from("instances")
    .insert({
      contractor_id,
      name,
      evolution_instance_name,
      evolution_instance_id: evolution_instance_name,
      current_status: "disconnected",
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ instance_id: instance.id, name }, { status: 201 })
}
