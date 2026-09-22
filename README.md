# Radar Cultural PR

Radar de **licitações e editais de cultura do Paraná** — Governo do Estado e todos os municípios — com foco em oportunidades **com inscrição ainda aberta**, organizadas por **categoria**, prazo, órgão e município.

- Fonte oficial: **PNCP** (Portal Nacional de Contratações Públicas), API `/api/consulta/v1/contratacoes/proposta`.
- Site 100% estático (GitHub Pages). Um job do GitHub Actions coleta os dados, grava um snapshot JSON e publica o site.

## Segmentos (abas)

A interface tem duas abas: **Cultural** e **Tecnologia**. Cada licitação carrega um campo `segmentos` e aparece na aba correspondente (uma mesma compra pode ser dos dois — ex.: plataforma de streaming de um festival).

- **Cultural**: categorias de artes e cultura (ver abaixo).
- **Tecnologia**: desenvolvimento de software, infraestrutura e redes, qualidade de software, testes de software, segurança e firewall, licenças de software e tecnologia geral.

A arquitetura é escalável: basta criar um classificador por segmento em `src/lib/segmentos/` e registrar as categorias em `src/lib/segmentos.ts` (que unifica rótulos, cores e a categoria principal exibida).

## Por que existe um job de coleta

A API do PNCP **não envia cabeçalhos CORS**, então o navegador não pode chamá-la direto. Ela também é lenta, limita requisições (às vezes respondendo `200` com HTML em vez de JSON) e cai com frequência. Por isso os dados são coletados fora do navegador, por um job agendado, e servidos como arquivo estático — o site abre rápido e continua no ar mesmo se o PNCP estiver fora.

## Arquitetura

```
scripts/coletar.ts        Coletor PNCP: retry/backoff, paginação, orçamento de tempo, snapshot
src/lib/categorias.ts     Classificador de cultura por palavras-chave (compartilhado)
src/lib/segmentos/tecnologia.ts  Classificador de tecnologia por palavras-chave
src/lib/segmentos.ts      Registro unificado de segmentos/categorias (rótulo, cor, principal)
src/lib/seguranca.ts      Sanitização de URLs externas (http/https)
src/lib/tipos.ts          Tipos do snapshot e da licitação
src/lib/filtros.ts        Regras de filtro/ordenação (funções puras)
src/lib/formato.ts        Formatação de moeda, data e prazo
src/componentes/          KPIs, filtros e cartões
src/App.tsx               Dashboard
public/dados/licitacoes.json   Snapshot publicado
.github/workflows/pages.yml    Coleta diária + build + deploy no Pages
```

## Categorias

A categoria é inferida por palavras-chave do objeto do edital (uma licitação pode ter várias tags):

**Cultura:** Música · Música eletrônica (psytrance, darkpsy, trance, rave, DJ) · Artes cênicas (teatro, dança, circo) · Audiovisual e cinema · Artes visuais (inclui fotografia) · Experimental e arte digital · Literatura e livro · Patrimônio e memória · Cultura popular e tradicional · Eventos e festivais · Eventos multiculturais · Fomento, editais e prêmios · Equipamentos e espaços culturais · Formação e oficinas · Gestão e produção cultural · Cultura (geral).

**Tecnologia:** Desenvolvimento de software · Infraestrutura e redes · Qualidade de software · Testes de software · Segurança e firewall · Licenças de software · Tecnologia (geral).

> A classificação é automática e aproximada; não substitui a leitura do edital.

## Filtros

Além da busca por texto e dos chips de categoria, o painel permite combinar:

- Município, esfera (estadual/municipal) e modalidade;
- Prazo de encerramento (3, 7, 15 ou 30 dias);
- Publicação (últimos 7, 15, 30 ou 60 dias);
- Valor estimado (mínimo e máximo) e "só com valor informado";
- Ordenação por prazo, data de publicação, valor, município ou órgão.

Os **filtros ativos** aparecem como chips removíveis, um a um, acima do botão "Limpar filtros".

## Dados de cada licitação

Cada item do arquivo `public/dados/licitacoes.json` (que funciona como a sua API pessoal) traz o que é preciso para pesquisar e participar:

- `objeto` e `informacaoComplementar` — o que está sendo contratado;
- `orgao`, `cnpj`, `esfera`, `municipio`, `uf`, `codigoIbge` — quem está comprando;
- `numeroCompra`, `numeroControlePncp`, `anoCompra`, `sequencialCompra` — identificação do processo;
- `dataPublicacao`, `dataAberturaProposta`, `dataEncerramentoProposta` — **período de inscrição**;
- `linkPncp` — página oficial do edital no PNCP;
- `linkSistemaOrigem` — link do sistema do órgão (quando existe), útil para dar o lance/proposta;
- `valorEstimado`, `modalidade`, `situacao`;
- `segmentos` — em quais abas a licitação aparece (`cultura` e/ou `tecnologia`);
- `categorias` e `categoriaPrincipal` — classificação por segmento.

## Rodando localmente

```bash
npm install
npm run coletar     # baixa do PNCP e gera public/dados/licitacoes.json
npm run dev         # abre o dashboard em http://localhost:5173
```

Outros scripts:

```bash
npm run processar   # reprocessa APENAS o cache local (.cache/pncp), sem tocar no PNCP
npm run reprocessar # reclassifica o snapshot já existente, sem rede
npm run typecheck   # checagem de tipos
npm run build       # build de produção em dist/
npm run test        # testes (vitest)
```

### Cache e modo offline

O PNCP é lento e limita requisições. Para não repetir chamadas, cada página baixada é gravada em `.cache/pncp/` (fora do git). Rodar `npm run coletar` de novo reaproveita o que já está em cache e só busca o que falta; `npm run processar` regenera o snapshot inteiramente offline. Assim dá para ajustar categorias e apresentação sem bater na API.

> Se o PNCP estiver fora do ar, a coleta mantém o snapshot anterior e nada é perdido.


## Deploy (GitHub Pages)

1. No repositório: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Faça push para `main`. O workflow `Radar Cultural PR` roda a coleta, o build e publica.
3. A URL fica em `https://<usuario>.github.io/lotus-radar/`.
4. A coleta roda automaticamente todo dia (`cron: 0 9 * * *`, 06h de Brasília) e também pode ser disparada à mão em **Actions → Radar Cultural PR → Run workflow**.

> Observação: o GitHub Actions ignora commits cuja mensagem contenha o token `[skip ci]` (é o que o commit automático da coleta usa para não republicar a cada dia). A detecção vale para a mensagem como um todo — inclusive se o token só aparecer como citação. Para disparar um deploy via push, **não** inclua o token na mensagem.

Se usar domínio próprio, ajuste `base` em `vite.config.ts` para `'/'` (ou defina a variável `BASE_PATH`).

## Limites conhecidos

- A cobertura depende de o órgão publicar no PNCP. Alguns municípios pequenos usam sistemas próprios e podem não aparecer.
- O coletor tem limites de páginas e de tempo; quando corta, o snapshot é marcado como **parcial**.
- `valorTotalEstimado` ausente ou zero é tratado como **não informado** (nunca como R$ 0,00).

## Segurança

O site é estático e não guarda dados de usuários, mas trata conteúdo **externo** (objetos, links e informações complementares vindos do PNCP):

- **URLs**: todo link exibido passa por `src/lib/seguranca.ts` (`urlSegura`) — aceita apenas `http`/`https`, sem credenciais embutidas e com tamanho limitado. A sanitização é aplicada na coleta (`scripts/coletar.ts`, `scripts/reprocessar.ts`) e de novo na renderização (`CartaoLicitacao.tsx`) como defesa em profundidade.
- **CSP**: o build injeta uma Content-Security-Policy restritiva (`default-src 'self'`, sem scripts inline, `object-src 'none'`, `frame-ancestors 'none'`), via plugin em `vite.config.ts`.
- **Código/caracteres**: o conteúdo é renderizado com React (XSS mitigado por padrão); o coletor valida e limita tamanhos de todos os campos.
- **Dependências**: `npm audit` acompanhado; as dependências de produção são só `react`/`react-dom`.

## Licença

MIT.
