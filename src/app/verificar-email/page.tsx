import type { Metadata } from 'next';
import Link from 'next/link';
import { confirmarEmail } from '../acoes';

export const metadata: Metadata = {
  title: 'Confirmar e-mail — Lotus Radar',
  robots: { index: false },
};

/**
 * A tela e' lida pelo link do e-mail, entao o consumo do token acontece aqui no
 * servidor. Reabrir a mesma URL devolve "ja usado", e nao um erro: quem clica
 * duas vezes (cliente de e-mail que abre e recarrega) precisa ver que deu
 * certo, nao um erro que sugere que algo deu errado.
 */
export default async function PaginaVerificarEmail({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="auth">
        <h1>Link incompleto</h1>
        <p className="auth__sub">O endereço está sem o código de segurança.</p>
        <p className="auth__rodape">
          <Link href="/conta">Ir para a minha conta</Link>
        </p>
      </div>
    );
  }

  const resultado = await confirmarEmail(token);

  return (
    <div className="auth">
      {resultado.ok ? (
        <>
          <h1>E-mail confirmado</h1>
          <p className="auth__sub">
            Sua conta está verificada. Os alertas passam a chegar sem cair em spam.
          </p>
          <p className="auth__rodape">
            <Link href="/">Ver o radar</Link>
          </p>
        </>
      ) : (
        <>
          <h1>Não deu para confirmar</h1>
          <p className="form__aviso form__aviso--erro" role="alert">
            {resultado.erro}
          </p>
          <p className="auth__rodape">
            <Link href="/conta">Abrir minha conta</Link> ·{' '}
            <Link href="/recuperar-senha">Pedir novo link</Link>
          </p>
        </>
      )}
    </div>
  );
}
