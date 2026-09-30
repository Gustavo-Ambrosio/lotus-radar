# AGENTS.md — lotus-radar

Memória de trabalho do projeto. Leia antes de mexer.

## Objetivo e situação do repositório

**Lotus Radar** é um radar de licitações/editais de cultura e tecnologia no
Brasil. O objetivo é migrar a SPA Vite/GitHub Pages para um SaaS comercial com
contas, planos, cobrança recorrente, buscas salvas e alertas.

Diretório: `D:\G - MHJ\LotosGrowBot\licitações\lotus-radar`.
Branch: `feat/saas-next`. Trabalho em andamento e não commitado. No Windows, Git
pode ser chamado por `C:\Program Files\Git\cmd\git.exe`.

## Arquitetura atual

- Next.js 15 App Router, em `src/app/`; UI quase toda Server Component.
- Drizzle + PostgreSQL para produção; PGlite em `.pgdata/` para dev local.
- `public/dados/licitacoes.json` ainda é o transporte dos coletores; a tabela
  `licitacoes` é a fonte de verdade das telas.
- Auth por cookie httpOnly opaco; banco guarda SHA-256 do token de sessão.
- Resend para e-mail; sem chave em desenvolvimento, apenas simula sem imprimir
  links/tokens.
- Mercado Pago para assinaturas recorrentes; ativação pelo webhook HMAC-validado.
- UI e mensagens em pt-BR. Segredos, senha e links com token nunca devem ir para
  logs.

## Já implementado

### Banco e dados

- `src/db/schema.ts`: 9 tabelas (`usuarios`, `sessoes`, `tokens`, `assinaturas`,
  `eventos_pagamento`, `licitacoes`, `coletas`, `buscas_salvas`,
  `alertas_enviados`) e enums de plano/status.
- `src/lib/env.ts`: validação de ambiente e bloqueio de PGlite em produção.
- `src/lib/db/index.ts`, `drizzle.config.ts`, `drizzle/0000_inicial.sql`,
  `scripts/db-migrate.ts`, `scripts/db-seed.ts`.
- `src/lib/ingestao.ts`, `scripts/ingerir-snapshot.ts`: ingestão idempotente,
  classificação exclusiva por segmento, geo e remoção segura quando o snapshot
  está completo.
- `src/lib/licitacoes.ts`: consulta server-side com filtros, paginação, busca,
  geografia, resumo e filtro temporal para alertas.
- Dados locais previamente carregados no PGlite: snapshot tinha 2.478 itens;
  1.801 itens vivos gravados; 677 encerrados descartados; 7 sem geolocalização.

### Aplicação e auth

- `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/licitacao/[id]/page.tsx`,
  `src/app/not-found.tsx`; design legado foi movido para `src/app/globals.css`.
- Páginas `/entrar`, `/criar-conta`, `/recuperar-senha`, `/redefinir-senha`,
  `/verificar-email`, `/conta`, `/conta/buscas`, `/planos` e `/checkout`.
- `src/lib/auth/`: hash bcrypt, sessões, tokens de uso único, cookie e guards.
- `src/app/acoes.ts`, `src/app/acoes-busca.ts`: Server Actions de auth,
  confirmação de e-mail, salvar/apagar busca e alternar alertas.
- `src/lib/validacao.ts` e `src/lib/email.ts`; dados externos dos modelos HTML
  escapados; tokens de e-mail nunca logados.

### Planos, cobrança e alertas

- `src/billing/planos.ts`: gratuito, Pro (R$ 89/mês) e Equipe (R$ 249/mês).
- `src/lib/mercadopago.ts`, `src/app/acoes-billing.ts`,
  `src/app/api/webhooks/mercadopago/route.ts`: checkout, cancelamento,
  verificação HMAC e sincronização da assinatura consultada no MP.
- `src/lib/alertas.ts` e teste: regras puras de elegibilidade/janelas.
- `scripts/disparar-alertas.ts`: CLI idempotente, e-mail agrupado por busca,
  opção `--dry-run`, limitação por rodada e retry de falhas.
- Cobertura de testes atual: **157 testes em 17 arquivos**.

## Ainda falta / validar antes de lançamento

1. Testar checkout, cancelamento e ciclo de webhook em conta de teste Mercado
   Pago; o provider ainda não foi exercitado com credenciais reais.
2. Testar Resend com domínio verificado e conferir entregabilidade.
3. Configurar cron no host para coletar → ingerir → disparar alertas. O job CLI
   existe; endpoints protegidos de cron não foram criados.
4. Validar migrations e consultas em PostgreSQL gerenciado de staging (até aqui
   validação local foi PGlite).
5. Revisar limites de plano e UX de busca/filtros, em especial upgrade/troca de
   assinatura ativa.
6. Fazer revisão final de diff/status; não commitar sem pedido explícito.

## Código legado aproveitável

Os módulos puros de `src/lib/` continuam sendo referência: `categorias.ts`,
`segmentos.ts`, `segmentos/tecnologia.ts`, `filtros.ts`, `vigencia.ts`, `geo.ts`,
`url.ts`, `agrupar.ts`, `destaque.ts`, `exportar.ts`, `formato.ts`,
`seguranca.ts`, `texto.ts`, `tipos.ts`, `municipios-br.ts`.

Coletores existentes em `scripts/`: PNCP, SIC Cultura, MinC/PNAB,
`gerar-geo-br.ts`, `reprocessar.ts` e `gerar-feeds.ts`. A SPA (`index.html`,
`src/main.tsx`, `src/App.tsx`, `src/componentes/`) foi removida. Nenhum workflow
em `.github/workflows/` está presente na árvore atual.

## Convenções

- TypeScript estrito, `noUncheckedIndexedAccess`, `noUnusedLocals` e
  `noUnusedParameters`; não enfraquecer.
- Tipos com `import type`, `verbatimModuleSyntax` ativo.
- Comentários e identificadores em português quando naturais.
- Funções puras em `src/lib` com testes `.test.ts` ao lado (Vitest).
- Links externos sempre por `urlSegura` (`src/lib/seguranca.ts`).
- `.env`/`.env.local` são privados; manter `.env.example` como contrato.

## Comandos

```bash
npm run dev
npm run typecheck
npm test
npm run build
npm run db:generate
npm run db:migrate
npm run db:seed
npm run coletar
npm run ingest
npm run alertas:disparar -- --dry-run
```

Nota: `next build` passa sem banco de produção pois a raiz é dinâmica e
`metadataBase` lê `NEXT_PUBLIC_APP_URL` diretamente no build.
