import Link from 'next/link';

/**
 * Paginacao por link, sem JavaScript. Cada pagina e' uma URL distinta, o que
 * mantem o botao "voltar" do navegador util (a lista nao fica presa num estado
 * que so o cliente conhece) e faz a pagina ser cacheavel.
 */
export function PaginaLista({
  pagina,
  paginas,
  total,
  consulta,
  rotuloItens = 'resultados',
}: {
  pagina: number;
  paginas: number;
  total: number;
  consulta: string;
  rotuloItens?: string;
}) {
  if (paginas <= 1) {
    return (
      <p className="paginacao__resumo">
        {total.toLocaleString('pt-BR')} {rotuloItens}
      </p>
    );
  }

  const comPagina = (n: number) => `${consulta}${consulta.includes('?') ? '&' : '?'}pagina=${n}`;

  // Janela deslizante de 5 paginas em torno da atual: em listagem de centenas de
  // paginas, mostrar todas transforma o rodape em um muro.
  const inicio = Math.max(1, Math.min(pagina - 2, paginas - 4));
  const fim = Math.min(paginas, inicio + 4);
  const numeros: number[] = [];
  for (let n = inicio; n <= fim; n += 1) numeros.push(n);

  return (
    <nav className="paginacao" aria-label="Paginação dos resultados">
      <span className="paginacao__resumo">
        Página {pagina} de {paginas} · {total.toLocaleString('pt-BR')} {rotuloItens}
      </span>

      <div className="paginacao__controles">
        {pagina > 1 ? (
          <Link className="paginacao__botao" href={comPagina(pagina - 1)} rel="prev">
            ← Anterior
          </Link>
        ) : (
          <span className="paginacao__botao paginacao__botao--off" aria-disabled="true">
            ← Anterior
          </span>
        )}

        {inicio > 1 ? <span className="paginacao__reticencias">…</span> : null}

        {numeros.map((n) =>
          n === pagina ? (
            <span key={n} className="paginacao__botao paginacao__botao--atual" aria-current="page">
              {n}
            </span>
          ) : (
            <Link key={n} className="paginacao__botao" href={comPagina(n)}>
              {n}
            </Link>
          ),
        )}

        {fim < paginas ? <span className="paginacao__reticencias">…</span> : null}

        {pagina < paginas ? (
          <Link className="paginacao__botao" href={comPagina(pagina + 1)} rel="next">
            Próxima →
          </Link>
        ) : (
          <span className="paginacao__botao paginacao__botao--off" aria-disabled="true">
            Próxima →
          </span>
        )}
      </div>
    </nav>
  );
}
