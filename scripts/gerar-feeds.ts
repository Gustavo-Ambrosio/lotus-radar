import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { formatarMoeda } from '../src/lib/formato';
import { rotuloCategoria, rotuloSegmento } from '../src/lib/segmentos';
import type { Snapshot } from '../src/lib/tipos';

const BASE_URL = 'https://gustavo-ambrosio.github.io/lotus-radar';

function lerSnapshot(): Snapshot {
  const caminho = new URL('../public/dados/licitacoes.json', import.meta.url);
  if (!existsSync(caminho)) {
    throw new Error('Snapshot não encontrado. Rode a coleta antes do build.');
  }
  return JSON.parse(readFileSync(caminho, 'utf8')) as Snapshot;
}

function escaparXml(valor: string): string {
  return valor
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function gerarRss(snapshot: Snapshot): string {
  const itens = snapshot.licitacoes
    .slice()
    .sort((a, b) => new Date(b.dataPublicacao ?? 0).getTime() - new Date(a.dataPublicacao ?? 0).getTime())
    .slice(0, 50)
    .map((lic) => {
      const titulo = `${lic.municipio} — ${lic.objeto}`;
      const descricao =
        `${rotuloSegmento(lic.segmentos[0] ?? 'cultura')} · ${lic.esfera} · ${lic.modalidade} · ` +
        `Valor: ${formatarMoeda(lic.valorEstimado)} — Prazo: ${lic.dataEncerramentoProposta ?? 'não informado'}`;
      const pubDate = lic.dataPublicacao ? new Date(lic.dataPublicacao).toUTCString() : new Date().toUTCString();
      return [
        '    <item>',
        `      <title>${escaparXml(titulo)}</title>`,
        `      <link>${escaparXml(lic.linkPncp || lic.link)}</link>`,
        `      <guid isPermaLink="false">${escaparXml(lic.id)}</guid>`,
        `      <pubDate>${pubDate}</pubDate>`,
        `      <category>${escaparXml(rotuloCategoria(lic.categoriaPrincipal ?? ''))}</category>`,
        `      <description>${escaparXml(descricao)}</description>`,
        '    </item>',
      ].join('\n');
    })
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>Radar Cultural Brasil — novas oportunidades</title>`,
    `    <link>${BASE_URL}/</link>`,
    `    <description>Licitações e editais abertos em cultura e tecnologia em todo o Brasil (atualização diária via PNCP, SIC Cultura e MinC).</description>`,
    `    <atom:link href="${BASE_URL}/feed.rss" rel="self" type="application/rss+xml" />`,
    `    <language>pt-br</language>`,
    `    <lastBuildDate>${new Date(snapshot.geradoEm).toUTCString()}</lastBuildDate>`,
    itens,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');
}

function dataIcs(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

function diaSeguinte(iso: string | null): string {
  const base = dataIcs(iso);
  if (!base) return '';
  const d = new Date(`${base.slice(0, 4)}-${base.slice(4, 6)}-${base.slice(6, 8)}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

function quebrarLinhaIcs(chave: string, valor: string): string {
  const completa = `${chave}:${valor}`;
  if (completa.length <= 75) return completa;
  const partes: string[] = [];
  let restante = completa;
  let continuacao = false;
  while (restante.length > 0) {
    const custo = continuacao ? 74 : 75;
    partes.push(`${continuacao ? ' ' : ''}${restante.slice(0, custo)}`);
    restante = restante.slice(custo);
    continuacao = true;
  }
  return partes.join('\r\n');
}

function gerarIcs(snapshot: Snapshot): string {
  const eventos = snapshot.licitacoes
    .filter((lic) => lic.dataEncerramentoProposta)
    .map((lic) => {
      const fim = dataIcs(lic.dataEncerramentoProposta);
      const sentido = diaSeguinte(lic.dataEncerramentoProposta);
      const uid = lic.id.replace(/[^a-zA-Z0-9]/g, '-');
      const descricao = `${rotuloSegmento(lic.segmentos[0] ?? 'cultura')} · ${lic.esfera} · ${lic.modalidade} · Valor: ${formatarMoeda(lic.valorEstimado)}`;
      const rotuloLocal = lic.uf && lic.uf !== 'BR' ? `${lic.municipio}, ${lic.uf}` : lic.municipio;
      return [
        'BEGIN:VEVENT',
        `UID:${uid}@lotus-radar`,
        `DTSTAMP:${dataIcs(snapshot.geradoEm)}T000000Z`,
        `DTSTART;VALUE=DATE:${fim}`,
        `DTEND;VALUE=DATE:${sentido}`,
        quebrarLinhaIcs('SUMMARY', lic.objeto),
        quebrarLinhaIcs('DESCRIPTION', descricao),
        quebrarLinhaIcs('LOCATION', rotuloLocal),
        quebrarLinhaIcs('URL', lic.linkPncp || lic.link),
        'END:VEVENT',
      ].join('\r\n');
    })
    .join('\r\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Lotus Radar//Lotus Radar PR//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Radar Cultural Paraná',
    eventos,
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}

function principal(): void {
  const snapshot = lerSnapshot();
  const saidaDist = new URL('../dist/', import.meta.url);

  writeFileSync(new URL('feed.rss', saidaDist), gerarRss(snapshot));
  writeFileSync(new URL('calendario.ics', saidaDist), gerarIcs(snapshot));
  console.log(`Feeds gerados: dist/feed.rss e dist/calendario.ics (${snapshot.licitacoes.length} itens)`);
}

principal();