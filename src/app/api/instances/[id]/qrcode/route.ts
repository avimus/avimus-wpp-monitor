import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { connectInstance } from "@/lib/evolution/client"

export async function POST(
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
    .select("id, current_status, evolution_instance_name, evolution_instance_id")
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

  const reconnectable = ["disconnected", "reconnecting"]
  if (!reconnectable.includes(instance.current_status)) {
    return NextResponse.json(
      {
        error: "Instance is not in a reconnectable state",
        current_status: instance.current_status,
      },
      { status: 409 }
    )
  }

  try {
    const result = await connectInstance(instanceName)

    if (!result.base64) {
      return NextResponse.json(
        { error: "Evolution did not return a QR Code. Instance may already be connected." },
        { status: 502 }
      )
    }

    await supabase
      .from("instances")
      .update({
        current_status: "reconnecting",
        last_sync_at: new Date().toISOString(),
      })
      .eq("id", params.id)

    return NextResponse.json({
      qrcode: result.base64,
      expires_in_seconds: 30,
    })
  } catch {
    return NextResponse.json(
      { error: "External service unavailable. Try again in a few seconds." },
      { status: 502 }
    )
  }
}
