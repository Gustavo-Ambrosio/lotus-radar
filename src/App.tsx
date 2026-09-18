import { useEffect, useMemo, useState } from 'react';
import { CATEGORIAS } from './lib/categorias';
import { aplicarFiltros, FILTROS_INICIAIS, valoresUnicos, type Filtros } from './lib/filtros';
import { formatarDataHora } from './lib/formato';
import type { Snapshot } from './lib/tipos';
import { Kpis } from './componentes/Kpis';
import { PainelFiltros } from './componentes/Filtros';
import { CartaoLicitacao } from './componentes/CartaoLicitacao';

export default function App() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIAIS);

  useEffect(() => {
    let ativo = true;
    const url = `${import.meta.env.BASE_URL}dados/licitacoes.json`;

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<Snapshot>;
      })
      .then((dados) => {
        if (ativo) {
          setSnapshot(dados);
          setCarregando(false);
        }
      })
      .catch((e: unknown) => {
        if (ativo) {
          setErro(e instanceof Error ? e.message : String(e));
          setCarregando(false);
        }
      });

    return () => {
      ativo = false;
    };
  }, []);

  const licitacoes = snapshot?.licitacoes ?? [];

  const municipios = useMemo(() => valoresUnicos(licitacoes, (l) => l.municipio), [licitacoes]);
  const modalidades = useMemo(() => valoresUnicos(licitacoes, (l) => l.modalidade), [licitacoes]);
  const esferas = useMemo(() => valoresUnicos(licitacoes, (l) => l.esfera), [licitacoes]);

  const categoriasDisponiveis = useMemo(
    () =>
      CATEGORIAS.map((c) => ({
        id: c.id,
        label: c.label,
        cor: c.cor,
        total: licitacoes.filter((l) => l.categorias.includes(c.id)).length,
      }))
        .filter((c) => c.total > 0)
        .sort((a, b) => b.total - a.total),
    [licitacoes],
  );

  const filtradas = useMemo(() => aplicarFiltros(licitacoes, filtros), [licitacoes, filtros]);

  return (
    <>
      <header className="cabecalho">
        <div className="container">
          <div className="cabecalho__marca">
            <span className="cabecalho__logo" aria-hidden="true">
              🎭
            </span>
            <h1>Radar Cultural PR</h1>
          </div>
          <p className="cabecalho__subtitulo">
            Licitações e editais de cultura do Governo do Paraná e de todos os municípios — abertos
            para inscrição, organizados por categoria, prazo e órgão. Fonte oficial: PNCP.
          </p>
          {snapshot && (
            <p className="cabecalho__meta">
              Atualizado em {formatarDataHora(snapshot.geradoEm)}
              {snapshot.truncado ? ' · coleta parcial' : ''}
            </p>
          )}
        </div>
      </header>

      <main className="container">
        {carregando && <p className="estado">Carregando editais…</p>}

        {erro && (
          <p className="estado estado--erro">
            Não foi possível carregar os dados ({erro}). O snapshot pode ainda não ter sido gerado.
          </p>
        )}

        {snapshot && (
          <>
            <Kpis licitacoes={licitacoes} truncado={snapshot.truncado} />

            <PainelFiltros
              filtros={filtros}
              onChange={setFiltros}
              municipios={municipios}
              modalidades={modalidades}
              esferas={esferas}
              categorias={categoriasDisponiveis}
              totalFiltrado={filtradas.length}
              totalGeral={licitacoes.length}
            />

            {filtradas.length === 0 ? (
              <p className="estado">Nenhum edital corresponde aos filtros selecionados.</p>
            ) : (
              <section className="lista" aria-label="Editais">
                {filtradas.map((licitacao) => (
                  <CartaoLicitacao key={licitacao.id} licitacao={licitacao} />
                ))}
              </section>
            )}
          </>
        )}
      </main>

      <footer className="rodape">
        <div className="container">
          <p>
            Projeto independente, sem vínculo com órgãos públicos. Dados públicos do{' '}
            <a href="https://pncp.gov.br" target="_blank" rel="noopener noreferrer">
              PNCP
            </a>
            . A categoria é inferida por palavras-chave do objeto do edital e pode não refletir a
            classificação oficial.
          </p>
          <p>
            {snapshot?.observacao ?? 'A cobertura depende de o órgão publicar no PNCP.'}
          </p>
        </div>
      </footer>
    </>
  );
}
