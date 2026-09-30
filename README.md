# Lotus Radar

Radar de licitações e editais de cultura e tecnologia do Brasil — federal,
estadual e municipal. O produto está migrando da SPA Vite/GitHub Pages para um
SaaS com Next.js, PostgreSQL, contas, planos pagos, buscas salvas e alertas.

## Arquitetura

- Next.js 15 App Router em `src/app/`; telas renderizadas no servidor.
- Drizzle ORM com PostgreSQL em produção e PGlite local em `.pgdata/`.
- `src/db/schema.ts` define usuários, sessões, tokens, assinaturas, eventos de
  pagamento, licitações, buscas salvas e entregas de alertas.
- O snapshot `public/dados/licitacoes.json` continua sendo o formato de
  transporte dos coletores; a tabela `licitacoes` é a fonte das telas.
- `src/lib/` mantém classificadores, filtros, geografia e formatação puros já
  usados pela aplicação anterior.
- Mercado Pago processa assinaturas recorrentes. O webhook consulta o recurso
  diretamente no gateway e valida `x-signature` antes de atualizar o plano.
- Resend envia confirmação de e-mail, redefinição de senha e alertas. Sem chave
  em desenvolvimento, os envios são simulados no console.

## Requisitos e início local

Node.js 20.11 ou superior.

```bash
npm install
Copy-Item .env.example .env.local
npm run db:migrate
npm run ingest
npm run dev
```

Sem `DATABASE_URL`, o projeto usa PGlite persistido em `.pgdata/`. Para criar a
conta administrativa local, defina `SEED_ADMIN_EMAIL` e `SEED_ADMIN_SENHA` no
ambiente e rode `npm run db:seed`. Não há senha administrativa padrão.

## Comandos

```bash
npm run dev                 # Next dev
npm run typecheck           # tsc --noEmit
npm test                    # Vitest
npm run build               # build de produção
npm run db:generate         # gerar migration Drizzle
npm run db:migrate          # aplicar migrations
npm run db:check            # verificar conexão, tabelas e extensão PostgreSQL
npm run db:seed             # conferir planos / seed opcional de admin
npm run coletar             # PNCP/SIC/MinC/PNAB -> snapshot
npm run ingest              # snapshot -> PostgreSQL/PGlite
npm run alertas:disparar -- --dry-run
```

## Ambiente

Copie o contrato de `.env.example`. Produção exige `DATABASE_URL` PostgreSQL e
`SESSION_SECRET` com pelo menos 32 caracteres. Para pagamentos, configure
`MERCADOPAGO_ACCESS_TOKEN` e `MERCADOPAGO_WEBHOOK_SECRET`; para e-mail real,
configure `RESEND_API_KEY` e `MAIL_FROM`. `NEXT_PUBLIC_APP_URL` deve ser a URL
pública HTTPS da aplicação. Nunca registre tokens, senhas ou segredos em logs.

## Fluxos implementados

- Cadastro, login/logout, sessão persistida em cookie httpOnly, confirmação de
  e-mail e redefinição de senha por token de uso único.
- Plano gratuito, Pro e Equipe; checkout recorrente MP e cancelamento da
  renovação. O plano só é ativado/alterado após webhook válido do gateway.
- Busca server-side com URL compartilhável, salvar/excluir buscas e ligar ou
  desligar alertas por e-mail.
- Job de alertas CLI idempotente: `npm run alertas:disparar`. Agendamento do job
  deve ser configurado no host de produção.

### Agendamento automatizado no GitHub Actions

O workflow `.github/workflows/atualizar-radar.yml` executa a cada 12 horas
(00h e 12h UTC) e também pode ser iniciado em **Actions → Atualizar radar e
enviar alertas → Run workflow**.
Configure no repositório:

- Secrets `DATABASE_URL` (PostgreSQL gerenciado), `SESSION_SECRET` (32 ou mais
  caracteres aleatórios) e `RESEND_API_KEY`.
- Variables `NEXT_PUBLIC_APP_URL` (URL HTTPS pública) e `MAIL_FROM` (remetente
  verificado no Resend).

O job valida a configuração antes de rodar e confere conexão, tabelas e
migrations do PostgreSQL com `npm run db:check` antes da coleta; falha se faltar
algum valor ou se o banco, URL pública ou segredo de sessão não tiverem formato
válido. Coleta, ingestão e envio de alertas ocorrem em sequência no mesmo runner.
Antes de ativar o workflow, aplique as migrations ao Postgres de produção com
`npm run db:migrate`.

Para testes sem domínio, `Lotus Radar <onboarding@resend.dev>` pode ser usado
como `MAIL_FROM`, mas o Resend só permite enviar para o endereço verificado da
conta. Não execute o job de alertas com esse remetente se houver outros
destinatários elegíveis; para envio a clientes, verifique um domínio próprio.
Execuções manuais iniciam sem envio de e-mail; o envio exige marcar a opção
explícita. Com o remetente de teste do Resend, alertas são sempre ignorados.

### Deploy da aplicação no Railway

1. Crie um projeto Railway, adicione um serviço PostgreSQL e conecte o serviço
   da aplicação a este repositório/branch `main` (após aprovar o PR).
2. O `railway.json` configura o build Next.js, aplica migrations antes de
   iniciar o servidor e usa `/` como health check.
3. No serviço da aplicação, configure `DATABASE_URL` como referência a
   `${{Postgres.DATABASE_URL}}` (ajuste `Postgres` ao nome do serviço do banco),
   `SESSION_SECRET` com pelo menos 32 caracteres aleatórios e
   `NEXT_PUBLIC_APP_URL` com o domínio HTTPS gerado pelo Railway.
4. Configure também `RESEND_API_KEY` e `MAIL_FROM` para e-mails. Adicione
   `MERCADOPAGO_ACCESS_TOKEN` e `MERCADOPAGO_WEBHOOK_SECRET` após configurar a
   aplicação e o webhook no painel Mercado Pago.
5. Gere um domínio público no Railway, atualize `NEXT_PUBLIC_APP_URL` com a URL
   final e configure essa mesma URL como variable no GitHub Actions. Configure
   `DATABASE_URL` e `RESEND_API_KEY` como secrets e `MAIL_FROM` como variable no
   GitHub Actions; assim o job agendado roda contra o mesmo banco e app.

Não use PGlite em produção. A aplicação falha ao iniciar se estiver em
`NODE_ENV=production` sem `DATABASE_URL` PostgreSQL.

## Fontes e limitações dos dados

Os coletores de `scripts/` consultam fontes públicas como PNCP, SIC Cultura,
MinC e PNAB. A cobertura depende da disponibilidade e estrutura dessas fontes;
a classificação por categoria é automática e aproximada. Leia sempre o edital
original antes de preparar uma proposta. Links externos são filtrados por
`urlSegura`.

## Próximas validações de lançamento

- Rodar checkout, cancelamento e webhooks em uma conta de teste do Mercado Pago.
- Testar entrega de e-mail em domínio verificado do Resend.
- Configurar os secrets/variables e validar uma execução manual do workflow de
  coleta, ingestão e envio de alertas.
- Validar PostgreSQL gerenciado e migrations em ambiente de staging.
