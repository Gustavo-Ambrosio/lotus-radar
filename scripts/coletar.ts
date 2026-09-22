import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { classificar } from '../src/lib/categorias';
import { classificarTecnologia } from '../src/lib/segmentos/tecnologia';
import { urlSegura } from '../src/lib/seguranca';
import type { Esfera, Licitacao, Segmento, Snapshot } from '../src/lib/tipos';

const BASE_PNCP = 'https://pncp.gov.br/api/consulta/v1';
const UF = 'PR';
const TAMANHO_PAGINA = 50;
const MAX_PAGINAS = 220;
const TIMEOUT_REQUISICAO_MS = 30_000;
const ORCAMENTO_TOTAL_MS = 15 * 60_000;
const INTERVALO_ENTRE_REQUISICOES_MS = 450;
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
  if (new Date(encerramento).getTime() < agora) return null;

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
    uf: String(item.unidadeOrgao?.ufSigla || UF).toUpperCase(),
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

function urlProposta(pagina: number, modalidade?: number): string {
  const params = new URLSearchParams({
    dataFinal: dataFinal(),
    pagina: String(pagina),
    tamanhoPagina: String(TAMANHO_PAGINA),
    uf: UF,
  });
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

async function coletarPaginas(
  modalidade?: number,
): Promise<{ itens: ItemPncp[]; truncado: boolean; falhou: boolean }> {
  const itens: ItemPncp[] = [];
  let pagina = 1;
  let totalPaginas = 1;

  while (pagina <= totalPaginas) {
    if (pagina > MAX_PAGINAS || estourouOrcamento()) {
      console.warn(`[pncp] corte de segurança na página ${pagina}`);
      return { itens, truncado: true, falhou: false };
    }

    const dados = await obterResposta(urlProposta(pagina, modalidade));
    if (!dados) {
      if (MODO_OFFLINE) {
        const completo = await lerCacheCompleto();
        if (completo) {
          itens.push(...completo);
          console.log(`[pncp] offline: ${completo.length} itens carregados do cache completo`);
          break;
        }
      }
      return { itens, truncado: true, falhou: true };
    }

    const lote = Array.isArray(dados.data) ? dados.data : [];
    itens.push(...lote);

    totalPaginas = Number(dados.totalPaginas || 1);
    const restantes = Number(dados.paginasRestantes ?? 0);
    console.log(
      `[pncp] modalidade=${modalidade ?? 'todas'} pagina=${pagina}/${totalPaginas} +${lote.length} (restam ${restantes})`,
    );

    if (lote.length === 0 || restantes <= 0) break;
    pagina += 1;
    await dormir(INTERVALO_ENTRE_REQUISICOES_MS);
  }

  return { itens, truncado: false, falhou: false };
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
  console.log(
    `[pncp] UF=${UF} janela=${DIAS_JANELA}d dataFinal=${dataFinal()}${MODO_OFFLINE ? ' [offline/cache]' : ''}`,
  );

  const direto = await coletarPaginas();
  let itens = direto.itens;
  let truncado = direto.truncado;

  if (direto.falhou && itens.length === 0) {
    console.warn('[pncp] PNCP indisponível e cache vazio; mantendo snapshot anterior.');
    return;
  }

  if (direto.falhou) {
    console.warn(`[pncp] coleta interrompida; gravando parcial com ${itens.length} registros do cache.`);
    truncado = true;
  } else if (itens.length === 0) {
    console.warn('[pncp] consulta sem modalidade voltou vazia; varrendo modalidades');
    for (const codigo of Object.keys(MODALIDADES).map(Number)) {
      if (estourouOrcamento()) {
        truncado = true;
        break;
      }
      const parcial = await coletarPaginas(codigo);
      itens.push(...parcial.itens);
      truncado = truncado || parcial.truncado;
      await dormir(INTERVALO_ENTRE_REQUISICOES_MS);
    }
  }

  const agora = Date.now();
  const porId = new Map<string, Licitacao>();
  for (const item of itens) {
    const normalizado = normalizar(item, agora);
    if (normalizado) porId.set(normalizado.id, normalizado);
  }

  const licitacoes = [...porId.values()].sort((a, b) => {
    const da = a.dataEncerramentoProposta ? new Date(a.dataEncerramentoProposta).getTime() : Infinity;
    const db = b.dataEncerramentoProposta ? new Date(b.dataEncerramentoProposta).getTime() : Infinity;
    return da - db;
  });

  console.log(`[pncp] ${itens.length} registros brutos -> ${licitacoes.length} licitações abertas (cultura/tecnologia)`);

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
    fonte: 'PNCP — Portal Nacional de Contratações Públicas (API /api/consulta/v1/contratacoes/proposta)',
    uf: UF,
    total: licitacoes.length,
    truncado,
    observacao:
      'Licitações de cultura e tecnologia abertas no Paraná. A cobertura depende de o órgão publicar no PNCP. A classificação é inferida por palavras-chave do objeto.',
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
