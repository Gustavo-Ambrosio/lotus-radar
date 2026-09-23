import { formatarData, formatarMoeda } from './formato';
import { rotuloCategoria, rotuloSegmento } from './segmentos';
import type { Licitacao } from './tipos';

function escaparsCsv(valor: string | null | undefined): string {
  const texto = (valor ?? '').replace(/\s+/g, ' ').trim();
  return /[";\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export function licitacoesParaCsv(lista: Licitacao[]): string {
  const cabecalho = [
    'Objeto',
    'Órgão',
    'Município',
    'UF',
    'Esfera',
    'Modalidade',
    'Categorias',
    'Segmentos',
    'Valor estimado',
    'Data de publicação',
    'Abertura das propostas',
    'Encerramento das propostas',
    'Identificação',
    'Link PNCP',
  ].join(';');

  const linhas = lista.map((l) =>
    [
      escaparsCsv(l.objeto),
      escaparsCsv(l.orgao),
      escaparsCsv(l.municipio),
      escaparsCsv(l.uf),
      escaparsCsv(l.esfera),
      escaparsCsv(l.modalidade),
      escaparsCsv(l.categorias.map(rotuloCategoria).join(', ')),
      escaparsCsv(l.segmentos.map(rotuloSegmento).join(', ')),
      l.valorEstimado === null ? 'Não informado' : formatarMoeda(l.valorEstimado),
      formatarData(l.dataPublicacao),
      formatarData(l.dataAberturaProposta),
      formatarData(l.dataEncerramentoProposta),
      escaparsCsv(l.numeroControlePncp ?? l.numeroCompra ?? l.id),
      escaparsCsv(l.linkPncp),
    ].join(';'),
  );

  return `\uFEFF${[cabecalho, ...linhas].join('\r\n')}`;
}

export function baixarArquivo(nome: string, conteudo: string, tipo: string): void {
  const blob = new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const ancora = document.createElement('a');
  ancora.href = url;
  ancora.download = nome;
  document.body.appendChild(ancora);
  ancora.click();
  ancora.remove();
  URL.revokeObjectURL(url);
}