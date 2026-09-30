import type { Metadata } from 'next';
import Link from 'next/link';
import { PLANOS } from '@/billing/planos';
import { exigirUsuario } from '@/lib/auth/cookie';
import { getConfig } from '@/lib/env';
import { acaoCheckout } from '../acoes-billing';

export const metadata: Metadata = {
  title: 'Checkout — Lotus Radar',
  robots: { index: false },
};

export default async function PaginaCheckout({
  searchParams,
}: {
  searchParams: Promise<{ plano?: string }>;
}) {
  const usuario = await exigirUsuario('/checkout');
  const { plano: id } = await searchParams;
  if (id !== 'pro' && id !== 'equipe') {
    return (
      <div className="auth">
        <h1>Escolha um plano</h1>
        <p className="auth__sub">Selecione o plano que faz sentido para o seu trabalho.</p>
        <p className="auth__rodape">
          <Link href="/planos">Ver planos</Link>
        </p>
      </div>
    );
  }

  const plano = PLANOS[id];
  const mercadoPagoConfigurado = Boolean(getConfig().mercadoPagoToken);

  return (
    <div className="auth">
      <h1>Assinar {plano.nome}</h1>
      <p className="auth__sub">
        {plano.resumo} Cobrança recorrente de R${' '}
        {(plano.precoMensalCentavos / 100).toFixed(2).replace('.', ',')}/mês.
      </p>

      {!usuario.emailVerificadoEm ? (
        <div className="form__aviso form__aviso--erro" role="alert">
          Confirme seu e-mail antes de assinar.{' '}
          <Link href="/conta">Reenviar confirmação pela sua conta</Link>.
        </div>
      ) : !mercadoPagoConfigurado ? (
        <div className="form__aviso" role="status">
          O checkout está temporariamente indisponível. Entre em contato pelo e-mail de suporte.
        </div>
      ) : (
        <form action={acaoCheckout} className="form">
          <input type="hidden" name="plano" value={id} />
          <div className="painel-conta">
            <h2>{plano.nome} · R$ {(plano.precoMensalCentavos / 100).toFixed(2).replace('.', ',')}/mês</h2>
            <p className="painel-conta__nota">Conta: {usuario.email}</p>
            <ul className="plano__lista">
              {plano.destaques.map((destaque) => <li key={destaque}>{destaque}</li>)}
            </ul>
          </div>
          <p className="form__dica">
            O pagamento é processado pelo Mercado Pago. O plano só ativa quando recebermos a
            confirmação assinada do gateway; não envie dados de cartão ao Lotus Radar.
          </p>
          <button type="submit" className="form__botao">
            Continuar para o Mercado Pago
          </button>
        </form>
      )}

      <p className="auth__rodape">
        <Link href="/planos">Voltar aos planos</Link>
      </p>
    </div>
  );
}
