import Link from 'next/link';

/**
 * A 404 raiz nao herda o `force-dynamic` do layout na fase de build, e o
 * `next build` tenta coletar a configuracao dela estaticamente — o que abriria
 * o banco sem `DATABASE_URL` e quebraria o build. Declarar aqui evita isso.
 */
export const dynamic = 'force-dynamic';

export default function PaginaNaoEncontrada() {
  return (
    <div className="vazio">
      <h2>Não encontramos esta página</h2>
      <p>
        O endereço pode ter mudado, ou a licitação saiu do radar porque encerrou.
      </p>
      <p style={{ marginTop: 20 }}>
        <Link className="conta__botao conta__botao--primario" href="/">
          Voltar ao radar
        </Link>
      </p>
    </div>
  );
}
