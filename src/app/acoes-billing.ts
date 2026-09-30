'use server';

import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { assinaturas, usuarios } from '@/db/schema';
import { PLANOS } from '@/billing/planos';
import { exigirUsuario } from '@/lib/auth/cookie';
import { db } from '@/lib/db';
import { getConfig } from '@/lib/env';
import { cancelarAssinaturaMP, criarAssinaturaMP } from '@/lib/mercadopago';
import { urlSegura } from '@/lib/seguranca';

/** Inicia o checkout recorrente e deixa a ativacao para o webhook assinado. */
export async function acaoCheckout(formData: FormData): Promise<void> {
  const usuario = await exigirUsuario('/planos');
  const idPlano = formData.get('plano');
  if (idPlano !== 'pro' && idPlano !== 'equipe') redirect('/planos?checkout=plano-invalido');
  const planoId: 'pro' | 'equipe' = idPlano === 'pro' ? 'pro' : 'equipe';
  if (!usuario.emailVerificadoEm) redirect('/conta?checkout=email-nao-confirmado');
  if (usuario.plano === planoId && usuario.planoValidoAte && usuario.planoValidoAte > new Date()) {
    redirect('/conta?checkout=plano-atual');
  }

  const config = getConfig();
  if (!config.mercadoPagoToken) redirect('/planos?checkout=indisponivel');

  const plano = PLANOS[planoId];
  const origem = config.urlBase;
  const banco = await db();
  const [existente] = await banco
    .select({ id: assinaturas.id, status: assinaturas.status })
    .from(assinaturas)
    .where(eq(assinaturas.usuarioId, usuario.id))
    .limit(1);

  // Evita abrir uma segunda cobrança recorrente. A troca de plano tem que
  // esperar o cancelamento da recorrência atual no Mercado Pago.
  if (existente && ['ativa', 'pendente', 'atrasada'].includes(existente.status)) {
    redirect('/conta?checkout=assinatura-existente');
  }

  const assinaturaId = existente?.id ?? randomUUID();
  const valoresPendentes = {
    plano: planoId,
    preapprovalId: null,
    externalReference: usuario.id,
    status: 'pendente' as const,
    motivoStatus: 'checkout em criação',
    valorCentavos: plano.precoMensalCentavos,
    moeda: 'BRL',
    atualizadoEm: new Date(),
  };
  if (existente) {
    await banco.update(assinaturas).set(valoresPendentes).where(eq(assinaturas.id, assinaturaId));
  } else {
    await banco.insert(assinaturas).values({ id: assinaturaId, usuarioId: usuario.id, ...valoresPendentes });
  }

  let checkout: Awaited<ReturnType<typeof criarAssinaturaMP>>;
  try {
    checkout = await criarAssinaturaMP({
      usuarioId: usuario.id,
      email: usuario.email,
      nomePlano: plano.nome,
      valorCentavos: plano.precoMensalCentavos,
      retorno: config.urlRetornoCheckout,
      webhook: `${origem}/api/webhooks/mercadopago`,
    });
  } catch {
    // Nao registrar corpo da resposta do gateway: pode conter dados do cliente.
    await banco
      .update(assinaturas)
      .set({ status: 'inativa', motivoStatus: 'falha ao iniciar checkout', atualizadoEm: new Date() })
      .where(eq(assinaturas.id, assinaturaId));
    redirect('/planos?checkout=erro');
  }

  const endereco = urlSegura(checkout.url);
  if (!endereco || !endereco.startsWith('https://')) redirect('/planos?checkout=erro');

  const valores = {
    plano: planoId,
    preapprovalId: checkout.id,
    externalReference: usuario.id,
    status: 'pendente' as const,
    motivoStatus: checkout.status,
    valorCentavos: plano.precoMensalCentavos,
    moeda: 'BRL',
    atualizadoEm: new Date(),
  };

  await banco.update(assinaturas).set(valores).where(eq(assinaturas.id, assinaturaId));

  redirect(endereco);
}

/** Cancela renovacoes futuras sem apagar buscas salvas nem encurtar o ciclo pago. */
export async function acaoCancelarAssinatura(): Promise<void> {
  const usuario = await exigirUsuario('/conta');
  const banco = await db();
  const [assinatura] = await banco
    .select()
    .from(assinaturas)
    .where(eq(assinaturas.usuarioId, usuario.id))
    .limit(1);

  if (!assinatura?.preapprovalId || !['ativa', 'atrasada', 'pendente'].includes(assinatura.status)) {
    redirect('/conta?cancelamento=indisponivel');
  }

  try {
    await cancelarAssinaturaMP(assinatura.preapprovalId);
  } catch {
    redirect('/conta?cancelamento=erro');
  }

  const agora = new Date();
  await banco
    .update(assinaturas)
    .set({ status: 'cancelada', canceladoEm: agora, atualizadoEm: agora })
    .where(eq(assinaturas.id, assinatura.id));
  await banco
    .update(usuarios)
    .set({ cancelouAssinaturaEm: agora, atualizadoEm: agora })
    .where(eq(usuarios.id, usuario.id));

  redirect('/conta?cancelamento=ok');
}
