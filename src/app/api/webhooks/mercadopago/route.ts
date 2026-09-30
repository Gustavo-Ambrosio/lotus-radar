import { createHash } from 'node:crypto';
import { eq, or } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { planoPorPreco } from '@/billing/planos';
import { assinaturas, eventosPagamento, usuarios } from '@/db/schema';
import { db } from '@/lib/db';
import { getConfig } from '@/lib/env';
import { assinaturaWebhookValida, consultarAssinaturaMP } from '@/lib/mercadopago';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const aviso = (status: number, ok: boolean) => NextResponse.json({ ok }, { status });

/**
 * Webhook Mercado Pago. O payload recebido serve apenas para localizar o
 * evento; identidade, estado e valor são sempre consultados no MP após validar
 * o HMAC. A linha bruta fica em `eventos_pagamento` antes de alterar o plano.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const config = getConfig();
  const segredo = config.mercadoPagoWebhookSecret;
  if (!segredo) return aviso(503, false);

  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return aviso(400, false);
  }

  const json = corpo as { type?: unknown; action?: unknown; data?: { id?: unknown } };
  const recursoId = String(json.data?.id ?? requestUrlId(request) ?? '');
  const tipo = typeof json.type === 'string' ? json.type : 'unknown';
  const requestId = request.headers.get('x-request-id');
  if (!recursoId || !assinaturaWebhookValida(segredo, request.headers.get('x-signature'), requestId, recursoId)) {
    return aviso(401, false);
  }

  // Este produto vende assinaturas recorrentes. Outros tipos de notificação
  // (pagamento avulso, merchant order) não mudam o acesso.
  if (!tipo.includes('preapproval') && tipo !== 'subscription_preapproval') {
    return NextResponse.json({ ok: true, ignorado: true });
  }

  const banco = await db();
  const id = createHash('sha256')
    .update(`${tipo}:${String(json.action ?? '')}:${recursoId}:${requestId}`)
    .digest('hex');

  const inserido = await banco
    .insert(eventosPagamento)
    .values({
      id,
      tipo,
      assinaturaExterna: recursoId,
      payload: corpo,
    })
    .onConflictDoNothing()
    .returning({ id: eventosPagamento.id });

  if (inserido.length === 0) {
    const [anterior] = await banco
      .select({ status: eventosPagamento.statusProcessamento })
      .from(eventosPagamento)
      .where(eq(eventosPagamento.id, id))
      .limit(1);
    if (anterior?.status === 'processado' || anterior?.status === 'ignorado') {
      return NextResponse.json({ ok: true, duplicado: true });
    }
  }

  try {
    const estado = await consultarAssinaturaMP(recursoId);
    const [assinatura] = await banco
      .select()
      .from(assinaturas)
      .where(
        or(
          eq(assinaturas.preapprovalId, recursoId),
          ...(estado.external_reference ? [eq(assinaturas.usuarioId, estado.external_reference)] : []),
        ),
      )
      .limit(1);

    if (!assinatura) {
      await banco
        .update(eventosPagamento)
        .set({ statusProcessamento: 'ignorado', erro: 'Assinatura local não encontrada.', processadoEm: new Date() })
        .where(eq(eventosPagamento.id, id));
      return NextResponse.json({ ok: true, ignorado: true });
    }

    const valorCentavos = typeof estado.auto_recurring?.transaction_amount === 'number'
      ? Math.round(estado.auto_recurring.transaction_amount * 100)
      : assinatura.valorCentavos ?? 0;
    const plano = planoPorPreco(valorCentavos)?.id ?? assinatura.plano;
    const statusLocal = mapearStatus(estado.status);
    if (!statusLocal) {
      await banco
        .update(eventosPagamento)
        .set({ statusProcessamento: 'ignorado', erro: `Status MP não mapeado: ${estado.status}`, processadoEm: new Date() })
        .where(eq(eventosPagamento.id, id));
      return NextResponse.json({ ok: true, ignorado: true });
    }
    const venceEm = estado.auto_recurring?.next_payment_date
      ? new Date(estado.auto_recurring.next_payment_date)
      : assinatura.proximaCobrancaEm;

    await banco
      .update(assinaturas)
      .set({
        preapprovalId: estado.id,
        externalReference: estado.external_reference ?? assinatura.usuarioId,
        plano,
        status: statusLocal,
        motivoStatus: estado.reason ?? estado.status,
        valorCentavos,
        proximaCobrancaEm: venceEm,
        canceladoEm: statusLocal === 'cancelada' ? new Date() : null,
        atualizadoEm: new Date(),
      })
      .where(eq(assinaturas.id, assinatura.id));

    if (estado.external_reference) {
      if (statusLocal === 'ativa') {
        await banco
          .update(usuarios)
          .set({ plano, planoValidoAte: venceEm, planoVerificadoEm: new Date(), atualizadoEm: new Date() })
          .where(eq(usuarios.id, estado.external_reference));
      } else if (statusLocal === 'cancelada' || statusLocal === 'expirada') {
        // Mantém o acesso até o fim do período pago; depois o guard de plano
        // efetivo aplica o gratuito (sem apagar buscas ou histórico).
        const validoAte = assinatura.proximaCobrancaEm;
        await banco
          .update(usuarios)
          .set({
            plano: validoAte && validoAte > new Date() ? assinatura.plano : 'gratuito',
            planoValidoAte: validoAte,
            planoVerificadoEm: new Date(),
            cancelouAssinaturaEm: statusLocal === 'cancelada' ? new Date() : undefined,
            atualizadoEm: new Date(),
          })
          .where(eq(usuarios.id, estado.external_reference));
      }
    }

    await banco
      .update(eventosPagamento)
      .set({
        assinaturaId: assinatura.id,
        usuarioId: assinatura.usuarioId,
        statusProcessamento: 'processado',
        processadoEm: new Date(),
      })
      .where(eq(eventosPagamento.id, id));

    return NextResponse.json({ ok: true });
  } catch (erro) {
    await banco
      .update(eventosPagamento)
      .set({
        statusProcessamento: 'erro',
        erro: (erro instanceof Error ? erro.message : 'Falha no webhook').slice(0, 500),
      })
      .where(eq(eventosPagamento.id, id));
    return aviso(500, false);
  }
}

function mapearStatus(status: string): 'pendente' | 'ativa' | 'atrasada' | 'cancelada' | 'expirada' | null {
  switch (status) {
    case 'authorized': return 'ativa';
    case 'paused': return 'atrasada';
    case 'cancelled': return 'cancelada';
    case 'pending': return 'pendente';
    default: return null;
  }
}

function requestUrlId(request: Request): string | null {
  return new URL(request.url).searchParams.get('data.id') ?? new URL(request.url).searchParams.get('id');
}
