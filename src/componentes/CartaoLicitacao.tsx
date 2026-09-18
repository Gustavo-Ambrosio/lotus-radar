import { corCategoria, rotuloCategoria } from '../lib/categorias';
import {
  diasRestantes,
  formatarData,
  formatarMoeda,
  formatarPeriodo,
  nivelPrazo,
  rotuloPrazo,
} from '../lib/formato';
import type { Licitacao } from '../lib/tipos';

interface Props {
  licitacao: Licitacao;
}

export function CartaoLicitacao({ licitacao }: Props) {
  const dias = diasRestantes(licitacao.dataEncerramentoProposta);
  const nivel = nivelPrazo(dias);
  const identificacao =
    licitacao.numeroControlePncp || licitacao.numeroCompra || `ID ${licitacao.id}`;

  return (
    <article className="cartao" style={{ borderLeftColor: corCategoria(licitacao.categoriaPrincipal) }}>
      <div className="cartao__topo">
        <span
          className="badge"
          style={{
            background: `${corCategoria(licitacao.categoriaPrincipal)}1a`,
            color: corCategoria(licitacao.categoriaPrincipal),
          }}
        >
          {rotuloCategoria(licitacao.categoriaPrincipal)}
        </span>
        <span className="badge badge--contorno">{licitacao.esfera}</span>
        <span className="badge badge--contorno">{licitacao.modalidade}</span>
        <span className={`badge badge--prazo prazo--${nivel}`}>{rotuloPrazo(dias)}</span>
      </div>

      <p className="cartao__objeto">{licitacao.objeto}</p>

      <p className="cartao__inscricao">
        <span className="cartao__inscricao-rotulo">Período de inscrição</span>
        <strong>
          {formatarPeriodo(licitacao.dataAberturaProposta, licitacao.dataEncerramentoProposta)}
        </strong>
      </p>

      <div className="cartao__dados">
        <span>
          Órgão: <strong>{licitacao.orgao}</strong>
          {licitacao.cnpj ? ` (${licitacao.cnpj})` : ''}
        </span>
        <span>
          Município: <strong>{licitacao.municipio}</strong>
        </span>
        <span>
          Identificação: <strong>{identificacao}</strong>
        </span>
        <span>
          Publicado: <strong>{formatarData(licitacao.dataPublicacao)}</strong>
        </span>
        <span>
          Valor estimado: <strong>{formatarMoeda(licitacao.valorEstimado)}</strong>
        </span>
      </div>

      {licitacao.informacaoComplementar && (
        <details className="cartao__complemento">
          <summary>Informações complementares</summary>
          <p>{licitacao.informacaoComplementar}</p>
        </details>
      )}

      <div className="cartao__acoes">
        <div className="chips">
          {licitacao.categorias
            .filter((c) => c !== licitacao.categoriaPrincipal)
            .slice(0, 4)
            .map((c) => (
              <span key={c} className="badge badge--contorno">
                {rotuloCategoria(c)}
              </span>
            ))}
        </div>
        <div className="cartao__links">
          <a
            className="link-edital"
            href={licitacao.linkPncp || licitacao.link}
            target="_blank"
            rel="noopener noreferrer"
          >
            Ver no PNCP →
          </a>
          {licitacao.linkSistemaOrigem && (
            <a
              className="link-edital link-edital--secundario"
              href={licitacao.linkSistemaOrigem}
              target="_blank"
              rel="noopener noreferrer"
            >
              Sistema de origem →
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
