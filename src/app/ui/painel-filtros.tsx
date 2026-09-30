import Link from 'next/link';
import type { Filtros } from '@/lib/filtros';
import { urlDaConsulta } from '@/lib/url';
import type { Segmento } from '@/lib/tipos';

/**
 * Os filtros sao um formulario GET. Cada mudanca de campo e' um link rebuilt a
 * partir dos outros valores, e o que a pessoa digitou no texto continua na URL
 * porque ela e' a fonte da verdade — recarregar a pagina mantem o recorte.
 */

const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

const ORDENACOES: { valor: string; rotulo: string }[] = [
  { valor: 'prazo', rotulo: 'Prazo mais próximo' },
  { valor: 'valor', rotulo: 'Maior valor' },
  { valor: 'recente', rotulo: 'Publicado recentemente' },
  { valor: 'relevancia', rotulo: 'Relevância da busca' },
];

interface Props {
  segmento: Segmento;
  categorias: { id: string; label: string; cor: string }[];
  filtros: Filtros;
}

export function PainelFiltros({ segmento, categorias, filtros }: Props) {
  /** Refaz a query alternando uma categoria, mantendo o resto do recorte. */
  const alternaCategoria = (id: string): string => {
    const marcadas = filtros.categorias.includes(id)
      ? filtros.categorias.filter((c) => c !== id)
      : [...filtros.categorias, id];
    return urlDaConsulta(segmento, { ...filtros, categorias: marcadas });
  };

  const vazio =
    filtros.busca === '' &&
    filtros.categorias.length === 0 &&
    filtros.uf === '' &&
    filtros.municipio === '' &&
    filtros.esfera === '' &&
    filtros.modalidade === '' &&
    filtros.prazoMaxDias === null &&
    filtros.valorMinimo === null &&
    filtros.valorMaximo === null;

  return (
    <aside className="painel" aria-label="Filtros">
      <div className="filtros__titulo">
        <h2>Filtros</h2>
        {!vazio ? (
          <Link className="filtros__limpar" href={`/?seg=${segmento}`}>
            limpar
          </Link>
        ) : null}
      </div>

      <form className="filtros__corpo" method="get" action={`/?seg=${segmento}`}>
        <input type="hidden" name="seg" value={segmento} />

        <div className="campo campo--busca">
          <label htmlFor="f-busca">Buscar no objeto</label>
          <input
            id="f-busca"
            type="search"
            name="busca"
            defaultValue={filtros.busca}
            placeholder="ex.: festival, proyeção, orquestra"
          />
        </div>

        <div className="filtros__linha">
          <div className="campo">
            <label htmlFor="f-uf">Estado</label>
            <select id="f-uf" name="uf" defaultValue={filtros.uf}>
              <option value="">Todos</option>
              {UFS.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="f-municipio">Município</label>
            <input id="f-municipio" name="municipio" defaultValue={filtros.municipio} placeholder="Curitiba" />
          </div>
        </div>

        <div className="filtros__linha">
          <div className="campo">
            <label htmlFor="f-prazo">Prazo (dias)</label>
            <select
              id="f-prazo"
              name="prazoMaxDias"
              defaultValue={filtros.prazoMaxDias ?? ''}
            >
              <option value="">Qualquer</option>
              <option value="7">Até 7 dias</option>
              <option value="15">Até 15 dias</option>
              <option value="30">Até 30 dias</option>
              <option value="60">Até 60 dias</option>
            </select>
          </div>
          <div className="campo">
            <label htmlFor="f-ordenacao">Ordenar por</label>
            <select id="f-ordenacao" name="ordenacao" defaultValue={filtros.ordenacao}>
              {ORDENACOES.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.rotulo}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="filtros__linha">
          <div className="campo">
            <label htmlFor="f-vmin">Valor mín. (R$)</label>
            <input
              id="f-vmin"
              name="valorMinimo"
              type="number"
              min={0}
              step={1000}
              defaultValue={filtros.valorMinimo ?? ''}
            />
          </div>
          <div className="campo">
            <label htmlFor="f-vmax">Valor máx. (R$)</label>
            <input
              id="f-vmax"
              name="valorMaximo"
              type="number"
              min={0}
              step={1000}
              defaultValue={filtros.valorMaximo ?? ''}
            />
          </div>
        </div>

        <button type="submit" className="filtros__aplicar">
          Aplicar filtros
        </button>
      </form>

      <div className="filtros__categorias">
        <p className="filtros__subtitulo">Categoria</p>
        <div className="chips">
          {categorias.map((c) => (
            <Link
              key={c.id}
              href={alternaCategoria(c.id)}
              className={
                filtros.categorias.includes(c.id) ? 'chip chip--ativo' : 'chip'
              }
              aria-pressed={filtros.categorias.includes(c.id)}
              style={{ borderColor: c.cor }}
            >
              <span className="chip__ponto" style={{ background: c.cor }} aria-hidden="true" />
              {c.label}
            </Link>
          ))}
        </div>
      </div>

      {!vazio ? (
        <p className="filtros__rodape-info">
          Mostrando só o que combina com o filtro. Entrou numa conta paga? Dá para salvar esta
          busca e receber o alerta por e-mail.
        </p>
      ) : null}
    </aside>
  );
}
