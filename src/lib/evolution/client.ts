const BASE_URL = process.env.EVOLUTION_API_URL!
const API_KEY = process.env.EVOLUTION_API_KEY!

function headers() {
  return {
    "Content-Type": "application/json",
    apikey: API_KEY,
  }
}

export interface CreateInstanceResult {
  base64?: string
  code?: string
}

export interface InstanceStateResult {
  instance?: { instanceName: string; state: string }
  state?: string
}

export interface SendTextResult {
  key?: { id: string }
  error?: boolean
  message?: string
}

/**
 * Creates a new instance in Evolution, configures the webhook, and returns the
 * QR code so the user can connect immediately.
 */
export async function createInstance(
  instanceName: string,
  webhookUrl: string
): Promise<CreateInstanceResult> {
  const createRes = await fetch(`${BASE_URL}/instance/create`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      instanceName,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
    }),
  })

  if (!createRes.ok) {
    const text = await createRes.text().catch(() => "")
    throw new Error(`Evolution /instance/create failed: ${createRes.status} ${text}`)
  }

  await fetch(`${BASE_URL}/webhook/set/${instanceName}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      url: webhookUrl,
      enabled: true,
      events: ["CONNECTION_UPDATE", "QRCODE_UPDATED"],
    }),
  })

  const connectRes = await fetch(`${BASE_URL}/instance/connect/${instanceName}`, {
    method: "GET",
    headers: headers(),
  })

  if (!connectRes.ok) {
    throw new Error(`Evolution /instance/connect failed: ${connectRes.status}`)
  }

  return connectRes.json()
}

/**
 * Reconnects an existing instance and returns its QR code.
 */
export async function connectInstance(
  instanceName: string
): Promise<CreateInstanceResult> {
  const res = await fetch(`${BASE_URL}/instance/connect/${instanceName}`, {
    method: "GET",
    headers: headers(),
  })

  if (!res.ok) {
    throw new Error(`Evolution /instance/connect failed: ${res.status}`)
  }

  return res.json()
}

export async function fetchInstanceState(
  instanceName: string
): Promise<InstanceStateResult> {
  const res = await fetch(`${BASE_URL}/instance/connectionState/${instanceName}`, {
    method: "GET",
    headers: headers(),
  })

  if (!res.ok) {
    throw new Error(`Evolution /instance/connectionState failed: ${res.status}`)
  }

  return res.json()
}

export async function sendText(
  instanceName: string,
  number: string,
  text: string
): Promise<SendTextResult> {
  const res = await fetch(`${BASE_URL}/message/sendText/${instanceName}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ number, text }),
  })

  if (!res.ok) {
    throw new Error(`Evolution /message/sendText failed: ${res.status}`)
  }

  return res.json()
}
