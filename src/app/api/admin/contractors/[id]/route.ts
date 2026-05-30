import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

function getAdminClient() {
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

  const { name, email, phone } = await request.json()

  if (!name || !email || !phone) {
    return NextResponse.json(
      { error: "name, email and phone are required" },
      { status: 400 }
    )
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  console.log("PUT /contractors/[id] DEBUG:", {
    contractorId: params.id,
    hasUrl: !!url,
    hasServiceKey: !!key,
    keyPrefix: key?.slice(0, 10),
  })

  const serviceClient = getAdminClient()
  const { error } = await serviceClient
    .from("profiles")
    .update({ name, email, phone })
    .eq("id", params.id)

  if (error) {
    console.log("PUT /contractors/[id] UPDATE ERROR:", error)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ id: params.id, name, email, phone })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const adminUser = await verifyAdmin(supabase)

  if (!adminUser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const adminClient = getAdminClient()

  // Check if this contractor has auth credentials
  const { data: profile } = await adminClient
    .from("profiles")
    .select("has_auth")
    .eq("id", params.id)
    .single()

  // Delete profile first (cascades instances + status_logs via FK)
  await adminClient.from("profiles").delete().eq("id", params.id)

  // If they had auth, delete the auth user too
  if (profile?.has_auth) {
    await adminClient.auth.admin.deleteUser(params.id)
  }

  return NextResponse.json({ deleted: true, contractor_id: params.id })
}
