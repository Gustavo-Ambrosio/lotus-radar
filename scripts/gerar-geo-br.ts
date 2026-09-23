import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { readFileSync } from 'node:fs';

const URL_IBGE = 'https://servicodados.ibge.gov.br/api/v1/localidades/municipios';
const GEO_BASE = 'https://raw.githubusercontent.com/tbrugz/geodata-br/master/geojson/geojs-XX-mun.json';
const CACHE_DIR = new URL('../.cache/geo/', import.meta.url);
const CACHE_IBGE = new URL('brasil-municipios-ibge.json', CACHE_DIR);
const SAIDA = new URL('../src/lib/municipios-br.ts', import.meta.url);
const SAIDA_JSON = new URL('../public/dados/municipios.json', import.meta.url);

const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS',
  'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC',
  'SP', 'SE', 'TO',
];

const CODIGO_UF: Record<string, string> = {
  RO: '11', AC: '12', AM: '13', RR: '14', PA: '15', AP: '16', TO: '17',
  MA: '21', PI: '22', CE: '23', RN: '24', PB: '25', PE: '26', AL: '27',
  SE: '28', BA: '29', MG: '31', ES: '32', RJ: '33', SP: '35', PR: '41',
  SC: '42', RS: '43', MS: '50', MT: '51', GO: '52', DF: '53',
};

// Municípios criados após a malha do geodata-br (falta no GeoJSON). Coordenadas
// aproximadas da sede (geocodificação via Nominatim/OSM) — fonte livre e aberta.
const COORDENADAS_FALTA: Record<string, { lat: number; lng: number }> = {
  '1504752': { lat: -2.6822, lng: -54.6427 }, // Mojuí dos Campos (PA)
  '2206720': { lat: -5.3513, lng: -42.8153 }, // Nazária (PI)
  '4212650': { lat: -28.3846, lng: -48.8658 }, // Pescaria Brava (SC)
  '4220000': { lat: -28.8236, lng: -49.2242 }, // Balneário Rincão (SC)
  '4314548': { lat: -29.0977, lng: -51.4498 }, // Pinto Bandeira (RS)
  '5006275': { lat: -19.0219, lng: -53.0123 }, // Paraíso das Águas (MS)
  '5101837': { lat: -13.5081, lng: -55.1526 }, // Boa Esperança do Norte (MT)
};

const UF_PELO_CODIGO: Record<string, string> = {
  '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA', '16': 'AP', '17': 'TO',
  '21': 'MA', '22': 'PI', '23': 'CE', '24': 'RN', '25': 'PB', '26': 'PE', '27': 'AL',
  '28': 'SE', '29': 'BA', '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP', '41': 'PR',
  '42': 'SC', '43': 'RS', '50': 'MS', '51': 'MT', '52': 'GO', '53': 'DF',
};

interface MunicipioIbge {
  id?: unknown;
  nome?: unknown;
  microrregiao?: { mesorregiao?: { UF?: { sigla?: string } } };
}

interface PropriedadesFeature {
  id?: unknown;
  name?: unknown;
}

interface GeometriaGeoJson {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: number[][][] | number[][][][];
}

interface FeatureGeoJson {
  id?: unknown;
  properties?: PropriedadesFeature;
  geometry?: GeometriaGeoJson;
}

type ColecaoGeoJson = { features: FeatureGeoJson[] };

async function obterIbge(): Promise<MunicipioIbge[]> {
  if (existsSync(CACHE_IBGE)) {
    return JSON.parse(readFileSync(CACHE_IBGE, 'utf8')) as MunicipioIbge[];
  }
  const resposta = await fetch(URL_IBGE, { headers: { accept: 'application/json' } });
  if (!resposta.ok) throw new Error(`IBGE falhou: HTTP ${resposta.status}`);
  const dados = (await resposta.json()) as MunicipioIbge[];
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(CACHE_IBGE, JSON.stringify(dados));
  return dados;
}

async function obterGeoJson(uf: string): Promise<ColecaoGeoJson> {
  const codigo = CODIGO_UF[uf];
  const arquivo = new URL(`geojs-${codigo}-mun.geojson`, CACHE_DIR);
  if (existsSync(arquivo)) {
    return JSON.parse(readFileSync(arquivo, 'utf8')) as ColecaoGeoJson;
  }
  const url = GEO_BASE.replace('XX', codigo ?? '');
  const resposta = await fetch(url, { headers: { accept: 'application/json' } });
  if (!resposta.ok) throw new Error(`${uf} falhou: HTTP ${resposta.status}`);
  const dados = (await resposta.json()) as ColecaoGeoJson;
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(arquivo, JSON.stringify(dados));
  return dados;
}

function areaEcentro(poligono: number[][][]): { area: number; lat: number; lng: number } {
  let area = 0;
  let lat = 0;
  let lng = 0;
  const anelExterior = poligono[0] ?? [];
  for (let i = 0; i < anelExterior.length - 1; i += 1) {
    const p1 = anelExterior[i] ?? [];
    const p2 = anelExterior[i + 1] ?? [];
    const x1 = p1[0] ?? 0;
    const y1 = p1[1] ?? 0;
    const x2 = p2[0] ?? 0;
    const y2 = p2[1] ?? 0;
    const a = x1 * y2 - x2 * y1;
    area += a;
    lng += (x1 + x2) * a;
    lat += (y1 + y2) * a;
  }
  area /= 2;
  if (area === 0) {
    const meio = anelExterior[Math.floor(anelExterior.length / 2)] ?? [];
    return { area: 0, lat: meio[1] ?? 0, lng: meio[0] ?? 0 };
  }
  return { area, lat: lat / (6 * area), lng: lng / (6 * area) };
}

function centroDe(feature: FeatureGeoJson): { lat: number; lng: number } | null {
  const geometria = feature.geometry;
  if (!geometria) return null;
  if (geometria.type === 'Polygon') return areaEcentro(geometria.coordinates as number[][][]);
  let melhor: { area: number; lat: number; lng: number } | null = null;
  for (const poligono of geometria.coordinates as number[][][][]) {
    const c = areaEcentro(poligono as number[][][]);
    if (melhor === null || c.area > melhor.area) melhor = c;
  }
  return melhor ?? null;
}

async function principal(): Promise<void> {
  const municipiosIbge = await obterIbge();
  const porIdIbge = new Map<string, MunicipioIbge>();
  for (const m of municipiosIbge) {
    const id = String(m.id ?? '');
    if (id) porIdIbge.set(id, m);
  }

  const coordenadas = new Map<string, { lat: number; lng: number }>();
  for (const uf of UFS) {
    const colecao = await obterGeoJson(uf);
    let contados = 0;
    for (const feature of colecao.features) {
      const id = String(feature.properties?.id ?? feature.id ?? '');
      if (!id) continue;
      const centro = centroDe(feature);
      if (!centro) continue;
      coordenadas.set(id, { lat: centro.lat, lng: centro.lng });
      contados += 1;
    }
    console.log(`[geo] ${uf}: ${contados} municípios com coordenadas`);
  }

  const municipios: Array<{ codigoIbge: string; uf: string; nome: string; lat: number; lng: number }> = [];
  for (const m of municipiosIbge) {
    const codigoIbge = String(m.id ?? '');
    const nome = String(m.nome ?? '').trim();
    const uf =
      String(m.microrregiao?.mesorregiao?.UF?.sigla ?? '').toUpperCase() ||
      UF_PELO_CODIGO[codigoIbge.slice(0, 2)] ||
      '';
    if (!codigoIbge || !nome || !uf) continue;
    const coord = coordenadas.get(codigoIbge) ?? COORDENADAS_FALTA[codigoIbge];
    if (!coord) continue;
    municipios.push({ codigoIbge, uf, nome, lat: coord.lat, lng: coord.lng });
  }

  const semCoordenadas = porIdIbge.size - municipios.length;
  if (semCoordenadas > 0) {
    console.warn(`[geo] ATENÇÃO: ${semCoordenadas} municípios do IBGE sem coordenadas no GeoJSON.`);
  }

  municipios.sort((a, b) => (a.uf === b.uf ? a.nome.localeCompare(b.nome, 'pt-BR') : a.uf.localeCompare(b.uf)));

  // Coordenadas arredondadas para 2 casas (~1 km): suficiente para o radar de distância e
  // reduz o peso dos dados embutidos no bundle.
  const arredondados = municipios.map((m) => ({
    ...m,
    lat: Number(m.lat.toFixed(2)),
    lng: Number(m.lng.toFixed(2)),
  }));

  const linhas = arredondados
    .map((m) => {
      const nome = m.nome.replace(/'/g, "\\'");
      return `  { codigoIbge: '${m.codigoIbge}', uf: '${m.uf}', nome: '${nome}', lat: ${m.lat}, lng: ${m.lng} },`;
    })
    .join('\n');

  const conteudo = `// Gerado automaticamente por scripts/gerar-geo-br.ts — não editar manualmente.
// Fonte: lista oficial de municípios (IBGE) + coordenadas aproximadas do centro do
// polígono (GeoJSON do IBGE via tbrugz/geodata-br), para os 27 estados do Brasil.

export interface MunicipioBrasil {
  codigoIbge: string;
  uf: string;
  nome: string;
  lat: number;
  lng: number;
}

export const MUNICIPIOS_BR: ReadonlyArray<MunicipioBrasil> = [
${linhas}
];
`;

  writeFileSync(SAIDA, conteudo);
  console.log(`OK: ${municipios.length} municípios → ${SAIDA.pathname}`);

  const tuplas = arredondados.map((m) => [m.codigoIbge, m.uf, m.nome, m.lat, m.lng]);
  // JSON puro (sem comentários) — precisa ser válido para response.json().
  const corpoJson = `[
${tuplas.map((t) => `  ${JSON.stringify(t)}`).join(',\n')}
]
`;
  writeFileSync(SAIDA_JSON, corpoJson);
  console.log(`OK: ${tuplas.length} municípios → ${SAIDA_JSON.pathname}`);
}

principal().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});