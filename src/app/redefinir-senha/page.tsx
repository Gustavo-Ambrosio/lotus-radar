import type { Metadata } from 'next';
import Link from 'next/link';
import { FormularioAcao } from '../ui/formulario';
import { acaoRedefinir } from '../acoes';
import { TAMANHO_MINIMO_SENHA } from '@/lib/auth/senha';

export const metadata: Metadata = {
  title: 'Redefinir senha — Lotus Radar',
  robots: { index: false },
};

export default async function PaginaRedefinir({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  // Sem token na URL nao ha o que redefinir: mostrar o formulario aqui faria a
  // pessoa digitar uma senha nova e perder o trabalho num erro de link.
  if (!token) {
    return (
      <div className="auth">
        <h1>Link incompleto</h1>
        <p className="auth__sub">
          O endereço está sem o código de segurança. Peça um novo link e abra pelo e-mail.
        </p>
        <p className="auth__rodape">
          <Link href="/recuperar-senha">Pedir novo link</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="auth">
      <h1>Nova senha</h1>
      <p className="auth__sub">
        Depois de salvar, todas as sessões abertas caem — inclusive as de outros aparelhos.
      </p>

      <FormularioAcao
        acao={acaoRedefinir}
        ocultos={{ token }}
        campos={[
          {
            nome: 'senha',
            rotulo: 'Senha nova',
            tipo: 'password',
            autoComplete: 'new-password',
            required: true,
            minLength: TAMANHO_MINIMO_SENHA,
            dica: `Mínimo de ${TAMANHO_MINIMO_SENHA} caracteres.`,
          },
          {
            nome: 'confirmacao',
            rotulo: 'Repetir a senha',
            tipo: 'password',
            autoComplete: 'new-password',
            required: true,
          },
        ]}
        textoEnviar="Salvar nova senha"
      />
    </div>
  );
}
