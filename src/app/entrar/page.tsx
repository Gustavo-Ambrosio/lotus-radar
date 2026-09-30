import type { Metadata } from 'next';
import Link from 'next/link';
import { FormularioAcao } from '../ui/formulario';
import { acaoLogin } from '../acoes';

export const metadata: Metadata = {
  title: 'Entrar — Lotus Radar',
  robots: { index: false },
};

export default async function PaginaEntrar({
  searchParams,
}: {
  searchParams: Promise<{ destino?: string; sair?: string }>;
}) {
  const { destino, sair } = await searchParams;

  return (
    <div className="auth">
      <h1>Entrar</h1>
      <p className="auth__sub">Acompanhe suas buscas salvas e os alertas do radar.</p>

      <FormularioAcao
        acao={acaoLogin}
        campos={[
          { nome: 'email', rotulo: 'E-mail', tipo: 'email', autoComplete: 'email', required: true },
          { nome: 'senha', rotulo: 'Senha', tipo: 'password', autoComplete: 'current-password', required: true },
        ]}
        ocultos={{ destino }}
        textoEnviar="Entrar"
        extras={
          <div className="form__alternativas">
            <Link href="/recuperar-senha">Esqueci a senha</Link>
            <Link href="/criar-conta">Criar conta</Link>
          </div>
        }
        avisoInicial={
          sair === '1' ? { texto: 'Você saiu da sua conta.' } : undefined
        }
      />
    </div>
  );
}
