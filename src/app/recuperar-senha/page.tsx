import type { Metadata } from 'next';
import Link from 'next/link';
import { FormularioAcao } from '../ui/formulario';
import { acaoRecuperar } from '../acoes';

export const metadata: Metadata = {
  title: 'Recuperar senha — Lotus Radar',
  robots: { index: false },
};

export default function PaginaRecuperar() {
  return (
    <div className="auth">
      <h1>Recuperar senha</h1>
      <p className="auth__sub">
        Enviamos um link por e-mail. Ele vale por uma hora e pode ser usado uma vez só.
      </p>

      <FormularioAcao
        acao={acaoRecuperar}
        campos={[
          {
            nome: 'email',
            rotulo: 'E-mail da conta',
            tipo: 'email',
            autoComplete: 'email',
            required: true,
          },
        ]}
        textoEnviar="Enviar link"
        extras={
          <p className="form__dica" style={{ textAlign: 'center' }}>
            Lembrou a senha? <Link href="/entrar">Entrar</Link>
          </p>
        }
      />
    </div>
  );
}
