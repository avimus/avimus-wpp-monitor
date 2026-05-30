# Worldmensage API Contract (Real)

**Branch**: `001-whatsapp-monitor-dashboard` | **Date**: 2026-05-30 | **Updated**: 2026-05-30

**Base URL**: `http://api.wordmensagens.com.br`
**Auth**: campo `token` no body de cada requisição POST (nunca exposto no cliente)

> ℹ️ Nota: URL usa "wordmensagens" (não "worldmensage"). Variável de ambiente `WORLDMENSAGE_BASE_URL`
> deve conter `http://api.wordmensagens.com.br`.

---

## POST `/instance-create`

Cria uma nova instância WhatsApp e retorna o QR Code para pareamento inicial.
**Também usado para reconectar uma instância existente desconectada** (gera novo QR Code).

**Request body:**

```json
{
  "token": "{WORLDMENSAGE_TOKEN}"
}
```

**Response (sucesso):**

```json
{
  "status": "qr",
  "qrcode": "data:image/png;base64,iVBORw0KGgo...",
  "instance": "nome-da-instancia-gerada"
}
```

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `status` | string | Estado inicial — tipicamente `"qr"` aguardando escaneamento |
| `qrcode` | string | QR Code em base64 (`data:image/png;base64,...`) — exibir diretamente em `<img>` |
| `instance` | string | Identificador da instância na Worldmensage — persistir em `instances.worldmensage_instance_id` |

**Uso no fluxo de criação (admin):**
1. Admin chama `POST /api/admin/instances` no nosso servidor
2. Nossa API route chama `POST /instance-create` na Worldmensage
3. Persiste `instance` retornado em `instances.worldmensage_instance_id`
4. Retorna `qrcode` para exibição no modal de pareamento

**Uso no fluxo de reconexão (contratante):**
1. Contratante clica em "Reconectar" no painel
2. Cliente chama `POST /api/instances/[id]/qrcode` no nosso servidor
3. Nossa API route chama `POST /instance-create` na Worldmensage
4. Retorna novo `qrcode` para exibição no modal

> ⚠ **Implicação**: cada chamada a `/instance-create` pode gerar uma nova `instance` string.
> Verificar se a Worldmensage reutiliza o mesmo identificador para reconexão ou gera um novo.
> Se gerar novo: atualizar `instances.worldmensage_instance_id` após cada reconexão.

---

## Webhook de Status (recebido no nosso servidor)

A Worldmensage **envia** requisições POST para nossa URL de webhook quando o estado de uma
instância muda. **Não há polling** — o monitoramento em tempo real depende inteiramente deste webhook.

**Nossa rota receptora**: `POST /api/webhook/worldmensage` (rota pública — sem autenticação de sessão)

**Payload recebido:**

```json
{
  "type": "connection",
  "instance": "nome-da-instancia",
  "connection": "open"
}
```

| Campo | Tipo | Valores conhecidos | Descrição |
|-------|------|--------------------|-----------|
| `type` | string | `"connection"` | Tipo do evento |
| `instance` | string | nome da instância | `instances.worldmensage_instance_id` |
| `connection` | string | `"open"`, `"close"` | Estado da conexão |

**Mapeamento para estados internos:**

| `connection` (Worldmensage) | `current_status` (interno) |
|-----------------------------|---------------------------|
| `"open"` | `connected` |
| `"close"` | `disconnected` |
| (após POST /instance-create) | `reconnecting` (definido localmente ao gerar QR) |

**Comportamento do endpoint `/api/webhook/worldmensage`:**
1. Valida que o payload tem `type == "connection"`
2. Busca instância por `worldmensage_instance_id = instance` via Service Role
3. Se status mudou: atualiza `instances.current_status` e `last_sync_at`; insere em `status_logs`
4. Supabase Realtime propaga o UPDATE automaticamente para clientes conectados
5. Retorna HTTP 200 (sempre — para evitar reenvios da Worldmensage)

**Segurança do webhook:**
- Validar `secret` ou header de assinatura se a Worldmensage suportar (verificar documentação)
- Sem validação disponível: usar IP allowlist ou token de query param como mitigação mínima
- Rota é pública por natureza (Worldmensage não autentica via nossa sessão)

**Configuração na Worldmensage:**
- Registrar `https://seu-dominio.vercel.app/api/webhook/worldmensage` como URL de webhook
- Verificar se o registro é por instância ou global por token

---

## POST `/send-text`

Envia uma mensagem de texto via uma instância. Usado como **proxy de verificação de entrega**
(estado `delivery_failure`).

**Request body:**

```json
{
  "token": "{WORLDMENSAGE_TOKEN}",
  "phone": "5511999999999",
  "message": "ping"
}
```

**Response:**

```json
{ "erro": false }
```

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `erro` | boolean | `false` = mensagem enviada; `true` = falha no envio |

**Uso para detectar `delivery_failure`:**
- Enviar mensagem de teste para um número de monitoramento conhecido (ex: número do admin)
- Se `erro: true` com instância `connected` (via webhook) → marcar como `delivery_failure`
- Executar via Vercel Cron em intervalo maior (ex: a cada 5 minutos) para não gerar volume
- Esta lógica é **opcional para o MVP** — simplificar para `connected` / `disconnected` inicialmente

---

## Limitações Confirmadas

| Limitação | Impacto no projeto | Solução adotada |
|-----------|-------------------|-----------------|
| Não há endpoint para listar instâncias por token | Impossível sincronizar instâncias da Worldmensage com o DB | Instâncias persistidas no Supabase no momento da criação pelo admin; `worldmensage_instance_id` é a âncora |
| Não há endpoint de verificação de status on-demand | Impossível checar status sem webhook | Estado mantido no DB via webhook; exibir `last_sync_at` para indicar atualidade |
| Não há endpoint dedicado para falha de entrega | Estado `delivery_failure` não vem automaticamente | Detectar via POST /send-text periódico (MVP: simplificar — usar só `connected`/`disconnected`) |
| Monitoramento em tempo real depende de webhook | Requer rota pública no nosso servidor | `POST /api/webhook/worldmensage` exposta publicamente |
| Reconexão usa o mesmo endpoint de criação | Pode gerar nova `instance` a cada reconexão | Verificar comportamento exato; atualizar `worldmensage_instance_id` se necessário |

---

## Impacto Arquitetural vs. Plano Original

O plano original assumia **Vercel Cron + polling** à Worldmensage. A API real usa **webhooks**.
Esta mudança é uma **melhoria**: elimina o Cron de sync de status (menor custo, menor latência).

| Componente | Plano original | Real (ajustado) |
|------------|----------------|-----------------|
| Sync de status | Vercel Cron a cada 10s | Webhook recebido da Worldmensage |
| `GET /api/cron/sync-status` | Necessário | **Removido** |
| `POST /api/webhook/worldmensage` | Não existia | **Adicionado** (rota pública) |
| Vercel Cron | Para sync de status | Apenas para limpeza de logs (retenção LGPD) |

---

## Variáveis de Ambiente Necessárias

```bash
# Worldmensage — APENAS server-side (nunca NEXT_PUBLIC_)
WORLDMENSAGE_BASE_URL=http://api.wordmensagens.com.br
WORLDMENSAGE_TOKEN=seu-token-aqui

# Cron secret — protege o endpoint de limpeza de logs
CRON_SECRET=gere-um-valor-aleatorio-seguro
```

> `WORLDMENSAGE_API_KEY` do plano original foi renomeado para `WORLDMENSAGE_TOKEN`
> (alinha com o campo `token` do body da API).
