import { NextRequest, NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import type { InstanceStatus } from "@/types"

const STATE_MAP: Record<string, InstanceStatus> = {
  open: "connected",
  close: "disconnected",
  closing: "disconnected",
}

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  let body: {
    event?: string
    instance?: string
    data?: { state?: string }
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

  if (body.event !== "connection.update" || !body.instance || !body.data?.state) {
    return NextResponse.json({ ok: true })
  }

  const newStatus = STATE_MAP[body.data.state]
  if (!newStatus) {
    return NextResponse.json({ ok: true })
  }

  const supabase = getServiceClient()

  // Look up by worldmensage_nome first (Evolution instanceName), fall back to worldmensage_instance_id
  let instance: { id: string; contractor_id: string; current_status: string } | null = null

  const { data: byNome } = await supabase
    .from("instances")
    .select("id, contractor_id, current_status")
    .eq("worldmensage_nome", body.instance)
    .single()

  if (byNome) {
    instance = byNome
  } else {
    const { data: byInstanceId } = await supabase
      .from("instances")
      .select("id, contractor_id, current_status")
      .eq("worldmensage_instance_id", body.instance)
      .single()
    instance = byInstanceId
  }

  if (!instance) {
    return NextResponse.json({ ok: true })
  }

  if (instance.current_status === newStatus) {
    return NextResponse.json({ ok: true })
  }

  const now = new Date().toISOString()

  await supabase
    .from("status_logs")
    .update({ ended_at: now })
    .eq("instance_id", instance.id)
    .is("ended_at", null)

  await supabase
    .from("instances")
    .update({ current_status: newStatus, last_sync_at: now })
    .eq("id", instance.id)

  await supabase.from("status_logs").insert({
    instance_id: instance.id,
    contractor_id: instance.contractor_id,
    status: newStatus,
    recorded_at: now,
  })

  return NextResponse.json({ ok: true })
}
