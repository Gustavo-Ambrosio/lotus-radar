import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { categoriasDoSegmento, resolverSegmentoExclusivo } from './lib/segmentos';
import { aplicarFiltros, FILTROS_INICIAIS, valoresUnicos, type Filtros } from './lib/filtros';
import { formatarDataHora } from './lib/formato';
import { agruparPorDia } from './lib/agrupar';
import { filtrosDaUrl, montarQuery, segmentoDaUrl } from './lib/url';
import { baixarArquivo, licitacoesParaCsv } from './lib/exportar';
import { carregarMunicipios, UFS_ORDENADAS, type Coordenadas } from './lib/geo';
import type { MunicipioBrasil } from './lib/municipios-br';
import type { Segmento, Snapshot } from './lib/tipos';
import { Kpis } from './componentes/Kpis';
import { PainelFiltros } from './componentes/Filtros';
import { CartaoLicitacao } from './componentes/CartaoLicitacao';

const MapaLicitacoes = lazy(() =>
  import('./componentes/MapaLicitacoes').then((mod) => ({ default: mod.MapaLicitacoes })),
);

const SEGMENTOS: { id: Segmento; rotulo: string; emBreve: boolean }[] = [
  { id: 'cultura', rotulo: 'Cultural', emBreve: false },
  { id: 'tecnologia', rotulo: 'Tecnologia', emBreve: false },
];

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
  const [segmento, setSegmento] = useState<Segmento>(() => segmentoDaUrl(new URLSearchParams(window.location.search)));
  const [filtros, setFiltros] = useState<Filtros>(() => filtrosDaUrl(new URLSearchParams(window.location.search)));
  const [mostrarMapa, setMostrarMapa] = useState(false);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [localizacao, setLocalizacao] = useState<Coordenadas | null>(null);
  const [localizando, setLocalizando] = useState(false);
  const [localizacaoErro, setLocalizacaoErro] = useState<string | null>(null);
  const [municipios, setMunicipios] = useState<MunicipioBrasil[]>([]);
  const primeiroRender = useRef(true);

  useEffect(() => {
    let ativo = true;
    carregarMunicipios()
      .then((dados) => {
        if (ativo) setMunicipios(dados);
      })
      .catch((e: unknown) => {
        console.warn('[geo] lista de municípios não carregada:', e instanceof Error ? e.message : e);
      });
    return () => {
      ativo = false;
    };
  }, []);

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

  useEffect(() => {
    if (primeiroRender.current) {
      primeiroRender.current = false;
      return;
    }
    const parans = montarQuery(segmento, filtros);
    const caminho = parans ? `${window.location.pathname}${parans}` : window.location.pathname;
    window.history.replaceState(null, '', caminho);
  }, [segmento, filtros]);

  useEffect(() => {
    const aoNavagar = () => {
      const parans = new URLSearchParams(window.location.search);
      setSegmento(segmentoDaUrl(parans));
      setFiltros(filtrosDaUrl(parans));
    };
    window.addEventListener('popstate', aoNavagar);
    return () => window.removeEventListener('popstate', aoNavagar);
  }, []);

  const licitacoes = snapshot?.licitacoes ?? [];
  const licitacoesDoSegmento = useMemo(
    () => licitacoes.filter((l) => resolverSegmentoExclusivo(l) === segmento),
    [licitacoes, segmento],
  );

  const modalidades = useMemo(
    () => valoresUnicos(licitacoesDoSegmento, (l) => l.modalidade),
    [licitacoesDoSegmento],
  );
  const esferas = useMemo(
    () => valoresUnicos(licitacoesDoSegmento, (l) => l.esfera),
    [licitacoesDoSegmento],
  );

  const categoriasDisponiveis = useMemo(() => {
    const base = categoriasDoSegmento(segmento);
    return base.map((c) => ({
      id: c.id,
      label: c.label,
      cor: c.cor,
      total: licitacoesDoSegmento.filter((l) => l.categorias.includes(c.id)).length,
    }));
  }, [segmento, licitacoesDoSegmento]);

  const filtradas = useMemo(
    () => aplicarFiltros(licitacoesDoSegmento, filtros, localizacao),
    [licitacoesDoSegmento, filtros, localizacao],
  );

  const grupos = useMemo(() => agruparPorDia(filtradas), [filtradas]);

  function solicitarLocalizacao() {
    if (!('geolocation' in navigator)) {
      setLocalizacaoErro('Geolocalização não é suportada neste navegador.');
      return;
    }
    setLocalizando(true);
    setLocalizacaoErro(null);
    navigator.geolocation.getCurrentPosition(
      (posicao) => {
        setLocalizacao({
          lat: posicao.coords.latitude,
          lng: posicao.coords.longitude,
        });
        setLocalizando(false);
      },
      (falha) => {
        setLocalizacaoErro(mensagemGeo(falha.code));
        setLocalizando(false);
      },
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 5 * 60_000 },
    );
  }

  function trocarSegmento(novo: Segmento) {
    if (novo === segmento) return;
    setSegmento(novo);
    setFiltros((atual) => ({ ...atual, categorias: [] }));
  }

  function confirmarMunicipioNoMapa(municipio: string) {
    setFiltros((atual) => ({ ...atual, municipio }));
  }

  async function copiarLink() {
    const parans = montarQuery(segmento, filtros);
    const destino = `${window.location.origin}${window.location.pathname}${parans}`;
    try {
      await navigator.clipboard.writeText(destino);
      setLinkCopiado(true);
      window.setTimeout(() => setLinkCopiado(false), 1800);
    } catch {
      setLinkCopiado(false);
    }
  }

  function exportarCsv() {
    baixarArquivo(`lotus-radar-${segmento}.csv`, licitacoesParaCsv(filtradas), 'text/csv;charset=utf-8');
  }

  function exportarJson() {
    baixarArquivo(
      `lotus-radar-${segmento}.json`,
      JSON.stringify({ geradoEm: snapshot?.geradoEm ?? null, segmento, total: filtradas.length, licitacoes: filtradas }, null, 2),
      'application/json;charset=utf-8',
    );
  }

  return (
    <>
      <header className="hero">
        <div className="container hero__interior">
          <div className="marca">
            <span className="marca__logo">
              <LogoRadar />
            </span>
            <div className="marca__texto">
              <h1 className="marca__nome">Radar Cultural Brasil</h1>
              <p className="marca__legenda">Oportunidades públicas em cultura e tecnologia</p>
            </div>
          </div>

          <p className="hero__resumo">
            Acompanhe em um só lugar as <strong>licitações e editais abertos</strong> de todo o
            Brasil — Governo Federal, estados e municípios — em <strong>cultura</strong> e{' '}
            <strong>tecnologia</strong>. Encontre por categoria, estado, município, distância, prazo,
            órgão ou valor e inscreva-se direto na fonte oficial.
          </p>

          <div className="hero__selos">
            <span className="selo">
              <span className="selo__icone">✓</span> Fontes oficiais: PNCP, SIC Cultura e MinC
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
                className={segmento === seg.id ? 'segmento segmento--ativo' : 'segmento'}
                onClick={() => trocarSegmento(seg.id)}
                aria-pressed={segmento === seg.id}
                disabled={seg.emBreve}
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
            <Kpis licitacoes={licitacoesDoSegmento} truncado={snapshot.truncado} segmento={segmento} />

            <PainelFiltros
              filtros={filtros}
              onChange={setFiltros}
              ufs={UFS_ORDENADAS}
              municipios={municipios}
              modalidades={modalidades}
              esferas={esferas}
              categorias={categoriasDisponiveis}
              localizacao={localizacao}
              localizando={localizando}
              localizacaoErro={localizacaoErro}
              solicitarLocalizacao={solicitarLocalizacao}
              totalFiltrado={filtradas.length}
              totalGeral={licitacoesDoSegmento.length}
            />

            {filtradas.length === 0 ? (
              <div className="estado">
                <strong>Nenhuma oportunidade corresponde aos filtros selecionados.</strong>
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
              <section className="lista" aria-label="Oportunidades abertas">
                <header className="lista__cabecalho">
                  <div className="lista__titulos">
                    <h2>Oportunidades abertas</h2>
                    <span className="lista__contador">
                      {filtradas.length.toLocaleString('pt-BR')}{' '}
                      {filtradas.length === 1 ? 'edital' : 'editais'}
                    </span>
                  </div>
                  <div className="lista__acoes">
                    <button
                      type="button"
                      className={`mapa__botao-abrir${mostrarMapa ? ' mapa__botao-abrir--ativo' : ''}`}
                      onClick={() => setMostrarMapa((v) => !v)}
                      aria-expanded={mostrarMapa}
                    >
                      {mostrarMapa ? 'Ocultar mapa' : 'Ver mapa'}
                    </button>
                    <button type="button" className="ferramenta" onClick={() => void copiarLink()}>
                      {linkCopiado ? 'Link copiado ✓' : 'Copiar link'}
                    </button>
                    <button type="button" className="ferramenta" onClick={exportarCsv}>
                      CSV
                    </button>
                    <button type="button" className="ferramenta" onClick={exportarJson}>
                      JSON
                    </button>
                  </div>
                </header>

                {mostrarMapa && (
                  <Suspense
                    fallback={
                      <div className="mapa__moldura mapa__moldura--carregando" role="status">
                        Carregando mapa…
                      </div>
                    }
                  >
                    <MapaLicitacoes
                      licitacoes={filtradas}
                      onFiltrarMunicipio={confirmarMunicipioNoMapa}
                    />
                  </Suspense>
                )}

                {grupos.map((grupo) => (
                  <section key={grupo.chave} className="grupo" aria-label={grupo.rotulo}>
                    <h3 className="grupo__titulo">
                      {grupo.rotulo}
                      <span className="grupo__contador">{grupo.itens.length}</span>
                    </h3>
                    <div className="lista__grade">
                      {grupo.itens.map((licitacao) => (
                        <CartaoLicitacao
                          key={licitacao.id}
                          licitacao={licitacao}
                          segmento={segmento}
                          busca={filtros.busca}
                        />
                      ))}
                    </div>
                  </section>
                ))}
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
              Projeto independente e gratuito, sem vínculo com órgãos públicos. A cobertura depende
              de o órgão publicar no PNCP. {snapshot?.observacao ?? ''}
            </p>
          </div>
          <div className="rodape__bloco">
            <p className="rodape__titulo">Transparência</p>
            <p className="rodape__texto">
              Dados públicos do{' '}
              <a href="https://pncp.gov.br" target="_blank" rel="noopener noreferrer">
                Portal Nacional de Contratações Públicas (PNCP)
              </a>, do{' '}
              <a href="https://www.cultura.pr.gov.br/Pagina/Editais" target="_blank" rel="noopener noreferrer">
                SIC Cultura (Secretaria de Cultura do Paraná)
              </a>{' '}
              e dos{' '}
              <a
                href="https://www.gov.br/cultura/pt-br/assuntos/editais"
                target="_blank"
                rel="noopener noreferrer"
              >
                editais de fomento do Ministério da Cultura (MinC)
              </a>
              . A classificação (cultural ou tecnológica) é inferida automaticamente pelo texto do
              objeto e pode não refletir a classificação oficial.
            </p>
          </div>
        <div className="rodape__bloco">
            <p className="rodape__titulo">Acompanhar</p>
            <p className="rodape__texto">
              <a href="./feed.rss" rel="noopener noreferrer">Assinar o feed RSS</a> ·{' '}
              <a href="./calendario.ics" rel="noopener noreferrer">Adicionar ao calendário (iCal)</a>{' '}
              — exporte também o recorte filtrado com os botões CSVe JSON acima da lista.
            </p>
          </div>
        </div>
        <p className="rodape__base">Radar Cultural Brasil · atualização diária automática</p>
      </footer>
    </>
  );
}

function mensagemGeo(codigo: number): string {
  switch (codigo) {
    case 1:
      return 'Permissão de localização negada. Ative no navegador para usar o filtro de distância.';
    case 2:
      return 'Não foi possível obter sua localização. Tente novamente.';
    case 3:
      return 'A obtenção da localização expirou. Tente novamente.';
    default:
      return 'Não foi possível obter sua localização.';
  }
}