import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { classificar } from '../src/lib/categorias';
import { classificarTecnologia } from '../src/lib/segmentos/tecnologia';
import { urlSegura } from '../src/lib/seguranca';
import { estaEncerrada } from '../src/lib/vigencia';
import type { Licitacao, Segmento } from '../src/lib/tipos';
import { limparHtml } from './coletar-sic';

const RAIZ = resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const CACHE_DIR = resolve(RAIZ, '.cache', 'mintc');
const CACHE_ARQUIVO = resolve(CACHE_DIR, 'editais.json');

const PAGINAS_EDITAIS = [
  {
    url: 'https://www.gov.br/cultura/pt-br/assuntos/editais/inscricoes-abertas',
    sempreAberto: true,
  },
  {
    url: 'https://www.gov.br/cultura/pt-br/assuntos/editais/inscricoes-em-andamento',
    sempreAberto: false,
  },
];
const ORGAO = 'Ministério da Cultura (MinC) — gov.br';
const MAX_PAGINAS = 50;

interface LinkEdital {
  titulo: string;
  url: string;
  sempreAberto: boolean;
}

async function obterHtml(url: string): Promise<string> {
  const resposta = await fetch(url, {
    headers: { accept: 'text/html', 'user-agent': 'lotus-radar/0.1 (+https://github.com/Gustavo-Ambrosio/lotus-radar)' },
  });
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status} em ${url}`);
  return resposta.text();
}

export function dataDaPagina(texto: string, agora = Date.now()): string | null | 'EXPIRADA' {
  const MESES: Record<string, number> = {
    janeiro: 1, fevereiro: 2, março: 3, abril: 4, maio: 5, junho: 6,
    julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
  };
  const NM = Object.keys(MESES).join('|');
  const INSCPC = String.raw`inscri[çc][ãõo]\w*`;
  const DATA = new RegExp(`(?:\\d{1,2}\\/\\d{1,2}\\/\\d{4})|(?:\\d{1,2})\\s+de\\s+(?:${NM})(?:,?\\s+de\\s+\\d{4})?`, 'gi');
  const DATA2 = `(?:\\d{1,2}\\/\\d{1,2}\\/\\d{4}|\\d{1,2}\\s+de\\s+(?:${NM})(?:,?\\s+de\\s+\\d{4})?)`;
  const ANO_ATUAL = new Date(agora).getFullYear();

  const lerData = (campo: string): { ts: number; iso: string } | null => {
    const num = campo.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (num) {
      const dia = Number(num[1]);
      const mes = Number(num[2]);
      const ano = Number(num[3]);
      if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
      const ts = new Date(ano, mes - 1, dia, 23, 59, 59).getTime();
      return { ts, iso: `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}T23:59:59-03:00` };
    }
    const ext = campo.trim().match(new RegExp(`^(\\d{1,2})\\s+de\\s+(${NM})(?:,?\\s+de\\s+(\\d{4}))?$`, 'i'));
    if (ext) {
      const mesNome = (ext[2] ?? '').toLowerCase();
      const dia = Number(ext[1]);
      const mes = MESES[mesNome] ?? 0;
      if (mes === 0 || dia < 1 || dia > 31) return null;
      const ano = ext[3] ? Number(ext[3]) : ANO_ATUAL;
      const ts = new Date(ano, mes - 1, dia, 23, 59, 59).getTime();
      return { ts, iso: `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}T23:59:59-03:00` };
    }
    return null;
  };

  // Datas que aparecem logo após uma âncora de fim de prazo de inscrição.
  const datasApos = (ancora: RegExp, janela = 160): Array<{ ts: number; iso: string }> => {
    const out: Array<{ ts: number; iso: string }> = [];
    ancora.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = ancora.exec(texto)) !== null) {
      const pedaco = texto.slice(m.index + m[0].length, m.index + m[0].length + janela);
      DATA.lastIndex = 0;
      let dm: RegExpExecArray | null;
      let primeiro = true;
      while ((dm = DATA.exec(pedaco)) !== null) {
        const d = lerData(dm[0]);
        if (d && primeiro) {
          out.push(d);
          primeiro = false;
        }
      }
    }
    return out;
  };

  const resultados: Array<{ ts: number; iso: string; prio: number }> = [];
  const coletar = (ancora: RegExp, prio: number, janela = 160) => {
    for (const d of datasApos(ancora, janela)) resultados.push({ ...d, prio });
  };

  // 1) Encerramento/término/fim do prazo de inscrição (mais confiável)
  coletar(new RegExp(`(?:encerramento?s?|t[ée]rmino)\\s+do\\s+prazo\\s+(?:de\\s+)?${INSCPC}`, 'gi'), 4);
  coletar(new RegExp(`fim\\s+das?\\s+${INSCPC}`, 'gi'), 4);
  // 2) Data limite para submissão/envio/preenchimento/entrega
  coletar(
    new RegExp(`data\\s*[- ]?limite\\s+(?:para\\s+)?(?:a\\s+)?(?:submis[ss][ãa]o|envio|${INSCPC}|preenchimento|entrega)\\s*(?:de\\s+${INSCPC})?`, 'gi'),
    3,
  );
  // 3) "Até data inscrição" e "inscrições ... até data"
  coletar(new RegExp(`at[eé]\\s+(?:as\\s+\\d{1,2}h[^0-9]{0,20}?)?(?:o\\s+dia\\s+)?\\d{1,2}[^0-9]{0,40}?${INSCPC}`, 'gi'), 3);
  coletar(new RegExp(`${INSCPC}[^.;]{0,200}?\\bat[eé]\\s+(?:as\\s+\\d{1,2}h[^0-9]{0,24}?)?(?:o\\s+dia\\s+)?`, 'gi'), 2, 250);
  // 4) Período de inscrição "de X a Y" (fim = Y): a âncora consome a primeira
  //    data e o separador para que a primeira data após a âncora seja Y.
  coletar(
    new RegExp(`(?:per[ií]odo\\s+(?:de\\s+)?${INSCPC}|${INSCPC})\\s*:?\\s*(?:de|entre)\\s+${DATA2}\\s*(?:at[eé]|ao|a|e|,|e\\s+at[eé])\\s+`, 'gi'),
    1,
    220,
  );

  if (resultados.length === 0) return null;
  const futuras = resultados.filter((r) => r.ts >= agora - 86_400_000);
  if (futuras.length === 0) return 'EXPIRADA';
  const melhorPrio = Math.max(...futuras.map((r) => r.prio));
  const candidatas = futuras.filter((r) => r.prio === melhorPrio).sort((a, b) => b.ts - a.ts);
  const escolhida = candidatas[0];
  if (!escolhida) return null;
  return escolhida.iso;
}

function slugDaUrl(url: string): string {
  const ultimo = url.split('/').filter(Boolean).pop() ?? '';
  return ultimo
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
}

function classificarMinC(titulo: string): { categorias: string[]; principal: string | null; segmentos: Segmento[] } {
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

function montarLicitacao(titulo: string, url: string, encerramento: string | null, publicado: string | null): Licitacao | null {
  const link = urlSegura(url);
  if (!link) return null;
  const classificacao = classificarMinC(titulo);
  return {
    id: `mintc-${slugDaUrl(url)}`,
    orgao: ORGAO,
    cnpj: '',
    esfera: 'Federal',
    uf: 'BR',
    municipio: 'Brasil (âmbito nacional)',
    codigoIbge: '',
    objeto: titulo,
    informacaoComplementar: null,
    modalidade: 'Edital de fomento',
    numeroCompra: null,
    numeroControlePncp: null,
    anoCompra: null,
    sequencialCompra: null,
    valorEstimado: null,
    dataPublicacao: publicado,
    dataAberturaProposta: null,
    dataEncerramentoProposta: encerramento,
    link,
    linkPncp: link,
    linkSistemaOrigem: link,
    categorias: classificacao.categorias,
    categoriaPrincipal: classificacao.principal,
    segmentos: classificacao.segmentos,
    situacao: '',
    origem: 'MinC — Ministério da Cultura (gov.br, editais de fomento)',
  };
}

function extractLinks(html: string): Array<{ titulo: string; url: string }> {
  const links: Array<{ titulo: string; url: string }> = [];
  const comTitulo = /<a class="govbr-card-content"[^>]*href="([^"#]+)"[^>]*>[\s\S]*?<span class="titulo">([\s\S]*?)<\/span>[\s\S]*?<\/a>/gi;
  let encontrado: RegExpExecArray | null;
  while ((encontrado = comTitulo.exec(html)) !== null) {
    const url = (encontrado[1] ?? '').replace(/&amp;/g, '&').trim();
    const titulo = limparHtml(encontrado[2] ?? '').trim();
    if (!url || !titulo) continue;
    links.push({ titulo, url });
  }
  return links;
}

export async function coletarMintcLicitacoes(offline = false): Promise<Licitacao[]> {
  if (offline) return lerMintcDoCache();

  const mapa = new Map<string, LinkEdital>();
  try {
    for (const pagina of PAGINAS_EDITAIS) {
      const htmlLista = await obterHtml(pagina.url);
      const links = extractLinks(htmlLista);
      for (const link of links) {
        const existente = mapa.get(link.url);
        if (existente) continue;
        mapa.set(link.url, { ...link, sempreAberto: pagina.sempreAberto });
      }
    }

    if (mapa.size === 0) {
      console.warn('[mintc] listagens sem editais detectadas; mantém cache anterior.');
      return lerMintcDoCache();
    }

    const resultado: Licitacao[] = [];
    const agora = Date.now();
    for (const link of [...mapa.values()].slice(0, MAX_PAGINAS)) {
      try {
        const pagina = await obterHtml(link.url);
        const texte = limparHtml(pagina);
        const encerramento = dataDaPagina(texte);
        const publicadoMatch = texte.match(/Publicado em ((\d{1,2})\/(\d{1,2})\/(\d{4}))/);
        let publicado: string | null = null;
        if (publicadoMatch) {
          const instante = new Date(Number(publicadoMatch[4]), Number(publicadoMatch[3]) - 1, Number(publicadoMatch[2]));
          publicado = `${instante.getFullYear()}-${String(instante.getMonth() + 1).padStart(2, '0')}-${String(
            instante.getDate(),
          ).padStart(2, '0')}T12:00:00-03:00`;
        }

        // Quando a página não expõe o prazo de inscrição (muitas vezes só no PDF anexo),
        // mantemos o edital apenas se a listagem é a de "inscrições abertas" (cartilha oficial).
        // Quando o texto indica prazo já expirado, o edital sai do radar.
        const encerramentoValido = encerramento !== null && encerramento !== 'EXPIRADA' && !estaEncerrada(encerramento, '', agora);
        if (encerramento === 'EXPIRADA') continue;
        if (!encerramentoValido && !link.sempreAberto) continue;

        const item = montarLicitacao(link.titulo, link.url, encerramentoValido ? encerramento : null, publicado);
        if (item) {
          resultado.push(item);
          console.log(`[mintc] ${item.objeto} → ${item.dataEncerramentoProposta ?? 'sem prazo informado'} (${link.url})`);
        }
      } catch (e) {
        const mensagem = e instanceof Error ? e.message : String(e);
        console.warn(`[mintc] falha ao ler ${link.url}: ${mensagem}`);
        continue;
      }
    }

    gravarMintcCache(resultado);
    return resultado;
  } catch (e) {
    const mensagem = e instanceof Error ? e.message : String(e);
    console.warn(`[mintc] falha geral (${mensagem}); usa cache se existir.`);
    return lerMintcDoCache();
  }
}

function gravarMintcCache(lista: Licitacao[]): void {
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(CACHE_ARQUIVO, `${JSON.stringify({ geradoEm: new Date().toISOString(), itens: lista }, null, 2)}\n`, 'utf8');
}

export function lerMintcDoCache(): Licitacao[] {
  try {
    if (!existsSync(CACHE_ARQUIVO)) return [];
    const bruto = JSON.parse(readFileSync(CACHE_ARQUIVO, 'utf8')) as { itens?: Licitacao[] };
    return Array.isArray(bruto.itens) ? bruto.itens : [];
  } catch {
    return [];
  }
}

export const MINC_CACHE_ARQUIVO = CACHE_ARQUIVO;