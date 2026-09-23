import type { Filtros } from '../lib/filtros';
import { NOME_UF, type Coordenadas } from '../lib/geo';
import type { MunicipioBrasil } from '../lib/municipios-br';

interface OpcaoCategoria {
  id: string;
  label: string;
  cor: string;
  total: number;
}

interface Props {
  filtros: Filtros;
  onChange: (filtros: Filtros) => void;
  ufs: readonly string[];
  municipios: readonly MunicipioBrasil[];
  modalidades: string[];
  esferas: string[];
  categorias: OpcaoCategoria[];
  localizacao: Coordenadas | null;
  localizando: boolean;
  localizacaoErro: string | null;
  solicitarLocalizacao: () => void;
  totalFiltrado: number;
  totalGeral: number;
}

const DISTANCIAS = [50, 100, 150, 250, 500, 1000];

export function PainelFiltros({
  filtros,
  onChange,
  ufs,
  municipios,
  modalidades,
  esferas,
  categorias,
  localizacao,
  localizando,
  localizacaoErro,
  solicitarLocalizacao,
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

  const municipiosFiltrados = useMemoMunicipios(filtros.uf, municipios);

  const ativos = montarAtivos(filtros, onChange, categorias);

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
              onChange={(e) => atualizar('busca', e.target.value)}
            />
          </div>
        </div>

        <div className="campo">
          <label htmlFor="uf">Estado</label>
          <select id="uf" value={filtros.uf} onChange={(e) => atualizar('uf', e.target.value)}>
            <option value="">Todos os estados</option>
            {ufs.map((uf) => (
              <option key={uf} value={uf}>
                {uf} — {NOME_UF[uf] ?? uf}
              </option>
            ))}
          </select>
        </div>

        <div className="campo">
          <label htmlFor="municipio">Município</label>
          <select
            id="municipio"
            value={filtros.municipio}
            onChange={(e) => atualizar('municipio', e.target.value)}
          >
            <option value="">Todos os municípios</option>
            {agruparPorUf(municipiosFiltrados).map((grupo) => (
              <optgroup key={grupo.uf} label={`${grupo.uf} — ${NOME_UF[grupo.uf] ?? grupo.uf}`}>
                {grupo.itens.map((m) => (
                  <option key={m.codigoIbge} value={m.nome}>
                    {m.nome}
                  </option>
                ))}
              </optgroup>
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
      </div>

      <div className="filtros__linha filtros__linha--secundaria">
        <div className="campo">
          <label htmlFor="publicado">Publicados em</label>
          <select
            id="publicado"
            value={filtros.publicadoDias === null ? '' : String(filtros.publicadoDias)}
            onChange={(e) =>
              atualizar('publicadoDias', e.target.value === '' ? null : Number(e.target.value))
            }
          >
            <option value="">Qualquer data</option>
            <option value="7">Últimos 7 dias</option>
            <option value="15">Últimos 15 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="60">Últimos 60 dias</option>
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
            <option value="orgao">Órgão (A–Z)</option>
          </select>
        </div>

        <div className="campo">
          <label htmlFor="valor-min">Valor mínimo (R$)</label>
          <input
            id="valor-min"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="sem mínimo"
            value={filtros.valorMinimo ?? ''}
            onChange={(e) => atualizar('valorMinimo', parseNumero(e.target.value))}
          />
        </div>

        <div className="campo">
          <label htmlFor="valor-max">Valor máximo (R$)</label>
          <input
            id="valor-max"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="sem máximo"
            value={filtros.valorMaximo ?? ''}
            onChange={(e) => atualizar('valorMaximo', parseNumero(e.target.value))}
          />
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
      </div>

      <div className="filtros__linha filtros__linha--terciaria">
        <div className="campo">
          <label htmlFor="distancia">Distância da minha localização</label>
          <select
            id="distancia"
            value={filtros.distanciaMaxKm === null ? '' : String(filtros.distanciaMaxKm)}
            onChange={(e) =>
              atualizar('distanciaMaxKm', e.target.value === '' ? null : Number(e.target.value))
            }
            disabled={!localizacao}
          >
            <option value="">Qualquer distância</option>
            {DISTANCIAS.map((km) => (
              <option key={km} value={km}>
                Até {km} km
              </option>
            ))}
          </select>
        </div>

        <div className="campo">
          <label htmlFor="localizacao">Minha localização</label>
          <div className="campo__controle-localizacao">
            {localizacao ? (
              <input
                id="localizacao"
                type="text"
                readOnly
                value={`Lat ${localizacao.lat.toFixed(4)}, Lng ${localizacao.lng.toFixed(4)}`}
              />
            ) : (
              <input id="localizacao" type="text" readOnly placeholder="não compartilhada" />
            )}
            <button
              type="button"
              className="botao-localizar"
              onClick={solicitarLocalizacao}
              disabled={localizando}
            >
              {localizando ? 'Localizando…' : localizacao ? 'Atualizar' : 'Usar minha localização'}
            </button>
          </div>
          {localizacaoErro && <p className="campo__aviso">{localizacaoErro}</p>}
        </div>

        <div className="campo campo--check">
          <span className="campo__rotulo">Valor estimado</span>
          <label className="campo__check-rotulo">
            <input
              type="checkbox"
              checked={filtros.somenteComValor}
              onChange={(e) => atualizar('somenteComValor', e.target.checked)}
            />
            Só com valor
          </label>
        </div>
      </div>

      <div className="filtros__categorias">
        <p className="filtros__subtitulo">Categorias</p>
        <div className="chips">
          {categorias.map((categoria) => {
            const ativo = filtros.categorias.includes(categoria.id);
            const classe = [
              'chip',
              ativo ? 'chip--ativo' : '',
              categoria.total === 0 ? 'chip--zero' : '',
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <button
                type="button"
                key={categoria.id}
                className={classe}
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

      {ativos.length > 0 && (
        <div className="filtros__ativos">
          <p className="filtros__subtitulo">
            Filtros ativos ({ativos.length})
          </p>
          <div className="chips">
            {ativos.map((ativo) => (
              <span key={ativo.chave} className="ativo">
                {ativo.rotulo}
                <button
                  type="button"
                  className="ativo__remover"
                  aria-label={`Remover filtro ${ativo.rotulo}`}
                  onClick={ativo.limpar}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="filtros__rodape">
        <span className="filtros__rodape-info">
          Resultado {plural(totalFiltrado)} — filtros aplicados em tempo real
        </span>
        <button
          type="button"
          className="botao-limpar"
          onClick={() =>
            onChange({
              ...filtros,
              busca: '',
              categorias: [],
              uf: '',
              municipio: '',
              esfera: '',
              modalidade: '',
              distanciaMaxKm: null,
              prazoMaxDias: null,
              publicadoDias: null,
              valorMinimo: null,
              valorMaximo: null,
              somenteComValor: false,
            })
          }
        >
          Limpar filtros
        </button>
      </div>
    </section>
  );
}

function useMemoMunicipios(uf: string, municipios: readonly MunicipioBrasil[]): MunicipioBrasil[] {
  const ativo = uf.trim().toUpperCase();
  if (!ativo) return municipios as MunicipioBrasil[];
  return municipios.filter((m) => m.uf === ativo);
}

function agruparPorUf(
  municipios: readonly MunicipioBrasil[],
): Array<{ uf: string; itens: MunicipioBrasil[] }> {
  const grupos = new Map<string, MunicipioBrasil[]>();
  for (const m of municipios) {
    const atual = grupos.get(m.uf) ?? [];
    atual.push(m);
    grupos.set(m.uf, atual);
  }
  return [...grupos.entries()].map(([uf, itens]) => ({ uf, itens }));
}

interface FiltroAtivo {
  chave: string;
  rotulo: string;
  limpar: () => void;
}

function montarAtivos(
  filtros: Filtros,
  onChange: (filtros: Filtros) => void,
  categorias: OpcaoCategoria[],
): FiltroAtivo[] {
  const ativos: FiltroAtivo[] = [];
  const limpar = (patch: Partial<Filtros>) => onChange({ ...filtros, ...patch });

  if (filtros.busca) {
    const curto = filtros.busca.length > 24 ? `${filtros.busca.slice(0, 24)}…` : filtros.busca;
    ativos.push({ chave: 'busca', rotulo: `Busca: “${curto}”`, limpar: () => limpar({ busca: '' }) });
  }
  if (filtros.uf) {
    ativos.push({ chave: 'uf', rotulo: `Estado: ${filtros.uf}`, limpar: () => limpar({ uf: '' }) });
  }
  if (filtros.municipio) {
    ativos.push({ chave: 'municipio', rotulo: `Município: ${filtros.municipio}`, limpar: () => limpar({ municipio: '' }) });
  }
  if (filtros.esfera) {
    ativos.push({ chave: 'esfera', rotulo: `Esfera: ${filtros.esfera}`, limpar: () => limpar({ esfera: '' }) });
  }
  if (filtros.modalidade) {
    ativos.push({ chave: 'modalidade', rotulo: `Modalidade: ${filtros.modalidade}`, limpar: () => limpar({ modalidade: '' }) });
  }
  if (filtros.distanciaMaxKm !== null) {
    ativos.push({ chave: 'distancia', rotulo: `Até ${filtros.distanciaMaxKm} km`, limpar: () => limpar({ distanciaMaxKm: null }) });
  }
  if (filtros.prazoMaxDias !== null) {
    ativos.push({ chave: 'prazo', rotulo: `Encerra em até ${filtros.prazoMaxDias} dias`, limpar: () => limpar({ prazoMaxDias: null }) });
  }
  if (filtros.publicadoDias !== null) {
    ativos.push({ chave: 'publicado', rotulo: `Publicados em ${filtros.publicadoDias} dias`, limpar: () => limpar({ publicadoDias: null }) });
  }
  if (filtros.valorMinimo !== null) {
    ativos.push({ chave: 'valor-min', rotulo: `Valor mínimo: ${filtros.valorMinimo.toLocaleString('pt-BR')}`, limpar: () => limpar({ valorMinimo: null }) });
  }
  if (filtros.valorMaximo !== null) {
    ativos.push({ chave: 'valor-max', rotulo: `Valor máximo: ${filtros.valorMaximo.toLocaleString('pt-BR')}`, limpar: () => limpar({ valorMaximo: null }) });
  }
  if (filtros.somenteComValor) {
    ativos.push({ chave: 'valor-ok', rotulo: 'Só com valor informado', limpar: () => limpar({ somenteComValor: false }) });
  }
  for (const id of filtros.categorias) {
    const categoria = categorias.find((c) => c.id === id);
    ativos.push({
      chave: `categoria-${id}`,
      rotulo: `Categoria: ${categoria?.label ?? id}`,
      limpar: () => limpar({ categorias: filtros.categorias.filter((c) => c !== id) }),
    });
  }

  return ativos;
}

function parseNumero(valor: string): number | null {
  if (valor === '') return null;
  const numero = Number(valor);
  return Number.isFinite(numero) && numero >= 0 ? numero : null;
}

function plural(total: number): string {
  return total === 1 ? '1 edital' : `${total} editais`;
}