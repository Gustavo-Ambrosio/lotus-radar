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
  `feat/saas-next`, incluindo workflow, README e memória. Ainda falta enviar ao
  remoto.
- Após push, confirmar a branch remota. Não executar o workflow: o remetente
  temporário `onboarding@resend.dev` só pode alcançar o e-mail verificado da
  conta Resend e não há confirmação de que não existam outros destinatários
  elegíveis no Postgres.
