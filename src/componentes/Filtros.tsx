import type { Filtros } from '../lib/filtros';

interface OpcaoCategoria {
  id: string;
  label: string;
  cor: string;
  total: number;
}

interface Props {
  filtros: Filtros;
  onChange: (filtros: Filtros) => void;
  municipios: string[];
  modalidades: string[];
  esferas: string[];
  categorias: OpcaoCategoria[];
  totalFiltrado: number;
  totalGeral: number;
}

export function PainelFiltros({
  filtros,
  onChange,
  municipios,
  modalidades,
  esferas,
  categorias,
  totalFiltrado,
  totalGeral,
}: Props) {
  function atualizar<K extends keyof Filtros>(campo: K, valor: Filtros[K]) {
    onChange({ ...filtros, [campo]: valor });
  }

  function alternarCategoria(id: string) {
    const ativo = filtros.categorias.includes(id);
    atualizar(
      'categorias',
      ativo ? filtros.categorias.filter((c) => c !== id) : [...filtros.categorias, id],
    );
  }

  return (
    <section className="painel filtros" aria-label="Filtros">
      <div className="filtros__titulo">
        <h2>Filtrar oportunidades</h2>
        <span className="filtros__resumo">
          Mostrando <strong>{totalFiltrado}</strong> de <strong>{totalGeral}</strong>
        </span>
      </div>

      <div className="filtros__linha">
        <div className="campo campo--busca">
          <label htmlFor="busca">Buscar</label>
          <div className="campo__controle">
            <svg
              className="campo__icone"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
            </svg>
            <input
              id="busca"
              type="search"
              placeholder="Objeto, órgão ou município"
              value={filtros.busca}
              autoComplete="off"
              aria-describedby="ajuda-busca"
              onChange={(e) => atualizar('busca', e.target.value)}
            />
            <span id="ajuda-busca" hidden>
              Busca por palavras-chave do objeto, nome do órgão ou município
            </span>
          </div>
        </div>

        <div className="campo">
          <label htmlFor="municipio">Município</label>
          <select
            id="municipio"
            value={filtros.municipio}
            onChange={(e) => atualizar('municipio', e.target.value)}
          >
            <option value="">Todos os municípios</option>
            {municipios.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div className="campo">
          <label htmlFor="esfera">Esfera</label>
          <select id="esfera" value={filtros.esfera} onChange={(e) => atualizar('esfera', e.target.value)}>
            <option value="">Todas as esferas</option>
            {esferas.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>

        <div className="campo">
          <label htmlFor="modalidade">Modalidade</label>
          <select
            id="modalidade"
            value={filtros.modalidade}
            onChange={(e) => atualizar('modalidade', e.target.value)}
          >
            <option value="">Todas as modalidades</option>
            {modalidades.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div className="campo">
          <label htmlFor="prazo">Prazo</label>
          <select
            id="prazo"
            value={filtros.prazoMaxDias === null ? '' : String(filtros.prazoMaxDias)}
            onChange={(e) =>
              atualizar('prazoMaxDias', e.target.value === '' ? null : Number(e.target.value))
            }
          >
            <option value="">Qualquer prazo</option>
            <option value="3">Encerra em 3 dias</option>
            <option value="7">Encerra em 7 dias</option>
            <option value="15">Encerra em 15 dias</option>
            <option value="30">Encerra em 30 dias</option>
          </select>
        </div>

        <div className="campo">
          <label htmlFor="ordenacao">Ordenar por</label>
          <select
            id="ordenacao"
            value={filtros.ordenacao}
            onChange={(e) => atualizar('ordenacao', e.target.value as Filtros['ordenacao'])}
          >
            <option value="prazo">Prazo mais próximo</option>
            <option value="recentes">Publicados recentemente</option>
            <option value="valor-desc">Maior valor</option>
            <option value="valor-asc">Menor valor</option>
            <option value="municipio">Município</option>
          </select>
        </div>
      </div>

      <div className="filtros__categorias">
        <p className="filtros__subtitulo">Categorias</p>
        <div className="chips">
          {categorias.map((categoria) => {
            const ativo = filtros.categorias.includes(categoria.id);
            return (
              <button
                type="button"
                key={categoria.id}
                className={ativo ? 'chip chip--ativo' : 'chip'}
                onClick={() => alternarCategoria(categoria.id)}
                aria-pressed={ativo}
              >
                <span className="chip__ponto" style={{ background: categoria.cor }} />
                {categoria.label}
                <strong className="chip__total">{categoria.total}</strong>
              </button>
            );
          })}
        </div>
      </div>

      <div className="filtros__rodape">
        <span className="filtros__rodape-info">
          Resultado {filtradosTexto(totalFiltrado)} — filtros aplicados em tempo real
        </span>
        <button
          type="button"
          className="botao-limpar"
          onClick={() =>
            onChange({
              ...filtros,
              busca: '',
              categorias: [],
              municipio: '',
              esfera: '',
              modalidade: '',
              prazoMaxDias: null,
            })
          }
        >
          Limpar filtros
        </button>
      </div>
    </section>
  );
}

function filtradosTexto(total: number): string {
  return total === 1 ? '1 edital' : `${total} editais`;
}