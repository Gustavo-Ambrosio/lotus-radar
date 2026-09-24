import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { classificar } from '../src/lib/categorias';
import { classificarTecnologia } from '../src/lib/segmentos/tecnologia';
import { urlSegura } from '../src/lib/seguranca';
import type { Esfera, Licitacao, Segmento } from '../src/lib/tipos';

const RAIZ = resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const CACHE_DIR = resolve(RAIZ, '.cache', 'pnab');
const CACHE_ARQUIVO = resolve(CACHE_DIR, 'oportunidades.json');

const API_BASE = 'https://mapa.cultura.gov.br/api/opportunity';
const ORGAO_PADRAO = 'Mapa da Cultura — Política Nacional Aldir Blanc (PNAB)';
const LIMITE_PAGINA = 100;
const MAX_PAGINAS = 10;
const DIAS_ABERTURA_MINIMA = 400;
const TIPO_EDITAL = 9;
const TIPO_CONCURSO = 10;
const TIPOS_ABRANGIDOS = `${TIPO_EDITAL},${TIPO_CONCURSO}`;
const RUIDOS = /\b(testes?|exemplo|mock)\b/i;

interface DataPhp {
  date?: string;
  timezone?: string;
}

interface OportunidadeMapa {
  id?: number;
  name?: string;
  type?: { id?: number; name?: string } | number;
  registrationFrom?: DataPhp | null;
  registrationTo?: DataPhp | null;
  createTimestamp?: DataPhp | null;
  owner?: {
    id?: number;
    name?: string;
    En_Estado?: string;
    En_Municipio?: string;
  } | number | null;
  singleUrl?: string;
}

interface PacoteOportunidades {
  geradoEm?: string;
  itens?: Licitacao[];
}

function dormir(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function requisitarJson(url: string): Promise<OportunidadeMapa[]> {
  let ultimoErro = '';
  for (let tentativa = 1; tentativa <= 4; tentativa++) {
    try {
      const resposta = await fetch(url, {
        headers: { accept: 'application/json', 'user-agent': 'lotus-radar/0.1 (+https://github.com/Gustavo-Ambrosio/lotus-radar)' },
      });
      const tipo = resposta.headers.get('content-type') || '';
      if (!resposta.ok) throw new Error(`HTTP ${resposta.status} para ${url}`);
      if (!tipo.includes('application/json')) {
        throw new Error(`resposta não-JSON (${tipo || 'vazio'}) para ${url}`);
      }
      const dados = (await resposta.json()) as unknown;
      return Array.isArray(dados) ? (dados as OportunidadeMapa[]) : [];
    } catch (erro) {
      ultimoErro = erro instanceof Error ? erro.message : String(erro);
      if (tentativa === 4) break;
      await dormir(1500 * tentativa);
    }
  }
  throw new Error(`falha definitiva ao consultar Mapa da Cultura: ${ultimoErro}`);
}

function dataPhpParaIso(valor?: DataPhp | string | null): string | null {
  if (!valor) return null;
  const bruto = typeof valor === 'string' ? valor : valor.date;
  if (!bruto) return null;
  const match = bruto.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2}))?/);
  if (!match) return null;
  const [, ano, mes, dia, hora = '23', minuto = '59', segundo = '59'] = match;
  return `${ano}-${mes}-${dia}T${hora}:${minuto}:${segundo}-03:00`;
}

function tipoDaOportunidade(registro: OportunidadeMapa): { id: number | null; nome: string } {
  if (typeof registro.type === 'number') return { id: registro.type, nome: String(registro.type) };
  if (registro.type && typeof registro.type === 'object') {
    return { id: registro.type.id ?? null, nome: registro.type.name ?? '' };
  }
  return { id: null, nome: '' };
}

function nomeDoAgenciador(owner: OportunidadeMapa['owner']): string {
  if (owner && typeof owner === 'object') return String(owner.name ?? '').trim();
  return '';
}

function inferirEsfera(nomeOrgao: string): Esfera {
  const texto = nomeOrgao
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (/minist(?:e|é)rio|secretaria (do|de) (audiovisual|ciudadania|cidadania)|fundacao nacional|governo federal|uniao/.test(texto)) {
    return 'Federal';
  }
  if (/governo do estado|secretaria de estado|secretaria estadual|^secretaria.*(?:pr|sp|rj|mg|ba|rs|pe|ce|go|sc|pa|ma|am|mt|ms|es|rn|pb|pi|al|se|ro|ac|ap|rr|to|df)\b|^secretaria de cultura do/.test(texto)) {
    return 'Estadual';
  }
  if (/prefeitura|secretaria municipal|secretaria de cultura|fundacao municipal|coordenacao municipal|diretoria de cultura|conselho municipal|comcult|secult/.test(texto)) {
    return 'Municipal';
  }
  return 'Não informada';
}

function ufDoRegistro(registro: OportunidadeMapa): string {
  if (registro.owner && typeof registro.owner === 'object' && registro.owner.En_Estado) {
    return String(registro.owner.En_Estado).trim().toUpperCase().slice(0, 2);
  }
  return 'BR';
}

function municipioDoRegistro(registro: OportunidadeMapa): string {
  if (registro.owner && typeof registro.owner === 'object' && registro.owner.En_Municipio) {
    return String(registro.owner.En_Municipio).trim();
  }
  return 'Não informado';
}

function classificarPnab(titulo: string): { categorias: string[]; principal: string | null; segmentos: Segmento[] } {
  const classificacao = classificar(titulo);
  const classificacaoTecnologia = classificarTecnologia(titulo);
  const segmentos: Segmento[] = [];
  if (classificacao.principal) segmentos.push('cultura');
  if (classificacaoTecnologia.principal) segmentos.push('tecnologia');
  return {
    categorias: [...(classificacao.categorias ?? []), ...(classificacaoTecnologia.categorias ?? [])],
    principal: classificacao.principal ?? classificacaoTecnologia.principal,
    segmentos,
  };
}

function montarLicitacao(registro: OportunidadeMapa): Licitacao | null {
  const titulo = String(registro.name ?? '').trim();
  if (!titulo) return null;
  const idMapa = registro.id;
  if (idMapa === undefined) return null;
  if (RUIDOS.test(titulo)) return null;

  const link = urlSegura(String(registro.singleUrl ?? ''));
  if (!link) return null;

  const encerramento = dataPhpParaIso(registro.registrationTo);
  if (!encerramento) return null;
  if (estaMuitoDistante(encerramento)) return null;

  const tipo = tipoDaOportunidade(registro);
  const nomeOrgao = nomeDoAgenciador(registro.owner) || ORGAO_PADRAO;
  const classificacao = classificarPnab(titulo);
  const esfera = inferirEsfera(nomeOrgao);
  const uf = ufDoRegistro(registro);
  const modalidade =
    tipo.nome === 'Edital' ? 'Edital de fomento' : tipo.nome === 'Concurso' ? 'Concurso' : `Oportunidade (${tipo.nome || idMapa})`;

  return {
    id: `pnab-${idMapa}`,
    orgao: nomeOrgao,
    cnpj: '',
    esfera,
    uf,
    municipio: municipioDoRegistro(registro),
    codigoIbge: '',
    objeto: titulo,
    informacaoComplementar: null,
    modalidade,
    numeroCompra: null,
    numeroControlePncp: null,
    anoCompra: null,
    sequencialCompra: null,
    valorEstimado: null,
    dataPublicacao: dataPhpParaIso(registro.createTimestamp),
    dataAberturaProposta: dataPhpParaIso(registro.registrationFrom),
    dataEncerramentoProposta: encerramento,
    link,
    linkPncp: link,
    linkSistemaOrigem: link,
    categorias: classificacao.categorias,
    categoriaPrincipal: classificacao.principal,
    segmentos: classificacao.segmentos,
    situacao: '',
    origem: 'PNAB — Política Nacional Aldir Blanc (Mapa da Cultura/SNIIC, API pública)',
  };
}

function estaMuitoDistante(encerramento: string): boolean {
  const instante = new Date(encerramento).getTime();
  if (!Number.isFinite(instante)) return true;
  const agora = Date.now();
  return instante > agora + DIAS_ABERTURA_MINIMA * 86_400_000;
}

function urlPagina(pagina: number, dataReferencia: string): string {
  const params = new URLSearchParams({
    '@select': [
      'id',
      'name',
      'type.{id,name}',
      'registrationFrom',
      'registrationTo',
      'createTimestamp',
      'owner.{id,name,En_Estado,En_Municipio}',
      'singleUrl',
    ].join(','),
    '@limit': String(LIMITE_PAGINA),
    '@page': String(pagina),
    'type': `IN(${TIPOS_ABRANGIDOS})`,
    'registrationTo': `GTE(${dataReferencia})`,
  });
  return `${API_BASE}/find?${params.toString()}`;
}

export async function coletarPnabLicitacoes(offline = false): Promise<Licitacao[]> {
  if (offline) return lerPnabDoCache();

  const agora = new Date();
  const dataReferencia = agora.toISOString().slice(0, 10);
  const resultado: Licitacao[] = [];

  try {
    for (let pagina = 1; pagina <= MAX_PAGINAS; pagina++) {
      const lote = await requisitarJson(urlPagina(pagina, dataReferencia));
if (lote.length === 0) break;

      for (const registro of lote) {
        const item = montarLicitacao(registro);
        if (!item) continue;
        resultado.push(item);
        console.log(
          `[pnab] ${item.objeto} → ${item.dataEncerramentoProposta ?? 'sem prazo'} (${item.orgao}|${item.uf})`,
        );
      }

      if (lote.length < LIMITE_PAGINA) break;
      await dormir(1200);
    }

    gravarPnabCache(resultado);
    return resultado;
  } catch (e) {
    const mensagem = e instanceof Error ? e.message : String(e);
    console.warn(`[pnab] falha geral (${mensagem}); usa cache se existir.`);
    return lerPnabDoCache();
  }
}

function gravarPnabCache(lista: Licitacao[]): void {
  mkdirSync(CACHE_DIR, { recursive: true });
  const pacote: PacoteOportunidades = { geradoEm: new Date().toISOString(), itens: lista };
  writeFileSync(CACHE_ARQUIVO, `${JSON.stringify(pacote, null, 2)}\n`, 'utf8');
}

export function lerPnabDoCache(): Licitacao[] {
  try {
    if (!existsSync(CACHE_ARQUIVO)) return [];
    const bruto = JSON.parse(readFileSync(CACHE_ARQUIVO, 'utf8')) as PacoteOportunidades;
    return Array.isArray(bruto.itens) ? bruto.itens : [];
  } catch {
    return [];
  }
}

export const PNAB_CACHE_ARQUIVO = CACHE_ARQUIVO;