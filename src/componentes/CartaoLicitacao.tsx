import { corCategoria, rotuloCategoria } from '../lib/categorias';
import {
  diasRestantes,
  formatarData,
  formatarMoeda,
  formatarPeriodo,
  nivelPrazo,
  rotuloPrazo,
} from '../lib/formato';
import { urlSegura } from '../lib/seguranca';
import type { Licitacao } from '../lib/tipos';

interface Props {
  licitacao: Licitacao;
}

export function CartaoLicitacao({ licitacao }: Props) {
  const dias = diasRestantes(licitacao.dataEncerramentoProposta);
  const nivel = nivelPrazo(dias);
  const identificacao =
    licitacao.numeroControlePncp || licitacao.numeroCompra || `ID ${licitacao.id}`;
  const cor = corCategoria(licitacao.categoriaPrincipal);

  const linkPncp = urlSegura(licitacao.linkPncp || licitacao.link);
  const linkOrigem = urlSegura(licitacao.linkSistemaOrigem);

  return (
    <article className="cartao">
      <header className="cartao__topo">
        <div className="cartao__selos">
          <span
            className="badge badge--categoria"
            style={{
              color: cor,
              background: `${cor}1f`,
              borderColor: `${cor}40`,
            }}
          >
            {rotuloCategoria(licitacao.categoriaPrincipal)}
          </span>
          <span className="badge">{licitacao.esfera}</span>
          <span className="badge">{licitacao.modalidade}</span>
        </div>
        <span className={`prazo prazo--${nivel}`}>{rotuloPrazo(dias)}</span>
      </header>

      <h3 className="cartao__objeto">{licitacao.objeto}</h3>

      <p className="inscricao">
        <span className="inscricao__rotulo">Período de inscrição</span>
        <strong className="inscricao__datas">
          {formatarPeriodo(licitacao.dataAberturaProposta, licitacao.dataEncerramentoProposta)}
        </strong>
        <span className="inscricao__nota">
          {dias !== null && dias >= 0 ? `${dias} dia(s) restante(s)` : 'encerrada'}
        </span>
      </p>

      <dl className="cartao__dados">
        <div>
          <dt>Órgão</dt>
          <dd>
            {licitacao.orgao}
            {licitacao.cnpj ? <span className="cartao__dados-cnpj">{licitacao.cnpj}</span> : null}
          </dd>
        </div>
        <div>
          <dt>Município</dt>
          <dd>{licitacao.municipio}</dd>
        </div>
        <div>
          <dt>Identificação</dt>
          <dd>{identificacao}</dd>
        </div>
        <div>
          <dt>Publicado</dt>
          <dd>{formatarData(licitacao.dataPublicacao)}</dd>
        </div>
        <div>
          <dt>Valor estimado</dt>
          <dd>{formatarMoeda(licitacao.valorEstimado)}</dd>
        </div>
      </dl>

      {licitacao.informacaoComplementar && (
        <details className="cartao__complemento">
          <summary>Informações complementares</summary>
          <p>{licitacao.informacaoComplementar}</p>
        </details>
      )}

      <footer className="cartao__rodape">
        <div className="cartao__rotulos">
          {licitacao.categorias
            .filter((c) => c !== licitacao.categoriaPrincipal)
            .slice(0, 4)
            .map((c) => (
              <span key={c} className="badge badge--fino">
                {rotuloCategoria(c)}
              </span>
            ))}
        </div>
        <div className="cartao__links">
          {linkPncp && (
            <a
              className="botao-link botao-link--primario"
              href={linkPncp}
              target="_blank"
              rel="noopener noreferrer"
            >
              Acessar edital
              <span className="botao-link__seta">↗</span>
            </a>
          )}
          {linkOrigem && (
            <a
              className="botao-link"
              href={linkOrigem}
              target="_blank"
              rel="noopener noreferrer"
            >
              Sistema de origem
              <span className="botao-link__seta">↗</span>
            </a>
          )}
        </div>
      </footer>
    </article>
  );
}