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

function logError(step: string, error: unknown) {
  const e = error as { message?: string; status?: number; code?: string; details?: string }
  console.error(`[create-access] ERRO em "${step}":`, {
    message: e?.message,
    status: e?.status,
    code: e?.code,
    details: e?.details,
    raw: error,
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const TAG = `[create-access] contractorId=${params.id}`

  const supabase = createClient()
  const adminUser = await verifyAdmin(supabase)

  if (!adminUser) {
    console.warn(`${TAG} - Forbidden: caller is not admin`)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json()
  const { email, password } = body
  console.log(`${TAG} - body recebido:`, { email, passwordLength: password?.length ?? 0 })

  if (!email || !password) {
    return NextResponse.json({ error: "email and password are required" }, { status: 400 })
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
  }

  const adminClient = getAdminClient()
  const oldId = params.id

  // 1. Fetch existing profile
  console.log(`${TAG} - [1] Buscando profile antigo id=${oldId}`)
  const { data: oldProfile, error: profileError } = await adminClient
    .from("profiles")
    .select("id, name, email, phone, role")
    .eq("id", oldId)
    .single()

  if (profileError || !oldProfile) {
    logError("buscar profile antigo", profileError)
    return NextResponse.json({ error: "Contractor not found" }, { status: 404 })
  }
  console.log(`${TAG} - [1] Profile encontrado:`, { name: oldProfile.name, email: oldProfile.email })

  // 2. Create auth user
  console.log(`${TAG} - [2] Criando auth user para email=${email}`)
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: oldProfile.name },
  })

  if (authError) {
    logError("createUser", authError)
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  const newId = authData.user.id
  console.log(`${TAG} - [2] Auth user criado: newId=${newId}`)

  // 3. Sync profile data onto the new profile created by trigger
  console.log(`${TAG} - [3] Atualizando novo profile id=${newId} com email/phone`)
  const { error: updateProfileError } = await adminClient
    .from("profiles")
    .update({ email: oldProfile.email, phone: oldProfile.phone, role: oldProfile.role, has_auth: true })
    .eq("id", newId)

  if (updateProfileError) {
    logError("update novo profile", updateProfileError)
    // Non-fatal — continue
  } else {
    console.log(`${TAG} - [3] Novo profile atualizado OK`)
  }

  // 4. Transfer instances
  console.log(`${TAG} - [4] Transferindo instances de ${oldId} para ${newId}`)
  const { error: instancesError, count: instancesCount } = await adminClient
    .from("instances")
    .update({ contractor_id: newId })
    .eq("contractor_id", oldId)

  if (instancesError) {
    logError("update instances", instancesError)
  } else {
    console.log(`${TAG} - [4] Instances transferidas (count=${instancesCount})`)
  }

  // 5. Transfer status logs
  console.log(`${TAG} - [5] Transferindo status_logs de ${oldId} para ${newId}`)
  const { error: logsError, count: logsCount } = await adminClient
    .from("status_logs")
    .update({ contractor_id: newId })
    .eq("contractor_id", oldId)

  if (logsError) {
    logError("update status_logs", logsError)
  } else {
    console.log(`${TAG} - [5] Status logs transferidos (count=${logsCount})`)
  }

  // 6. Delete old profile
  console.log(`${TAG} - [6] Deletando profile antigo id=${oldId}`)
  const { error: deleteError } = await adminClient
    .from("profiles")
    .delete()
    .eq("id", oldId)

  if (deleteError) {
    logError("delete profile antigo", deleteError)
  } else {
    console.log(`${TAG} - [6] Profile antigo deletado OK`)
  }

  console.log(`${TAG} - CONCLUÍDO: contractor_id agora é ${newId}`)
  return NextResponse.json({ success: true, contractor_id: newId })
}
