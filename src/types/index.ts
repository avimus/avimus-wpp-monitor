export type InstanceStatus =
  | "connected"
  | "disconnected"
  | "delivery_failure"
  | "reconnecting"

export type UserRole = "admin" | "contractor"

export interface Profile {
  id: string
  role: UserRole
  name: string
  email: string | null
  phone: string | null
  has_auth: boolean
  created_at: string
}

export interface Instance {
  id: string
  contractor_id: string
  name: string
  worldmensage_nome: string | null
  worldmensage_instance_id: string
  worldmensage_token: string | null
  current_status: InstanceStatus
  last_sync_at: string | null
  created_at: string
}

export interface StatusLog {
  id: string
  instance_id: string
  contractor_id: string
  status: InstanceStatus
  recorded_at: string
  ended_at: string | null
}
