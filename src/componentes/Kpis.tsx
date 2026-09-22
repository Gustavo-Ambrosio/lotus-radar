import { corCategoria, rotuloCategoria } from '../lib/categorias';
import type { Licitacao } from '../lib/tipos';
import { formatarMoeda, diasRestantes } from '../lib/formato';

interface Props {
  licitacoes: Licitacao[];
  truncado: boolean;
}

export function Kpis({ licitacoes, truncado }: Props) {
  const total = licitacoes.length;

  const urgentes = licitacoes.filter((l) => {
    const dias = diasRestantes(l.dataEncerramentoProposta);
    return dias !== null && dias >= 0 && dias <= 7;
  }).length;

  const comValor = licitacoes.filter((l) => l.valorEstimado !== null);
  const valorTotal = comValor.reduce((soma, l) => soma + (l.valorEstimado ?? 0), 0);

  const municipios = new Set(licitacoes.map((l) => l.municipio)).size;

  const porCategoria = new Map<string, number>();
  for (const l of licitacoes) {
    porCategoria.set(l.categoriaPrincipal, (porCategoria.get(l.categoriaPrincipal) ?? 0) + 1);
  }
  const principal = [...porCategoria.entries()].sort((a, b) => b[1] - a[1])[0];

  return (
    <section className="kpis" aria-label="Indicadores">
      <div className="kpi">
        <p className="kpi__rotulo">Oportunidades abertas</p>
        <p className="kpi__valor">{total.toLocaleString('pt-BR')}</p>
        <p className="kpi__nota">{truncado ? 'Coleta parcial nesta atualização' : 'Com inscrição em aberto'}</p>
      </div>
      <div className="kpi">
        <p className="kpi__rotulo">Encerram em 7 dias</p>
        <p className="kpi__valor kpi__valor--alerta">{urgentes.toLocaleString('pt-BR')}</p>
        <p className="kpi__nota">Prioridade de análise</p>
      </div>
      <div className="kpi">
        <p className="kpi__rotulo">Valor estimado somado</p>
        <p className="kpi__valor kpi__valor--compacto">{formatarMoeda(valorTotal)}</p>
        <p className="kpi__nota">
          {comValor.length} de {total} com valor informado
        </p>
      </div>
      <div className="kpi">
        <p className="kpi__rotulo">Municípios atendidos</p>
        <p className="kpi__valor">{municipios.toLocaleString('pt-BR')}</p>
        <p className="kpi__nota">De 399 municípios do Paraná</p>
      </div>
      <div className="kpi">
        <p className="kpi__rotulo">Categoria recorrente</p>
        <p className="kpi__valor kpi__valor--rotulo">
          {principal ? (
            <span style={{ color: corCategoria(principal[0]) }}>{rotuloCategoria(principal[0])}</span>
          ) : (
            '—'
          )}
        </p>
        <p className="kpi__nota">{principal ? `${principal[1]} oportunidades` : 'Sem dados'}</p>
      </div>
    </section>
  );
}