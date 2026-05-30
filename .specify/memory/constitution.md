<!--
## Sync Impact Report

**Version change**: 0.0.0 (template) → 1.0.0 (initial ratification)

### Principles
- [PRINCIPLE_1_NAME] → I. Autonomia do Cliente Final (new)
- [PRINCIPLE_2_NAME] → II. Feedback Visual Imediato (new)
- [PRINCIPLE_3_NAME] → III. Isolamento Multi-Tenant (new)
- [PRINCIPLE_4_NAME] → IV. Simplicidade e YAGNI (new)
- [PRINCIPLE_5_NAME] → V. Stack Padrão Obrigatória (new)

### Sections Added
- Qualidade e Segurança (Section 2)
- Workflow de Desenvolvimento (Section 3)
- Governance

### Templates
- ✅ `.specify/templates/plan-template.md` — Constitution Check section already present; no structural changes needed
- ✅ `.specify/templates/spec-template.md` — Compatible with all five principles; no changes needed
- ✅ `.specify/templates/tasks-template.md` — Multi-tenant and usability tasks MUST be represented in generated task lists
- ✅ `.specify/templates/commands/` — No command files found; no updates needed

### Deferred TODOs
- None. All fields resolved from user input and project context.
-->

# Avimus WPP Monitor — Constitution

## Core Principles

### I. Autonomia do Cliente Final

O cliente final DEVE conseguir realizar todas as ações críticas — reconectar instância, verificar
status, gerenciar configurações — sem necessidade de contato com suporte.

- A UI DEVE apresentar em todo momento o estado atual da instância de forma legível e sem ambiguidade.
- Toda ação disponível ao usuário DEVE ter feedback claro de início, progresso e conclusão.
- Mensagens de erro DEVEM indicar o problema e, sempre que possível, a ação corretiva esperada.
- Fluxos de reconexão DEVEM ser completos e autossuficientes dentro da interface.

**Rationale**: Reduzir fricção de suporte é o principal diferencial de produto. Um cliente que
consegue se auto-atender não abandona a plataforma.

### II. Feedback Visual Imediato

Toda mudança de estado de instância WhatsApp DEVE ser refletida na interface em até 5 segundos.

- Estados de carregamento, erro, conectado, desconectado e reconectando DEVEM ser visualmente
  distintos e inequívocos.
- Nunca deixar o usuário sem resposta visual após uma ação — loading state é obrigatório.
- Polling de status DEVE usar mecanismos eficientes (Supabase Realtime ou pooling com back-off).
- Toasts, badges e indicadores de status DEVEM usar linguagem direta, não jargão técnico.

**Rationale**: Status ambíguo gera tickets de suporte. Feedback imediato é o que separa um produto
de monitoramento de uma tela de logs.

### III. Isolamento Multi-Tenant

Dados de tenants DEVEM ser isolados na camada de banco de dados via Row Level Security (RLS)
do Supabase. Nenhum tenant PODE acessar dados de outro tenant sob qualquer circunstância.

- Toda tabela que contém dados de tenant DEVE ter política RLS ativa e testada.
- Queries de aplicação NUNCA DEVEM filtrar por tenant_id em código quando RLS pode fazê-lo.
- Autenticação via Supabase Auth — o JWT do usuário determina o tenant context automaticamente.
- Testes de isolamento DEVEM cobrir tentativas de acesso cross-tenant explicitamente.

**Rationale**: Vazamento de dados entre tenants é uma falha catastrófica e inaceitável em SaaS.
RLS é a linha de defesa principal; não depender apenas de filtros de aplicação elimina erros humanos.

### IV. Simplicidade e YAGNI

Nenhum código DEVE ser adicionado sem necessidade imediata e demonstrável.

- Abstrações DEVEM ser justificadas por requisitos presentes, não por cenários hipotéticos.
- Três linhas similares são preferíveis a uma abstração prematura.
- Padrões de design arquiteturais (Repository, CQRS, etc.) DEVEM ser adotados apenas quando a
  complexidade atual os exige — não por antecipação.
- Features, flags, e código de compatibilidade retroativa DEVEM ser removidos quando não há uso ativo.

**Rationale**: Over-engineering aumenta custo de manutenção, dificulta onboarding e adia entrega
de valor real. A simplicidade é uma vantagem competitiva, não uma fraqueza.

### V. Stack Padrão Obrigatória

O projeto DEVE usar Next.js 14 (App Router), Supabase (PostgreSQL + Auth + RLS) e Vercel.

- **Frontend**: Next.js 14 com App Router. Server Components por padrão; Client Components apenas
  quando necessário (interatividade, estado local, browser APIs).
- **Backend/DB**: Supabase — PostgreSQL para persistência, Auth para identidade, RLS para
  isolamento, Realtime para status em tempo real.
- **Deploy**: Vercel para frontend/API routes. Variáveis de ambiente via Vercel dashboard.
- Adições à stack (libs, serviços externos) DEVEM ser documentadas no plano da feature com
  justificativa clara.
- Substituições de componentes da stack EXIGEM proposta documentada e aprovação explícita.

**Rationale**: Stack consistente reduz fricção cognitiva, simplifica onboarding, e concentra
expertise. A stack escolhida cobre o domínio do produto sem lacunas.

## Qualidade e Segurança

**Segurança multi-tenant é inegociável:**
- RLS DEVE estar ativa antes de qualquer feature que persiste dados de tenant.
- Chaves Supabase service role NUNCA DEVEM ser expostas no cliente (browser/app).
- Variáveis de ambiente com credenciais NUNCA DEVEM ser commitadas.

**Performance mínima aceitável:**
- Status de instância DEVE atualizar em ≤ 5 segundos após mudança real.
- Páginas iniciais DEVEM carregar em ≤ 2 segundos em conexão 4G padrão.
- Polling/realtime DEVE implementar back-off para evitar sobrecarga no Supabase.

**Qualidade de código:**
- TypeScript estrito (`strict: true`) em todo o projeto.
- Componentes DEVEM ter responsabilidade única e clara.
- Lógica de negócio DEVE residir em server actions ou API routes — nunca exposta no cliente.

## Workflow de Desenvolvimento

**Antes de implementar qualquer feature:**
1. Spec aprovada em `/specs/[###-feature-name]/spec.md`.
2. Constitution Check aprovado no plano (`plan.md`).
3. RLS e isolamento multi-tenant avaliados explicitamente.

**Durante implementação:**
- Commits atômicos por tarefa concluída.
- Features DEVEM ser testáveis de forma independente ao final de cada user story.
- Deploy preview no Vercel DEVE ser validado antes de merge para main.

**Gates de qualidade:**
- TypeScript sem erros (`tsc --noEmit`) obrigatório antes de merge.
- RLS testada manualmente ou via migration seed antes de qualquer deploy que adicione nova tabela.
- Fluxos críticos de usuário (reconexão de instância, visualização de status) DEVEM ser
  validados no preview antes de merge.

## Governance

Esta constituição é o documento de maior autoridade do projeto. Em caso de conflito com outras
práticas, convenções ou preferências pessoais, a constituição prevalece.

**Processo de emenda:**
1. Abrir PR com proposta de alteração ao arquivo `constitution.md`.
2. Documentar: princípio afetado, motivação, impacto nos templates e features existentes.
3. Incrementar `CONSTITUTION_VERSION` conforme semver (MAJOR: remoção/redefinição incompatível;
   MINOR: novo princípio ou seção; PATCH: clarificação ou correção).
4. Atualizar `LAST_AMENDED_DATE` para a data da aprovação.

**Compliance:**
- Todo PR DEVE incluir um Constitution Check no `plan.md` da feature.
- Violações documentadas em `plan.md > Complexity Tracking` com justificativa explícita.
- Revisores DEVEM verificar conformidade com os princípios antes de aprovar.

**Version**: 1.0.0 | **Ratified**: 2026-05-30 | **Last Amended**: 2026-05-30
