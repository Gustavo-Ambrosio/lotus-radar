# Radar Cultural Brasil

Radar de **licitações e editais de cultura e tecnologia do Brasil inteiro** — Governo Federal, estados, Distrito Federal e municípios — com foco em oportunidades **com inscrição ainda aberta**, organizadas por **estado**, município, distância da sua localização, categoria, prazo, órgão e valor.

- Fontes oficiais: **PNCP** (Portal Nacional de Contratações Públicas, API `/api/consulta/v1/contratacoes/proposta`) e **SIC Cultura** (Secretaria de Estado da Cultura do Paraná — editais de fomento/PNAB).
- Site 100% estático (GitHub Pages). Um job do GitHub Actions coleta os dados, grava um snapshot JSON e publica o site.

## Segmentos (abas)

A interface tem duas abas: **Cultural** e **Tecnologia**. Cada licitação carrega um campo `segmentos` e aparece na aba correspondente (uma mesma compra pode ser dos dois — ex.: plataforma de streaming de um festival).

- **Cultural**: categorias de artes e cultura (ver abaixo).
- **Tecnologia**: desenvolvimento de software, infraestrutura e redes, qualidade de software, testes de software, segurança e firewall, licenças de software e tecnologia geral.

A arquitetura é escalável: basta criar um classificador por segmento em `src/lib/segmentos/` e registrar as categorias em `src/lib/segmentos.ts` (que unifica rótulos, cores e a categoria principal exibida).

## Por que existe um job de coleta

A API do PNCP **não envia cabeçalhos CORS**, então o navegador não pode chamá-la direto. Ela também é lenta, limita requisições (às vezes respondendo `200` com HTML em vez de JSON) e cai com frequência. Por isso os dados são coletados fora do navegador, por um job agendado, e servidos como arquivo estático — o site abre rápido e continua no ar mesmo se o PNCP estiver fora.

O coletor varre os **27 estados** na busca de licitações (órgãos federais também publicam no PNCP, sempre associados a uma UF — a unidade do órgão). Para ver só um estado: `npm run coletar` com `UFS=PR,SP`

O snapshot contém **somente oportunidades abertas**: a cada coleta, e também no reprocessamento offline, as licitações com prazo de propostas já encerrado (ou anuladas, revogadas, desertas, concluídas etc.) são removidas (`src/lib/vigencia.ts`). Assim o número de editais não acumula — ele reflete apenas o que está "live" hoje.

## Arquitetura

```
scripts/coletar.ts        Coletor PNCP: 27 UFs (+orgãos federais), retry/backoff, paginação, orçamento, snapshot
scripts/coletar-sic.ts    Coletor SIC Cultura (editais de fomento do PR), best-effort com cache
scripts/gerar-geo-br.ts   Regenera municipios-br.ts (municípios + coordenadas) a partir do IBGE e GeoJSON
src/lib/categorias.ts     Classificador de cultura por palavras-chave (compartilhado)
src/lib/segmentos/tecnologia.ts  Classificador de tecnologia por palavras-chave
src/lib/segmentos.ts      Registro unificado de segmentos/categorias (rótulo, cor, principal)
src/lib/seguranca.ts      Sanitização de URLs externas (http/https)
src/lib/tipos.ts          Tipos do snapshot e da licitação
src/lib/filtros.ts        Regras de filtro/ordenação (funções puras, inclui distância)
src/lib/formato.ts        Formatação de moeda, data e prazo
src/lib/vigencia.ts       Regra de "live": remove encerradas por prazo ou situação
src/lib/url.ts            Sincronização de segmento/filtros com a URL
src/lib/agrupar.ts        Agrupamento da lista por dia (Hoje/Ontem/data)
src/lib/destaque.ts       Destaque dos termos da busca no cartão
src/lib/exportar.ts       Exportação CSV/JSON do recorte filtrado
src/lib/geo.ts            UFs, distância (haversine) e lookup de municípios no mapa/filtros
src/lib/municipios-br.ts  Lista oficial IBGE: 5.570 municípios com coordenadas (mapa + filtros)
scripts/gerar-feeds.ts    Gera feed.rss e calendario.ics no build
src/componentes/          KPIs, filtros, cartões e mapa (Leaflet)
src/App.tsx               Dashboard
public/dados/licitacoes.json   Snapshot publicado
.github/workflows/pages.yml    Coleta diária + build + deploy no Pages
```

## Categorias

A categoria é inferida por palavras-chave do objeto do edital (uma licitação pode ter várias tags):

**Cultura:** Música · Música eletrônica (psytrance, darkpsy, trance, rave, DJ) · Artes cênicas (teatro, dança, circo) · Audiovisual e cinema (inclui trilha sonora/produção audiovisual) · Artes visuais (inclui fotografia) · Experimental e arte digital · Eventos literários (festival do livro, sarau) · Publicações literárias · Literatura e livro · Patrimônio e memória · Cultura popular e tradicional · Produção cultural · Evento artístico · Eventos e festivais · Eventos multiculturais · Premiações e prêmios · Fomento e editais · Equipamentos e espaços culturais · Formação e oficinas · Gestão cultural · Cultura (geral).

**Tecnologia:** Desenvolvimento de software · Infraestrutura e redes (servidores, rede de dados, switches/roteadores, Linux/Windows, monitoramento NOC, Zabbix/Grafana) · Qualidade de software · Testes de software · Segurança e firewall (firewall NGFW, VPN, SD-WAN, antivírus/EDR/XDR, gestão de vulnerabilidades) · Licenças de software · Tecnologia (geral, inclui suporte técnico, help desk, service desk, central de serviços, outsourcing e serviços continuados de TI).

> Todos os **chips de filtro** do segmento ficam visíveis — mesmo sem oportunidades no momento (mostram `0`). A classificação é automática e aproximada; não substitui a leitura do edital.

> A classificação é automática e aproximada; não substitui a leitura do edital.

## Filtros

Além da busca por texto e dos chips de categoria, o painel permite combinar:

- Estado (27 UFs) e município — o dropdown de municípios usa a **lista oficial do IBGE** (5.570 municípios), filtrada pelo estado escolhido;
- Distância da sua localização (**geolocalização do navegador**, opcional): até 50, 100, 150, 250, 500 ou 1000 km — o site calcula a distância até o centro de cada município;
- Esfera (federal/estadual/municipal) e modalidade;
- Prazo de encerramento (3, 7, 15 ou 30 dias);
- Publicação (últimos 7, 15, 30 ou 60 dias);
- Valor estimado (mínimo e máximo) e "só com valor informado";
- Ordenação por prazo, data de publicação, valor, município ou órgão.

Os **filtros ativos** aparecem como chips removíveis, um a um, acima do botão "Limpar filtros".

## Amostragem, mapa e compartilhamento

- **URL compartilhável**: cada combinação de segmento + filtros fica salva na query string (`?seg=tecnologia&uf=PR&busca=rede&municipio=Curitiba&distancia=100`). Copie com o botão **"Copiar link"** acima da lista e compartilhe o recorte exato.
- **Agrupamento por dia**: a lista é organizada em **Hoje / Ontem / data** conforme a data de publicação, com ordenação interna seguindo o filtro escolhido.
- **Mapa do Brasil** (Leaflet): o botão **"Ver mapa"** mostra um ponto por município com tamanho proporcional ao número de oportunidades; cada ponto pode ser usado para **filtrar** por aquele município. As coordenadas vêm de `src/lib/geo.ts` + `src/lib/municipios-br.ts` (gerados por `scripts/gerar-geo-br.ts` a partir da lista do IBGE e do GeoJSON público).
- **Cartões**: o termo da busca fica **destacado em amarelo**, selos indicam **"novo"** (publicado nas últimas 72h) e **"encerra em Xh"** (últimas 24h), o cartão indica a **criticidade** pela borda (vermelho = encerra em ≤ 3 dias, âmbar = ≤ 10 dias) e dá para **expandir** para ver as informações complementares sem sair da lista.
- **Exportar e assinar**: acima da lista, os botões **CSV** e **JSON** exportam exatamente o recorte filtrado. O build também gera **`dist/feed.rss`** (últimos 50 em RSS) e **`dist/calendario.ics`** (todos encerrando em um calendário do iCal), acessíveis em `/feed.rss` e `/calendario.ics` e linkados no rodapé — dá para assinar e acompanhar em qualquer leitor de feeds ou agenda.

## Dados de cada licitação

Cada item do arquivo `public/dados/licitacoes.json` (que funciona como a sua API pessoal) traz o que é preciso para pesquisar e participar:

- `objeto` e `informacaoComplementar` — o que está sendo contratado;
- `orgao`, `cnpj`, `esfera`, `municipio`, `uf`, `codigoIbge` — quem está comprando;
- `numeroCompra`, `numeroControlePncp`, `anoCompra`, `sequencialCompra` — identificação do processo;
- `dataPublicacao`, `dataAberturaProposta`, `dataEncerramentoProposta` — **período de inscrição**;
- `linkPncp` — página oficial do edital no PNCP;
- `linkSistemaOrigem` — link do sistema do órgão (quando existe), útil para dar o lance/proposta;
- `valorEstimado`, `modalidade`, `situacao`;
- `origem` — qual fonte originou o item (PNCP ou SIC Cultura);
- `segmentos` — em quais abas a licitação aparece (`cultura` e/ou `tecnologia`);
- `categorias` e `categoriaPrincipal` — classificação por segmento.

## Rodando localmente

```bash
npm install
npm run coletar     # UFS=PR,SP limitam; padrão: 27 estados. Gera public/dados/licitacoes.json
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
2. Faça push para `main`. O workflow `Radar Cultural Brasil` roda a coleta, o build e publica.
3. A URL fica em `https://<usuario>.github.io/lotus-radar/`.
4. A coleta roda automaticamente todo dia (`cron: 0 9 * * *`, 06h de Brasília) e também pode ser disparada à mão em **Actions → Radar Cultural Brasil → Run workflow**.

> Observação: o GitHub Actions ignora commits cuja mensagem contenha o token `[skip ci]` (é o que o commit automático da coleta usa para não republicar a cada dia). A detecção vale para a mensagem como um todo — inclusive se o token só aparecer como citação. Para disparar um deploy via push, **não** inclua o token na mensagem.

Se usar domínio próprio, ajuste `base` em `vite.config.ts` para `'/'` (ou defina a variável `BASE_PATH`).

## Limites conhecidos

- A cobertura depende de o órgão publicar no PNCP. Alguns municípios pequenos usam sistemas próprios e podem não aparecer.
- O coletor tem limites de páginas e de tempo; quando corta, o snapshot é marcado como **parcial**.
- `valorTotalEstimado` ausente ou zero é tratado como **não informado** (nunca como R$ 0,00).
- O coletor do SIC Cultura é **best-effort**: o portal divulga prazos em linguagem natural; só entram os editais com data de encerramento futura claramente detectável.
- O filtro de distância usa **geolocalização do navegador** (nada é enviado a servidores) e compara com o centro do município — é uma aproximação.

## Segurança

O site é estático e não guarda dados de usuários, mas trata conteúdo **externo** (objetos, links e informações complementares vindos do PNCP):

- **URLs**: todo link exibido passa por `src/lib/seguranca.ts` (`urlSegura`) — aceita apenas `http`/`https`, sem credenciais embutidas e com tamanho limitado. A sanitização é aplicada na coleta (`scripts/coletar.ts`, `scripts/reprocessar.ts`) e de novo na renderização (`CartaoLicitacao.tsx`) como defesa em profundidade.
- **CSP**: o build injeta uma Content-Security-Policy restritiva (`default-src 'self'`, sem scripts inline, `object-src 'none'`, `frame-ancestors 'none'`), via plugin em `vite.config.ts`. O mapa permite apenas os tiles do OpenStreetMap (`img-src`/`connect-src` → `https://*.tile.openstreetmap.org`).
- **Código/caracteres**: o conteúdo é renderizado com React (XSS mitigado por padrão); o coletor valida e limita tamanhos de todos os campos.
- **Dependências**: `npm audit` acompanhado; as dependências de produção são só `react`/`react-dom`.

## Licença

MIT.
