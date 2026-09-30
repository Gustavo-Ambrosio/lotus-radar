# Memória das sessões de trabalho

Este arquivo guarda um resumo persistente das decisões, alterações e do ponto
de retomada. Não substitui o histórico original do chat; registre aqui os
resultados importantes ao final de cada sessão. A memória técnica principal do
projeto está em `AGENTS.md`.

## 2026-09-30 — retomada do SaaS e automação operacional

### Contexto

- O usuário pediu para analisar o projeto e continuar a evolução para um SaaS
  comercial, retomando o trabalho anterior.
- A branch era `feat/saas-next`, sem alterações locais no início desta sessão.
- O projeto já tinha Next.js 15, autenticação, planos, Mercado Pago, Resend,
  buscas salvas e alertas. A validação de integrações reais ainda estava
  pendente, conforme `AGENTS.md`.

### Trabalho realizado

- Criado `.github/workflows/atualizar-radar.yml`: execução agendada a cada 12
  horas e execução manual; roda `npm run coletar`, `npm run ingest` e
  `npm run alertas:disparar`, com Postgres, timeout de 240 minutos e concorrência
  controlada.
- Atualizado `README.md` com a configuração de secrets/variables e a exigência
  de aplicar migrations antes de ativar o workflow.
- Atualizado `AGENTS.md` com o estado atual e as pendências revisadas.
- Verificações aprovadas: `npm run typecheck`, `npm test` (158 testes em 17
  arquivos), `npm run build` e `git diff --check`.

### Estado ao encerrar

- Alterações não commitadas: `.github/workflows/atualizar-radar.yml`,
  `README.md` e `AGENTS.md`; esta memória também deve ser adicionada ao controle
  de versão junto delas. Não fazer commit sem pedido explícito.
- Próximo passo: configurar `DATABASE_URL`, `SESSION_SECRET`, `RESEND_API_KEY`
  como GitHub Actions secrets e `NEXT_PUBLIC_APP_URL`, `MAIL_FROM` como
  variables; aplicar migrations no Postgres de produção/staging; executar o
  workflow manualmente e verificar coleta, ingestão e entrega de alertas.
- Depois, seguir com testes reais de checkout/cancelamento/webhook no Mercado
  Pago, entregabilidade do Resend e validação das migrations/consultas no
  PostgreSQL gerenciado.

### Continuidade e backup

Ao retomar, ler primeiro `AGENTS.md`, este arquivo e `git status`. Acrescentar
uma entrada datada aqui ao encerrar cada sessão relevante, registrando o que
mudou, verificações, estado de commit e próximo passo. Este repositório mantém
resumos de continuidade; o transcript integral do chat deve ser exportado pela
interface da plataforma se for necessário preservá-lo palavra por palavra.

## Continuação — 2026-09-30

- O usuário pediu para começar a próxima etapa. Foi verificado que o GitHub CLI
  está autenticado no repositório `Gustavo-Ambrosio/lotus-radar`.
- Consultados apenas os nomes das configurações (nunca valores): existe o secret
  `DATABASE_URL`; não há `SESSION_SECRET`, `RESEND_API_KEY` nem variables
  configuradas (`NEXT_PUBLIC_APP_URL`, `MAIL_FROM`). A ausência das credenciais
  impede migrar/testar o Postgres ou executar a coleta/alertas reais agora.
- Fortalecido o workflow com validação antecipada de envs obrigatórias, prefixo
  PostgreSQL, URL pública HTTPS e tamanho mínimo de `SESSION_SECRET`.
- Atualizado `AGENTS.md`. Próximo passo permanece configurar os itens faltantes;
  não registrar valores de secrets e não commitar sem pedido explícito.
- `npm run typecheck`, `npm test` (158 testes) e `git diff --check` passaram.
  Não havia validador YAML instalado neste ambiente.

## Configuração GitHub — 2026-09-30

- Após o usuário autorizar a continuação, gerado segredo aleatório forte e
  enviado diretamente a `gh secret set SESSION_SECRET`. O valor nunca foi
  impresso nem recuperado; a listagem confirma somente o nome cadastrado.
- Secrets presentes agora: `DATABASE_URL`, `SESSION_SECRET`. Segredo pendente:
  `RESEND_API_KEY`. Variables pendentes: `NEXT_PUBLIC_APP_URL` e `MAIL_FROM`.
- README corrigido para refletir cron a cada 12 horas (00h/12h UTC), nome real
  do workflow, validação antecipada e os secrets/variables obrigatórios.
- Para continuar, obter do usuário a URL HTTPS final publicada no Railway e o
  endereço de remetente já verificado no Resend. Orientar o usuário a cadastrar
  `RESEND_API_KEY` localmente via `gh secret set RESEND_API_KEY` (stdin), sem
  enviar a chave no chat. Depois, cadastrar as duas variables via `gh variable
  set`, aplicar migrations no Postgres de produção e executar o workflow manual.

## Configuração da URL pública — 2026-09-30

- O usuário forneceu o domínio `lotus-radar-production.up.railway.app`.
- Configurada a GitHub Actions variable `NEXT_PUBLIC_APP_URL` como
  `https://lotus-radar-production.up.railway.app`; confirmado apenas nome e
  valor público da variable.
- O usuário informou que ainda não possui domínio próprio no item Resend.
  Sem domínio controlado/verificado por DNS, não há remetente de produção para
  registrar nem como concluir o envio real. Próximo passo com o usuário: decidir
  e registrar um domínio, adicionar/verificar no Resend, depois definir
  `MAIL_FROM` e cadastrar `RESEND_API_KEY` diretamente no GitHub.

## Configuração de teste do Resend — 2026-09-30

- Usuário informou que concluiu os seis passos de configuração do Resend.
- GitHub confirmou os secrets `DATABASE_URL`, `SESSION_SECRET` e
  `RESEND_API_KEY`; `NEXT_PUBLIC_APP_URL` está configurada como
  `https://lotus-radar-production.up.railway.app`.
- `MAIL_FROM` havia sido criado incorretamente como secret. Criada a Actions
  variable `MAIL_FROM=Lotus Radar <onboarding@resend.dev>` e removido o secret
  duplicado. Não enviar a variável de teste para todos os usuários: Resend limita
  `onboarding@resend.dev` ao e-mail verificado da conta Resend.
- `gh workflow list` no branch padrão `main` mostra que
  `atualizar-radar.yml` não existe publicado; a definição atual ainda está em
  alterações locais não commitadas. Não é possível dispará-lo antes de publicar.
- Próxima decisão necessária: obter autorização explícita do usuário para
  publicar as alterações (commit/push); antes de executar job de alertas, deve
  haver garantia de que os destinatários são somente endereços permitidos pelo
  Resend. No Railway, confirmar que `RESEND_API_KEY` e `MAIL_FROM` também foram
  definidas no serviço da aplicação.

## Publicação do workflow autorizada — 2026-09-30

- O usuário autorizou explicitamente commit e push.
- Criado commit `0ec2d1b` (`ci: automatiza coleta e alertas do radar`) na branch
  `feat/saas-next`, incluindo workflow, README e memória. Criado também o commit
  `81d829c` para registrar a autorização e a memória da publicação.
- Os dois commits foram enviados a `origin/feat/saas-next`; a branch local está
  sincronizada e limpa.
- O workflow não aparece na lista de workflows do GitHub enquanto não chegar ao
  branch padrão `main`. Não executar o workflow: o remetente
  temporário `onboarding@resend.dev` só pode alcançar o e-mail verificado da
  conta Resend e não há confirmação de que não existam outros destinatários
  elegíveis no Postgres.

## Proteção do remetente de teste — 2026-09-30

- CI do PR #2 passou após a publicação anterior.
- Ajustado o workflow: o remetente `Lotus Radar <onboarding@resend.dev>` sempre
  pula a etapa de envio; execuções manuais também não enviam por padrão e
  requerem marcar explicitamente `enviar_alertas`. Com domínio verificado, o
  agendamento envia normalmente.
- Atualizados `README.md` e `AGENTS.md`. Commit `cd03c14` publicado em
  `origin/feat/saas-next`; CI de push e PR passou em typecheck, testes e build.
- PR #2 permanece aberto; definição ainda não está no branch padrão `main`.
  Não disparar manualmente enquanto o Resend estiver em modo de teste. A
  execução agendada pula o envio usando onboarding@resend.dev.

## Agente de interface visual — 2026-09-30

- Usuário apontou a captura `situação visual.png`, localizada na pasta pai do
  repositório (`../situação visual.png`).
- Analisada a página inicial: sublinhado padrão em títulos/abas/CTA; hero com
  título e subtítulo lado a lado; painel de filtros merece revisão de espaço e
  alinhamento. As classes que ajudam a investigar estão em `globals.css` e a
  estrutura inicial em `src/app/page.tsx`.
- Criado agente primário `.opencode/agents/visual-lotus.md` e documentação dos
  achados em `docs/ANALISE_VISUAL_ATUAL.md`. Nenhum CSS da aplicação foi alterado
  nesta tarefa.
- O arquivo de captura não está versionado; o agente instrui a pedir reanexo se
  ele não estiver no workspace. Reiniciar o OpenCode para carregar o agente.
- Alterações do agente e memória ainda não commitadas.

## Expansão para produto, negócio, UX e UI — 2026-09-30

- Usuário esclareceu que o agente visual precisa atuar profissionalmente em
  produto, negócio, UX e UI e obedecer ao layout aprovado que já teria sido
  definido na memória/roadmap.
- Rebuscados todos os Markdown do repositório e da pasta `licitações`: o
  `ROADMAP.md` disponível cobre fontes/coleta de dados, não especificação de
  layout. Por isso, o agente recebeu regra de preservar a estrutura macro e
  exigir a referência exata antes de mudanças estruturais, sem inventar um
  layout aprovado.
- Atualizado `.opencode/agents/visual-lotus.md` com competências de produto e
  negócio SaaS, jornada/ativação/retensão/conversão, limites dos planos como
  fonte de verdade, CRO ético, acessibilidade e critérios de trabalho.
- Criado `docs/DIRETRIZES_PRODUTO_UX.md` com proposta de valor, tarefas,
  objetivos de negócio, jornada e planos (valores devem sempre ser conferidos
  em `src/billing/planos.ts`).
- Usuário perguntou sobre trabalho paralelo. O agente de OpenCode não roda em
  background só por existir; pode-se iniciar uma tarefa delegada de UI em
  paralelo a uma frente separada de preparação do SaaS, evitando arquivos em
  conflito.
- Para a especificação visual aprovada, consultar o documento indicado pelo
  usuário. O `ROADMAP.md` que existe neste checkout aborda coletores; se a
  referência estiver em outro arquivo/local, solicitar caminho preciso em vez
  de substituir ou inventar o layout.

## Referência visual oficial confirmada pelo usuário — 2026-09-30

- Usuário esclareceu: o layout aprovado é o GitHub Pages
  `https://gustavo-ambrosio.github.io/lotus-radar`; a captura `../situação visual.png`
  é o estado atual da aplicação SaaS no Railway
  (`https://lotus-radar-production.up.railway.app`). Comparar as duas no mesmo
  viewport e manter essa distinção.
- Atualizados `.opencode/agents/visual-lotus.md`,
  `docs/ANALISE_VISUAL_ATUAL.md`, `docs/DIRETRIZES_PRODUTO_UX.md` e `AGENTS.md`.
  O Pages é agora fonte vinculante para identidade, hierarquia e organização;
  preservar os fluxos SaaS novos ao adaptá-los.
- Usuário perguntou se precisa fechar o terminal para reiniciar OpenCode. Não é
  necessário fechar a janela: encerrar somente o processo OpenCode (`/exit` ou
  `Ctrl+C`) e executar `opencode` de novo na raiz do projeto. Arquivos/memórias
  já estão salvos no disco; a conversa pode ser retomada por `AGENTS.md` e
  `docs/MEMORIA_SESSOES.md`. Alterações não commitadas permanecem na pasta.

## Primeiro trabalho em paralelo — 2026-09-30

- Seguindo `.opencode/agents/visual-lotus.md`, foi feita uma correção pequena em
  `src/app/globals.css`: links de objeto, abas e CTA deixam o sublinhado padrão,
  ganham hover coerente e foco visível. Sem alteração da macroestrutura.
- A captura local foi consultada; a tela renderizada não foi verificada em
  navegador. typecheck, testes (158) e build passaram.
- Em paralelo, inspecionado o fluxo Mercado Pago. O teste existente cobre apenas
  validação HMAC do webhook; os fluxos de criar/consultar/cancelar assinatura e
  o ciclo real seguem precisando de credenciais de sandbox e testes integrados.
  Nenhuma alteração no módulo de cobrança nesta sessão.
- Atualizado `AGENTS.md`; alterações visuais, de documentação e do agente não
  commitadas. Para carregar a configuração do agente, reiniciar OpenCode.

## Correção do painel de filtros — 2026-09-30

- Usuário indicou a captura `../layoutatual.png` como estado atual da aplicação
  local em `localhost:3000`. Ela foi localizada e analisada; não é a captura
  anterior do Railway.
- A captura mostra os campos da sidebar extrapolando a coluna e a leitura do
  hero sem o título aparente. Corrigida a grade interna dos filtros para duas
  colunas fluidas (uma em celular estreito), inputs/selects com `min-width: 0`,
  coluna principal encolhível e título do hero explícito como bloco branco.
- Atualizada `docs/ANALISE_VISUAL_ATUAL.md` e referência correspondente no
  `AGENTS.md`. `npm run typecheck`, `npm test` (158 testes), `npm run build` e
  `git diff --check` passaram.
- Sem navegador para validar uma captura após as mudanças; revisão visual final
  ainda depende de atualizar `localhost:3000`. Não foi feito commit.

## PostgreSQL Railway e prontidão local — 2026-09-30

- Usuário configurou `.env.local` com a URL pública do PostgreSQL Railway. O
  primeiro valor `DATABASE_URL` continha somente host/porta; ajustado para usar
  a URL PostgreSQL completa já presente em `DATABASE_PUBLIC_URL`. `.env.local`
  permanece ignorado pelo Git.
- `npm run db:migrate` executou com sucesso no PostgreSQL Railway. A migration
  já estava aplicada; a extensão `pg_trgm` e o schema Drizzle foram confirmados.
- Adicionado `npm run db:check` (`scripts/db-check.ts`), verificação segura de
  conectividade, 9 tabelas obrigatórias, extensão `pg_trgm` e quantidade de
  migrations, sem consultar dados de usuários. Resultado: banco acessível, 9
  tabelas, extensão ativa e 1 migration registrada.
- `src/lib/env.ts` agora interpreta opções vazias no `.env` como não
  configuradas. `scripts/db-migrate.ts` mostra nome/código de erros sem expor
  credenciais. README documenta `db:check`.
- Corrigido `src/app/acoes-billing.ts`: URL de checkout inválida do MP agora
  encerra o estado local pendente como inativo para não bloquear novas tentativas.
- Verificações: `npm run typecheck`, `npm test` (158), `npm run build`,
  `npm run db:check` e `git diff --check` passaram. Alterações continuam sem
  commit; alterações visuais/agente em andamento foram preservadas.
- Próximas validações externas: teste integrado de checkout/cancelamento/webhook
  com Mercado Pago sandbox, e-mail com remetente/destinatários de teste seguros,
  e execução controlada do workflow de coleta e ingestão. A migration no banco
  Railway e o schema estão verificados; ingestão ainda não foi executada.

## Revisão de layout da home — continuação em 2026-09-30

- Usuário apontou a captura `../layoutatual2.png`, ainda do localhost, e pediu a
  conclusão sem novas interrupções. A captura mostra o título do hero ausente na
  renderização, controles sem respiro interno, início da lista abaixo do painel
  e links sublinhados nas categorias.
- Para isolar o hero do CSS legado, trocadas as classes genéricas `marca*` por
  classes próprias `hero__*`, com título responsivo explícito. Painel recebeu
  padding, lista passou a alinhar seu cabeçalho ao topo do painel e chips/link
  das categorias perderam a aparência padrão sublinhada. Mantido o grid
  responsivo corrigido na etapa anterior.
- Captura posterior ainda necessária para afirmar validação visual. O usuário
  segue insatisfeito com a composição; a prioridade é conferir o mesmo viewport
  do Pages aprovado e ajustar o que divergir, sem chamar testes de validação UI.
