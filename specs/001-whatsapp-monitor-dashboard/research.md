# Research: Painel de Monitoramento de Instâncias WhatsApp

**Branch**: `001-whatsapp-monitor-dashboard` | **Date**: 2026-05-30

---

## 1. Worldmensage API

### Decision
Proxy todas as chamadas à API Worldmensage através de Next.js API Routes no servidor.
A API key da Worldmensage NUNCA é exposta ao cliente.

### Endpoints assumidos (verificar na documentação oficial da Worldmensage)

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/instance/connectionState/{instanceName}` | GET | Retorna o status atual da instância |
| `/instance/connect/{instanceName}` | GET | Gera o QR Code para reconexão |
| `/instance/logout/{instanceName}` | DELETE | Desconecta a instância |

**Status retornados esperados (mapear para estados internos):**

| Status Worldmensage | Estado Interno |
|--------------------|----------------|
| `open` | `connected` |
| `close` | `disconnected` |
| `connecting` | `reconnecting` |
| Falha de entrega detectada via campo auxiliar | `delivery_failure` |

> **⚠ AÇÃO REQUERIDA**: Validar nomes exatos dos endpoints e campos de resposta na
> documentação oficial da Worldmensage antes de iniciar a implementação.
> URL de referência: documentação da API Worldmensage / Swagger da instância configurada.

### Rationale
Proxying server-side mantém a API key segura (princípio III da constituição — segurança).
Evita expor credenciais no bundle do cliente.

### Alternatives considered
- Chamada direta do browser à Worldmensage: rejeitado — expõe API key no cliente.
- SDK oficial da Worldmensage: verificar se existe; se sim, usar no wrapper server-side.

---

## 2. Estratégia de Atualização de Status (Status Propagation)

### Decision
**Server-side polling via Vercel Cron + Supabase Realtime para push ao cliente.**

Fluxo:
1. Vercel Cron Job (a cada 10 segundos) chama `GET /api/cron/sync-status`
2. API route faz GET Worldmensage para cada instância ativa
3. Compara com status atual no DB; se mudou, atualiza `instances.current_status` e insere em `status_logs`
4. Supabase Realtime detecta o UPDATE e notifica todos os clientes conectados via WebSocket
5. Cliente atualiza a UI sem reload

### Rationale
- **Centralizado**: uma única thread de polling para 200 instâncias, não 200 conexões independentes
- **Eficiente**: Supabase Realtime elimina polling do cliente (sem fetch periódico no browser)
- **Simples**: sem infraestrutura adicional além de Vercel Cron (built-in no Vercel)
- **Custo previsível**: 6 chamadas/min × 200 instâncias = 1200 chamadas/min à Worldmensage — verificar rate limits

### Alternatives considered
- **Client-side polling**: cada browser faz fetch periódico à API. Rejeitado — não escala com 200
  instâncias × N usuários simultâneos; chamadas duplicadas.
- **Webhooks da Worldmensage**: ideal se suportado. Verificar se a Worldmensage suporta
  webhooks de mudança de status; se sim, implementar como upgrade na v2 para eliminar o Cron Job.
- **Vercel Edge Streaming**: complexidade desnecessária para o volume atual (YAGNI — princípio IV).

### Cron interval
10 segundos satisfaz o requisito SC-002 (≤5s de latência percebida pelo usuário, considerando
o delay de processamento do Realtime). Ajustável para 5s se necessário, observando rate limits
da Worldmensage.

---

## 3. Next.js 14 App Router + Supabase Auth

### Decision
Usar **Supabase SSR** (`@supabase/ssr`) com dois clientes distintos:
- `createBrowserClient` — componentes Client (`'use client'`)
- `createServerClient` — Server Components, API Routes, Server Actions, Middleware

Autenticação via **Supabase Auth Email/Password** com sessão em cookies HTTP-only (gerenciado pelo
`@supabase/ssr`).

Middleware do Next.js (`middleware.ts`) intercepta todas as rotas protegidas e renova o token
de sessão automaticamente via `supabase.auth.getUser()`.

### Padrão de route groups
```
app/(auth)/          → rotas públicas (login)
app/(dashboard)/     → rotas protegidas (middleware valida sessão)
app/(dashboard)/admin/ → rotas de admin (middleware valida role)
```

### Rationale
- `@supabase/ssr` é o padrão oficial do Supabase para Next.js App Router (2024+)
- Cookies HTTP-only previnem XSS; token auto-renovado via middleware
- Route groups permitem layouts distintos sem impactar a URL

### Alternatives considered
- `@supabase/auth-helpers-nextjs`: deprecado em favor do `@supabase/ssr`
- JWT customizado: complexidade desnecessária quando Supabase Auth já provê

---

## 4. Multi-Tenant RLS Strategy

### Decision
**Row Level Security (RLS) no Supabase com `auth.uid()` como âncora de isolamento.**

Cada tabela de dados de tenant tem `contractor_id uuid` com política RLS:
```sql
-- instances: contractors see only their own
CREATE POLICY "contractors_own_instances"
  ON instances FOR ALL
  USING (contractor_id = auth.uid() OR is_admin());

-- status_logs: contractors see logs of their instances only
CREATE POLICY "contractors_own_logs"
  ON status_logs FOR SELECT
  USING (contractor_id = auth.uid() OR is_admin());
```

`is_admin()` é uma função SQL que verifica `profiles.role = 'admin'`.

`contractor_id` é **desnormalizado em `status_logs`** (mesmo que seja derivável via JOIN com
`instances`) para permitir RLS simples e eficiente sem subqueries na policy.

### Rationale
- RLS é a linha de defesa no DB — protege mesmo se houver bug na camada de aplicação (princípio III)
- Desnormalização de `contractor_id` em logs é um tradeoff explícito: levemente redundante,
  mas torna a policy de RLS simples e o índice eficiente
- Admin acessa tudo via `is_admin()` sem bypass de RLS (RLS fica sempre ativo)

### Cron Job e service role
O Vercel Cron Job usa o **Supabase Service Role key** (bypass RLS) para atualizar status de
todas as instâncias. Esta key fica exclusivamente em variáveis de ambiente do servidor Vercel,
nunca no bundle do cliente.

### Alternatives considered
- Tenant schema isolation (schema por tenant): overkill para 50 tenants, viola YAGNI
- Filtro de `contractor_id` apenas na camada de aplicação: rejeitado — falha silenciosa
  se bug de aplicação — RLS é obrigatório pela constituição

---

## 5. QR Code Display

### Decision
Worldmensage retorna o QR Code como **imagem base64** ou URL. Exibir diretamente com `<img>`.
Não utilizar biblioteca de geração de QR Code no cliente — o QR Code já vem pronto da API.

Fluxo do modal de reconexão:
1. Contratante clica em "Reconectar" → POST `/api/instances/[id]/qrcode`
2. API Route chama Worldmensage → retorna base64
3. Modal exibe `<img src="data:image/png;base64,...">` com contador de expiração (30s)
4. Supabase Realtime escuta mudança de `instances.current_status`
5. Quando status muda para `reconnecting` → atualiza UI do modal
6. Quando status muda para `connected` → fecha modal, exibe sucesso

### QR Code expiration
Implementar contador regressivo visual (ex: 30 segundos). Ao expirar, habilitar botão
"Gerar novo QR Code" sem fechar o modal.

### Rationale
- Zero dependências extras para geração de QR (princípio IV — YAGNI)
- Realtime elimina a necessidade de polling do cliente para detectar reconexão

---

## 6. LGPD — Retenção de Dados

### Decision
- Logs de status: retenção de **90 dias** via Supabase pg_cron ou função agendada
- Exclusão de contratante: cascade delete em `instances` e `status_logs` via FK constraints
- Política de privacidade: página estática em `/privacy`

### Implementação da retenção
```sql
-- Executar via pg_cron a cada dia
DELETE FROM status_logs WHERE recorded_at < NOW() - INTERVAL '90 days';
```

Alternativa simples: Vercel Cron diário chamando endpoint de limpeza.

---

## 7. Decisões de Biblioteca UI

### Decision
**shadcn/ui** — componentes acessíveis e personalizáveis baseados em Radix UI + Tailwind CSS.

Componentes principais a usar:
- `Badge` — indicador de status (Conectada/Desconectada/Falha na Entrega/Reconectando)
- `Dialog` — modal do QR Code
- `Card` — card de instância no dashboard
- `Toast` (sonner) — feedback de ações (reconexão iniciada, erro, etc.)
- `Table` — histórico de status

### Rationale
shadcn/ui é a escolha padrão para projetos Next.js com Tailwind; sem lock-in de versão;
componentes são copiados para o projeto (não dependência de runtime).
