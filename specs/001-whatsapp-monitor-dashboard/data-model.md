# Data Model: Painel de Monitoramento de Instâncias WhatsApp

**Branch**: `001-whatsapp-monitor-dashboard` | **Date**: 2026-05-30

---

## Entidades e Schema (Supabase / PostgreSQL)

### Enum Types

```sql
CREATE TYPE instance_status AS ENUM (
  'connected',        -- Conectada
  'disconnected',     -- Desconectada
  'delivery_failure', -- Falha na Entrega
  'reconnecting'      -- Reconectando
);

CREATE TYPE user_role AS ENUM (
  'admin',
  'contractor'
);
```

---

### Tabela: `profiles`

Estende `auth.users` do Supabase. Criada via trigger após signup.

```sql
CREATE TABLE profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role         user_role NOT NULL DEFAULT 'contractor',
  name         text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Cada usuário vê apenas o próprio perfil; admin vê todos
CREATE POLICY "profiles_self_or_admin"
  ON profiles FOR ALL
  USING (id = auth.uid() OR EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));
```

**Campos:**

| Campo | Tipo | Restrições | Descrição |
|-------|------|-----------|-----------|
| `id` | uuid | PK, FK auth.users | Mesmo ID do Supabase Auth |
| `role` | user_role | NOT NULL | `admin` ou `contractor` |
| `name` | text | NOT NULL | Nome do contratante ou admin |
| `created_at` | timestamptz | NOT NULL, default now() | Data de cadastro |

---

### Tabela: `instances`

```sql
CREATE TABLE instances (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id            uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name                     text NOT NULL,
  worldmensage_instance_id text NOT NULL UNIQUE,
  current_status           instance_status NOT NULL DEFAULT 'disconnected',
  last_sync_at             timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_instances_contractor_id ON instances(contractor_id);
CREATE INDEX idx_instances_status ON instances(current_status);

ALTER TABLE instances ENABLE ROW LEVEL SECURITY;

-- Função auxiliar para verificar admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Contratante vê apenas suas instâncias; admin vê todas
CREATE POLICY "instances_contractor_or_admin"
  ON instances FOR ALL
  USING (contractor_id = auth.uid() OR is_admin());
```

**Campos:**

| Campo | Tipo | Restrições | Descrição |
|-------|------|-----------|-----------|
| `id` | uuid | PK | Identificador interno |
| `contractor_id` | uuid | NOT NULL, FK profiles | Contratante dono da instância |
| `name` | text | NOT NULL | Nome amigável (ex: "Instância Principal") |
| `worldmensage_instance_id` | text | NOT NULL, UNIQUE | ID externo na API Worldmensage |
| `current_status` | instance_status | NOT NULL | Status atual (atualizado pelo Cron) |
| `last_sync_at` | timestamptz | nullable | Última vez que o status foi sincronizado com sucesso |
| `created_at` | timestamptz | NOT NULL | Data de criação |

**Transições de estado válidas:**

```
disconnected ──▶ reconnecting ──▶ connected
connected    ──▶ disconnected
connected    ──▶ delivery_failure
delivery_failure ──▶ connected
delivery_failure ──▶ disconnected
reconnecting ──▶ connected
reconnecting ──▶ disconnected  (timeout / falha de escaneamento)
```

---

### Tabela: `status_logs`

```sql
CREATE TABLE status_logs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id    uuid NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  contractor_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status         instance_status NOT NULL,
  recorded_at    timestamptz NOT NULL DEFAULT now(),
  ended_at       timestamptz -- null enquanto for o estado atual
);

CREATE INDEX idx_status_logs_instance_id ON status_logs(instance_id, recorded_at DESC);
CREATE INDEX idx_status_logs_contractor_id ON status_logs(contractor_id);

ALTER TABLE status_logs ENABLE ROW LEVEL SECURITY;

-- Contratante vê apenas logs de suas instâncias; admin vê todos
CREATE POLICY "status_logs_contractor_or_admin"
  ON status_logs FOR SELECT
  USING (contractor_id = auth.uid() OR is_admin());

-- Apenas service role (Cron) pode inserir/atualizar logs
CREATE POLICY "status_logs_service_role_write"
  ON status_logs FOR INSERT
  WITH CHECK (is_admin());
```

**Campos:**

| Campo | Tipo | Restrições | Descrição |
|-------|------|-----------|-----------|
| `id` | uuid | PK | Identificador do log |
| `instance_id` | uuid | NOT NULL, FK instances | Instância a que pertence |
| `contractor_id` | uuid | NOT NULL, FK profiles | Desnormalizado para RLS eficiente |
| `status` | instance_status | NOT NULL | Estado registrado |
| `recorded_at` | timestamptz | NOT NULL | Início do estado |
| `ended_at` | timestamptz | nullable | Fim do estado (null = atual) |

**Retenção:** Registros com `recorded_at < NOW() - INTERVAL '90 days'` são removidos automaticamente
(LGPD — retenção máxima 90 dias).

---

## Relacionamentos

```
auth.users (Supabase)
    │ 1:1
    ▼
profiles
    │ 1:N
    ▼
instances ──────────────────────────────────▶ worldmensage_instance_id (externa)
    │ 1:N
    ▼
status_logs
```

---

## Migrations (ordem de execução)

1. `001_create_enums.sql` — cria `instance_status`, `user_role`
2. `002_create_profiles.sql` — cria `profiles`, RLS, trigger de criação automática
3. `003_create_instances.sql` — cria `instances`, índices, RLS, função `is_admin()`
4. `004_create_status_logs.sql` — cria `status_logs`, índices, RLS
5. `005_retention_cleanup.sql` — função de limpeza de logs (chamada pelo Cron de retenção)

---

## Supabase Realtime

Habilitar Realtime na tabela `instances` para que clientes recebam atualizações de status
sem polling. Filtrar por `contractor_id` no cliente para receber apenas atualizações das
próprias instâncias.

```typescript
// Exemplo de subscription no cliente
supabase
  .channel('instances-status')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'instances',
    filter: `contractor_id=eq.${userId}`
  }, (payload) => {
    updateInstanceStatus(payload.new)
  })
  .subscribe()
```

---

## Notas de Segurança

- `worldmensage_instance_id` é visível ao contratante mas só é utilizável via API routes
  server-side (nunca chamado diretamente do cliente)
- `profiles.role` não pode ser alterado pelo próprio usuário (RLS + sem UPDATE policy para self)
- Service Role key (Vercel env) é o único que tem write access a `status_logs`
