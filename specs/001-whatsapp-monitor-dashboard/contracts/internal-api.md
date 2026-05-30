# Internal API Contracts: Painel de Monitoramento

**Branch**: `001-whatsapp-monitor-dashboard` | **Date**: 2026-05-30

Todos os endpoints são Next.js 14 API Routes (`app/api/`).
Autenticação via Supabase session cookie (validada no servidor).

---

## POST `/api/instances/[id]/qrcode`

Gera o QR Code de reconexão para a instância especificada.

**Authorization**: Contratante dono da instância OU admin.

**Path params:**

| Param | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid | ID interno da instância (`instances.id`) |

**Request body:** nenhum

**Response 200:**

```json
{
  "qrcode": "data:image/png;base64,iVBORw0KGgo...",
  "expires_in_seconds": 30
}
```

**Response 403:** instância não pertence ao contratante autenticado

**Response 409:** instância já está no estado `connected` ou `reconnecting`

```json
{ "error": "Instance is not in disconnected state", "current_status": "connected" }
```

**Response 502:** falha na comunicação com a Worldmensage API

```json
{ "error": "External service unavailable. Try again in a few seconds." }
```

**Side effects:** atualiza `instances.current_status` para `reconnecting` ao confirmar que
o QR Code foi gerado com sucesso na Worldmensage.

---

## GET `/api/instances/[id]/status`

Consulta o status atual de uma instância diretamente da Worldmensage (sem cache).

**Authorization**: Contratante dono da instância OU admin.

**Path params:**

| Param | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid | ID interno da instância |

**Response 200:**

```json
{
  "instance_id": "uuid",
  "status": "connected",
  "last_sync_at": "2026-05-30T14:35:00Z"
}
```

**Response 503:** Worldmensage indisponível — retorna último status conhecido do DB:

```json
{
  "instance_id": "uuid",
  "status": "connected",
  "last_sync_at": "2026-05-30T14:30:00Z",
  "stale": true,
  "error": "External service temporarily unavailable"
}
```

---

## GET `/api/cron/sync-status`

Sincroniza o status de todas as instâncias ativas com a Worldmensage.
Chamado pelo Vercel Cron a cada 10 segundos.

**Authorization**: `Authorization: Bearer {CRON_SECRET}` (env var `CRON_SECRET`)

**Response 200:**

```json
{
  "synced": 47,
  "errors": 2,
  "duration_ms": 1240
}
```

**Comportamento:**
1. Busca todas as instâncias via Service Role (bypass RLS)
2. Para cada instância, chama Worldmensage GET status
3. Se status mudou: atualiza `instances.current_status`, `last_sync_at`; insere novo registro em `status_logs` e seta `ended_at` no registro anterior
4. Supabase Realtime propaga o UPDATE para clientes conectados

**Erro por instância:** log no console + incrementa `errors`, mas não interrompe as demais.

---

## DELETE `/api/admin/contractors/[id]`

Remove um contratante e todos os seus dados (LGPD — direito de eliminação).

**Authorization**: Admin apenas.

**Path params:**

| Param | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid | ID do contratante (`profiles.id`) |

**Response 200:**

```json
{ "deleted": true, "contractor_id": "uuid" }
```

**Side effects (CASCADE via FK):** remove `instances` e `status_logs` associados.
Remove também o usuário de `auth.users` via Supabase Admin API.

---

## POST `/api/admin/contractors`

Cria um novo contratante.

**Authorization**: Admin apenas.

**Request body:**

```json
{
  "name": "Nome do Contratante",
  "email": "contratante@empresa.com"
}
```

**Response 201:**

```json
{
  "contractor_id": "uuid",
  "email": "contratante@empresa.com",
  "temporary_password_sent": true
}
```

**Comportamento:** Cria usuário via Supabase Admin API com senha temporária;
envia email de boas-vindas com link para redefinição de senha.

---

## POST `/api/admin/instances`

Cria uma nova instância e atribui a um contratante.

**Authorization**: Admin apenas.

**Request body:**

```json
{
  "contractor_id": "uuid",
  "name": "Instância Principal",
  "worldmensage_instance_id": "nome-instancia-worldmensage"
}
```

**Response 201:**

```json
{
  "instance_id": "uuid",
  "name": "Instância Principal",
  "contractor_id": "uuid",
  "current_status": "disconnected"
}
```

---

## PATCH `/api/admin/instances/[id]`

Reatribui uma instância para outro contratante.

**Authorization**: Admin apenas.

**Request body:**

```json
{ "contractor_id": "uuid" }
```

**Response 200:**

```json
{ "instance_id": "uuid", "contractor_id": "uuid (novo)" }
```
