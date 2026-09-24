import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { classificar } from '../src/lib/categorias';
import { classificarTecnologia } from '../src/lib/segmentos/tecnologia';
import { urlSegura } from '../src/lib/seguranca';
import { estaEncerrada } from '../src/lib/vigencia';
import type { Esfera, Licitacao, Segmento, Snapshot } from '../src/lib/tipos';
import { coletarSicLicitacoes } from './coletar-sic';
import { coletarMintcLicitacoes } from './coletar-mintc';

const BASE_PNCP = 'https://pncp.gov.br/api/consulta/v1';

const TODAS_UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS',
  'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC',
  'SP', 'SE', 'TO',
];

const UFS_SELECIONADAS = (process.env.UFS ?? 'TODAS').toUpperCase().split(',').map((s) => s.trim());

function escopoDeUfs(): string[] {
  if (UFS_SELECIONADAS.length === 1 && (UFS_SELECIONADAS[0] === 'TODAS' || !UFS_SELECIONADAS[0])) {
    return [...TODAS_UFS];
  }
  return UFS_SELECIONADAS.filter((uf) => TODAS_UFS.includes(uf));
}

const TAMANHO_PAGINA = 50;
const MAX_PAGINAS_POR_ESTADO = 400;
const TIMEOUT_REQUISICAO_MS = 30_000;
const ORCAMENTO_TOTAL_MS = 150 * 60_000;
const INTERVALO_ENTRE_REQUISICOES_MS = 250;
const DIAS_JANELA = Number(process.env.DIAS_JANELA ?? 180);
const USER_AGENT =
  'lotus-radar/0.1 (+https://github.com/Gustavo-Ambrosio/lotus-radar)';
const MODO_OFFLINE = process.argv.includes('--offline');

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '..');
const ARQUIVO_SNAPSHOT = resolve(RAIZ, 'public/dados/licitacoes.json');
const CACHE_DIR = resolve(RAIZ, '.cache/pncp');

const MODALIDADES: Record<number, string> = {
  1: 'Leilão - Eletrônico',
  2: 'Diálogo Competitivo',
  3: 'Concurso',
  4: 'Concorrência - Eletrônica',
  5: 'Concorrência - Presencial',
  6: 'Pregão - Eletrônico',
  7: 'Pregão - Presencial',
  8: 'Dispensa',
  9: 'Inexigibilidade',
  10: 'Manifestação de Interesse',
  11: 'Pré-qualificação',
  12: 'Credenciamento',
  13: 'Leilão - Presencial',
  14: 'Inovação',
};

interface ItemPncp {
  numeroControlePNCP?: string;
  numeroCompra?: string;
  anoCompra?: number;
  sequencialCompra?: number;
  objetoCompra?: string;
  informacaoComplementar?: string;
  valorTotalEstimado?: number | null;
  modalidadeId?: number;
  modalidadeNome?: string;
  situacaoCompraNome?: string;
  dataPublicacaoPncp?: string | null;
  dataAberturaProposta?: string | null;
  dataEncerramentoProposta?: string | null;
  linkSistemaOrigem?: string | null;
  linkProcessoEletronico?: string | null;
  orgaoEntidade?: {
    cnpj?: string;
    razaoSocial?: string;
    esferaId?: string;
  };
  unidadeOrgao?: {
    ufSigla?: string;
    municipioNome?: string;
    codigoIbge?: string;
    nomeUnidade?: string;
  };
}

interface RespostaPg {
  data?: ItemPncp[];
  totalRegistros?: number;
  totalPaginas?: number;
  paginasRestantes?: number;
}

const inicio = Date.now();

function dormir(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function estourouOrcamento(): boolean {
  return Date.now() - inicio > ORCAMENTO_TOTAL_MS;
}

function comOffset(valor?: string | null): string | null {
  if (!valor) return null;
  const texto = String(valor).trim();
  if (!texto) return null;
  if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(texto)) return texto;
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) return `${texto}T00:00:00-03:00`;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(texto)) return `${texto}:00-03:00`;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(texto)) return `${texto}-03:00`;
  const parsed = new Date(texto);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function mapearEsfera(esferaId?: string): Esfera {
  switch ((esferaId || '').toUpperCase()) {
    case 'E':
      return 'Estadual';
    case 'M':
      return 'Municipal';
    case 'F':
      return 'Federal';
    case 'D':
      return 'Distrital';
    default:
      return 'Não informada';
  }
}

function valorOuNulo(valor?: number | null): number | null {
  if (valor === null || valor === undefined) return null;
  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero <= 0) return null;
  return numero;
}

function urlSistemaOrigem(item: ItemPncp): string | null {
  const sistema = item.linkSistemaOrigem || item.linkProcessoEletronico;
  return urlSegura(sistema);
}

function urlPncp(item: ItemPncp): string {
  const cnpj = String(item.orgaoEntidade?.cnpj || '');
  if (cnpj && item.anoCompra && item.sequencialCompra) {
    return `https://pncp.gov.br/app/editais/${cnpj}/${item.anoCompra}/${item.sequencialCompra}`;
  }
  return 'https://pncp.gov.br/app/editais';
}

function normalizar(item: ItemPncp, agora: number): Licitacao | null {
  const objeto = String(item.objetoCompra || '').trim();
  if (!objeto) return null;

  const encerramento = comOffset(item.dataEncerramentoProposta);
  if (!encerramento) return null;
  if (estaEncerrada(encerramento, item.situacaoCompraNome, agora)) return null;

  // A classificação usa somente o objeto. Informação complementar já foi testada como fonte
  // extra de recall, mas produziu falsos positivos em massa (ex.: "meio de cultura" em compras
  // de laboratório) e foi descartada. Ver histórico de commits.
  const classificacao = classificar(objeto);
  const classificacaoTecnologia = classificarTecnologia(objeto);

  const segmentos: Segmento[] = [];
  if (classificacao.principal) segmentos.push('cultura');
  if (classificacaoTecnologia.principal) segmentos.push('tecnologia');
  if (segmentos.length === 0) return null;

  const categorias = [
    ...(classificacao.categorias ?? []),
    ...(classificacaoTecnologia.categorias ?? []),
  ];
  const categoriaPrincipal = classificacao.principal ?? classificacaoTecnologia.principal;

  const linkPncp = urlPncp(item);
  const linkSistemaOrigem = urlSistemaOrigem(item);

  const id = String(
    item.numeroControlePNCP ||
      `${item.orgaoEntidade?.cnpj || 'sem-cnpj'}-${item.anoCompra || ''}-${item.sequencialCompra || objeto.slice(0, 24)}`,
  );

  return {
    id,
    orgao: String(item.orgaoEntidade?.razaoSocial || item.unidadeOrgao?.nomeUnidade || 'Órgão não informado').trim(),
    cnpj: String(item.orgaoEntidade?.cnpj || ''),
    esfera: mapearEsfera(item.orgaoEntidade?.esferaId),
    uf: String(item.unidadeOrgao?.ufSigla || 'BR').toUpperCase(),
    municipio: String(item.unidadeOrgao?.municipioNome || 'Não informado').trim(),
    codigoIbge: String(item.unidadeOrgao?.codigoIbge || ''),
    objeto,
    informacaoComplementar: item.informacaoComplementar
      ? String(item.informacaoComplementar).trim()
      : null,
    modalidade:
      item.modalidadeNome ||
      (item.modalidadeId ? MODALIDADES[item.modalidadeId] : undefined) ||
      'Não informada',
    numeroCompra: item.numeroCompra ? String(item.numeroCompra).trim() : null,
    numeroControlePncp: item.numeroControlePNCP ? String(item.numeroControlePNCP).trim() : null,
    anoCompra: item.anoCompra ?? null,
    sequencialCompra: item.sequencialCompra ?? null,
    valorEstimado: valorOuNulo(item.valorTotalEstimado),
    dataPublicacao: comOffset(item.dataPublicacaoPncp),
    dataAberturaProposta: comOffset(item.dataAberturaProposta),
    dataEncerramentoProposta: encerramento,
    link: linkSistemaOrigem || linkPncp,
    linkPncp,
    linkSistemaOrigem,
    categorias,
    categoriaPrincipal,
    segmentos,
    situacao: String(item.situacaoCompraNome || '').trim(),
    origem: 'PNCP — Portal Nacional de Contratações Públicas (API /api/consulta/v1/contratacoes/proposta)',
  };
}

function caminhoCache(url: string): string {
  const hash = createHash('sha1').update(url).digest('hex');
  return resolve(CACHE_DIR, `${hash}.json`);
}

async function lerCache(url: string): Promise<RespostaPg | null> {
  try {
    const bruto = await readFile(caminhoCache(url), 'utf8');
    const pacote = JSON.parse(bruto) as { dados?: RespostaPg };
    return pacote.dados ?? null;
  } catch {
    return null;
  }
}

async function gravarCache(url: string, dados: RespostaPg): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });
  const pacote = { url, gravadoEm: new Date().toISOString(), dados };
  await writeFile(caminhoCache(url), JSON.stringify(pacote), 'utf8');
}

class ErroHttp extends Error {
  espera: number;

  constructor(mensagem: string, espera: number) {
    super(mensagem);
    this.espera = espera;
  }
}

function esperaDeRetry(resposta: Response, tentativa: number): number {
  const cabecalho = Number(resposta.headers.get('retry-after'));
  if (Number.isFinite(cabecalho) && cabecalho > 0) {
    return Math.min(120_000, cabecalho * 1000);
  }
  return Math.min(60_000, 2000 * 2 ** (tentativa - 1));
}

async function requisicaoJson(url: string, tentativas = 5): Promise<RespostaPg | null> {
  for (let tentativa = 1; tentativa <= tentativas; tentativa++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_REQUISICAO_MS);
    try {
      const resposta = await fetch(url, {
        headers: { accept: 'application/json', 'user-agent': USER_AGENT },
        signal: controller.signal,
      });
      const tipo = resposta.headers.get('content-type') || '';

      if (resposta.status === 429 || resposta.status >= 500) {
        throw new ErroHttp(`status ${resposta.status}`, esperaDeRetry(resposta, tentativa));
      }
      if (!resposta.ok) {
        const corpo = await resposta.text().catch(() => '');
        throw new ErroHttp(`HTTP ${resposta.status} ${corpo.slice(0, 160)}`, 0);
      }
      if (!tipo.includes('application/json')) {
        throw new ErroHttp(`content-type inesperado (${tipo || 'vazio'})`, 0);
      }
      return (await resposta.json()) as RespostaPg;
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : String(erro);
      if (tentativa === tentativas) {
        console.warn(`[pncp] falha definitiva em ${url}: ${mensagem}`);
        return null;
      }
      const espera =
        erro instanceof ErroHttp && erro.espera > 0
          ? erro.espera
          : Math.min(60_000, 2000 * 2 ** (tentativa - 1));
      console.warn(`[pncp] tentativa ${tentativa} falhou (${mensagem}); aguardando ${espera}ms`);
      await dormir(espera);
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

async function obterResposta(url: string): Promise<RespostaPg | null> {
  const cache = await lerCache(url);
  if (cache) return cache;

  if (MODO_OFFLINE) {
    console.warn(`[cache] ausente no modo offline: ${url}`);
    return null;
  }

  const dados = await requisicaoJson(url);
  if (dados) await gravarCache(url, dados);
  return dados;
}

function urlProposta(uf: string, pagina: number, modalidade?: number): string {
  const params = new URLSearchParams({
    dataFinal: dataFinal(),
    pagina: String(pagina),
    tamanhoPagina: String(TAMANHO_PAGINA),
  });
  if (uf && uf !== 'BR') params.set('uf', uf);
  if (modalidade) params.set('codigoModalidadeContratacao', String(modalidade));
  return `${BASE_PNCP}/contratacoes/proposta?${params.toString()}`;
}

function dataFinal(): string {
  const d = new Date();
  d.setDate(d.getDate() + DIAS_JANELA);
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

async function lerCacheCompleto(): Promise<ItemPncp[] | null> {
  try {
    const arquivos = await readdir(CACHE_DIR);
    const itens: ItemPncp[] = [];
    for (const arquivo of arquivos.filter((f) => f.endsWith('.json'))) {
      try {
        const bruto = await readFile(resolve(CACHE_DIR, arquivo), 'utf8');
        const pacote = JSON.parse(bruto) as { dados?: RespostaPg };
        const lote = Array.isArray(pacote.dados?.data) ? pacote.dados.data : [];
        itens.push(...lote);
      } catch {
        // arquivo corrompido ou não relacionado; ignora
      }
    }
    return itens.length > 0 ? itens : null;
  } catch {
    return null;
  }
}

interface Consulta {
  uf: string;
  modalidade?: number;
}

interface EstadoConsulta {
  consulta: Consulta;
  pagina: number;
  terminado: boolean;
  falhou: boolean;
}

async function coletarEmRodizio(
  consultas: Consulta[],
): Promise<{ itens: ItemPncp[]; respostas: number; falhou: boolean; parcial: boolean }> {
  const estados = consultas.map<EstadoConsulta>((consulta) => ({
    consulta,
    pagina: 1,
    terminado: false,
    falhou: false,
  }));
  const itens: ItemPncp[] = [];
  let respostas = 0;
  let parcial = false;

  while (!estourouOrcamento()) {
    let algumaAvancou = false;
    for (const estado of estados) {
      if (estado.terminado || estourouOrcamento()) continue;

      const c = estado.consulta;
      const dados = await obterResposta(urlProposta(c.uf, estado.pagina, c.modalidade));
      respostas += 1;
      if (!dados) {
        estado.terminado = true;
        estado.falhou = true;
        console.warn(
          `[pncp] falha ao ler uf=${c.uf}${c.modalidade ? ` modalidade=${c.modalidade}` : ''} página ${estado.pagina} (sem cache)`,
        );
        await dormir(INTERVALO_ENTRE_REQUISICOES_MS);
        continue;
      }

      const lote = Array.isArray(dados.data) ? dados.data : [];
      itens.push(...lote);

      const totalPaginas = Number(dados.totalPaginas || 1);
      const restantes = Number(dados.paginasRestantes ?? 0);
      console.log(
        `[pncp] uf=${c.uf}${c.modalidade ? ` modalidade=${c.modalidade}` : ''} pagina=${estado.pagina}/${totalPaginas} +${lote.length} (restam ${restantes})`,
      );

      if (lote.length === 0 || restantes <= 0) {
        estado.terminado = true;
      } else if (estado.pagina >= MAX_PAGINAS_POR_ESTADO) {
        estado.terminado = true;
        parcial = true;
        console.warn(`[pncp] corte de segurança: uf=${c.uf} parou na página ${estado.pagina}`);
      } else {
        estado.pagina += 1;
        algumaAvancou = true;
      }
      await dormir(INTERVALO_ENTRE_REQUISICOES_MS);
    }
    if (!algumaAvancou) break;
  }

  if (estourouOrcamento() && estados.some((e) => !e.terminado)) {
    parcial = true;
    console.warn('[pncp] orçamento esgotado com estados ainda em andamento; coleta parcial.');
  }

  const falhou = estados.some((e) => e.falhou);
  return { itens, respostas, falhou, parcial };
}

async function lerSnapshotAtual(): Promise<Snapshot | null> {
  try {
    const bruto = await readFile(ARQUIVO_SNAPSHOT, 'utf8');
    return JSON.parse(bruto) as Snapshot;
  } catch {
    return null;
  }
}

async function principal(): Promise<void> {
  const escopo = escopoDeUfs();
  console.log(
    `[pncp] escopo=${escopo.join(',')} (${escopo.length} estados) janela=${DIAS_JANELA}d dataFinal=${dataFinal()}${MODO_OFFLINE ? ' [offline/cache]' : ''}`,
  );

  let itens: ItemPncp[] = [];
  let parcial = false;
  let falhouAlgum = false;
  let respostas = 0;

  if (MODO_OFFLINE) {
    const completo = await lerCacheCompleto();
    if (completo) {
      itens.push(...completo);
      console.log(`[pncp] offline: ${completo.length} itens carregados do cache completo`);
    } else {
      console.warn('[pncp] offline: cache vazio');
    }
  } else {
    const varredura = await coletarEmRodizio(escopo.map<Consulta>((uf) => ({ uf })));
    itens = varredura.itens;
    respostas = varredura.respostas;
    falhouAlgum = varredura.falhou;
    parcial = varredura.parcial;
  }

  if (itens.length === 0 && !MODO_OFFLINE) {
    console.warn('[pncp] consulta por estado voltou vazia; varrendo modalidades em âmbito nacional');
    const varredura = await coletarEmRodizio(
      Object.keys(MODALIDADES).map<Consulta>((codigo) => ({
        uf: 'BR',
        modalidade: Number(codigo),
      })),
    );
    itens = varredura.itens;
    respostas += varredura.respostas;
    falhouAlgum = falhouAlgum || varredura.falhou;
    parcial = parcial || varredura.parcial;
  }

  const agora = Date.now();
  const porId = new Map<string, Licitacao>();
  for (const item of itens) {
    const normalizado = normalizar(item, agora);
    if (normalizado) porId.set(normalizado.id, normalizado);
  }

  const sic = await coletarSicLicitacoes(MODO_OFFLINE);
  for (const item of sic) {
    if (estaEncerrada(item.dataEncerramentoProposta, item.situacao, agora)) continue;
    porId.set(item.id, item);
  }

  const mintc = await coletarMintcLicitacoes(MODO_OFFLINE);
  for (const item of mintc) {
    if (estaEncerrada(item.dataEncerramentoProposta, item.situacao, agora)) continue;
    porId.set(item.id, item);
  }

  const licitacoes = [...porId.values()].sort((a, b) => {
    const da = a.dataEncerramentoProposta ? new Date(a.dataEncerramentoProposta).getTime() : Infinity;
    const db = b.dataEncerramentoProposta ? new Date(b.dataEncerramentoProposta).getTime() : Infinity;
    return da - db;
  });

  if (itens.length > 0) {
    console.log(`[pncp] ${itens.length} registros brutos (${respostas} requisições de página)`);
  }
  console.log(`[pncp] ${licitacoes.length} licitações abertas (cultura/tecnologia) | SIC: ${sic.length} | MinC: ${mintc.length}`);

  const fontes = ['PNCP — Portal Nacional de Contratações Públicas (todos os estados e órgãos federais)'];
  if (sic.length > 0) {
    fontes.push('SIC.Cultura-PR — Secretaria de Estado da Cultura do Paraná (editais de fomento)');
  }
  if (mintc.length > 0) {
    fontes.push('MinC — Ministério da Cultura (gov.br, editais de fomento)');
  }

  if (licitacoes.length === 0) {
    const atual = await lerSnapshotAtual();
    if (atual && atual.licitacoes.length > 0) {
      console.warn('[pncp] nenhum resultado; mantendo snapshot anterior.');
      return;
    }
    console.warn('[pncp] nenhum resultado e sem snapshot anterior; gravando snapshot vazio.');
  }

  const snapshot: Snapshot = {
    geradoEm: new Date().toISOString(),
    fonte: fontes.join('; '),
    uf: 'BR',
    estados: escopo,
    fontes,
    total: licitacoes.length,
    truncado: parcial || falhouAlgum,
    observacao:
      'Somente licitações, editais e avisos abertos (cultura e tecnologia) em todo o Brasil — municípios, estados, Distrito Federal e órgãos federais. Os encerrados são removidos a cada coleta. A cobertura depende de o órgão publicar no PNCP; a classificação é inferida por palavras-chave do objeto.',
    licitacoes,
  };

  await mkdir(dirname(ARQUIVO_SNAPSHOT), { recursive: true });
  await writeFile(ARQUIVO_SNAPSHOT, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  console.log(`[pncp] snapshot gravado em ${ARQUIVO_SNAPSHOT}`);
}

principal()
  .then(() => process.exit(0))
  .catch((erro) => {
    console.error('[pncp] erro fatal na coleta:', erro);
    process.exit(0);
  });