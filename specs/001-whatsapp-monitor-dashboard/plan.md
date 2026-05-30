# Implementation Plan: Painel de Monitoramento de Instâncias WhatsApp

**Branch**: `001-whatsapp-monitor-dashboard` | **Date**: 2026-05-30 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-whatsapp-monitor-dashboard/spec.md`

## Summary

Painel SaaS multi-tenant para monitoramento de instâncias WhatsApp. Contratantes visualizam o
status em tempo real das suas instâncias (Conectada / Desconectada / Falha na Entrega /
Reconectando) e reconectam instâncias desconectadas via QR Code sem precisar de suporte.
Administradores gerenciam contratantes e instâncias, com visão global da plataforma.

Abordagem técnica: Next.js 14 (App Router) + Supabase (PostgreSQL + Auth + RLS + Realtime) +
Vercel (deploy + Cron). Status sincronizado via Vercel Cron → Worldmensage API → Supabase DB →
Supabase Realtime → cliente. QR Code gerado on-demand via API Route server-side.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+

**Primary Dependencies**:
- Next.js 14 (App Router, Server Components, Server Actions)
- @supabase/ssr + @supabase/supabase-js
- shadcn/ui (Radix UI + Tailwind CSS)
- lucide-react (ícones)
- date-fns (formatação de datas)
- sonner (toast notifications)

**Storage**: Supabase PostgreSQL — tabelas: `profiles`, `instances`, `status_logs`

**Testing**: Não incluído no escopo desta feature (sem testes automatizados no MVP —
conforme YAGNI; validação via checklist no quickstart.md)

**Target Platform**: Web (desktop + mobile), navegadores modernos (Chrome, Safari, Firefox)

**Project Type**: Web application (SaaS multi-tenant)

**Performance Goals**:
- Status update percebido pelo usuário: ≤ 5 segundos após mudança real (SC-002)
- Carregamento inicial do dashboard: ≤ 2 segundos (requisito da constituição)
- Cron sync: 200 instâncias a cada 10 segundos (1.200 req/min à Worldmensage — verificar rate limits)

**Constraints**:
- API key da Worldmensage exclusivamente server-side (nunca no bundle do cliente)
- RLS ativo em todas as tabelas com dados de tenant
- Logs de status com retenção máxima de 90 dias (LGPD)
- Sem SSO ou magic link no MVP (email/password apenas)

**Scale/Scope**: até 50 contratantes, até 200 instâncias totais em 12 meses

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Status | Evidência |
|-----------|--------|-----------|
| I. Autonomia do Cliente Final | ✅ PASS | QR Code flow completo no painel; 4 estados visuais distintos; botão "Reconectar" contextual; timer + regeneração de QR |
| II. Feedback Visual Imediato | ✅ PASS | Supabase Realtime propaga status em ≤5s; estados de loading, erro e sucesso definidos; QR Code modal com timer; toast para ações |
| III. Isolamento Multi-Tenant | ✅ PASS | RLS em `instances` e `status_logs` com `contractor_id = auth.uid()`; API key Worldmensage server-only; Service Role key exclusiva do servidor |
| IV. Simplicidade e YAGNI | ✅ PASS | Sem Repository pattern; Supabase Realtime elimina WebSocket customizado; Vercel Cron elimina fila de mensagens; shadcn/ui evita biblioteca de componentes pesada |
| V. Stack Padrão Obrigatória | ✅ PASS | Next.js 14 (App Router), Supabase (PostgreSQL + Auth + RLS + Realtime), Vercel (deploy + Cron) |

**Resultado: APROVADO — pode avançar para implementação.**

**Post-design re-check** (após Phase 1):

| Princípio | Status | Notas |
|-----------|--------|-------|
| III. Isolamento Multi-Tenant | ✅ PASS | `contractor_id` desnormalizado em `status_logs` para RLS sem subquery; `is_admin()` SECURITY DEFINER impede escalada de privilégio |
| IV. Simplicidade e YAGNI | ✅ PASS | Sem abstrações extras; desnormalização de `contractor_id` é tradeoff justificado (ver Complexity Tracking) |

## Project Structure

### Documentation (this feature)

```text
specs/001-whatsapp-monitor-dashboard/
├── plan.md              # Este arquivo
├── research.md          # Decisões de pesquisa e arquitetura
├── data-model.md        # Schema do banco, RLS, Realtime
├── quickstart.md        # Setup e validação end-to-end
├── contracts/
│   ├── internal-api.md  # Contratos das API Routes do Next.js
│   └── worldmensage-api.md  # Endpoints assumidos da Worldmensage (validar)
└── tasks.md             # Gerado pelo /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx                  # Middleware de sessão + role check
│   │   ├── page.tsx                    # Dashboard do contratante
│   │   ├── instances/
│   │   │   └── [id]/
│   │   │       └── page.tsx            # Histórico de status
│   │   └── admin/
│   │       ├── layout.tsx              # Guarda de role admin
│   │       ├── page.tsx                # Visão geral admin
│   │       ├── contractors/
│   │       │   ├── page.tsx
│   │       │   └── new/page.tsx
│   │       └── instances/
│   │           └── page.tsx
│   ├── api/
│   │   ├── instances/[id]/
│   │   │   ├── qrcode/route.ts
│   │   │   └── status/route.ts
│   │   ├── admin/
│   │   │   ├── contractors/route.ts
│   │   │   └── instances/
│   │   │       └── [id]/route.ts
│   │   └── cron/
│   │       └── sync-status/route.ts
│   ├── privacy/
│   │   └── page.tsx
│   └── layout.tsx
├── components/
│   ├── instances/
│   │   ├── InstanceCard.tsx
│   │   ├── StatusBadge.tsx
│   │   └── QRCodeModal.tsx
│   ├── admin/
│   │   ├── ContractorForm.tsx
│   │   └── InstanceAssignForm.tsx
│   └── ui/                             # shadcn/ui (gerado)
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   └── worldmensage/
│       └── client.ts
├── types/
│   └── index.ts
└── middleware.ts

supabase/
└── migrations/
    ├── 001_create_enums.sql
    ├── 002_create_profiles.sql
    ├── 003_create_instances.sql
    ├── 004_create_status_logs.sql
    └── 005_retention_cleanup.sql

vercel.json                             # Cron job config
```

**Structure Decision**: Web application (Next.js App Router). Frontend e backend API coexistem
na mesma aplicação Next.js (via route groups e API routes). Sem separação backend/frontend em
projetos distintos — YAGNI, alinhado com arquitetura padrão Next.js 14.

## Complexity Tracking

| Decisão | Por que necessária | Alternativa mais simples rejeitada porque |
|---------|--------------------|------------------------------------------|
| `contractor_id` desnormalizado em `status_logs` | RLS eficiente sem subquery em policy | JOIN na policy causaria query planner issue em alta frequência de updates pelo Cron |
| Vercel Cron + Service Role para sync | Sync centralizado, API key protegida | Client-side polling expõe API key e não escala com múltiplos usuários simultâneos |
