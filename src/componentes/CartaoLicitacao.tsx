import { useRef, useState } from 'react';
import { corCategoria, categoriasDoSegmento, principalDoSegmento, rotuloCategoria, rotuloSegmento } from '../lib/segmentos';
import {
  diasRestantes,
  formatarData,
  formatarMoeda,
  formatarPeriodo,
  horasRestantes,
  nivelPrazo,
  rotuloPrazo,
  foiPublicadoRecentemente,
} from '../lib/formato';
import { destacar } from '../lib/destaque';
import { urlSegura } from '../lib/seguranca';
import type { Licitacao, Segmento } from '../lib/tipos';

interface Props {
  licitacao: Licitacao;
  segmento: Segmento;
  busca?: string;
}

export function CartaoLicitacao({ licitacao, segmento, busca = '' }: Props) {
  const [expandido, setExpandido] = useState(false);
  const [popupObjeto, setPopupObjeto] = useState(false);
  const objetoRef = useRef<HTMLHeadingElement | null>(null);
  const dias = diasRestantes(licitacao.dataEncerramentoProposta);
  const horas = horasRestantes(licitacao.dataEncerramentoProposta);
  const nivel = nivelPrazo(dias);
  const recente = foiPublicadoRecentemente(licitacao.dataPublicacao, 72);
  const identificacao =
    licitacao.numeroControlePncp || licitacao.numeroCompra || `ID ${licitacao.id}`;

  const categoriasDoSegmentoIds = categoriasDoSegmento(segmento).map((c) => c.id);
  const principal =
    principalDoSegmento(licitacao, segmento) ??
    (licitacao.categoriaPrincipal && categoriasDoSegmentoIds.includes(licitacao.categoriaPrincipal)
      ? licitacao.categoriaPrincipal
      : null);
  const cor = corCategoria(principal ?? '');
  const outrosSegmentos = licitacao.segmentos.filter((s) => s !== segmento);

  const linkPncp = urlSegura(licitacao.linkPncp || licitacao.link);
  const linkOrigem = urlSegura(licitacao.linkSistemaOrigem);

  const trechosObjeto = destacar(licitacao.objeto, busca);
  const encerraEmBreve = horas !== null && horas >= 0 && horas <= 24;
  const objetoTruncadoId = `tooltip-objeto-${licitacao.id}`;

  function aoEntrarNoObjeto() {
    const el = objetoRef.current;
    if (!el || expandido) {
      setPopupObjeto(false);
      return;
    }
    setPopupObjeto(el.scrollHeight > el.clientHeight + 1);
  }

  return (
    <article className={`cartao cartao--${nivel}`}>
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
            {principal ? rotuloCategoria(principal) : rotuloSegmento(segmento)}
          </span>
          {recente && dias !== null && dias >= 0 && (
            <span className="badge badge--novo">Novo</span>
          )}
          <span className="badge">{licitacao.esfera}</span>
          <span className="badge">{licitacao.modalidade}</span>
          {outrosSegmentos.map((s) => (
            <span key={s} className="badge badge--outro-segmento">
              + {rotuloSegmento(s)}
            </span>
          ))}
        </div>
        <div className="cartao__prazo">
          <span className={`prazo prazo--${nivel}`}>{rotuloPrazo(dias)}</span>
          {encerraEmBreve && dias !== null && dias <= 0 && (
            <span className="prazo prazo--urgente prazo--24h">Encerra em {Math.max(horas, 1)}h</span>
          )}
        </div>
      </header>

      <div
        className="cartao__objeto-wrap"
        onMouseEnter={aoEntrarNoObjeto}
        onMouseLeave={() => setPopupObjeto(false)}
      >
        <h3
          ref={objetoRef}
          className={`cartao__objeto ${expandido ? 'cartao__objeto--expandido' : ''}`}
          aria-describedby={popupObjeto ? objetoTruncadoId : undefined}
        >
          {trechosObjeto.map((trecho, i) =>
            trecho.marca ? (
              <mark key={i} className="busca-destaque">
                {trecho.texto}
              </mark>
            ) : (
              <span key={i}>{trecho.texto}</span>
            ),
          )}
        </h3>
        {popupObjeto && (
          <div id={objetoTruncadoId} role="tooltip" className="cartao__tooltip">
            {licitacao.objeto}
          </div>
        )}
      </div>

      {expandido && licitacao.informacaoComplementar && (
        <p className="cartao__resumo">{licitacao.informacaoComplementar}</p>
      )}

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

      {licitacao.informacaoComplementar && !expandido && (
        <button type="button" className="cartao__expandir" onClick={() => setExpandido(true)}>
          Ver detalhes
        </button>
      )}
      {licitacao.informacaoComplementar && expandido && (
        <button type="button" className="cartao__expandir" onClick={() => setExpandido(false)}>
          Ocultar detalhes
        </button>
      )}

      <footer className="cartao__rodape">
        <div className="cartao__rotulos">
          {licitacao.categorias
            .filter((c) => c !== principal)
            .filter((c) => categoriasDoSegmentoIds.includes(c))
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
            <a className="botao-link" href={linkOrigem} target="_blank" rel="noopener noreferrer">
              Sistema de origem
              <span className="botao-link__seta">↗</span>
            </a>
          )}
        </div>
      </footer>
    </article>
  );
}