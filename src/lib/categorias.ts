import { normalizarTexto } from './texto';

export interface Categoria {
  id: string;
  label: string;
  cor: string;
  palavras: string[];
}

export const CATEGORIAS: Categoria[] = [
  {
    id: 'musica',
    label: 'Música',
    cor: '#7c3aed',
    palavras: [
      'music', 'show', 'banda', 'orquestr', 'coral', 'cantor', 'cantora', 'concerto',
      'instrumento musical', 'sonorizac', 'fanfarra', 'percuss', 'dj ',
      'apresentacao musical', 'apresentacoes musicais',
    ],
  },
  {
    id: 'artes-cenicas',
    label: 'Artes cênicas (teatro, dança, circo)',
    cor: '#db2777',
    palavras: [
      'teatr', 'danc', 'circo', 'circense', 'espetac', 'dramaturg', 'coreograf', 'ballet',
      'mimica', 'teatro de bonec', 'performance artistic', 'artes cenic',
      'stand up', 'magica', 'ilusionism', 'figurino',
    ],
  },
  {
    id: 'audiovisual',
    label: 'Audiovisual e cinema',
    cor: '#0ea5e9',
    palavras: [
      'audiovisual', 'cinem', 'film', 'documentari', 'curta metrag', 'longa metrag',
      'producao de video', 'equipamento audiovisual', 'streaming', 'animac', 'cinegraf',
    ],
  },
  {
    id: 'artes-visuais',
    label: 'Artes visuais',
    cor: '#f59e0b',
    palavras: [
      'artes visuais', 'artes plastic', 'exposic', 'fotograf', 'pintura artistic', 'escultur',
      'grafite', 'mural artistic', 'instalacao artistic', 'galeria de arte', 'gravur', 'ilustrac',
      'design grafic', 'ceramic', 'ceramist', 'xilogravur',
    ],
  },
  {
    id: 'literatura',
    label: 'Literatura e livro',
    cor: '#16a34a',
    palavras: [
      'literat', 'livro', 'poesi', 'escritor', 'editora', 'quadrinh',
      'historias em quadrinho', 'contacao de histor', 'feira do livro', 'sarau',
      'bibliotec',
    ],
  },
  {
    id: 'patrimonio',
    label: 'Patrimônio e memória',
    cor: '#b45309',
    palavras: [
      'patrimoni', 'museu', 'acervo', 'restaur', 'arqueolog', 'tombament',
      'bem cultural', 'sitio histor', 'arquivo histor', 'memoria cultur',
    ],
  },
  {
    id: 'cultura-popular',
    label: 'Cultura popular e tradicional',
    cor: '#dc2626',
    palavras: [
      'cultura popular', 'folclor', 'artesanat', 'capoeir', 'fandang', 'religiosidade',
      'comunidade tradicional', 'indigena', 'quilombol', 'afro', 'etnia',
      'manifestacao popular', 'congada', 'tropeirism', 'feitio',
    ],
  },
  {
    id: 'eventos-festivais',
    label: 'Eventos e festivais',
    cor: '#ea580c',
    palavras: [
      'festiv', 'carnav', 'evento cultur', 'aniversario do municipio',
      'semana cultur', 'mostra cultur', 'programacao cultur', 'feira cultur',
      'festa junina',
    ],
  },
  {
    id: 'fomento',
    label: 'Fomento, editais e prêmios',
    cor: '#2563eb',
    palavras: [
      'foment', 'edital de foment', 'lei paulo gustavo', 'aldir blanc', 'incentivo cultur',
      'premio', 'premiac', 'subvenc', 'chamamento public', 'selecao public', 'bolsa',
      'auxilio cultur', 'credito cultur', 'mecenat', 'concurso cultur',
    ],
  },
  {
    id: 'equipamentos',
    label: 'Equipamentos e espaços culturais',
    cor: '#0d9488',
    palavras: [
      'equipamento cultur', 'centro cultur', 'casa de cultura', 'teatro municipal',
      'cine teatro', 'auditori', 'espaco cultur', 'espaco multius',
      'centro de eventos',
    ],
  },
  {
    id: 'formacao',
    label: 'Formação e oficinas',
    cor: '#65a30d',
    palavras: [
      'oficin', 'curso', 'formac', 'workshop', 'palestr', 'capacitac',
      'educacao cultural', 'mediacao cultural', 'seminari', 'laboratorio cultural',
    ],
  },
  {
    id: 'gestao',
    label: 'Gestão e produção cultural',
    cor: '#475569',
    palavras: [
      'gestao cultur', 'consultoria cultur', 'plano de cultura', 'plano municipal de cultura',
      'produtor cultur', 'producao cultur', 'curador', 'assessoria cultur',
      'sistema municipal de cultura', 'conselho de cultura', 'diagnostico cultur',
    ],
  },
  {
    id: 'cultura-geral',
    label: 'Cultura (geral)',
    cor: '#6b7280',
    palavras: [
      'cultur', 'artist', 'manifestacao cultur', 'projeto cultur', 'linguagem artistic',
      'apresentacao artistic', 'agente cultur', 'fazedor cultur', 'incentivador cultur',
    ],
  },
];

/** Sinais fortes: sem pelo menos um deles, o objeto não é tratado como cultura. */
const ANCORAS = [
  'cultur', 'artist', 'artes cenic', 'artes visuais', 'artes plastic', 'ceramic',
  'music', 'show', 'banda', 'orquestr', 'coral', 'fanfarra',
  'espetac', 'teatr', 'danc', 'circo', 'circense', 'ballet', 'performance artistic',
  'cinem', 'audiovisual', 'film', 'documentari', 'animac',
  'exposic', 'fotograf', 'escultur', 'gravur', 'galeria de arte', 'museu',
  'patrimoni', 'acervo', 'literat', 'livro', 'poesi', 'bibliotec',
  'festiv', 'folclor', 'artesanat', 'capoeir', 'fandang', 'carnav',
  'quadrinh', 'sarau', 'oficina cultur', 'edital de foment',
  'lei paulo gustavo', 'aldir blanc', 'premio cultur', 'mostra cultur',
  'apresentacao artistic', 'manifestacao cultur', 'projeto cultur',
];

/** Veto: se aparecer (substring), o objeto não é considerado cultura. */
const EXCLUSOES = [
  'artes marciais', 'arte marcial',
  'pneu', 'vulcanizac', 'recapagem',
  'generos aliment', 'alimentacao escolar', 'merenda', 'cesta basic',
  'medicament', 'combustivel', 'material de limpeza', 'material de construc',
  'material medico', 'medico hospitalar', 'odontolog',
  'pavimentac', 'terraplanagem', 'coleta de residu', 'coleta de lixo',
  'dedetizac', 'desratizac', 'desentupimento', 'fossa septica', 'hidrojateament',
  'transporte escolar', 'caixa termica', 'grama sintet', 'grama natural',
  'totem', 'toten', 'led', 'lampada', 'luminaria', 'ar condicionado',
  'banda larga', 'banda de rodagem',
  'bens inserviveis', 'bens moveis', 'alienacao de bens', 'patrimonio do municipio',
  'memoria de calculo', 'material grafic', 'material de escritorio', 'informatica',
];

function compilar(palavra: string): RegExp {
  const alvo = normalizarTexto(palavra).trim();
  const escapado = alvo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^| )${escapado}`);
}

const COMPILADAS = CATEGORIAS.map((categoria) => ({
  id: categoria.id,
  regexes: categoria.palavras.map(compilar),
}));

const ANCORAS_COMPILADAS = ANCORAS.map(compilar);
const EXCLUSOES_COMPILADAS = EXCLUSOES.map(compilar);

export interface Classificacao {
  categorias: string[];
  principal: string | null;
}

export function classificar(objeto: string): Classificacao {
  const texto = normalizarTexto(objeto);
  if (!texto) return { categorias: [], principal: null };

  if (EXCLUSOES_COMPILADAS.some((regex) => regex.test(texto))) {
    return { categorias: [], principal: null };
  }

  const temAncora = ANCORAS_COMPILADAS.some((regex) => regex.test(texto));
  if (!temAncora) {
    return { categorias: [], principal: null };
  }

  const encontradas: string[] = [];
  for (const categoria of COMPILADAS) {
    if (categoria.regexes.some((regex) => regex.test(texto))) {
      encontradas.push(categoria.id);
    }
  }

  if (encontradas.length === 0) {
    return { categorias: ['cultura-geral'], principal: 'cultura-geral' };
  }

  return { categorias: encontradas, principal: encontradas[0] ?? null };
}

export function ehCultura(objeto: string): boolean {
  return classificar(objeto).principal !== null;
}

export function rotuloCategoria(id: string): string {
  return CATEGORIAS.find((c) => c.id === id)?.label ?? id;
}

export function corCategoria(id: string): string {
  return CATEGORIAS.find((c) => c.id === id)?.cor ?? '#6b7280';
}
