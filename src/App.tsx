import { useEffect, useMemo, useState } from 'react';
import { CATEGORIAS } from './lib/categorias';
import { aplicarFiltros, FILTROS_INICIAIS, valoresUnicos, type Filtros } from './lib/filtros';
import { formatarDataHora } from './lib/formato';
import type { Snapshot } from './lib/tipos';
import { Kpis } from './componentes/Kpis';
import { PainelFiltros } from './componentes/Filtros';
import { CartaoLicitacao } from './componentes/CartaoLicitacao';

const SEGMENTOS = [
  { id: 'cultura', rotulo: 'Cultural', ativo: true, emBreve: false },
  { id: 'tecnologia', rotulo: 'Tecnologia', ativo: false, emBreve: true },
] as const;

function LogoRadar() {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="24" cy="24" r="21" stroke="currentColor" strokeWidth="2" opacity="0.35" />
      <circle cx="24" cy="24" r="14" stroke="currentColor" strokeWidth="2" opacity="0.55" />
      <circle cx="24" cy="24" r="7" stroke="currentColor" strokeWidth="2" />
      <circle cx="24" cy="24" r="2.6" fill="currentColor" />
      <path d="M24 24 L38 13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="38" cy="13" r="2.2" fill="currentColor" />
    </svg>
  );
}

export default function App() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIAIS);

  useEffect(() => {
    let ativo = true;
    const url = './dados/licitacoes.json';

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        if (!(r.headers.get('content-type') || '').includes('json')) {
          throw new Error('O snapshot ainda não foi gerado.');
        }
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
      <header className="hero">
        <div className="container hero__interior">
          <div className="marca">
            <span className="marca__logo">
              <LogoRadar />
            </span>
            <div className="marca__texto">
              <h1 className="marca__nome">Radar Cultural Paraná</h1>
              <p className="marca__legenda">Oportunidades de cultura — licitações, editais e prêmios</p>
            </div>
          </div>

          <p className="hero__resumo">
            Acompanhe, em um só lugar, as <strong>licitações e editais de cultura abertos</strong> do
            Governo do Paraná e de todos os municípios. Encontre por categoria, prazo, órgão ou
            município e inscreva-se direto na fonte oficial.
          </p>

          <div className="hero__selos">
            <span className="selo">
              <span className="selo__icone">✓</span> Fonte oficial: PNCP
            </span>
            {snapshot ? (
              <span className="selo">
                <span className="selo__icone">🕐</span> Atualizado em {formatarDataHora(snapshot.geradoEm)}
                {snapshot.truncado ? ' · coleta parcial' : ''}
              </span>
            ) : (
              <span className="selo">
                <span className="selo__icone">⋯</span> Carregando dados
              </span>
            )}
          </div>

          <nav className="segmentos" aria-label="Segmentos do radar">
            {SEGMENTOS.map((seg) => (
              <button
                key={seg.id}
                type="button"
                className={seg.ativo ? 'segmento segmento--ativo' : 'segmento segmento--em-breve'}
                disabled={seg.emBreve}
                aria-pressed={seg.ativo}
                title={seg.emBreve ? 'Em breve' : undefined}
              >
                {seg.rotulo}
                {seg.emBreve && <span className="segmento__selo">em breve</span>}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="container conteudo">
        {carregando && (
          <div className="estado" role="status">
            <span className="estado__texto">Carregando editais…</span>
          </div>
        )}

        {erro && (
          <div className="estado estado--erro" role="alert">
            <strong>Não foi possível carregar os dados.</strong>
            <span>{erro} — o snapshot pode ainda não ter sido gerado.</span>
          </div>
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
              <div className="estado">
                <strong>Nenhum edital corresponde aos filtros selecionados.</strong>
                <span>Tente ampliar a busca ou limpar os filtros.</span>
                <button
                  type="button"
                  className="botao-recuperar"
                  onClick={() => setFiltros(FILTROS_INICIAIS)}
                >
                  Limpar filtros
                </button>
              </div>
            ) : (
              <section className="lista" aria-label="Editais abertos">
                <header className="lista__cabecalho">
                  <h2>Oportunidades abertas</h2>
                  <span className="lista__contador">
                    {filtradas.length.toLocaleString('pt-BR')} {filtradas.length === 1 ? 'edital' : 'editais'}
                  </span>
                </header>
                <div className="lista__grade">
                  {filtradas.map((licitacao) => (
                    <CartaoLicitacao key={licitacao.id} licitacao={licitacao} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <footer className="rodape">
        <div className="container rodape__grade">
          <div className="rodape__bloco">
            <p className="rodape__titulo">Sobre</p>
            <p className="rodape__texto">
              Projeto independente e gratuito, sem vínculo com órgãos públicos. A cobertura depende de o
              órgão publicar no PNCP. {snapshot?.observacao ?? ''}
            </p>
          </div>
          <div className="rodape__bloco">
            <p className="rodape__titulo">Transparência</p>
            <p className="rodape__texto">
              Dados públicos do{' '}
              <a href="https://pncp.gov.br" target="_blank" rel="noopener noreferrer">
                Portal Nacional de Contratações Públicas (PNCP)
              </a>
              . A categoria é inferida automaticamente pelo texto do objeto e pode não refletir a
              classificação oficial.
            </p>
          </div>
        </div>
        <p className="rodape__base">
          Radar Cultural Paraná · atualização diária automática
        </p>
      </footer>
    </>
  );
}