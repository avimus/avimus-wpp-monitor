import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createInstance } from "@/lib/worldmensage/client"

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
    .select("id, current_status, worldmensage_instance_id, worldmensage_token")
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

  if (!instance.worldmensage_instance_id) {
    return NextResponse.json(
      { error: "Instance has no Worldmensage ID configured." },
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
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/worldmensage`
    const result = await createInstance(
      instance.worldmensage_instance_id,
      webhookUrl,
      instance.worldmensage_token
    )

    await supabase
      .from("instances")
      .update({
        worldmensage_instance_id: result.instance,
        current_status: "reconnecting",
        last_sync_at: new Date().toISOString(),
      })
      .eq("id", params.id)

    return NextResponse.json({
      qrcode: result.qrcode,
      expires_in_seconds: 30,
    })
  } catch {
    return NextResponse.json(
      { error: "External service unavailable. Try again in a few seconds." },
      { status: 502 }
    )
  }
}
