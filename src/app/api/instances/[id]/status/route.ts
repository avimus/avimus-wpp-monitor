import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { fetchInstanceState } from "@/lib/evolution/client"
import type { InstanceStatus } from "@/types"

const STATE_MAP: Record<string, InstanceStatus> = {
  open: "connected",
  close: "disconnected",
  closing: "disconnected",
  connecting: "reconnecting",
}

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(
  _: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: instance, error } = await supabase
    .from("instances")
    .select("id, contractor_id, current_status, evolution_instance_name, evolution_instance_id")
    .eq("id", params.id)
    .single()

  if (error || !instance) {
    return NextResponse.json({ error: "Instance not found" }, { status: 404 })
  }

  const instanceName = instance.evolution_instance_name ?? instance.evolution_instance_id

  if (!instanceName) {
    return NextResponse.json(
      { error: "Instance has no Evolution name configured." },
      { status: 422 }
    )
  }

  let newStatus: InstanceStatus | null = null

  try {
    const stateResult = await fetchInstanceState(instanceName)
    const rawState = stateResult.instance?.state ?? stateResult.state ?? null
    if (rawState) newStatus = STATE_MAP[rawState] ?? null
  } catch {
    return NextResponse.json({
      status: instance.current_status,
      synced_at: null,
      warning: "Could not reach Evolution API — showing last known status",
    })
  }

  if (!newStatus) {
    return NextResponse.json({
      status: instance.current_status,
      synced_at: null,
      warning: "Unknown state returned by Evolution API",
    })
  }

  const syncedAt = new Date().toISOString()
  const statusChanged = newStatus !== instance.current_status
  const serviceClient = getServiceClient()

  await serviceClient
    .from("instances")
    .update({ current_status: newStatus, last_sync_at: syncedAt })
    .eq("id", instance.id)

  if (statusChanged) {
    await serviceClient
      .from("status_logs")
      .update({ ended_at: syncedAt })
      .eq("instance_id", instance.id)
      .is("ended_at", null)

    await serviceClient.from("status_logs").insert({
      instance_id: instance.id,
      contractor_id: instance.contractor_id,
      status: newStatus,
      recorded_at: syncedAt,
    })
  }

  return NextResponse.json({ status: newStatus, synced_at: syncedAt })
}
