import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { getConfig } from './env';

const API = 'https://api.mercadopago.com';

const respostaPreapproval = z.object({
  id: z.string().min(1),
  init_point: z.string().url(),
  status: z.string().optional(),
});

export interface DadosAssinaturaMP {
  usuarioId: string;
  email: string;
  nomePlano: string;
  valorCentavos: number;
  retorno: string;
  webhook: string;
}

export interface AssinaturaCriadaMP {
  id: string;
  url: string;
  status: string;
}

/** Cria uma assinatura recorrente mensal no Mercado Pago. */
export async function criarAssinaturaMP(dados: DadosAssinaturaMP): Promise<AssinaturaCriadaMP> {
  const token = getConfig().mercadoPagoToken;
  if (!token) throw new Error('MERCADOPAGO_ACCESS_TOKEN não está configurado.');
  if (!Number.isInteger(dados.valorCentavos) || dados.valorCentavos <= 0) {
    throw new Error('Valor de assinatura inválido.');
  }

  const resposta = await fetch(`${API}/preapproval`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': `${dados.usuarioId}-${dados.nomePlano}-${new Date().toISOString().slice(0, 7)}`,
    },
    body: JSON.stringify({
      reason: `Lotus Radar ${dados.nomePlano}`,
      external_reference: dados.usuarioId,
      payer_email: dados.email,
      back_url: dados.retorno,
      notification_url: dados.webhook,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: dados.valorCentavos / 100,
        currency_id: 'BRL',
      },
      status: 'pending',
    }),
    cache: 'no-store',
  });

  if (!resposta.ok) {
    const texto = await resposta.text();
    throw new Error(`Mercado Pago recusou o checkout (HTTP ${resposta.status}): ${texto.slice(0, 300)}`);
  }

  const dadosResposta = respostaPreapproval.safeParse(await resposta.json());
  if (!dadosResposta.success) throw new Error('Resposta inesperada do Mercado Pago ao criar assinatura.');
  return {
    id: dadosResposta.data.id,
    url: dadosResposta.data.init_point,
    status: dadosResposta.data.status ?? 'pending',
  };
}

const respostaConsulta = z.object({
  id: z.string(),
  external_reference: z.string().nullable().optional(),
  status: z.string(),
  reason: z.string().optional(),
  auto_recurring: z
    .object({
      transaction_amount: z.number().optional(),
      next_payment_date: z.string().optional(),
    })
    .optional(),
  date_created: z.string().optional(),
  last_modified: z.string().optional(),
});

export type EstadoAssinaturaMP = z.infer<typeof respostaConsulta>;

/** Consulta a assinatura diretamente no gateway; nunca confiar no payload do webhook. */
export async function consultarAssinaturaMP(id: string): Promise<EstadoAssinaturaMP> {
  const token = getConfig().mercadoPagoToken;
  if (!token) throw new Error('MERCADOPAGO_ACCESS_TOKEN não está configurado.');
  const resposta = await fetch(`${API}/preapproval/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!resposta.ok) throw new Error(`Consulta ao Mercado Pago falhou (HTTP ${resposta.status}).`);
  return respostaConsulta.parse(await resposta.json());
}

/** Cancela recorrência mantendo o acesso até o fim do ciclo já pago. */
export async function cancelarAssinaturaMP(id: string): Promise<void> {
  const token = getConfig().mercadoPagoToken;
  if (!token) throw new Error('MERCADOPAGO_ACCESS_TOKEN não está configurado.');
  const resposta = await fetch(`${API}/preapproval/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: 'cancelled' }),
    cache: 'no-store',
  });
  if (!resposta.ok) throw new Error(`Cancelamento no Mercado Pago falhou (HTTP ${resposta.status}).`);
}

/** Confere a assinatura HMAC documentada pelo Mercado Pago. */
export function assinaturaWebhookValida(
  segredo: string,
  assinatura: string | null,
  requestId: string | null,
  recursoId: string,
): boolean {
  if (!assinatura || !requestId || !recursoId) return false;
  const valores = Object.fromEntries(
    assinatura.split(',').map((parte) => {
      const [chave, ...resto] = parte.trim().split('=');
      return [chave, resto.join('=')];
    }),
  );
  const ts = valores.ts;
  const v1 = valores.v1;
  if (!ts || !v1 || !/^\d+$/.test(ts) || !/^[a-f\d]{64}$/i.test(v1)) return false;

  const manifesto = `id:${recursoId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const esperado = createHmac('sha256', segredo).update(manifesto).digest();
  const recebido = Buffer.from(v1, 'hex');
  return recebido.length === esperado.length && timingSafeEqual(recebido, esperado);
}
