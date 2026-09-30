import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { licitacaoPorId } from '@/lib/licitacoes';
import { categoriasDoSegmento, rotuloCategoria, rotuloSegmento } from '@/lib/segmentos';
import {
  diasRestantes,
  formatarData,
  formatarDataHora,
  formatarMoeda,
  formatarPeriodo,
  horasRestantes,
  nivelPrazo,
  rotuloPrazo,
} from '@/lib/formato';
import { urlSegura } from '@/lib/seguranca';

export const dynamic = 'force-dynamic';

async function carregar(id: string) {
  return licitacaoPorId(await db(), id);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const licitacao = await carregar(decodeURIComponent(id));
  if (!licitacao) return { title: 'Licitação não encontrada — Lotus Radar' };

  return {
    title: `${licitacao.objeto.slice(0, 60)} — Lotus Radar`,
    description: licitacao.orgao,
    robots: { index: false },
  };
}

/**
 * Ficha completa. E' a pagina de destino de todo link do radar, entao precisa
 * responder bem tanto para quem chegou buscando um edital especifico (e' o
 * que o trafego organico traz) quanto para quem esta logado e decidiu
 * acompanhar este objeto.
 */
export default async function PaginaLicitacao({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const licitacao = await carregar(decodeURIComponent(id));
  if (!licitacao) notFound();

  const dias = diasRestantes(licitacao.dataEncerramentoProposta);
  const horas = horasRestantes(licitacao.dataEncerramentoProposta);
  const nivel = nivelPrazo(dias);
  const edital = urlSegura(licitacao.linkPncp || licitacao.link);
  const origem = urlSegura(licitacao.linkSistemaOrigem);
  const encerrada = dias !== null && dias < 0;

  const idsConhecidos = new Set(
    (['cultura', 'tecnologia'] as const).flatMap((s) => categoriasDoSegmento(s).map((c) => c.id)),
  );
  const categorias = licitacao.categorias.filter((c) => idsConhecidos.has(c));

  const linhas: [string, string][] = [
    ['Órgão', licitacao.orgao],
    ['CNPJ do órgão', licitacao.cnpj || '—'],
    ['Esfera', licitacao.esfera],
    ['Município', licitacao.municipio || '—'],
    ['UF', licitacao.uf || '—'],
    ['Código IBGE', licitacao.codigoIbge || '—'],
    ['Modalidade', licitacao.modalidade || '—'],
    ['Identificação', licitacao.numeroControlePncp || licitacao.numeroCompra || '—'],
    ['Número da compra', licitacao.numeroCompra || '—'],
    ['Ano', licitacao.anoCompra?.toString() ?? '—'],
    ['Valor estimado', formatarMoeda(licitacao.valorEstimado)],
    ['Publicado em', formatarDataHora(licitacao.dataPublicacao)],
    ['Abertura das propostas', formatarDataHora(licitacao.dataAberturaProposta)],
    ['Encerramento das propostas', formatarDataHora(licitacao.dataEncerramentoProposta)],
    ['Situação', licitacao.situacao || '—'],
    ['Fonte', licitacao.origem || '—'],
  ];

  return (
    <div className="ficha">
      <nav className="ficha__migalhas" aria-label="Você está em">
        <Link href="/">Radar</Link>
        <span aria-hidden="true">›</span>
        {licitacao.segmentos.map((s) => (
          <span key={s}>
            <Link href={`/?seg=${s}`}>{rotuloSegmento(s)}</Link>
            <span aria-hidden="true">›</span>
          </span>
        ))}
        <span className="ficha__migalhas-atual">Ficha</span>
      </nav>

      <header className="ficha__cabecalho">
        <div className="cartao__selos">
          {licitacao.segmentos.map((s) => (
            <span key={s} className="badge">
              {rotuloSegmento(s)}
            </span>
          ))}
          <span className="badge">{licitacao.esfera}</span>
          {licitacao.modalidade ? <span className="badge">{licitacao.modalidade}</span> : null}
        </div>

        <h1 className="ficha__objeto">{licitacao.objeto}</h1>
        <p className="ficha__orgao">{licitacao.orgao}</p>

        <div className="ficha__prazo">
          <span className={`prazo prazo--${nivel}`}>{rotuloPrazo(dias)}</span>
          {!encerrada && horas !== null && horas <= 48 ? (
            <span className="prazo prazo--urgente">
              Encerra em {horas < 1 ? 'menos de 1h' : `${horas}h`}
            </span>
          ) : null}
          <span className="ficha__periodo">
            {formatarPeriodo(licitacao.dataAberturaProposta, licitacao.dataEncerramentoProposta)}
          </span>
        </div>

        <div className="ficha__acoes">
          {edital ? (
            <a
              className="botao-link botao-link--primario"
              href={edital}
              target="_blank"
              rel="noopener noreferrer"
            >
              Abrir o edital na origem
              <span className="botao-link__seta" aria-hidden="true">
                ↗
              </span>
            </a>
          ) : null}
          {origem ? (
            <a className="botao-link" href={origem} target="_blank" rel="noopener noreferrer">
              Sistema de origem
              <span className="botao-link__seta" aria-hidden="true">
                ↗
              </span>
            </a>
          ) : null}
          <Link className="botao-link" href="/criar-conta">
            Alertar quando abrir outra igual
          </Link>
        </div>
      </header>

      {encerrada ? (
        <p className="form__aviso form__aviso--erro" role="alert">
          Esta licitação está encerrada. Ela continua no radar para histórico — mas não aceita mais
          propostas.
        </p>
      ) : null}

      {licitacao.informacaoComplementar ? (
        <section className="ficha__bloco">
          <h2>Informação complementar</h2>
          <p className="ficha__texto">{licitacao.informacaoComplementar}</p>
        </section>
      ) : null}

      <section className="ficha__bloco">
        <h2>Dados da licitação</h2>
        <dl className="ficha__dados">
          {linhas.map(([rotulo, valor]) => (
            <div key={rotulo} className="ficha__dado">
              <dt>{rotulo}</dt>
              <dd>{valor}</dd>
            </div>
          ))}
        </dl>
      </section>

      {categorias.length > 0 ? (
        <section className="ficha__bloco">
          <h2>Classificação automática</h2>
          <div className="cartao__rotulos">
            {categorias.map((c) => (
              <span key={c} className="badge">
                {rotuloCategoria(c)}
              </span>
            ))}
          </div>
          <p className="ficha__nota">
            A classificação vem da leitura do objeto e serve como ponto de partida. O que vale é o
            edital.
          </p>
        </section>
      ) : null}

      <p className="ficha__rodape">
        Publicada em {formatarData(licitacao.dataPublicacao)} · identificador{' '}
        {licitacao.numeroControlePncp || licitacao.numeroCompra || licitacao.id}
      </p>
    </div>
  );
}
