const BASE_URL = process.env.WORLDMENSAGE_BASE_URL!

export interface CreateInstanceResult {
  status: string
  qrcode: string
  instance: string
}

export interface SendTextResult {
  erro: boolean
  msg?: string
  message?: string
}

export async function createInstance(
  nome: string,
  webhookUrl: string,
  token: string
): Promise<CreateInstanceResult> {
  const res = await fetch(`${BASE_URL}/instance-create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, nome, webhook: webhookUrl }),
  })

  if (!res.ok) {
    throw new Error(`Worldmensage /instance-create failed: ${res.status}`)
  }

  return res.json()
}

export async function sendText(
  instanceName: string,
  to: string,
  message: string,
  token: string
): Promise<SendTextResult> {
  const res = await fetch(`${BASE_URL}/send-text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, instance: instanceName, to, message }),
  })

  if (!res.ok) {
    throw new Error(`Worldmensage /send-text failed: ${res.status}`)
  }

  return res.json()
}
