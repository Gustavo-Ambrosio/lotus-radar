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
      'apresentacao musical', 'apresentacoes musicais', 'reggae', 'ska ', 'mpb', 'samba',
      'pagode', 'festival de musica', 'dupla sertaneja',
    ],
  },
  {
    id: 'musica-eletronica',
    label: 'Música eletrônica',
    cor: '#8b5cf6',
    palavras: [
      'musica eletronica', 'eletronic dance', 'electronic dance', 'musica eletronica music',
      'edm ', 'psytrance', 'psytranc', 'darkpsy', 'dark psy', 'trance', 'dubstep',
      'techno', 'house music', 'rave ', 'festival de musica eletronica',
      'evento de musica eletronica', 'dj set', 'palco eletronico', 'som eletronico',
    ],
  },
  {
    id: 'artes-cenicas',
    label: 'Artes cênicas (teatro, dança, circo)',
    cor: '#db2777',
    palavras: [
      'teatr', 'danc', 'circo', 'circense', 'espetac', 'dramaturg', 'coreograf', 'ballet',
      'mimica', 'teatro de bonec', 'performance artistic', 'artes cenic',
      'stand up', 'magica', 'ilusionism', 'figurino', 'festival de teatro',
      'mostra de teatro', 'montagem teatral', 'grupo teatral', 'encenac',
    ],
  },
  {
    id: 'audiovisual',
    label: 'Audiovisual e cinema',
    cor: '#0ea5e9',
    palavras: [
      'audiovisual', 'cinem', 'film', 'documentari', 'curta metrag', 'longa metrag',
      'producao de video', 'producao audiovisual', 'producao cultural de audiovisual',
      'producao de conteudo audiovisual', 'produtora audiovisual',
      'equipamento audiovisual', 'streaming', 'animac', 'cinegraf',
      'sala de cinema', 'festival de cinema', 'mostra de cinema', 'cineclub',
      'producao cinematografic', 'videoclipe', 'clipe musical', 'cinemadeatro',
      'trilha sonora', 'musica e audiovisual', 'audiovisual e musica', 'jornalistico audiovisual',
    ],
  },
  {
    id: 'artes-visuais',
    label: 'Artes visuais',
    cor: '#f59e0b',
    palavras: [
      'artes visuais', 'artes plastic', 'exposic', 'fotograf', 'pintura artistic', 'escultur',
      'grafite', 'mural artistic', 'instalacao artistic', 'galeria de arte', 'gravur', 'ilustrac',
      'design grafic', 'ceramic', 'ceramist', 'xilogravur', 'ensaio fotografico',
      'fotografia artistic', 'exposicao fotografica', 'sala de exposicao',
    ],
  },
  {
    id: 'experimental',
    label: 'Experimental e arte digital',
    cor: '#0891b2',
    palavras: [
      'musica experimental', 'arte experimental', 'artes experimentais', 'performance experimental',
      'som experimental', 'composicao experimental', 'cinema experimental', 'videoarte',
      'video arte', 'arte sonora', 'sound art', 'tecnoarte', 'arte digital', 'artes digitais',
      'arte tecnologica',
    ],
  },
  {
    id: 'eventos-literarios',
    label: 'Eventos literários',
    cor: '#4ade80',
    palavras: [
      'evento literari', 'festival literari', 'semana literaria', 'semana do livro',
      'feira literaria', 'feira do livro', 'bienal do livro', 'salao do livro',
      'sarau', 'sarau literari', 'encontro de escritor', 'encontro literari',
      'mesa redonda literaria', 'clube do livro', 'clube de leitura',
      'contacao de histor', 'hora do conto',
    ],
  },
  {
    id: 'publicacoes-literarias',
    label: 'Publicações literárias',
    cor: '#86efac',
    palavras: [
      'publicacao literari', 'publicacao de livro', 'publicacao de obra', 'publicacao de text',
      'publicacao poetica', 'publicacao e distribuic', 'publicar obra', 'edicao de livro',
      'edicao de obra', 'edicao literari', 'lancamento de livro', 'lancamento de obra',
      'selo editoria', 'editora de livro', 'coedicao', 'publicacao de revist literari',
    ],
  },
  {
    id: 'literatura',
    label: 'Literatura e livro',
    cor: '#16a34a',
    palavras: [
      'literat', 'livro', 'poesi', 'escritor', 'editora', 'quadrinh',
      'historias em quadrinho', 'bibliotec', 'hq ', 'graphic novel', 'romanc',
      'contista', 'coletanea', 'antologia', 'cronica',
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
      'manifestacao popular', 'congada', 'tropeirism', 'feitio', 'maracatu', 'coco de roda',
    ],
  },
  {
    id: 'eventos-festivais',
    label: 'Eventos e festivais',
    cor: '#ea580c',
    palavras: [
      'festiv', 'carnav', 'evento cultur', 'aniversario do municipio',
      'semana cultur', 'mostra cultur', 'programacao cultur', 'feira cultur',
      'festa junina', 'arraia', 'festival gastronomico cultural',
    ],
  },
  {
    id: 'multicultural',
    label: 'Eventos multiculturais',
    cor: '#c026d3',
    palavras: [
      'multicultural', 'multiculturais', 'intercultural', 'interculturais',
      'festa das nacoes', 'encontro de culturas', 'mostra pluricultural',
      'semana multicultural', 'evento de integracao cultural',
    ],
  },
  {
    id: 'premiacoes',
    label: 'Premiações e prêmios',
    cor: '#f59e0b',
    palavras: [
      'premiac', 'premio literari', 'premio de music', 'premio de cinem', 'premio de teatr',
      'premio de danca', 'premio de arte', 'premio municipal de cultur', 'premio de cultur',
      'premio de incentivo', 'concurso de premia', 'premio nacional de', 'premio estadual de',
      'premio de literatura', 'certame', 'concessao de premio', 'condecorac',
    ],
  },
  {
    id: 'fomento',
    label: 'Fomento e editais',
    cor: '#2563eb',
    palavras: [
      'foment', 'edital de foment', 'lei paulo gustavo', 'aldir blanc', 'incentivo cultur',
      'subvenc', 'chamamento public', 'selecao public', 'bolsa',
      'auxilio cultur', 'credito cultur', 'mecenat', 'concurso cultur',
    ],
  },
  {
    id: 'producao-cultural',
    label: 'Produção cultural',
    cor: '#94a3b8',
    palavras: [
      'producao cultur', 'producao artistica', 'producao de evento cultur',
      'producao de espeta', 'producao de shows', 'producao de show', 'producao de festiv',
      'realizac de evento cultur', 'produtor de evento cultur', 'produtora cultural',
      'montagem de evento cultur',
    ],
  },
  {
    id: 'eventos-artisticos',
    label: 'Evento artístico',
    cor: '#fb7185',
    palavras: [
      'evento artistic', 'evento de arte', 'festival artistic', 'mostra artistica',
      'programacao artistica', 'semana artistica', 'espetac artistic', 'eventos artisticos',
    ],
  },
  {
    id: 'eventos-festivais',
    label: 'Eventos e festivais',
    cor: '#ea580c',
    palavras: [
      'festiv', 'carnav', 'evento cultur', 'aniversario do municipio',
      'semana cultur', 'mostra cultur', 'programacao cultur', 'feira cultur',
      'festa junina', 'arraia', 'festival gastronomico cultural',
    ],
  },
  {
    id: 'equipamentos',
    label: 'Equipamentos e espaços culturais',
    cor: '#0d9488',
    palavras: [
      'equipamento cultur', 'centro cultur', 'casa de cultura', 'teatro municipal',
      'cine teatro', 'auditori', 'espaco cultur', 'espaco multius',
      'centro de eventos', 'galpao de eventos',
    ],
  },
  {
    id: 'formacao',
    label: 'Formação e oficinas',
    cor: '#65a30d',
    palavras: [
      'oficin', 'curso', 'formac', 'workshop', 'palestr', 'capacitac',
      'educacao cultural', 'mediacao cultural', 'seminari', 'laboratorio cultural',
      'clube de arte', 'ateliê',
    ],
  },
  {
    id: 'gestao',
    label: 'Gestão cultural',
    cor: '#475569',
    palavras: [
      'gestao cultur', 'consultoria cultur', 'plano de cultura', 'plano municipal de cultura',
      'produtor cultur', 'curador', 'assessoria cultur',
      'sistema municipal de cultura', 'conselho de cultura', 'diagnostico cultur',
    ],
  },
  {
    id: 'cultura-geral',
    label: 'Cultura (geral)',
    cor: '#6b7280',
    palavras: [
      'cultur', 'artist', 'manifestacao cultur', 'projeto cultur', 'linguagem artistic',
      'agente cultur', 'fazedor cultur', 'incentivador cultur',
    ],
  },
];

/** Sinais fortes: sem pelo menos um deles, o objeto não é tratado como cultura. */
const ANCORAS = [
  'cultur', 'artist', 'artes cenic', 'artes visuais', 'artes plastic', 'ceramic',
  'music', 'show', 'banda', 'orquestr', 'coral', 'fanfarra', 'reggae', 'samba',
  'espetac', 'teatr', 'danc', 'circo', 'circense', 'ballet', 'performance artistic',
  'cinem', 'audiovisual', 'film', 'documentari', 'animac', 'cineclub', 'videoclipe',
  'exposic', 'fotograf', 'escultur', 'gravur', 'galeria de arte', 'museu',
  'patrimoni', 'acervo', 'literat', 'livro', 'poesi', 'bibliotec', 'quadrinh',
  'festiv', 'folclor', 'artesanat', 'capoeir', 'fandang', 'carnav',
  'quadrinh', 'sarau', 'oficina cultur', 'edital de foment',
  'lei paulo gustavo', 'aldir blanc', 'premio cultur', 'mostra cultur',
  'manifestacao cultur', 'projeto cultur',
  'psytrance', 'darkpsy', 'trance', 'dj ', 'rave ', 'eletronic dance', 'electronic dance',
  'eletronic music', 'multicultural', 'intercultural', 'pluricultural',
  'videoarte', 'video arte', 'arte sonora', 'arte digital', 'artes digitais', 'tecnoarte',
  'evento literari', 'festival literari', 'semana literaria', 'semana do livro',
  'feira do livro', 'feira literaria', 'bienal do livro', 'salao do livro',
  'encontro de escritor', 'encontro literari', 'clube do livro', 'clube de leitura',
  'contacao de histor', 'hora do conto',
  'publicacao literari', 'publicacao de livro', 'publicacao de obra', 'publicacao de text',
  'edicao de livro', 'edicao de obra', 'edicao literari', 'lancamento de livro',
  'lancamento de obra', 'selo editoria',
  'premiac', 'premio literari', 'premio de music', 'premio de cinem', 'premio de teatr',
  'premio de danca', 'premio de arte', 'premio municipal de cultur', 'premio de cultur',
  'premio de incentivo', 'concurso de premia', 'premio nacional de cultur', 'certame',
  'producao cultur', 'producao artistica', 'producao de evento cultur', 'producao de espeta',
  'producao de show', 'produtora cultural', 'realizac de evento cultur',
  'evento artistic', 'evento de arte', 'festival artistic', 'mostra artistica',
  'programacao artistica', 'semana artistica',
  'trilha sonora', 'producao audiovisual', 'producao de conteudo audiovisual',
  'musica e audiovisual', 'audiovisual e musica',
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
  'circuito eletronico', 'placa eletronica', 'componente eletronico', 'equipamento eletronico',
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
