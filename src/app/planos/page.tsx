import type { Metadata } from 'next';
import Link from 'next/link';
import { db } from '@/lib/db';
import { usuarios } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { usuarioAtual } from '@/lib/auth/cookie';
import { ORDEM_PLANOS, PLANOS, precoFormatado } from '@/billing/planos';

export const metadata: Metadata = {
  title: 'Planos — Lotus Radar',
  description:
    'Gratuito, Pro e Equipe. Alertas por e-mail, buscas salvas, exportação e mapa por raio para quem trabalha com cultura e tecnologia.',
};

export default async function PaginaPlanos({
  searchParams,
}: {
  searchParams: Promise<{ boasVindas?: string; assinou?: string; checkout?: string }>;
}) {
  const { boasVindas, assinou, checkout } = await searchParams;
  const usuario = await usuarioAtual();

  const banco = await db();
  const conta = usuario
    ? await banco.select({ cancelouEm: usuarios.cancelouAssinaturaEm }).from(usuarios).where(eq(usuarios.id, usuario.id)).limit(1)
    : [];

  return (
    <div className="planos">
      <header className="planos__cabecalho">
        <h1>Planos</h1>
        <p>
          O radar é público e sempre estará no plano gratuito. O que se paga é o trabalho de fundo:
          olhar para avisar no mesmo dia, organizar a busca e exportar o que a sua equipe precisa.
        </p>
      </header>

      {boasVindas === '1' ? (
        <p className="form__aviso" role="status" style={{ maxWidth: 640, margin: '0 auto 28px' }}>
          Conta criada. Enviamos o e-mail de confirmação — clique no link para liberar os alertas. Até
          lá, o plano gratuito já está valendo.
        </p>
      ) : null}

      {assinou === '1' ? (
        <p className="form__aviso" role="status" style={{ maxWidth: 640, margin: '0 auto 28px' }}>
          Pagamento aprovado. O plano novo entra assim que o Mercado Pago confirmar — costuma levar
          menos de um minuto. Você pode sair desta página.
        </p>
      ) : null}

      {checkout === 'retorno' ? (
        <p className="form__aviso" role="status" style={{ maxWidth: 640, margin: '0 auto 28px' }}>
          Voltou do Mercado Pago. A assinatura só aparece ativa depois que o webhook confirmar o
          pagamento; confira sua conta em instantes.
        </p>
      ) : null}
      {checkout === 'indisponivel' ? (
        <p className="form__aviso form__aviso--erro" role="alert" style={{ maxWidth: 640, margin: '0 auto 28px' }}>
          Checkout temporariamente indisponível. Tente novamente mais tarde.
        </p>
      ) : null}
      {checkout === 'erro' ? (
        <p className="form__aviso form__aviso--erro" role="alert" style={{ maxWidth: 640, margin: '0 auto 28px' }}>
          Não conseguimos iniciar o checkout. Nenhum pagamento foi concluído; tente novamente.
        </p>
      ) : null}

      {conta[0]?.cancelouEm ? (
        <p className="form__aviso form__aviso--erro" role="alert" style={{ maxWidth: 640, margin: '0 auto 28px' }}>
          Você cancelou a assinatura. As buscas salvas continuam guardadas e voltam intactas se
          reassinar.
        </p>
      ) : null}

      <div className="planos__grade">
        {ORDEM_PLANOS.map((id) => {
          const plano = PLANOS[id];
          const atual = usuario?.plano === id;
          return (
            <article key={id} className={plano.destaque ? 'plano plano--destaque' : 'plano'}>
              {plano.destaque ? <span className="plano__selo">Mais escolhido</span> : null}
              <h2 className="plano__nome">{plano.nome}</h2>
              <p className="plano__preco">
                {precoFormatado(plano).replace('/mês', '')}
                {plano.precoMensalCentavos > 0 ? <small>/mês</small> : null}
              </p>
              <p className="plano__resumo">{plano.resumo}</p>
              <ul className="plano__lista">
                {plano.destaques.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              {atual ? (
                <span className="plano__cta" aria-current="true">
                  Seu plano atual
                </span>
              ) : id === 'gratuito' ? (
                <Link className="plano__cta" href={usuario ? '/conta' : '/criar-conta'}>
                  {usuario ? 'Gerenciar assinatura' : 'Começar de graça'}
                </Link>
              ) : (
                <Link
                  className="plano__cta plano__cta--primario"
                  href={usuario ? `/checkout?plano=${id}` : `/criar-conta?plano=${id}`}
                >
                  Assinar {plano.nome}
                </Link>
              )}
            </article>
          );
        })}
      </div>

      <p className="planos__rodape">
        Sem fidelidade: cancele quando quiser e as buscas salvas continuam guardadas.{' '}
        {usuario ? (
          <Link href="/conta">Ver minha conta</Link>
        ) : (
          <>
            <Link href="/criar-conta">Criar conta</Link> ou <Link href="/entrar">entrar</Link>.
          </>
        )}
      </p>
    </div>
  );
}
