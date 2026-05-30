# Quickstart: Painel de Monitoramento de Instâncias WhatsApp

**Branch**: `001-whatsapp-monitor-dashboard` | **Date**: 2026-05-30

---

## Pré-requisitos

- Node.js 20+
- Conta Supabase (projeto criado)
- Conta Vercel (deploy)
- Credenciais da API Worldmensage

---

## 1. Setup do Projeto

```bash
npx create-next-app@14 avimus-wpp-monitor \
  --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

cd avimus-wpp-monitor

# UI components
npx shadcn@latest init
npx shadcn@latest add card badge dialog toast table button

# Supabase
npm install @supabase/ssr @supabase/supabase-js

# Ícones
npm install lucide-react

# Utilidades
npm install date-fns
```

---

## 2. Variáveis de Ambiente

Criar `.env.local` (desenvolvimento) e configurar no dashboard do Vercel (produção):

```bash
# Supabase — obtidos no dashboard do projeto Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Supabase Service Role — APENAS server-side (nunca NEXT_PUBLIC_)
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Worldmensage — APENAS server-side
WORLDMENSAGE_BASE_URL=https://api.worldmensage.com
WORLDMENSAGE_API_KEY=sk-...

# Cron secret — protege o endpoint de sync
CRON_SECRET=gere-um-valor-aleatorio-seguro
```

---

## 3. Supabase — Migrations

Executar as migrations na ordem no SQL Editor do Supabase ou via `supabase db push`:

```bash
supabase/migrations/
├── 001_create_enums.sql
├── 002_create_profiles.sql
├── 003_create_instances.sql
├── 004_create_status_logs.sql
└── 005_retention_cleanup.sql
```

Habilitar **Realtime** na tabela `instances`:
- Supabase Dashboard → Database → Replication → Add `instances` table

---

## 4. Estrutura de Arquivos

```
src/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx           # Página de login
│   ├── (dashboard)/
│   │   ├── layout.tsx             # Layout protegido (valida sessão)
│   │   ├── page.tsx               # Dashboard do contratante
│   │   ├── instances/
│   │   │   └── [id]/
│   │   │       └── page.tsx       # Histórico de status da instância
│   │   └── admin/
│   │       ├── layout.tsx         # Valida role = 'admin'
│   │       ├── page.tsx           # Visão geral admin
│   │       ├── contractors/
│   │       │   ├── page.tsx       # Listagem de contratantes
│   │       │   └── new/page.tsx   # Cadastro de contratante
│   │       └── instances/
│   │           └── page.tsx       # Gerenciar instâncias
│   ├── api/
│   │   ├── instances/
│   │   │   └── [id]/
│   │   │       ├── qrcode/route.ts
│   │   │       └── status/route.ts
│   │   ├── admin/
│   │   │   ├── contractors/route.ts
│   │   │   └── instances/route.ts
│   │   └── cron/
│   │       └── sync-status/route.ts
│   ├── privacy/
│   │   └── page.tsx               # Política de privacidade (LGPD)
│   └── layout.tsx
├── components/
│   ├── instances/
│   │   ├── InstanceCard.tsx       # Card com status e botão Reconectar
│   │   ├── StatusBadge.tsx        # Badge colorido por estado
│   │   └── QRCodeModal.tsx        # Modal com QR Code + timer + Realtime
│   ├── admin/
│   │   ├── ContractorForm.tsx
│   │   └── InstanceAssignForm.tsx
│   └── ui/                        # shadcn/ui (gerado automaticamente)
├── lib/
│   ├── supabase/
│   │   ├── client.ts              # createBrowserClient()
│   │   ├── server.ts              # createServerClient() para RSC/Actions
│   │   └── middleware.ts          # createServerClient() para middleware
│   └── worldmensage/
│       └── client.ts              # Wrapper da API Worldmensage
├── types/
│   └── index.ts                   # Instance, Profile, StatusLog types
└── middleware.ts                  # Proteção de rotas + refresh de sessão
```

---

## 5. Vercel Cron Job

Adicionar `vercel.json` na raiz:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-status",
      "schedule": "*/10 * * * * *"
    }
  ]
}
```

> Nota: O cron do Vercel tem granularidade mínima de 1 minuto no plano gratuito.
> Para polling a cada 10 segundos, pode ser necessário o plano Pro ou usar um serviço
> externo (ex: Upstash QStash). Avaliar durante a implementação.

---

## 6. Validação Pós-Deploy

Checklist de validação end-to-end:

- [ ] Login funciona com email/password
- [ ] Contratante vê apenas suas próprias instâncias (não vê instâncias de outro contratante)
- [ ] Status das instâncias atualiza automaticamente sem reload (Supabase Realtime)
- [ ] Botão "Reconectar" aparece apenas para instâncias no estado "Desconectada"
- [ ] QR Code é exibido após clicar em "Reconectar"
- [ ] Após escanear o QR Code, a instância transita de "Reconectando" para "Conectada" sem reload
- [ ] Timer de expiração do QR Code funciona; botão "Gerar novo" aparece ao expirar
- [ ] Admin vê todas as instâncias de todos os contratantes
- [ ] Admin consegue cadastrar novo contratante e atribuir instância
- [ ] Histórico de status exibe eventos em ordem cronológica decrescente
- [ ] Quando a Worldmensage está indisponível, o painel exibe último status + aviso de staleness
- [ ] Página de política de privacidade está acessível em `/privacy`
