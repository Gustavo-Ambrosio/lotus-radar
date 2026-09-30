import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { assinaturaWebhookValida } from './mercadopago';

describe('assinaturaWebhookValida', () => {
  const segredo = 'segredo-de-teste';
  const recursoId = '123456789';
  const requestId = 'request-id-exemplo';
  const ts = '1700000000';

  function assinaturaPara(id = recursoId, req = requestId, timestamp = ts): string {
    const manifesto = `id:${id.toLowerCase()};request-id:${req};ts:${timestamp};`;
    const v1 = createHmac('sha256', segredo).update(manifesto).digest('hex');
    return `ts=${timestamp},v1=${v1}`;
  }

  it('aceita um HMAC valido do manifesto documentado', () => {
    expect(assinaturaWebhookValida(segredo, assinaturaPara(), requestId, recursoId)).toBe(true);
  });

  it('rejeita alteracao do recurso, request id ou segredo', () => {
    expect(assinaturaWebhookValida(segredo, assinaturaPara(), requestId, 'outro-id')).toBe(false);
    expect(assinaturaWebhookValida(segredo, assinaturaPara(), 'outro-request', recursoId)).toBe(false);
    expect(assinaturaWebhookValida('outro-segredo', assinaturaPara(), requestId, recursoId)).toBe(false);
  });

  it('rejeita cabecalhos ausentes ou malformados sem lancar excecao', () => {
    expect(assinaturaWebhookValida(segredo, null, requestId, recursoId)).toBe(false);
    expect(assinaturaWebhookValida(segredo, 'ts=abc,v1=xyz', requestId, recursoId)).toBe(false);
  });
});
