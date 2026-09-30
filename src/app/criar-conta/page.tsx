import type { Metadata } from 'next';
import Link from 'next/link';
import { FormularioAcao } from '../ui/formulario';
import { acaoCadastro } from '../acoes';
import { TAMANHO_MINIMO_SENHA } from '@/lib/auth/senha';

export const metadata: Metadata = {
  title: 'Criar conta — Lotus Radar',
  description:
    'Crie sua conta no Lotus Radar e receba alerta por e-mail quando abrir licitação da sua área.',
  robots: { index: false },
};

export default function PaginaCriarConta() {
  return (
    <div className="auth auth--largo">
      <h1>Criar conta</h1>
      <p className="auth__sub">
        O plano gratuito acompanha o radar inteiro. Os planos pagos somam busca salva, alerta por
        e-mail e filtro por raio de distância.
      </p>

      <FormularioAcao
        acao={acaoCadastro}
        campos={[
          { nome: 'nome', rotulo: 'Nome', autoComplete: 'name', required: true, maxLength: 120 },
          { nome: 'email', rotulo: 'E-mail', tipo: 'email', autoComplete: 'email', required: true },
          {
            nome: 'senha',
            rotulo: 'Senha',
            tipo: 'password',
            autoComplete: 'new-password',
            required: true,
            minLength: TAMANHO_MINIMO_SENHA,
            dica: `Mínimo de ${TAMANHO_MINIMO_SENHA} caracteres. Use uma frase que você não usa em outro site.`,
          },
          {
            nome: 'empresa',
            rotulo: 'Empresa ou repartição',
            autoComplete: 'organization',
            maxLength: 160,
            dica: 'Opcional. Sai na nota fiscal e nos emails.',
          },
          {
            nome: 'documento',
            rotulo: 'CPF ou CNPJ',
            maxLength: 18,
            dica: 'Opcional. Necessário só para emitir nota fiscal.',
          },
        ]}
        textoEnviar="Criar conta e começar"
        extras={
          <p className="form__dica" style={{ textAlign: 'center' }}>
            Ao criar a conta você concorda com os termos de uso. Já tem conta?{' '}
            <Link href="/entrar">Entrar</Link>
          </p>
        }
      />
    </div>
  );
}
