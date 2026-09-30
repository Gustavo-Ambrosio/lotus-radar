import type { Metadata } from 'next';
import Link from 'next/link';
import { db } from '@/lib/db';
import { assinaturas, buscasSalvas } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { exigirUsuario } from '@/lib/auth/cookie';
import { PLANOS, limitesDoPlano, precoFormatado } from '@/billing/planos';
import { formatarData } from '@/lib/formato';
import { acaoReenviarConfirmacao } from '../acoes-busca';
import { acaoCancelarAssinatura } from '../acoes-billing';

export const metadata: Metadata = {
  title: 'Minha conta — Lotus Radar',
  robots: { index: false },
};

/**
 * Painel da conta. Server Component: os limites do plano sao lidos do banco e
 * aplicados na tela — nada aqui e' so exibicao, o que a pessoa ve e' o que o
 * servidor vai aceitar.
 */
export default async function PaginaConta({
  searchParams,
}: {
  searchParams: Promise<{ senha?: string; confirmacao?: string; checkout?: string; cancelamento?: string }>;
}) {
  const usuario = await exigirUsuario('/conta');
  const { senha, confirmacao, checkout, cancelamento } = await searchParams;
  const banco = await db();

  const [assinatura] = await banco
    .select()
    .from(assinaturas)
    .where(eq(assinaturas.usuarioId, usuario.id))
    .limit(1);

  const buscas = await banco
    .select({
      id: buscasSalvas.id,
      nome: buscasSalvas.nome,
      alertasEmail: buscasSalvas.alertasEmail,
    })
    .from(buscasSalvas)
    .where(eq(buscasSalvas.usuarioId, usuario.id))
    .orderBy(desc(buscasSalvas.atualizadoEm));

  const plano = PLANOS[usuario.plano];
  const limites = limitesDoPlano(usuario.plano);
  const emDia = !usuario.planoValidoAte || usuario.planoValidoAte.getTime() > Date.now();

  return (
    <div className="conta">
      <header className="conta__cabecalho">
        <h1>Olá, {usuario.nome.split(' ')[0]}</h1>
        <p>
          {usuario.email}
          {usuario.emailVerificadoEm ? ' · e-mail confirmado' : ' · e-mail ainda não confirmado'}
        </p>
      </header>

      {senha === 'alterada' ? (
        <p className="form__aviso" role="status">
          Senha trocada. As outras sessões foram encerradas por segurança.
        </p>
      ) : null}

      {checkout === 'assinatura-existente' ? (
        <p className="form__aviso" role="status">
          Já existe uma assinatura ativa ou aguardando pagamento. Para evitar uma segunda cobrança,
          a troca de plano deve ser feita depois de cancelar a atual no Mercado Pago.
        </p>
      ) : null}
      {checkout === 'email-nao-confirmado' ? (
        <p className="form__aviso form__aviso--erro" role="alert">
          Confirme seu e-mail antes de abrir o checkout.
        </p>
      ) : null}
      {cancelamento === 'ok' ? (
        <p className="form__aviso" role="status">
          Renovação cancelada. Seu acesso pago permanece até o fim do período já cobrado.
        </p>
      ) : null}
      {cancelamento === 'erro' ? (
        <p className="form__aviso form__aviso--erro" role="alert">
          Não conseguimos cancelar no Mercado Pago. Tente novamente ou cancele pelo painel do gateway.
        </p>
      ) : null}

      {!usuario.emailVerificadoEm ? (
        <div className="form__aviso form__aviso--erro" role="status">
          <p style={{ margin: 0 }}>
            Sem confirmar o e-mail, não podemos enviar alertas. Confira também a pasta de spam.
          </p>
          {confirmacao === 'reenviada' ? (
            <p style={{ margin: '8px 0 0' }}>Novo link enviado para {usuario.email}.</p>
          ) : (
            <form action={acaoReenviarConfirmacao} style={{ marginTop: 10 }}>
              <button type="submit" className="conta__botao">
                Reenviar confirmação
              </button>
            </form>
          )}
        </div>
      ) : null}

      <section className="painel-conta">
        <h2>Plano</h2>
        <p className="painel-conta__nota">{plano.resumo}</p>

        <dl className="painel-conta__linhas">
          <div className="painel-conta__linha">
            <dt>Plano atual</dt>
            <dd>
              {plano.nome} · {precoFormatado(plano)}
              {emDia ? '' : ' (vencido)'}
            </dd>
          </div>
          {usuario.planoValidoAte ? (
            <div className="painel-conta__linha">
              <dt>Válido até</dt>
              <dd>{formatarData(usuario.planoValidoAte.toISOString())}</dd>
            </div>
          ) : null}
          {assinatura ? (
            <>
              <div className="painel-conta__linha">
                <dt>Assinatura</dt>
                <dd>{assinatura.status}</dd>
              </div>
              {assinatura.proximaCobrancaEm ? (
                <div className="painel-conta__linha">
                  <dt>Próxima cobrança</dt>
                  <dd>{formatarData(assinatura.proximaCobrancaEm.toISOString())}</dd>
                </div>
              ) : null}
            </>
          ) : null}
          <div className="painel-conta__linha">
            <dt>Buscas salvas</dt>
            <dd>
              {buscas.length} de {limites.buscasSalvas}
            </dd>
          </div>
        </dl>

        <div className="conta__acoes">
          <Link className="conta__botao conta__botao--primario" href="/planos">
            {usuario.plano === 'gratuito' ? 'Assinar um plano' : 'Ver planos'}
          </Link>
          <Link className="conta__botao" href="/conta/buscas">
            Minhas buscas
          </Link>
          {assinatura?.preapprovalId && ['ativa', 'atrasada', 'pendente'].includes(assinatura.status) ? (
            <form action={acaoCancelarAssinatura}>
              <button type="submit" className="conta__botao conta__botao--perigo">
                Cancelar renovação
              </button>
            </form>
          ) : null}
        </div>
      </section>

      <section className="painel-conta">
        <h2>Dados da conta</h2>
        <p className="painel-conta__nota">Usamos isso para emitir a nota fiscal do plano pago.</p>
        <dl className="painel-conta__linhas">
          <div className="painel-conta__linha">
            <dt>Nome</dt>
            <dd>{usuario.nome}</dd>
          </div>
          {usuario.empresa ? (
            <div className="painel-conta__linha">
              <dt>Empresa</dt>
              <dd>{usuario.empresa}</dd>
            </div>
          ) : null}
          {usuario.documento ? (
            <div className="painel-conta__linha">
              <dt>CPF/CNPJ</dt>
              <dd>{usuario.documento}</dd>
            </div>
          ) : null}
        </dl>
        <div className="conta__acoes">
          <Link className="conta__botao" href="/recuperar-senha">
            Trocar a senha
          </Link>
        </div>
      </section>
    </div>
  );
}
