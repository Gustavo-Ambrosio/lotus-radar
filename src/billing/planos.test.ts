import { describe, expect, it } from 'vitest';
import { planoEfetivo } from './planos';

describe('planoEfetivo', () => {
  const agora = new Date('2026-06-10T12:00:00Z');

  it('mantem gratuito sem validade', () => {
    expect(planoEfetivo('gratuito', null, agora)).toBe('gratuito');
  });

  it('mantem plano pago enquanto a validade ainda esta no futuro', () => {
    expect(planoEfetivo('pro', new Date('2026-06-11T00:00:00Z'), agora)).toBe('pro');
  });

  it('remove os beneficios pagos quando a validade venceu, mesmo se o webhook atrasou', () => {
    expect(planoEfetivo('equipe', new Date('2026-06-10T11:59:59Z'), agora)).toBe('gratuito');
    expect(planoEfetivo('pro', agora, agora)).toBe('gratuito');
  });

  it('nao expira plano pago sem data de validade explicita', () => {
    expect(planoEfetivo('pro', null, agora)).toBe('pro');
  });
});
