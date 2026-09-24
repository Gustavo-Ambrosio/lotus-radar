import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { classificar } from '../src/lib/categorias';
import { urlSegura } from '../src/lib/seguranca';
import type { Licitacao } from '../src/lib/tipos';

const RAIZ = resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const CACHE_DIR = resolve(RAIZ, '.cache', 'sic');
const CACHE_ARQUIVO = resolve(CACHE_DIR, 'editais.json');

const PAGINA_EDITAIS = 'https://www.cultura.pr.gov.br/Pagina/Editais';
const BASE_CULTURA = 'https://www.cultura.pr.gov.br';
const ORGAO = 'Secretaria de Estado da Cultura — Paraná (SIC)';
const MAX_PAGINAS = 50;

const MESES: Record<string, number> = {
  janeiro: 1, fevereiro: 2, março: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};

const NOME_MESES = Object.keys(MESES).join('|');

interface LinkEdital {
  titulo: string;
  url: string;
}

export function limparHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-zA-Z0-9#]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function obterHtml(url: string): Promise<string> {
  const resposta = await fetch(url, {
    headers: { accept: 'text/html', 'user-agent': 'lotus-radar/0.1 (+https://github.com/Gustavo-Ambrosio/lotus-radar)' },
  });
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status} em ${url}`);
  return resposta.text();
}

export function datasDaPagina(texto: string): Array<{ dia: number; mes: number; ano: number; contexto: string }> {
  const candidatos: Array<{ dia: number; mes: number; ano: number; contexto: string }> = [];

  const numerica = /(\d{1,2})\/(\d{1,2})\/(\d{4})/g;
  let m: RegExpExecArray | null;
  while ((m = numerica.exec(texto)) !== null) {
    const dia = Number(m[1]);
    const mes = Number(m[2]);
    const ano = Number(m[3]);
    if (mes >= 1 && mes <= 12 && dia >= 1 && dia <= 31) {
      const inicio = Math.max(0, m.index - 70);
      candidatos.push({ dia, mes, ano, contexto: texto.slice(inicio, m.index + 12) });
    }
  }

  const porExtenso = new RegExp(
    `(?:dia\\s+)?(\\d{1,2})\\s+de\\s+(${NOME_MESES})(?:\\s+de\\s+(\\d{4}))?`,
    'gi',
  );
  while ((m = porExtenso.exec(texto)) !== null) {
    const dia = Number(m[1]);
    const mes = MESES[(m[2] ?? '').toLowerCase()] ?? 0;
    if (mes === 0) continue;
    const ano = m[3] ? Number(m[3]) : null;
    const inicio = Math.max(0, m.index - 70);
    const contexto = texto.slice(inicio, m.index + 40);
    if (ano) {
      candidatos.push({ dia, mes, ano, contexto });
    } else {
      const agora = new Date();
      let anoSugerido = agora.getFullYear();
      const dataTry = new Date(anoSugerido, mes - 1, dia);
      if (dataTry.getTime() < Date.now() - 86_400_000) anoSugerido += 1;
      candidatos.push({ dia, mes, ano: anoSugerido, contexto });
    }
  }

  return candidatos;
}

function contextoRelevante(contexto: string): boolean {
  return /inscri|prazo|at[eé]|prorrogad|encerr|proposta|envio|entrega|recebiment/.test(contexto.toLowerCase());
}

export function encerramentoDaPagina(html: string): string | null {
  const texto = limparHtml(html);
  const datas = datasDaPagina(texto);
  if (datas.length === 0) return null;

  const relevantes = datas.filter((d) => contextoRelevante(d.contexto));
  const pool = relevantes.length > 0 ? relevantes : datas;

  const agora = new Date();
  const limiteSuperior = agora.getTime() + 120 * 86_400_000;
  const futuras = pool
    .filter((d) => new Date(d.ano, d.mes - 1, d.dia, 23, 59, 59).getTime() >= agora.getTime() - 86_400_000)
    .filter((d) => new Date(d.ano, d.mes - 1, d.dia, 23, 59, 59).getTime() <= limiteSuperior)
    .sort((a, b) => new Date(a.ano, a.mes - 1, a.dia).getTime() - new Date(b.ano, b.mes - 1, b.dia).getTime());

  const escolhida = futuras[futuras.length - 1] ?? null;
  if (!escolhida) return null;

  const instante = new Date(escolhida.ano, escolhida.mes - 1, escolhida.dia, 23, 59, 59);
  return `${instante.getFullYear()}-${String(instante.getMonth() + 1).padStart(2, '0')}-${String(
    instante.getDate(),
  ).padStart(2, '0')}T23:59:59-03:00`;
}

function slugDaUrl(url: string): string {
  const ultimo = url.split('/').filter(Boolean).pop() ?? '';
  return ultimo
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
}

function montarLicitacao(titulo: string, url: string, encerramento: string): Licitacao | null {
  const link = urlSegura(url);
  if (!link) return null;
  const classificacao = classificar(titulo);
  return {
    id: `sic-${slugDaUrl(url)}`,
    orgao: ORGAO,
    cnpj: '',
    esfera: 'Estadual',
    uf: 'PR',
    municipio: 'Paraná (Estado)',
    codigoIbge: '',
    objeto: titulo,
    informacaoComplementar: null,
    modalidade: 'Edital de fomento',
    numeroCompra: null,
    numeroControlePncp: null,
    anoCompra: null,
    sequencialCompra: null,
    valorEstimado: null,
    dataPublicacao: null,
    dataAberturaProposta: null,
    dataEncerramentoProposta: encerramento,
    link,
    linkPncp: link,
    linkSistemaOrigem: link,
    categorias: classificacao.categorias ?? [],
    categoriaPrincipal: classificacao.principal,
    segmentos: ['cultura'],
    situacao: '',
    origem: 'SIC.Cultura-PR (Secretaria de Estado da Cultura do Paraná)',
  };
}

export async function coletarSicLicitacoes(offline = false): Promise<Licitacao[]> {
  if (offline) return lerSicDoCache();

  try {
    const htmlLista = await obterHtml(PAGINA_EDITAIS);
    const links: LinkEdital[] = [];
    const regex = /<a[^>]*href="([^"]*\/Pagina\/Edital-[^"#]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let encontrado: RegExpExecArray | null;
    while ((encontrado = regex.exec(htmlLista)) !== null) {
      const url = (encontrado[1] ?? '').replace(/&amp;/g, '&');
      const texto = limparHtml(encontrado[2] ?? '').trim();
      if (!texto) continue;
      const absoluto = url.startsWith('http') ? url : `${BASE_CULTURA}${url}`;
      links.push({ titulo: texto, url: absoluto });
    }
    const unicos = links.filter(
      (l, i, arr) => arr.findIndex((x) => x.url === l.url) === i,
    );

    if (unicos.length === 0) {
      console.warn('[sic] listagem sem editais detectada; mantém cache anterior.');
      return lerSicDoCache();
    }

    const resultado: Licitacao[] = [];
    for (const link of unicos.slice(0, MAX_PAGINAS)) {
      try {
        const pagina = await obterHtml(link.url);
        const encerramento = encerramentoDaPagina(pagina);
        if (!encerramento) continue;
        const item = montarLicitacao(link.titulo, link.url, encerramento);
        if (item) {
          resultado.push(item);
          console.log(`[sic] ${item.objeto} → ${encerramento}`);
        }
      } catch (e) {
        const mensagem = e instanceof Error ? e.message : String(e);
        console.warn(`[sic] falha ao ler ${link.url}: ${mensagem}`);
        continue;
      }
    }

    gravarSicCache(resultado);
    return resultado;
  } catch (e) {
    const mensagem = e instanceof Error ? e.message : String(e);
    console.warn(`[sic] falha geral (${mensagem}); usa cache se existir.`);
    return lerSicDoCache();
  }
}

function gravarSicCache(lista: Licitacao[]): void {
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(CACHE_ARQUIVO, `${JSON.stringify({ geradoEm: new Date().toISOString(), itens: lista }, null, 2)}\n`, 'utf8');
}

export function lerSicDoCache(): Licitacao[] {
  try {
    if (!existsSync(CACHE_ARQUIVO)) return [];
    const bruto = JSON.parse(readFileSync(CACHE_ARQUIVO, 'utf8')) as { itens?: Licitacao[] };
    return Array.isArray(bruto.itens) ? bruto.itens : [];
  } catch {
    return [];
  }
}

export const SIC_CACHE_ARQUIVO = CACHE_ARQUIVO;