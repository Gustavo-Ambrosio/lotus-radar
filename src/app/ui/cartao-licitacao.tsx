import Link from 'next/link';
import {
  categoriasDoSegmento,
  corCategoria,
  principalDoSegmento,
  rotuloCategoria,
  rotuloSegmento,
} from '@/lib/segmentos';
import {
  diasRestantes,
  formatarData,
  formatarMoeda,
  formatarPeriodo,
  horasRestantes,
  nivelPrazo,
  rotuloPrazo,
  foiPublicadoRecentemente,
} from '@/lib/formato';
import { destacar } from '@/lib/destaque';
import { urlSegura } from '@/lib/seguranca';
import type { Licitacao, Segmento } from '@/lib/tipos';

/**
 * Versao servidor do cartao. Mantem o markup e as classes do dashboard antigo
 * (o CSS de 1.200 linhas continua valendo) e troca os tres estados de
 * `useState` por coisas que nao precisam de navegador: o realce do termo
 * buscado, o "Novo" e o link para a pagina de detalhe.
 */
export function CartaoLicitacao({
  licitacao,
  segmento,
  busca = '',
}: {
  licitacao: Licitacao;
  segmento: Segmento;
  busca?: string;
}) {
  const dias = diasRestantes(licitacao.dataEncerramentoProposta);
  const horas = horasRestantes(licitacao.dataEncerramentoProposta);
  const nivel = nivelPrazo(dias);
  const recente = foiPublicadoRecentemente(licitacao.dataPublicacao, 72);

  const idsDoSegmento = categoriasDoSegmento(segmento).map((c) => c.id);
  const principal =
    principalDoSegmento(licitacao, segmento) ??
    (licitacao.categoriaPrincipal && idsDoSegmento.includes(licitacao.categoriaPrincipal)
      ? licitacao.categoriaPrincipal
      : null);
  const cor = corCategoria(principal ?? '');
  const outrosSegmentos = licitacao.segmentos.filter((s) => s !== segmento);

  const identificacao =
    licitacao.numeroControlePncp || licitacao.numeroCompra || `ID ${licitacao.id}`;

  const linkPncp = urlSegura(licitacao.linkPncp || licitacao.link);
  const linkOrigem = urlSegura(licitacao.linkSistemaOrigem);
  const trechoBusca = busca.trim();

  // So marca quando ha busca mesmo: sem termo, o realce nao informa nada e
  // polui a leitura do objeto.
  const partes = trechoBusca ? destacar(licitacao.objeto, trechoBusca) : null;

  return (
    <article className={`cartao cartao--${nivel}`}>
      <header className="cartao__topo">
        <div className="cartao__selos">
          <span
            className="badge badge--categoria"
            style={{ color: cor, background: `${cor}1f`, borderColor: `${cor}40` }}
          >
            {principal ? rotuloCategoria(principal) : rotuloSegmento(segmento)}
          </span>
          {recente && dias !== null && dias >= 0 ? (
            <span className="badge badge--novo">Novo</span>
          ) : null}
          <span className="badge">{licitacao.esfera}</span>
          {licitacao.modalidade ? <span className="badge">{licitacao.modalidade}</span> : null}
          {outrosSegmentos.map((s) => (
            <span key={s} className="badge badge--outro-segmento">
              + {rotuloSegmento(s)}
            </span>
          ))}
        </div>
        <div className="cartao__prazo">
          <span className={`prazo prazo--${nivel}`}>{rotuloPrazo(dias)}</span>
          {horas !== null && horas >= 0 && horas <= 24 ? (
            <span className="prazo prazo--urgente prazo--24h">
              Encerra em {Math.max(horas, 1)}h
            </span>
          ) : null}
        </div>
      </header>

      <div className="cartao__objeto-wrap">
        <h3 className="cartao__objeto">
          {partes ? (
            partes.map((trecho, i) =>
              trecho.marca ? (
                <mark key={i} className="busca-destaque">
                  {trecho.texto}
                </mark>
              ) : (
                <span key={i}>{trecho.texto}</span>
              ),
            )
          ) : (
            <Link href={`/licitacao/${licitacao.id}`}>{licitacao.objeto}</Link>
          )}
        </h3>
      </div>

      {licitacao.informacaoComplementar ? (
        <details className="cartao__complemento">
          <summary>Ver detalhes do objeto</summary>
          <p>{licitacao.informacaoComplementar}</p>
        </details>
      ) : null}

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

      <footer className="cartao__rodape">
        <div className="cartao__rotulos">
          {licitacao.categorias
            .filter((c) => c !== principal && idsDoSegmento.includes(c))
            .slice(0, 4)
            .map((c) => (
              <span key={c} className="badge badge--fino">
                {rotuloCategoria(c)}
              </span>
            ))}
        </div>
        <div className="cartao__links">
          <Link className="botao-link" href={`/licitacao/${licitacao.id}`}>
            Ficha completa
          </Link>
          {linkPncp ? (
            <a
              className="botao-link botao-link--primario"
              href={linkPncp}
              target="_blank"
              rel="noopener noreferrer"
            >
              Acessar edital
              <span className="botao-link__seta" aria-hidden="true">
                ↗
              </span>
            </a>
          ) : null}
          {linkOrigem ? (
            <a className="botao-link" href={linkOrigem} target="_blank" rel="noopener noreferrer">
              Sistema de origem
              <span className="botao-link__seta" aria-hidden="true">
                ↗
              </span>
            </a>
          ) : null}
        </div>
      </footer>
    </article>
  );
}
