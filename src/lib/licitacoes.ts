import { and, arrayOverlaps, asc, desc, eq, gte, isNotNull, lte, sql, type SQL } from 'drizzle-orm';
import { licitacoes, type LicitacaoDb, type NovaLicitacao } from '../db/schema';
import { normalizarTexto } from './texto';
import { FILTROS_INICIAIS, type Filtros } from './filtros';
import type { Coordenadas } from './geo';
import type { Esfera, Licitacao, Segmento } from './tipos';
import type { Database } from './db';

/**
 * Consulta do radar no servidor.
 *
 * Antes, o dashboard baixava o snapshot inteiro e filtrava no navegador — o
 * que tornava impossivel segmentar clientes ou proteger dado com plano. Aqui a
 * mesma forma de `Filtros` vira SQL, e cada filtro cai no indice que o
 * `src/db/schema.ts` criou para ele.
 *
 * `deLinha` devolve o mesmo formato de `src/lib/tipos.ts::Licitacao`, entao os
 * componentes de cartao, KPIs, agrupamento e exportacao continuam funcionando
 * sem mudanca.
 */

export interface ConsultaLicitacoes {
  segmento: Segmento;
  filtros: Filtros;
  /** Distancia maxima em km a partir de `origem`. */
  distanciaMaxKm: number | null;
  origem: Coordenadas | null;
  pagina: number;
  porPagina: number;
  /**
   * Restringe ao que a ingestao ainda nao tinha visto na data informada. E' o
   * filtro do job de alertas: sem ele, toda rodada reenviaria o recorte inteiro
   * como se fosse novidade. Usa `vista_em`, e nao `data_publicacao` — o edital
   * pode ter sido publicado ha semanas e acabado de entrar no nosso recorte.
   */
  vistaDepoisDe: Date | null;
}

export interface ResultadoLicitacoes {
  itens: Licitacao[];
  total: number;
  pagina: number;
  paginas: number;
  porPagina: number;
}

/** Filtros + aba + paginacao, com o que ja vem do URL. */
export function consultaInicial(segmento: Segmento, pagina = 1, porPagina = 50): ConsultaLicitacoes {
  return {
    segmento,
    filtros: { ...FILTROS_INICIAIS },
    distanciaMaxKm: null,
    origem: null,
    pagina,
    porPagina,
    vistaDepoisDe: null,
  };
}

/**
 * Distancia em km por haversine, em SQL.
 *
 * O `where` ja restringe por bounding box (que usa o indice de geo), entao
 * esta expressao so refina o que sobrou — calcular raio trigonometrico dentro
 * do indice nao seria possivel de qualquer modo.
 */
function distanciaKmSql(origem: Coordenadas): SQL<number> {
  const { lat, lng } = origem;
  return sql<number>`(6371 * 2 * asin(sqrt(
    power(sin(radians(${licitacoes.latitude} - ${lat}) / 2), 2)
    + cos(radians(${lat})) * cos(radians(${licitacoes.latitude}))
      * power(sin(radians(${licitacoes.longitude} - ${lng}) / 2), 2)
  )))`;
}

/** Bounding box que envolve o circulo de raio `km` (com folga de margem). */
function boundingBox(km: number, origem: Coordenadas) {
  const dLat = km / 111.32;
  const dLng = km / Math.max(1e-6, 111.32 * Math.cos((origem.lat * Math.PI) / 180));
  return {
    latMin: origem.lat - dLat,
    latMax: origem.lat + dLat,
    lngMin: origem.lng - dLng,
    lngMax: origem.lng + dLng,
  };
}

export function condicoesDaConsulta(consulta: ConsultaLicitacoes): SQL[] {
  const { filtros, segmento } = consulta;
  const condicoes: SQL[] = [];

  // Aba: exclusividade ja resolvida na escrita (ver src/lib/ingestao.ts).
  condicoes.push(eq(licitacoes.segmentoExclusivo, segmento));

  const busca = normalizarTexto(filtros.busca);
  if (busca) {
    // `textoBusca` ja esta normalizado na escrita, entao um `like` com o termo
    // normalizado casa e aproveita o indice GIN de trigram. Um `ilike` sobre o
    // objeto original nao usaria indice nenhum.
    condicoes.push(sql`${licitacoes.textoBusca} like ${`%${busca}%`}`);
  }

  if (filtros.categorias.length > 0) {
    condicoes.push(arrayOverlaps(licitacoes.categorias, filtros.categorias));
  }
  if (filtros.uf) condicoes.push(eq(licitacoes.uf, filtros.uf));
  if (filtros.municipio) condicoes.push(eq(licitacoes.municipio, filtros.municipio));
  if (filtros.esfera) condicoes.push(eq(licitacoes.esfera, filtros.esfera));
  if (filtros.modalidade) condicoes.push(eq(licitacoes.modalidade, filtros.modalidade));

  if (filtros.prazoMaxDias !== null) {
    const limite = new Date(Date.now() + filtros.prazoMaxDias * 24 * 60 * 60 * 1000);
    condicoes.push(isNotNull(licitacoes.dataEncerramentoProposta));
    condicoes.push(lte(licitacoes.dataEncerramentoProposta, limite));
  }
  if (filtros.publicadoDias !== null) {
    const desde = new Date(Date.now() - filtros.publicadoDias * 24 * 60 * 60 * 1000);
    condicoes.push(gte(licitacoes.dataPublicacao, desde));
  }
  if (filtros.somenteComValor) condicoes.push(isNotNull(licitacoes.valorEstimado));
  if (filtros.valorMinimo !== null) {
    condicoes.push(gte(licitacoes.valorEstimado, filtros.valorMinimo));
  }
  if (filtros.valorMaximo !== null) {
    condicoes.push(lte(licitacoes.valorEstimado, filtros.valorMaximo));
  }

  if (consulta.distanciaMaxKm !== null && consulta.origem) {
    const caixa = boundingBox(consulta.distanciaMaxKm, consulta.origem);
    condicoes.push(
      isNotNull(licitacoes.latitude),
      isNotNull(licitacoes.longitude),
      gte(licitacoes.latitude, caixa.latMin),
      lte(licitacoes.latitude, caixa.latMax),
      gte(licitacoes.longitude, caixa.lngMin),
      lte(licitacoes.longitude, caixa.lngMax),
      sql`${distanciaKmSql(consulta.origem)} <= ${consulta.distanciaMaxKm}`,
    );
  }

  if (consulta.vistaDepoisDe) {
    condicoes.push(gte(licitacoes.vistaEm, consulta.vistaDepoisDe));
  }

  return condicoes;
}

/**
 * `nulls last` vai por conta propria, e nao dentro de `asc()`/`desc()`: o
 * Postgres exige a ordem `coluna <direcao> nulls last`, e embrulhar a
 * expressao produziria `... nulls last asc`, que nem chega a ser valido.
 *
 * A ideia e' a mesma do filtro de ordenacao do cliente: item sem prazo e sem
 * valor nao pode ocupar as primeiras paginas de um radar de edital.
 */
function ordemDaConsulta(ordem: Filtros['ordenacao']): SQL[] {
  switch (ordem) {
    case 'recentes':
      return [sql`${licitacoes.dataPublicacao} desc nulls last`];
    case 'valor-desc':
      return [sql`${licitacoes.valorEstimado} desc nulls last`];
    case 'valor-asc':
      return [sql`${licitacoes.valorEstimado} asc nulls last`];
    case 'municipio':
      return [asc(licitacoes.municipio), asc(licitacoes.orgao)];
    case 'orgao':
      return [asc(licitacoes.orgao), asc(licitacoes.municipio)];
    case 'prazo':
    default:
      return [sql`${licitacoes.dataEncerramentoProposta} asc nulls last`];
  }
}
export async function buscarLicitacoes(
  db: Database,
  consulta: ConsultaLicitacoes,
): Promise<ResultadoLicitacoes> {
  const condicoes = condicoesDaConsulta(consulta);
  const onde = condicoes.length > 0 ? and(...condicoes) : undefined;
  const porPagina = Math.max(1, Math.min(consulta.porPagina, 500));
  const pagina = Math.max(1, consulta.pagina);

  const [linhas, contagem] = await Promise.all([
    db
      .select()
      .from(licitacoes)
      .where(onde)
      .orderBy(...ordemDaConsulta(consulta.filtros.ordenacao))
      .limit(porPagina)
      .offset((pagina - 1) * porPagina),
    db.select({ n: sql<number>`count(*)::int` }).from(licitacoes).where(onde),
  ]);

  const total = contagem[0]?.n ?? 0;
  return {
    itens: linhas.map(deLinha),
    total,
    pagina,
    paginas: Math.max(1, Math.ceil(total / porPagina)),
    porPagina,
  };
}

/** Busca do job de alertas: nao pagina, respeita o teto de resultados. */
export async function licitacoesNovas(
  db: Database,
  filtros: Filtros,
  segmento: Segmento,
  desde: Date,
  teto = 200,
): Promise<Licitacao[]> {
  const consulta: ConsultaLicitacoes = {
    ...consultaInicial(segmento),
    filtros,
    distanciaMaxKm: null,
    origem: null,
    pagina: 1,
    porPagina: teto,
  };
  const condicoes = [
    ...condicoesDaConsulta(consulta),
    gte(licitacoes.vistaEm, desde),
  ];
  const linhas = await db
    .select()
    .from(licitacoes)
    .where(and(...condicoes))
    .orderBy(...ordemDaConsulta(filtros.ordenacao))
    .limit(teto);
  return linhas.map(deLinha);
}

/** Uma licitacao pelo id do PNCP, para a pagina de detalhe. */
export async function licitacaoPorId(db: Database, id: string): Promise<Licitacao | null> {
  const linha = await db.select().from(licitacoes).where(eq(licitacoes.id, id)).limit(1);
  const achada = linha[0];
  return achada ? deLinha(achada) : null;
}

/** Recorte agregado por municipio, para o mapa. */
export async function pontosPorMunicipio(
  db: Database,
  consulta: ConsultaLicitacoes,
  teto = 2000,
): Promise<{ municipio: string; uf: string; lat: number; lng: number; total: number }[]> {
  const condicoes = condicoesDaConsulta(consulta);
  const onde = condicoes.length > 0 ? and(...condicoes) : undefined;

  const linhas = await db
    .select({
      municipio: licitacoes.municipio,
      uf: licitacoes.uf,
      lat: sql<number>`avg(${licitacoes.latitude})`,
      lng: sql<number>`avg(${licitacoes.longitude})`,
      total: sql<number>`count(*)::int`,
    })
    .from(licitacoes)
    .where(and(...(onde ? [onde, isNotNull(licitacoes.latitude)] : [isNotNull(licitacoes.latitude)])))
    .groupBy(licitacoes.municipio, licitacoes.uf)
    .orderBy(desc(sql`count(*)`))
    .limit(teto);

  return linhas.map((l) => ({
    municipio: l.municipio,
    uf: l.uf,
    lat: Number(l.lat),
    lng: Number(l.lng),
    total: Number(l.total),
  }));
}

/** KPIs do topo do painel, na mesma aba e com os mesmos filtros da lista. */
export async function resumoLicitacoes(
  db: Database,
  consulta: ConsultaLicitacoes,
): Promise<{ total: number; comValor: number; valorMedio: number; encerrandoLogo: number }> {
  const condicoes = condicoesDaConsulta(consulta);
  const onde = condicoes.length > 0 ? and(...condicoes) : undefined;

  const [linhas] = await db
    .select({
      total: sql<number>`count(*)::int`,
      comValor: sql<number>`count(${licitacoes.valorEstimado})::int`,
      somaValor: sql<number>`coalesce(sum(${licitacoes.valorEstimado}), 0)`,
      encerrandoLogo: sql<number>`count(*) filter (
        where ${licitacoes.dataEncerramentoProposta} is not null
          and ${licitacoes.dataEncerramentoProposta} <= now() + interval '10 days'
      )::int`,
    })
    .from(licitacoes)
    .where(onde);

  const resumo = linhas ?? { total: 0, comValor: 0, somaValor: 0, encerrandoLogo: 0 };
  return {
    total: Number(resumo.total),
    comValor: Number(resumo.comValor),
    valorMedio: Number(resumo.comValor) > 0 ? Number(resumo.somaValor) / Number(resumo.comValor) : 0,
    encerrandoLogo: Number(resumo.encerrandoLogo),
  };
}

function isoOuNull(valor: Date | null): string | null {
  return valor ? valor.toISOString() : null;
}

/**
 * Linha do banco -> formato do dominio. E' a ponte que mantem os componentes
 * de tela (cartao, KPIs, exportacao) intactos desde a era do snapshot JSON.
 */
export function deLinha(linha: LicitacaoDb): Licitacao {
  return {
    id: linha.id,
    orgao: linha.orgao,
    cnpj: linha.cnpj,
    esfera: linha.esfera as Esfera,
    uf: linha.uf,
    municipio: linha.municipio,
    codigoIbge: linha.codigoIbge,
    objeto: linha.objeto,
    informacaoComplementar: linha.informacaoComplementar,
    modalidade: linha.modalidade,
    numeroCompra: linha.numeroCompra,
    numeroControlePncp: linha.numeroControlePncp,
    anoCompra: linha.anoCompra,
    sequencialCompra: linha.sequencialCompra,
    valorEstimado: linha.valorEstimado === null ? null : Number(linha.valorEstimado),
    dataPublicacao: isoOuNull(linha.dataPublicacao),
    dataAberturaProposta: isoOuNull(linha.dataAberturaProposta),
    dataEncerramentoProposta: isoOuNull(linha.dataEncerramentoProposta),
    link: linha.link,
    linkPncp: linha.linkPncp,
    linkSistemaOrigem: linha.linkSistemaOrigem,
    categorias: [...linha.categorias],
    categoriaPrincipal: linha.categoriaPrincipal,
    segmentos: [...linha.segmentos] as Segmento[],
    situacao: linha.situacao,
    origem: linha.origem,
  };
}

/** Reexportado para quem importa a camada de dados e os tipos juntos. */
export type { NovaLicitacao };
