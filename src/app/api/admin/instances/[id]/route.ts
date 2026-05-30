import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

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

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const adminUser = await verifyAdmin(supabase)

  if (!adminUser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { name, contractor_id, worldmensage_nome, worldmensage_token } =
    await request.json()

  if (!name || !contractor_id || !worldmensage_nome) {
    return NextResponse.json(
      { error: "name, contractor_id and worldmensage_nome are required" },
      { status: 400 }
    )
  }

  const serviceClient = getServiceClient()

  const { data: instance, error } = await serviceClient
    .from("instances")
    .update({
      name,
      contractor_id,
      worldmensage_nome,
      worldmensage_instance_id: worldmensage_nome,
      worldmensage_token: worldmensage_token ?? null,
    })
    .eq("id", params.id)
    .select()
    .single()

  if (error) {
    console.log("PUT /instances/[id] ERROR:", error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Keep status_logs in sync if contractor changed
  await serviceClient
    .from("status_logs")
    .update({ contractor_id })
    .eq("instance_id", params.id)

  return NextResponse.json(instance)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const adminUser = await verifyAdmin(supabase)

  if (!adminUser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { contractor_id } = await request.json()

  if (!contractor_id) {
    return NextResponse.json(
      { error: "contractor_id is required" },
      { status: 400 }
    )
  }

  const serviceClient = getServiceClient()

  const { data: instance, error } = await serviceClient
    .from("instances")
    .update({ contractor_id })
    .eq("id", params.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  await serviceClient
    .from("status_logs")
    .update({ contractor_id })
    .eq("instance_id", params.id)

  return NextResponse.json({
    instance_id: instance.id,
    contractor_id: instance.contractor_id,
  })
}
