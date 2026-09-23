import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { readFileSync } from 'node:fs';

const URL_GEOJSON = 'https://raw.githubusercontent.com/tbrugz/geodata-br/master/geojson/geojs-41-mun.json';
const CACHE_DIR = new URL('../.cache/geo/', import.meta.url);
const CACHE_ARQUIVO = new URL('parana-municipios.geojson', CACHE_DIR);
const SAIDA = new URL('../src/lib/municipios-pr.ts', import.meta.url);

interface PropriedadesMunicipio {
  id?: unknown;
  name?: unknown;
}

interface GeometriaGeoJson {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: number[][][] | number[][][][];
}

interface FeatureGeoJson {
  properties?: PropriedadesMunicipio;
  geometry?: GeometriaGeoJson;
}

type ColecaoGeoJson = { features: FeatureGeoJson[] };

async function obterGeoJson(): Promise<ColecaoGeoJson> {
  if (existsSync(CACHE_ARQUIVO)) {
    return JSON.parse(readFileSync(CACHE_ARQUIVO, 'utf8')) as ColecaoGeoJson;
  }
  const resposta = await fetch(URL_GEOJSON);
  if (!resposta.ok) throw new Error(`Falha ao baixar GeoJSON: HTTP ${resposta.status}`);
  const dados = (await resposta.json()) as ColecaoGeoJson;
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(CACHE_ARQUIVO, JSON.stringify(dados));
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

async function principal(): Promise<void> {
  const colecao = await obterGeoJson();
  const municipios: Array<{ ibge: string; nome: string; lat: number; lng: number }> = [];

  for (const feature of colecao.features) {
    const id = String(feature.properties?.id ?? '');
    const nome = String(feature.properties?.name ?? '').trim();
    const geometria = feature.geometry;
    if (!geometria || id === '') continue;

    if (geometria.type === 'Polygon') {
      municipios.push({ ibge: id, nome, ...areaEcentro(geometria.coordinates as number[][][]) });
    } else if (geometria.type === 'MultiPolygon') {
      let melhor: { area: number; lat: number; lng: number } | null = null;
      for (const poligono of geometria.coordinates as number[][][][]) {
        const c = areaEcentro(poligono as number[][][]);
        if (melhor === null || c.area > melhor.area) melhor = c;
      }
      const centro = melhor ?? { area: 0, lat: -24.5, lng: -51.7 };
      municipios.push({ ibge: id, nome, lat: centro.lat, lng: centro.lng });
    }
  }

  municipios.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  const linhas = municipios
    .map((m) => {
      const nome = m.nome.replace(/'/g, "\\'");
      return `  { nome: '${nome}', lat: ${m.lat.toFixed(5)}, lng: ${m.lng.toFixed(5)} },`;
    })
    .join('\n');

  const conteudo = `// Gerado automaticamente por scripts/gerar-geo-pr.ts — não editar manualmente.
// Coordenadas aproximadas (centro do polígono do município) para o mapa do Paraná.

export interface CoordenadasMunicipio {
  nome: string;
  lat: number;
  lng: number;
}

export const MUNICIPIOS_PR: ReadonlyArray<CoordenadasMunicipio> = [
${linhas}
];
`;

  writeFileSync(SAIDA, conteudo);
  console.log(`OK: ${municipios.length} municípios → ${SAIDA.pathname}`);
}

principal().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});