import { NextRequest, NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import type { InstanceStatus } from "@/types"

const CONNECTION_MAP: Record<string, InstanceStatus> = {
  open: "connected",
  close: "disconnected",
}

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  let body: { type?: string; instance?: string; connection?: string }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

  if (body.type !== "connection" || !body.instance || !body.connection) {
    return NextResponse.json({ ok: true })
  }

  const newStatus = CONNECTION_MAP[body.connection]
  if (!newStatus) {
    return NextResponse.json({ ok: true })
  }

  const supabase = getServiceClient()

  const { data: instance, error } = await supabase
    .from("instances")
    .select("id, contractor_id, current_status")
    .eq("worldmensage_instance_id", body.instance)
    .single()

  if (error || !instance) {
    return NextResponse.json({ ok: true })
  }

  if (instance.current_status === newStatus) {
    return NextResponse.json({ ok: true })
  }

  const now = new Date().toISOString()

  // Close previous open log entry
  await supabase
    .from("status_logs")
    .update({ ended_at: now })
    .eq("instance_id", instance.id)
    .is("ended_at", null)

  // Update instance status
  await supabase
    .from("instances")
    .update({ current_status: newStatus, last_sync_at: now })
    .eq("id", instance.id)

  // Insert new log entry
  await supabase.from("status_logs").insert({
    instance_id: instance.id,
    contractor_id: instance.contractor_id,
    status: newStatus,
    recorded_at: now,
  })

  return NextResponse.json({ ok: true })
}
