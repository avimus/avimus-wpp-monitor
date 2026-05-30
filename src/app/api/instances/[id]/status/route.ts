import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import type { InstanceStatus } from "@/types"

const BASE_URL = process.env.WORLDMENSAGE_BASE_URL!

type PingResult = "connected" | "disconnected" | "unknown"

function isDisconnectedError(text: string): boolean {
  const keywords = [
    "desconectado",
    "sessão",
    "sessao",
    "session",
    "instância",
    "instancia",
    "not connected",
    "disconnected",
    "qrcode",
    "qr code",
    "not authenticated",
    "unauthorized",
    "logout",
    "acesso bloqueado",
    "bloqueado",
    "blocked",
    "entre em contato",
    "suporte",
  ]
  return keywords.some((kw) => text.includes(kw))
}

async function pingInstance(
  worldmensageInstanceId: string,
  token: string
): Promise<PingResult> {
  try {
    const res = await fetch(`${BASE_URL}/send-text`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        instance: worldmensageInstanceId,
        to: "5500000000000",
        message: "ping",
      }),
    })

    const data: Record<string, unknown> = await res.json().catch(() => ({}))
    const text = JSON.stringify(data).toLowerCase()
    console.log("PING RESPONSE:", { status: res.status, data, text })

    if (!res.ok) {
      return isDisconnectedError(text) ? "disconnected" : "unknown"
    }

    if (data.erro === true) {
      return isDisconnectedError(text) ? "disconnected" : "connected"
    }

    return "connected"
  } catch {
    return "unknown"
  }
}

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(
  _request: NextRequest,
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
    .select("id, contractor_id, current_status, worldmensage_instance_id, worldmensage_token")
    .eq("id", params.id)
    .single()

  if (error || !instance) {
    return NextResponse.json({ error: "Instance not found" }, { status: 404 })
  }

  if (!instance.worldmensage_token) {
    return NextResponse.json(
      { error: "Instance has no token configured." },
      { status: 422 }
    )
  }

  const pingResult = await pingInstance(
    instance.worldmensage_instance_id,
    instance.worldmensage_token
  )

  if (pingResult === "unknown") {
    return NextResponse.json({
      status: instance.current_status,
      synced_at: null,
      warning: "Could not reach external service — showing last known status",
    })
  }

  const newStatus = pingResult as InstanceStatus
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
