import type { Metadata } from 'next';
import Link from 'next/link';
import { db } from '@/lib/db';
import { buscasSalvas } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { exigirUsuario } from '@/lib/auth/cookie';
import { limitesDoPlano, PLANOS } from '@/billing/planos';
import { montarQuery } from '@/lib/url';
import { rotuloCategoria, rotuloSegmento } from '@/lib/segmentos';
import { formatarDataHora } from '@/lib/formato';
import { acaoAlternarAlerta, acaoExcluirBusca } from '../../acoes-busca';

export const metadata: Metadata = {
  title: 'Minhas buscas — Lotus Radar',
  robots: { index: false },
};

export const dynamic = 'force-dynamic';

type Params = Promise<Record<string, string | string[] | undefined>>;

export default async function PaginaBuscas({ searchParams }: { searchParams: Params }) {
  const usuario = await exigirUsuario('/conta/buscas');
  const params = await searchParams;
  const banco = await db();

  const buscas = await banco
    .select()
    .from(buscasSalvas)
    .where(eq(buscasSalvas.usuarioId, usuario.id))
    .orderBy(desc(buscasSalvas.atualizadoEm));

  const limite = limitesDoPlano(usuario.plano).buscasSalvas;
  const restantes = limite - buscas.length;
  const erro = params.erro;

  return (
    <div className="conta">
      <header className="conta__cabecalho">
        <h1>Minhas buscas</h1>
        <p>
          {buscas.length} de {limite} usadas
          {usuario.plano === 'gratuito' ? (
            <>
              {' · '}
              <Link href="/planos">Assinar o Pro</Link> para ter {limitesDoPlano('pro').buscasSalvas}{' '}
              buscas
            </>
          ) : null}
        </p>
      </header>

      {erro === 'limite' ? (
        <p className="form__aviso form__aviso--erro" role="alert">
          Você chegou no limite de {limite} busca(s) do plano {PLANOS[usuario.plano].nome}. Apague
          uma antiga ou <Link href="/planos">mude de plano</Link>.
        </p>
      ) : null}
      {erro === 'duplicada' ? (
        <p className="form__aviso form__aviso--erro" role="alert">
          Você já tinha salvo essa busca.
        </p>
      ) : null}
      {params.salva === '1' ? (
        <p className="form__aviso" role="status">
          Busca salva. O alerta de e-mail roda uma vez por dia, de madrugada.
        </p>
      ) : null}

      {buscas.length === 0 ? (
        <div className="vazio">
          <h2>Nenhuma busca salva ainda</h2>
          <p>
            Monte um recorte no radar e salve. O radar te avisa no mesmo dia quando entra algo
            naquele filtro.
          </p>
          <p style={{ marginTop: 20 }}>
            <Link className="conta__botao conta__botao--primario" href="/">
              Montar uma busca
            </Link>
          </p>
        </div>
      ) : (
        <div className="buscas">
          {buscas.map((busca) => {
            const filtros = busca.filtros as Record<string, unknown>;
            const segmento = busca.segmento === 'tecnologia' ? 'tecnologia' : 'cultura';
            const query =
              typeof filtros.query === 'string' && filtros.query
                ? filtros.query
                : montarQuery(segmento, filtros as never);
            const categorias = Array.isArray(filtros.categorias)
              ? (filtros.categorias as string[])
              : [];

            return (
              <article key={busca.id} className="busca">
                <div className="busca__topo">
                  <div>
                    <h3 className="busca__nome">{busca.nome}</h3>
                    <p className="busca__resumo">
                      {rotuloSegmento(segmento)}
                      {categorias.length > 0
                        ? ` · ${categorias.map((c) => rotuloCategoria(c)).join(', ')}`
                        : ''}
                      {typeof filtros.uf === 'string' && filtros.uf ? ` · ${filtros.uf}` : ''}
                      {busca.alertasEmail
                        ? ` · alerta ${busca.frequenciaAlerta}`
                        : ' · sem alerta'}
                    </p>
                  </div>
                </div>

                <div className="busca__acoes">
                  <Link className="conta__botao conta__botao--primario" href={`/${query}`}>
                    Ver resultados
                  </Link>

                  <form action={acaoAlternarAlerta}>
                    <input type="hidden" name="id" value={busca.id} />
                    <button type="submit" className="conta__botao">
                      {busca.alertasEmail ? 'Desligar alerta' : 'Ligar alerta'}
                    </button>
                  </form>

                  <form action={acaoExcluirBusca}>
                    <input type="hidden" name="id" value={busca.id} />
                    <button type="submit" className="conta__botao conta__botao--perigo">
                      Excluir
                    </button>
                  </form>
                </div>

                <p className="busca__resumo">
                  Criada em {formatarDataHora(busca.criadoEm.toISOString())}
                  {busca.ultimaExecucaoEm
                    ? ` · último alerta ${formatarDataHora(busca.ultimaExecucaoEm.toISOString())}`
                    : ' · nenhum alerta ainda'}
                </p>
              </article>
            );
          })}

          {restantes <= 0 ? (
            <p className="busca__resumo">
              Você usou todas as {limite} buscas do plano. <Link href="/planos">Veja os planos</Link>.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
