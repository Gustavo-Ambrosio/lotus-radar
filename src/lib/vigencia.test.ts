import { describe, expect, it } from 'vitest';
import { estaEncerrada } from './vigencia';

describe('estaEncerrada', () => {
  const agora = new Date('2026-09-23T12:00:00Z').getTime();

  it('mantém licitação com prazo futuro', () => {
    expect(estaEncerrada('2026-09-30T12:00:00Z', 'Em andamento', agora)).toBe(false);
  });

  it('encerra licitação com prazo no passado', () => {
    expect(estaEncerrada('2026-09-20T12:00:00Z', 'Em andamento', agora)).toBe(true);
  });

  it('encerra licitação sem prazo mas anulada', () => {
    expect(estaEncerrada(null, 'Licitação anulada', agora)).toBe(true);
  });

  it('encerra licitação revogada ou deserta', () => {
    expect(estaEncerrada('2026-09-30T12:00:00Z', 'Revogada', agora)).toBe(true);
    expect(estaEncerrada('2026-09-30T12:00:00Z', 'Deserta', agora)).toBe(true);
  });

  it('encerra licitação concluída e homologada', () => {
    expect(estaEncerrada('2026-09-30T12:00:00Z', 'Concluída', agora)).toBe(true);
    expect(estaEncerrada('2026-09-30T12:00:00Z', 'Homologada', agora)).toBe(true);
  });

  it('mantém licitação sem prazo e sem situação de encerramento', () => {
    expect(estaEncerrada(null, 'Divulgada', agora)).toBe(false);
    expect(estaEncerrada(null, null, agora)).toBe(false);
  });

  it('ignora caixa e acentos da situação', () => {
    expect(estaEncerrada('2026-10-01T12:00:00Z', 'LICITAÇÃO CANCELADA', agora)).toBe(true);
  });
});