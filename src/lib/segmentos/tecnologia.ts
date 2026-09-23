import { normalizarTexto } from '../texto';
import type { Categoria } from '../categorias';

export const CATEGORIAS_TECNOLOGIA: Categoria[] = [
  {
    id: 'software',
    label: 'Desenvolvimento de software',
    cor: '#2563eb',
    palavras: [
      'software', 'desenvolvimento de software', 'desenvolvimento de sistema', 'desenvolvim de aplicativo',
      'desenvolvimento web', 'software sob medida', 'aplicativo move', 'aplicativo web',
      'aplicativos move', 'sistema web', 'sistema de gestao', 'sistema de informacao',
      'sistema informatizado', 'sistema integrado', 'plataforma digital', 'portal web',
      'programac de sistemas', 'programador', 'manutencao evolutiva', 'manutencao de software',
      'desenvolvimentode solucao', 'pagina web', 'site instituc',
    ],
  },
  {
    id: 'infraestrutura',
    label: 'Infraestrutura e redes',
    cor: '#0ea5e9',
    palavras: [
      'infraestrutura de ti', 'infraestrutura de tecnologia', 'infraestrutura de rede',
      'infraestrutura de servidor', 'infraestrutura de datacenter',
      'infraestrutura de telecomunicacoes', 'infraestrutura de dados', 'servidor',
      'datacenter', 'centro de dados', 'cabeamento estruturado', 'rede de computador',
      'redes de computador', 'rede local', 'rede wan', 'rede wireless', 'gerencia de rede',
      'gerenciamento de rede', 'manutencao de rede', 'rede de dados', 'rede de voz e dados',
      'monitoramento de rede', 'monitoramento de servidor', 'monitoramento de ativos de ti',
      'administracao de servidor', 'manutencao de servidor', 'operacao de infraestrutura',
      'armazenamento de dados', 'storage', 'computacao em nuvem',
      'nuvem', 'cloud', 'backup', 'virtualizac', 'roteador', 'roteadores', 'switch ',
      'switches', 'access point', 'ponto de acesso de rede', 'no-break', 'cftv',
      'video monitoramento', 'circuito fechado de televisao', 'disco rigido', 'sala-cofre',
      'windows server', 'linux', 'sistema operacional', 'alta disponibilidade',
      'noc ', 'zabbix', 'grafana', 'infraestrutura tolerante a falhas',
    ],
  },
  {
    id: 'qualidade',
    label: 'Qualidade de software',
    cor: '#16a34a',
    palavras: [
      'qualidade de software', 'garantia da qualidade de software', 'controle de qualidade de software',
      'gerencia de qualidade', 'engenharia de qualidade', 'processo de qualidade de software',
      'melhoria continua de processos de software', 'indicadores de qualidade de software',
    ],
  },
  {
    id: 'testes',
    label: 'Testes de software',
    cor: '#d97706',
    palavras: [
      'teste de software', 'testes de software', 'teste automatizado', 'testes automatizados',
      'automacao de teste', 'automacao de testes', 'teste funcional', 'teste de aceitacao',
      'teste de integracao', 'teste de regressao', 'teste de performance', 'teste de carga',
      'teste de stress', 'teste de seguranca de aplicacao', 'plano de teste', 'casos de teste',
      'execucao de teste', 'ciclo de teste',
    ],
  },
  {
    id: 'seguranca',
    label: 'Segurança e firewall',
    cor: '#dc2626',
    palavras: [
      'firewall', 'firewall ngfw', 'ngfw', 'implementacao de firewall', 'seguranca da informacao',
      'seguranca de rede', 'seguranca cibernetic', 'seguranca de perimetro',
      'antivirus', 'antivirus corporativo', 'antivirus corporativa', 'edr ', 'xdr ',
      'protecao de dados', 'protecao de endpoints', 'protecao de servidor',
      'protecao de servidores', 'teste de intrusao', 'pentest', 'controlador de trafego',
      'controle de trafego', 'utm', 'vpn', 'sd-wan', 'gestao de identidade',
      'autenticacao de acesso', 'resposta a incidentes', 'gestao de vulnerabilidades',
      'servicos gerenciados de seguranca', 'servico gerenciado de seguranca',
      'monitoramento de seguranca', 'soc ', 'csirt',
    ],
  },
  {
    id: 'licencas',
    label: 'Licenças de software',
    cor: '#7c3aed',
    palavras: [
      'licenca de software', 'licencas de software', 'licenca de uso', 'licencas de uso',
      'direito de uso de software', 'assinatura de software', 'assinaturas de software',
      'licenciamento de software', 'renovacao de licenca', 'renovacao de assinatura',
      'cessao de direito de uso', 'adquirir licenca', 'licenca anual', 'licenca perpetua',
    ],
  },
  {
    id: 'ti-geral',
    label: 'Tecnologia (geral)',
    cor: '#6b7280',
    palavras: [
      'tecnologia da informacao', 'informatica', 'servicos de ti', 'servicos de tecnologia',
      'tic ', 'transformacao digital', 'governanca de ti', 'suporte de ti',
      'suporte tecnico de informatica', 'suporte tecnico em ti', 'suporte tecnico',
      'servicos tecnicos de informatica', 'servico de informatica', 'servicos de informatica',
      'servicos em informatica', 'help desk', 'service desk', 'central de servicos',
      'atendimento ao usuario', 'outsourcing de ti', 'servicos continuados de ti',
      'equipamento de informatica', 'materiais de informatica', 'consultoria em ti',
      'pecas de computador', 'computadores', 'monitor de computador', 'notebook',
      'impressora', 'material de ti',
    ],
  },
];

/** Sinais fortes: sem um deles, o objeto não é tratado como tecnologia. */
const ANCORAS = [
  'software', 'aplicativ', 'sistema informatizado', 'sistema web', 'sistema de gestao',
  'sistema de informacao', 'servidor', 'datacenter', 'cabeamento estruturado',
  'rede de computador', 'redes de computador', 'storage', 'cloud', 'computacao em nuvem',
  'nuvem', 'backup', 'virtualizac', 'firewall', 'antivirus', 'seguranca da informacao',
  'seguranca cibernetic', 'teste de software', 'testes de software', 'teste automatizado',
  'testes automatizados', 'automacao de teste', 'automacao de testes', 'execucao de teste',
  'execucao de testes', 'plano de teste',
  'qualidade de software', 'licenca de software', 'licencas de software', 'licenciament',
  'informatica', 'tecnologia da informacao', 'desenvolvim de software', 'desenvolvim de sistema',
  'gerencia de rede', 'cftv', 'video monitoramento', 'pentest', 'vpn', 'computador',
  'computadores', 'notebook', 'impressora',
  'suporte tecnico', 'help desk', 'service desk', 'central de servicos',
  'outsourcing', 'servicos continuados', 'atendimento ao usuario',
  'administracao de servidor', 'manutencao de servidor', 'manutencao de rede',
  'monitoramento de rede', 'monitoramento de servidor', 'monitoramento de ativos de ti',
  'rede de dados', 'rede de voz e dados', 'switches', 'roteador', 'roteadores',
  'windows server', 'sistema operacional', 'alta disponibilidade', 'operacao de infraestrutura',
  'firewall ngfw', 'ngfw', 'sd-wan', 'edr ', 'xdr ', 'seguranca de perimetro',
  'gestao de vulnerabilidades', 'servicos gerenciados de seguranca',
  'protecao de servidor', 'protecao de servidores', 'zabbix', 'grafana',
];

/** Veto: se aparecer, o objeto não é considerado tecnologia. */
const EXCLUSOES = [
  'sistema de esgoto', 'sistema de abastecimento de agua', 'sistema de irrigacao',
  'sistema de iluminacao', 'sistema prisional', 'sistema de saude', 'sistema educacional',
  'sistema unico de saude', 'sistema de som', 'sistema de audio', 'sistema de ar condicionado',
  'sistema de freio', 'sistema de direcao', 'sistema de transmissao', 'sistema de carregamento',
  'sistema de climatizacao', 'sistema fotovoltaico', 'sistema de seguranca do trabalho',
  'agua subterranea', 'esgoto sanitario', 'distrito industrial',
  'obras de infraestrutura', 'infraestrutura viaria', 'infraestrutura urbana',
  'infraestrutura rodoviaria', 'infraestrutura de via',
  'servidores publicos', 'servidor publico', 'servidores municipais',
  'servidores da ', 'servidores do ', 'servidores efetivo', 'servidores temporari',
  'servidores comissionad', 'servidores ativos', 'servidores aposentados',
  'servidores inativos', 'dos servidores da', 'dentre os servidores',
  'aos servidores', 'para os servidores', 'demais servidores', 'quadro de servidores',
  'destinados aos servidores', 'uniformes', 'epis destinados', 'agentes comunitarios',
  'agente de controle de endemias', 'instituicao financeira ou cooperativa',
  'folha de pagamento dos servidores',
  'usuario do sus', 'atendimento ao usuario do sus', 'agendamento de consultas',
  'unidade basica de saude',
];

function compilar(palavra: string): RegExp {
  const alvo = normalizarTexto(palavra).trim();
  const escapado = alvo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^| )${escapado}`);
}

const COMPILADAS = CATEGORIAS_TECNOLOGIA.map((categoria) => ({
  id: categoria.id,
  regexes: categoria.palavras.map(compilar),
}));

const ANCORAS_COMPILADAS = ANCORAS.map(compilar);
const EXCLUSOES_COMPILADAS = EXCLUSOES.map(compilar);

const ANCORAS_FORTES = ['software', 'informatica', 'tecnologia da informacao', 'firewall', 'licenca'];

export interface Classificacao {
  categorias: string[];
  principal: string | null;
}

export function classificarTecnologia(objeto: string): Classificacao {
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

  if (encontradas.length > 0) {
    return { categorias: encontradas, principal: encontradas[0] ?? null };
  }

  const sinalForte = ANCORAS_FORTES.some((palavra) => {
    const regex = compilar(palavra);
    return regex.test(texto);
  });

  if (sinalForte) {
    return { categorias: ['ti-geral'], principal: 'ti-geral' };
  }

  return { categorias: [], principal: null };
}

export function ehTecnologia(objeto: string): boolean {
  return classificarTecnologia(objeto).principal !== null;
}

export function rotuloCategoriaTecnologia(id: string): string {
  return CATEGORIAS_TECNOLOGIA.find((c) => c.id === id)?.label ?? id;
}

export function corCategoriaTecnologia(id: string): string {
  return CATEGORIAS_TECNOLOGIA.find((c) => c.id === id)?.cor ?? '#6b7280';
}