# Feature Specification: Painel de Monitoramento de Instâncias WhatsApp

**Feature Branch**: `001-whatsapp-monitor-dashboard`

**Created**: 2026-05-30

**Status**: Draft

**Input**: User description: "Quero um painel web de monitoramento de instâncias WhatsApp para uso próprio e dos meus clientes (contratantes). A ferramenta consome a API da Worldmensage para verificar o status de cada instância (online/offline) e se as mensagens estão sendo entregues. O contratante acessa seu painel, vê o status em tempo real da sua instância, e caso esteja desconectada, gera o QR Code diretamente na tela para reconectar sem precisar acionar suporte."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Contratante Visualiza Status em Tempo Real (Priority: P1)

O contratante acessa o painel e visualiza imediatamente o status atual de cada uma de suas instâncias
WhatsApp — se estão conectadas, desconectadas ou com falha na entrega de mensagens. O painel atualiza
automaticamente, sem necessidade de recarregar a página.

**Why this priority**: É a funcionalidade central do produto. Sem visibilidade do status, o contratante
não sabe quando agir. É o valor imediato e o motivo pelo qual o cliente paga pela plataforma.

**Independent Test**: Um contratante autenticado pode acessar o painel e ver o estado atual de todas as
suas instâncias, com atualização automática de status sem intervenção manual. Entrega MVP mínimo:
visibilidade do problema sem depender de qualquer outro story.

**Acceptance Scenarios**:

1. **Given** o contratante está autenticado, **When** acessa o painel, **Then** vê todas as suas instâncias com status atual claramente indicado (Conectada / Desconectada / Falha na Entrega / Reconectando).
2. **Given** uma instância muda de status (ex.: desconecta), **When** a mudança ocorre no sistema, **Then** o painel reflete o novo status em até 5 segundos sem que o contratante precise recarregar a página.
3. **Given** o contratante tem múltiplas instâncias, **When** visualiza o painel, **Then** cada instância é exibida de forma distinta com seu status individual.
4. **Given** uma instância está com falha na entrega de mensagens mas ainda tecnicamente conectada, **When** o contratante visualiza o painel, **Then** vê um indicador visual diferenciado para falha de entrega (estado distinto de "desconectada").

---

### User Story 2 - Contratante Reconecta Instância Desconectada via QR Code (Priority: P1)

Quando uma instância está desconectada, o contratante reconecta diretamente pelo painel, gerando um
QR Code na tela e escaneando com o celular — sem precisar contatar o suporte.

**Why this priority**: É o diferencial central do produto. A autonomia do cliente elimina o principal
custo operacional de suporte e é a proposta de valor que justifica a existência da plataforma.

**Independent Test**: Um contratante com uma instância desconectada pode iniciar o fluxo de reconexão,
visualizar o QR Code na tela, escanear com seu celular, e confirmar que a instância voltou ao estado
conectado — tudo sem sair do painel e sem intervenção de suporte.

**Acceptance Scenarios**:

1. **Given** uma instância está no estado "Desconectada", **When** o contratante clica no botão "Reconectar", **Then** o sistema gera e exibe um QR Code legível na tela.
2. **Given** o QR Code está exibido, **When** o contratante escaneia com o aplicativo WhatsApp no celular, **Then** a instância transita para o estado "Reconectando" imediatamente e, ao concluir, muda para "Conectada" — o painel reflete cada transição automaticamente.
3. **Given** o QR Code expirou antes de ser escaneado, **When** o contratante percebe a expiração, **Then** pode solicitar um novo QR Code sem precisar sair da tela ou recarregar a página.
4. **Given** uma instância não está no estado "Desconectada", **When** o contratante visualiza o painel, **Then** o botão "Reconectar" não é exibido para essa instância.
5. **Given** o serviço externo não responde ao tentar gerar o QR Code, **When** o erro ocorre, **Then** o sistema exibe mensagem clara com orientação para nova tentativa.

---

### User Story 3 - Administrador Gerencia Contratantes e Instâncias (Priority: P2)

O administrador (dono da plataforma) tem acesso a um painel administrativo onde pode cadastrar
contratantes, atribuir instâncias WhatsApp a cada contratante, e visualizar o status de todas as
instâncias da plataforma em um único lugar.

**Why this priority**: Sem o cadastro de contratantes, o produto não pode ser oferecido a clientes.
No entanto, o onboarding inicial pode ser operado manualmente, portanto não bloqueia o MVP do contratante.

**Independent Test**: Um administrador autenticado pode criar um contratante, atribuir uma instância a
ele, verificar que o contratante tem acesso somente àquela instância, e visualizar o status dessa
instância no painel de administração.

**Acceptance Scenarios**:

1. **Given** o administrador está autenticado, **When** acessa o painel admin, **Then** vê a lista de todos os contratantes e o status consolidado de suas instâncias.
2. **Given** o administrador deseja adicionar um contratante, **When** preenche e submete o formulário de cadastro, **Then** o contratante recebe acesso ao painel com as instâncias atribuídas visíveis.
3. **Given** o administrador atribui uma instância a um contratante, **When** a atribuição é concluída, **Then** a instância aparece no painel do contratante e desaparece da lista de instâncias não atribuídas.
4. **Given** o administrador visualiza o painel, **When** qualquer instância de qualquer contratante muda de status, **Then** o status atualiza no painel admin em até 5 segundos.

---

### User Story 4 - Consulta de Histórico de Status (Priority: P3)

O administrador e o contratante podem consultar o histórico de mudanças de status de uma instância
para entender padrões de desconexão, frequência de problemas e duração das interrupções.

**Why this priority**: Permite diagnóstico proativo e evidencia problemas recorrentes. Agrega valor
significativo sem ser bloqueante para o MVP.

**Independent Test**: Um usuário autenticado pode acessar o histórico de status de uma instância e
ver os eventos de mudança de status com data, hora e duração de cada estado.

**Acceptance Scenarios**:

1. **Given** o contratante acessa o histórico de uma de suas instâncias, **When** visualiza a lista de eventos, **Then** vê cada mudança de status com data, hora de início, hora de fim e duração.
2. **Given** o administrador acessa o histórico de qualquer instância, **When** visualiza, **Then** vê os mesmos dados acrescidos da identificação do contratante responsável.

---

### Edge Cases

- O que acontece quando o serviço externo de monitoramento está indisponível? (Exibir último status conhecido com aviso explícito de falha de sincronização e data/hora do último dado confiável)
- O que acontece quando o QR Code expira antes de ser escaneado? (Permitir geração imediata de novo QR Code, sem perda do contexto)
- O que acontece quando um contratante tem muitas instâncias? (Lista com filtro por status — ex.: mostrar só desconectadas)
- O que acontece quando a instância está em estado "Reconectando"? (Estado formal e distinto exibido durante o processo de reconexão; botão de gerar QR Code desabilitado enquanto ativo)
- O que acontece quando o serviço externo não responde ao gerar o QR Code? (Mensagem de erro amigável com instrução de nova tentativa)
- O que acontece quando dois usuários admin tentam atribuir a mesma instância simultaneamente? (Primeiro a confirmar prevalece; outro recebe aviso)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE exibir o status atual de cada instância WhatsApp atribuída ao contratante autenticado. Os estados possíveis são: **Conectada**, **Desconectada**, **Falha na Entrega** e **Reconectando** — cada um com indicador visual distinto.
- **FR-002**: O sistema DEVE atualizar o status das instâncias automaticamente, sem exigir ação do usuário, em no máximo 5 segundos após uma mudança real de estado.
- **FR-003**: O sistema DEVE exibir um botão "Reconectar" para instâncias no estado "Desconectada". Ao clicar, o sistema gera e exibe o QR Code diretamente no painel. O botão NÃO é exibido para instâncias nos estados "Conectada", "Falha na Entrega" ou "Reconectando".
- **FR-004**: O QR Code exibido DEVE ser legível para escaneamento com o aplicativo WhatsApp em um celular a até 30 cm de distância da tela.
- **FR-005**: O sistema DEVE detectar automaticamente quando o QR Code foi escaneado, transitando a instância para "Reconectando" e, ao concluir, para "Conectada".
- **FR-006**: O sistema DEVE permitir a regeneração do QR Code quando o atual expirar, sem interromper o fluxo do usuário.
- **FR-007**: O sistema DEVE garantir que cada contratante visualize e acesse exclusivamente as instâncias atribuídas a ele, sem qualquer acesso a dados de outros contratantes.
- **FR-008**: O sistema DEVE registrar um log histórico de cada mudança de status de instância, incluindo timestamp e novo estado.
- **FR-009**: O sistema DEVE exibir uma indicação visual clara quando o serviço externo de monitoramento estiver indisponível, apresentando o último status conhecido e a data/hora da última sincronização bem-sucedida.
- **FR-010**: Administradores DEVEM poder cadastrar contratantes com nome e credenciais de acesso.
- **FR-011**: Administradores DEVEM poder atribuir e reatribuir instâncias WhatsApp a contratantes.
- **FR-012**: Administradores DEVEM ter acesso a uma visão consolidada do status de todas as instâncias de todos os contratantes.
- **FR-013**: O painel DEVE ser utilizável em dispositivos móveis, pois o contratante precisará visualizar o QR Code e escanear com o celular simultaneamente (ex.: usando outro dispositivo ou dividindo tela).
- **FR-014**: Logs históricos de status DEVEM ter retenção máxima de 90 dias, após os quais são automaticamente removidos.
- **FR-015**: A exclusão de conta de um contratante DEVE remover todos os dados pessoais associados (nome, email, credenciais e logs vinculados), em conformidade com o direito de eliminação da LGPD.
- **FR-016**: O sistema DEVE exibir uma política de privacidade acessível ao contratante antes ou durante o primeiro acesso, descrevendo quais dados são coletados e por quanto tempo são retidos.

### Key Entities

- **Contratante**: Cliente da plataforma com acesso ao próprio painel isolado. Pode ter uma ou mais instâncias atribuídas. Realiza ações de visualização e reconexão.
- **Instância WhatsApp**: Conexão WhatsApp monitorada. Possui status atual (Conectada / Desconectada / Falha na Entrega / Reconectando), pertence a exatamente um contratante, e mantém histórico de mudanças de estado.
- **Log de Status**: Registro imutável de cada transição de estado de uma instância. Contém timestamp de início, timestamp de fim (quando disponível) e o estado registrado.
- **QR Code de Reconexão**: Gerado sob demanda para reconectar uma instância desconectada. Possui validade limitada e pode ser regenerado.
- **Administrador**: Usuário com acesso irrestrito à plataforma. Gerencia o ciclo de vida de contratantes e instâncias.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O contratante visualiza o status de todas as suas instâncias em menos de 3 segundos após acessar o painel.
- **SC-002**: Mudanças de status são refletidas no painel em no máximo 5 segundos após a ocorrência real.
- **SC-003**: O contratante conclui o fluxo completo de reconexão (perceber desconexão → solicitar QR Code → escanear → instância conectada) em menos de 2 minutos.
- **SC-004**: 95% dos contratantes conseguem reconectar sua instância de forma autônoma sem contatar o suporte.
- **SC-005**: O painel é totalmente funcional em dispositivos com tela de 5 polegadas ou maior (celular padrão).
- **SC-006**: O histórico de status de uma instância é acessível em no máximo 2 interações a partir da tela principal do painel.
- **SC-007**: O sistema mantém desempenho dentro dos critérios SC-001 e SC-002 com até 200 instâncias sendo monitoradas simultaneamente.

## Assumptions

- Cada contratante possui uma ou mais instâncias WhatsApp previamente configuradas no serviço externo de monitoramento.
- O serviço externo de monitoramento fornece endpoints para: consulta de status de instância, geração de QR Code de reconexão, e confirmação de conexão bem-sucedida.
- O onboarding inicial de contratantes e a configuração de instâncias exige ação do administrador; não há auto-cadastro de contratantes no MVP.
- O painel administrativo e o painel do contratante fazem parte da mesma aplicação web, com controle de acesso por papel (administrador / contratante).
- Contratantes acessam o painel via navegador web (desktop ou mobile).
- O escaneamento do QR Code é feito pelo celular do contratante usando o aplicativo WhatsApp nativo — não há integração de câmera in-app.
- Autenticação por email e senha é suficiente para o MVP; SSO e magic link são fora de escopo inicial.
- Notificações proativas (email/SMS/push quando a instância desconectar) estão fora do escopo desta especificação — o contratante acessa o painel para verificar o status.
- O número de instâncias por contratante é suficientemente pequeno para exibição em lista sem paginação complexa no MVP (estimativa: até 10 instâncias por contratante).
- Volume esperado de crescimento: até 50 contratantes e até 200 instâncias monitoradas simultaneamente em 12 meses de operação. Arquitetura deve suportar este volume sem mudanças estruturais.

## Clarifications

### Session 2026-05-30

- Q: Quais são os estados visíveis ao usuário que uma instância pode ter? → A: 4 estados — Conectada, Desconectada, Falha na Entrega, Reconectando (inclui estado transitório durante o processo de reconexão via QR Code)
- Q: Como o QR Code de reconexão é ativado? → A: Manual — o contratante vê o status "Desconectada" e clica no botão "Reconectar" para gerar o QR Code; o botão não é exibido em nenhum outro estado
- Q: O sistema precisa estar em conformidade com a LGPD nesta versão? → A: Conformidade básica — retenção máxima de 90 dias para logs, exclusão de conta remove dados pessoais associados, política de privacidade acessível no primeiro acesso
- Q: Qual é o volume esperado de contratantes e instâncias totais no lançamento e em 12 meses? → A: Pequeno — até 50 contratantes e até 200 instâncias totais em 12 meses; arquitetura deve suportar este volume sem mudanças estruturais
