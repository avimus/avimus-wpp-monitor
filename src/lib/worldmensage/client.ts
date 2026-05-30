const BASE_URL = process.env.EVOLUTION_API_URL!
const API_KEY = process.env.EVOLUTION_API_KEY!

function authHeaders() {
  return {
    "Content-Type": "application/json",
    apikey: API_KEY,
  }
}

export interface ConnectInstanceResult {
  base64?: string
  code?: string
}

export interface InstanceStateResult {
  instance?: {
    instanceName: string
    state: "open" | "close" | "closing" | "connecting"
  }
  // some Evolution versions wrap differently
  state?: "open" | "close" | "closing" | "connecting"
}

export interface SendTextResult {
  key?: { id: string }
  error?: boolean
  message?: string
}

export async function connectInstance(
  instanceName: string
): Promise<ConnectInstanceResult> {
  const res = await fetch(`${BASE_URL}/instance/connect/${instanceName}`, {
    method: "GET",
    headers: authHeaders(),
  })

  if (!res.ok) {
    throw new Error(`Evolution /instance/connect failed: ${res.status}`)
  }

  return res.json()
}

export async function fetchInstanceState(
  instanceName: string
): Promise<InstanceStateResult> {
  const res = await fetch(
    `${BASE_URL}/instance/connectionState/${instanceName}`,
    {
      method: "GET",
      headers: authHeaders(),
    }
  )

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
    headers: authHeaders(),
    body: JSON.stringify({ number, text }),
  })

  if (!res.ok) {
    throw new Error(`Evolution /message/sendText failed: ${res.status}`)
  }

  return res.json()
}
