import { MUNICIPIOS_BR, type MunicipioBrasil } from './municipios-br';

export interface Coordenadas {
  lat: number;
  lng: number;
}

export const NOME_UF: Readonly<Record<string, string>> = {
  AC: 'Acre',
  AL: 'Alagoas',
  AP: 'Amapá',
  AM: 'Amazonas',
  BA: 'Bahia',
  CE: 'Ceará',
  DF: 'Distrito Federal',
  ES: 'Espírito Santo',
  GO: 'Goiás',
  MA: 'Maranhão',
  MT: 'Mato Grosso',
  MS: 'Mato Grosso do Sul',
  MG: 'Minas Gerais',
  PA: 'Pará',
  PB: 'Paraíba',
  PR: 'Paraná',
  PE: 'Pernambuco',
  PI: 'Piauí',
  RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul',
  RO: 'Rondônia',
  RR: 'Roraima',
  SC: 'Santa Catarina',
  SP: 'São Paulo',
  SE: 'Sergipe',
  TO: 'Tocantins',
};

export const UFS_ORDENADAS: ReadonlyArray<string> = Object.entries(NOME_UF)
  .sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'))
  .map(([sigla]) => sigla);

export function municipiosDoEstado(uf: string): MunicipioBrasil[] {
  const alvo = uf.trim().toUpperCase();
  if (!alvo) return [...MUNICIPIOS_BR];
  return MUNICIPIOS_BR.filter((m) => m.uf === alvo);
}

export function municipioPorCodigoIbge(codigoIbge: string): MunicipioBrasil | null {
  return MUNICIPIOS_BR.find((m) => m.codigoIbge === codigoIbge) ?? null;
}

export function municipioPorNome(nome: string, uf = ''): MunicipioBrasil | null {
  const busca = normalizarMunicipio(nome);
  if (!busca) return null;
  const alvo = uf.trim().toUpperCase();
  return MUNICIPIOS_BR.find(
    (m) => (!alvo || m.uf === alvo) && normalizarMunicipio(m.nome) === busca,
  ) ?? null;
}

export function normalizarMunicipio(valor: string): string {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['`]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function distanciaKm(a: Coordenadas, b: Coordenadas): number {
  const raio = 6371;
  const dLat = (b.lat - a.lat) * (Math.PI / 180);
  const dLng = (b.lng - a.lng) * (Math.PI / 180);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * (Math.PI / 180)) *
      Math.cos(b.lat * (Math.PI / 180)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * raio * Math.asin(Math.sqrt(h));
}

export function coordenadasDeLicitacao(uf: string, municipio: string): Coordenadas | null {
  const m = municipioPorNome(municipio, uf);
  if (!m) return null;
  return { lat: m.lat, lng: m.lng };
}