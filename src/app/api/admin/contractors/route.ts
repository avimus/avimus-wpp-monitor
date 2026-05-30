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

export async function POST(request: NextRequest) {
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

  // Insert profile directly — no auth user yet (use "Criar Acesso" to add login)
  const adminClient = getAdminClient()
  const { data, error } = await adminClient
    .from("profiles")
    .insert({ name, email, phone, role: "contractor", has_auth: false })
    .select("id")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ contractor_id: data.id, email }, { status: 201 })
}

export async function GET() {
  const supabase = createClient()
  const adminUser = await verifyAdmin(supabase)

  if (!adminUser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { data: contractors } = await supabase
    .from("profiles")
    .select("id, name, email, phone, has_auth, created_at")
    .eq("role", "contractor")
    .order("name")

  return NextResponse.json(contractors ?? [])
}
