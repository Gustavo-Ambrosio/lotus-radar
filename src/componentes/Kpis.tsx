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
        <div className="kpi__rotulo">Editais abertos</div>
        <div className="kpi__valor">{total.toLocaleString('pt-BR')}</div>
        <div className="kpi__nota">
          {truncado ? 'Coleta parcial nesta atualização' : 'Todas as inscrições abertas'}
        </div>
      </div>
      <div className="kpi">
        <div className="kpi__rotulo">Encerram em até 7 dias</div>
        <div className="kpi__valor">{urgentes.toLocaleString('pt-BR')}</div>
        <div className="kpi__nota">Prioridade de análise</div>
      </div>
      <div className="kpi">
        <div className="kpi__rotulo">Valor estimado somado</div>
        <div className="kpi__valor" style={{ fontSize: '1.35rem' }}>
          {formatarMoeda(valorTotal)}
        </div>
        <div className="kpi__nota">
          {comValor.length} de {total} com valor informado
        </div>
      </div>
      <div className="kpi">
        <div className="kpi__rotulo">Municípios atendidos</div>
        <div className="kpi__valor">{municipios.toLocaleString('pt-BR')}</div>
        <div className="kpi__nota">Do total de 399 do Paraná</div>
      </div>
      <div className="kpi">
        <div className="kpi__rotulo">Categoria predominante</div>
        <div className="kpi__valor" style={{ fontSize: '1.15rem' }}>
          {principal ? (
            <span style={{ color: corCategoria(principal[0]) }}>{rotuloCategoria(principal[0])}</span>
          ) : (
            '—'
          )}
        </div>
        <div className="kpi__nota">{principal ? `${principal[1]} editais` : 'Sem dados'}</div>
      </div>
    </section>
  );
}
