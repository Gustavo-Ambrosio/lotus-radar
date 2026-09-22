import { CATEGORIAS } from './categorias';
import { CATEGORIAS_TECNOLOGIA } from './segmentos/tecnologia';
import type { Categoria } from './categorias';
import type { Licitacao, Segmento } from './tipos';

const REGISTRO: Categoria[] = [...CATEGORIAS, ...CATEGORIAS_TECNOLOGIA];

export function rotuloCategoria(id: string): string {
  return REGISTRO.find((c) => c.id === id)?.label ?? id;
}

export function corCategoria(id: string): string {
  return REGISTRO.find((c) => c.id === id)?.cor ?? '#6b7280';
}

export function categoriasDoSegmento(segmento: Segmento): Categoria[] {
  return segmento === 'tecnologia' ? CATEGORIAS_TECNOLOGIA : CATEGORIAS;
}

export function principalDoSegmento(licitacao: Licitacao, segmento: Segmento): string | null {
  const ids = new Set(categoriasDoSegmento(segmento).map((c) => c.id));
  return licitacao.categorias.find((c) => ids.has(c)) ?? null;
}

export function rotuloSegmento(segmento: Segmento): string {
  return segmento === 'tecnologia' ? 'Tecnologia' : 'Cultural';
}