import type { Metadata } from 'next';
import Link from 'next/link';
import { db } from '@/lib/db';
import { buscarLicitacoes, consultaInicial, resumoLicitacoes } from '@/lib/licitacoes';
import { agruparPorDia, rotuloDoGroupo } from '@/lib/agrupar';
import { categoriasDoSegmento, rotuloSegmento } from '@/lib/segmentos';
import { formatarMoeda } from '@/lib/formato';
import { filtrosDaUrl, montarQuery, segmentoDaUrl } from '@/lib/url';
import { usuarioAtual } from '@/lib/auth/cookie';
import { PaginaLista } from './ui/paginacao';
import { PainelFiltros } from './ui/painel-filtros';
import { CartaoLicitacao } from './ui/cartao-licitacao';
import { SalvarBusca } from './ui/salvar-busca';

export const metadata: Metadata = {
  title: 'Lotus Radar — licitações de cultura e tecnologia',
  description:
    'Radar de licitações e editais abertos de cultura e tecnologia no Brasil, com filtros por estado, município, valor e prazo.',
};

/**
 * O radar inteiro em Server Component, com os filtros guardados na URL. Isso
 * mantem a pagina linkavel (botao "compartilhar" e' so copiar o endereco) e faz
 * o cache funcionar por combinacao de filtros, ao custo de uma consulta por
 * navegacao — que o indice do Postgres segura sem suor.
 *
 * `dynamic` e' obrigatorio: sem ele o Next tentaria prerenderizar a home no
 * build e o primeiro deploy sairia com o banco vazio na pagina inicial.
 */
export const dynamic = 'force-dynamic';

type Parametros = Promise<Record<string, string | string[] | undefined>>;

function primeiro(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}
export default async function PaginaRadar({ searchParams }: { searchParams: Parametros }) {
  const params = await searchParams;
  const url = new URLSearchParams();
  for (const [chave, valor] of Object.entries(params)) {
    const um = primeiro(valor);
    if (um !== undefined) url.set(chave, um);
  }

  const segmento = segmentoDaUrl(url);
  const filtros = filtrosDaUrl(url);
  const pagina = Math.max(1, Number(url.get('pagina') ?? '1') || 1);

  const consulta = { ...consultaInicial(segmento, pagina, 50), filtros };
  const banco = await db();

  const [resultado, resumo] = await Promise.all([
    buscarLicitacoes(banco, consulta),
    resumoLicitacoes(banco, consulta),
  ]);

  const grupos = agruparPorDia(resultado.itens);
  const categorias = categoriasDoSegmento(segmento);
  const consultaAtual = montarQuery(segmento, filtros);
  const temFiltro = Boolean(
    filtros.busca ||
      filtros.categorias.length ||
      filtros.uf ||
      filtros.municipio ||
      filtros.esfera ||
      filtros.modalidade ||
      filtros.distanciaMaxKm !== null ||
      filtros.prazoMaxDias !== null ||
      filtros.publicadoDias !== null ||
      filtros.valorMinimo !== null ||
      filtros.valorMaximo !== null ||
      filtros.somenteComValor,
  );

  // O botao de salvar so aparece para quem tem conta; para o visitante ele
  // vira o convite para criar uma, com o recorte ja na URL.
  const usuario = await usuarioAtual();

  return (
    <>
      <section className="hero">
        <div className="container hero__interior">
          <div className="hero__marca">
            <h1 className="hero__titulo">Licitações de cultura e tecnologia</h1>
            <p className="hero__apoio">O que está aberto agora no Brasil, do federal ao município.</p>
          </div>
          <div className="hero__resumo">
            <p>
              <strong>{resultado.total.toLocaleString('pt-BR')}</strong> oportunidades em{' '}
              {rotuloSegmento(segmento).toLowerCase()} neste recorte
              {resumo.encerrandoLogo > 0 ? (
                <>
                  {' · '}
                  <strong>{resumo.encerrandoLogo}</strong> encerrando em menos de 7 dias
                </>
              ) : null}
              {resumo.comValor > 0 ? (
                <>
                  {' · valor médio de '}
                  <strong>{formatarMoeda(resumo.valorMedio)}</strong>
                </>
              ) : null}
              .
            </p>
            <p className="hero__selos">
              <span className="selo">
                <span className="selo__icone" aria-hidden="true">
                  ✓
                </span>
                Fontes oficiais: PNCP, SIC Cultura, MinC e PNAB
              </span>
            </p>
          </div>
        </div>
      </section>

      <div className="container conteudo">
        {url.get('erro') === 'busca-vazia' ? (
          <p className="form__aviso form__aviso--erro" role="alert">
            Ajuste algum filtro antes de salvar — do jeito que está, a busca pegaria o radar inteiro.
          </p>
        ) : null}

        <nav className="segmentos" aria-label="Segmentos do radar">
          {(['cultura', 'tecnologia'] as const).map((seg) => (
            <Link
              key={seg}
              href={`/?seg=${seg}`}
              className={seg === segmento ? 'segmento segmento--ativo' : 'segmento'}
              aria-current={seg === segmento ? 'page' : undefined}
            >
              {rotuloSegmento(seg)}
            </Link>
          ))}
        </nav>

        <div className="radar">
          <PainelFiltros segmento={segmento} categorias={categorias} filtros={filtros} />

          <div>
            {resultado.total === 0 ? (
              <div className="estado">
                <span className="estado__texto">
                  Nenhuma licitação aberta neste recorte.{' '}
                  <Link href={`/?seg=${segmento}`}>Limpar os filtros</Link> e ver tudo.
                </span>
              </div>
            ) : (
              <section className="lista" aria-label="Oportunidades abertas">
                <header className="lista__cabecalho">
                  <div className="lista__titulos">
                    <h2>Abertas agora</h2>
                    <span className="lista__contador">
                      {resultado.total.toLocaleString('pt-BR')} resultados
                      {temFiltro ? ' com filtro' : ''}
                    </span>
                  </div>
                  {usuario ? (
                    <SalvarBusca url={url} />
                  ) : (
                    <div className="lista__acoes">
                      <Link className="ferramenta" href={`/criar-conta?${url.toString()}`}>
                        Criar conta para salvar
                      </Link>
                    </div>
                  )}
                </header>

                {grupos.map((grupo) => (
                  <section key={grupo.chave} className="grupo" aria-label={rotuloDoGroupo(grupo.chave)}>
                    <h3 className="grupo__titulo">{rotuloDoGroupo(grupo.chave)}</h3>
                    {grupo.itens.map((licitacao) => (
                      <CartaoLicitacao
                        key={licitacao.id}
                        licitacao={licitacao}
                        segmento={segmento}
                        busca={filtros.busca}
                      />
                    ))}
                  </section>
                ))}

                <PaginaLista
                  pagina={resultado.pagina}
                  paginas={resultado.paginas}
                  total={resultado.total}
                  consulta={consultaAtual}
                />
              </section>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
