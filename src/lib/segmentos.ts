import { CATEGORIAS } from './categorias';
import { CATEGORIAS_TECNOLOGIA } from './segmentos/tecnologia';
import { normalizarTexto } from './texto';
import type { Categoria } from './categorias';
import type { Licitacao, Segmento } from './tipos';

type Restricao = { id: string; label: string; cor: string };

const REGISTO: Restricao[] = [...CATEGORIAS, ...CATEGORIAS_TECNOLOGIA];

export function rotuloCategoria(id: string): string {
  return REGISTO.find((c) => c.id === id)?.label ?? id;
}

export function corCategoria(id: string): string {
  return REGISTO.find((c) => c.id === id)?.cor ?? '#6b7280';
}

export function categoriasDoSegmento(segmento: Segmento): Categoria[] {
  return segmento === 'tecnologia' ? CATEGORIAS_TECNOLOGIA : CATEGORIAS;
}

export function principalDoSegmento(licitacao: Licitacao, segmento: Segmento): string | null {
  const ids = new Set(categoriasDoSegmento(segmento).map((c) => c.id));
  return licitacao.categorias.find((c) => ids.has(c)) ?? null;
}

/***
 * Sinais culturais de leitura direta (nao exigem ancora): indicam que o objeto
 * e genuinamente cultural mesmo quando tambem toca palavras de tecnologia.
 */
const CULTURA_LEITURA_DIRETA = [
  'livro', 'livro didatic', 'biblioteci', 'bibliograf',
  'instrumento musical', 'instrumentos musicais', 'atril ', 'partitura',
  'banda musical', 'banda de musica', 'orquestr', 'coral ', 'corais',
  'teatr', 'espetacul', 'show musical', 'danc', 'ballet', 'festival de musica',
  'festival cultura', 'semana cultural', 'acervo', 'patrimonio', 'museu',
  'obra de arte', 'exposicao de arte', 'arte educacao', 'artes visuais',
  'artesanat', 'sarau', 'literatura', 'obra literari', 'leitura publica',
  'mediacao de leitura', 'contacao de historia', 'estatua', 'escultur',
  'equipamento de som', 'equipamento de audio', 'sonorizac',
  'producao musical', 'apresentacao musical',
];

/***
 * Sinais fortes de tecnologia que sobrepoem a classificacao generica:
 * com um deles no texto, o objeto e tratado como tecnologia.
 */
const TECNOLOGIA_PRECEDENTE = [
  'software', 'desenvolvimento de software', 'desenvolvimento de sistema',
  'desenvolvimento de aplicativo', 'aplicativo move', 'aplicativo web',
  'sistema informatizado', 'sistema web', 'sistema de gestao',
  'portal web', 'pagina web', 'programac de sistema', 'programador',
  'manutencao de software', 'manutencao evolutiva',
  'infraestrutura de ti', 'infraestrutura de rede', 'servidor',
  'datacenter', 'centro de dados', 'cabeamento estruturado',
  'rede de computador', 'rede local', 'rede wan', 'storage',
  'computacao em nuvem', 'nuvem', 'cloud', 'backup', 'virtualizac',
  'firewall', 'seguranca da informacao', 'seguranca cibernetic',
  'teste de software', 'testes de software', 'qualidade de software',
  'licenca de software', 'licencas de software', 'informatica',
  'tecnologia da informacao', 'suporte tecnico', 'help desk',
];

/***
 * Resolve a que aba uma licitacao pertence de forma EXCLUSIVA:
 * 1. Leitura direta de cultura vence (ex.: banda + som -> Cultura);
 * 2. Senao, precedente forte de tecnologia vence (ex.: software -> Tecnologia);
 * 3. Senao, um unico segmento atribuido decide;
 * 4. Em caso de dupla sem sinal direto, retorna null (nao repete nas duas abas).
 */
export function resolverSegmentoExclusivo(licitacao: Pick<Licitacao, 'objeto' | 'segmentos'>): Segmento | null {
  const texto = normalizarTexto(licitacao.objeto);
  if (!texto) return null;

  const temCulturaDireta = CULTURA_LEITURA_DIRETA.some((palavra) => {
    const alvo = normalizarTexto(palavra);
    if (!alvo) return false;
    const escapado = alvo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^| )${escapado}`).test(texto);
  });
  if (temCulturaDireta) return 'cultura';

  const temTecnologiaPrecedente = TECNOLOGIA_PRECEDENTE.some((palavra) => {
    const alvo = normalizarTexto(palavra);
    if (!alvo) return false;
    const escapado = alvo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^| )${escapado}`).test(texto);
  });
  if (temTecnologiaPrecedente) return 'tecnologia';

  if (licitacao.segmentos.length === 1) return licitacao.segmentos[0] ?? null;
  return null;
}

export function ehDoSegmento(licitacao: Pick<Licitacao, 'objeto' | 'segmentos'>, segmento: Segmento): boolean {
  return resolverSegmentoExclusivo(licitacao) === segmento;
}

export function rotuloSegmento(segmento: Segmento): string {
  return segmento === 'tecnologia' ? 'Tecnologia' : 'Cultura';
}