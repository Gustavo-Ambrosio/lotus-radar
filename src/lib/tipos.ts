export type Esfera = 'Estadual' | 'Municipal' | 'Federal' | 'Distrital' | 'Não informada';

export type Segmento = 'cultura' | 'tecnologia';

export interface Licitacao {
  id: string;
  orgao: string;
  cnpj: string;
  esfera: Esfera;
  uf: string;
  municipio: string;
  codigoIbge: string;
  objeto: string;
  informacaoComplementar: string | null;
  modalidade: string;
  numeroCompra: string | null;
  numeroControlePncp: string | null;
  anoCompra: number | null;
  sequencialCompra: number | null;
  valorEstimado: number | null;
  dataPublicacao: string | null;
  dataAberturaProposta: string | null;
  dataEncerramentoProposta: string | null;
  link: string;
  linkPncp: string;
  linkSistemaOrigem: string | null;
  categorias: string[];
  categoriaPrincipal: string | null;
  segmentos: Segmento[];
  situacao: string;
}

export interface Snapshot {
  geradoEm: string;
  fonte: string;
  uf: string;
  total: number;
  truncado: boolean;
  observacao: string;
  licitacoes: Licitacao[];
}
