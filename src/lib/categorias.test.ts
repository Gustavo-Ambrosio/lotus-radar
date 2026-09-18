import { describe, expect, it } from 'vitest';
import { classificar, ehCultura, rotuloCategoria } from './categorias';

describe('classificar', () => {
  it('detecta música', () => {
    expect(classificar('Contratação de banda para show musical').categorias).toContain('musica');
  });

  it('detecta audiovisual', () => {
    expect(classificar('Produção de documentário audiovisual').categorias).toContain('audiovisual');
  });

  it('detecta fomento', () => {
    expect(classificar('Edital de fomento Lei Paulo Gustavo').categorias).toContain('fomento');
  });

  it('não considera objeto não cultural', () => {
    expect(ehCultura('Aquisição de pneus para a frota municipal')).toBe(false);
  });

  it('ignora acento e caixa', () => {
    expect(ehCultura('CONTRATAÇÃO DE MÚSICA AO VIVO')).toBe(true);
  });

  it('não confunde "arte" dentro de outra palavra', () => {
    expect(ehCultura('Reforma de quarteirão e pavimentação')).toBe(false);
  });

  it('reconhece plurais e flexões', () => {
    expect(ehCultura('Seleção de projetos culturais')).toBe(true);
    expect(classificar('Credenciamento para shows artísticos musicais').principal).toBe('musica');
  });

  it('ignora banda larga', () => {
    expect(ehCultura('Contratação de link de internet banda larga')).toBe(false);
  });

  it('não confunde galerias pluviais com arte', () => {
    expect(ehCultura('Limpeza de galerias pluviais e bueiros')).toBe(false);
  });

  it('categoria principal é a mais específica', () => {
    expect(classificar('Oficina de teatro e cultura popular').principal).toBe('artes-cenicas');
  });

  it('tem rótulo legível para toda categoria classificada', () => {
    expect(rotuloCategoria('musica')).toBe('Música');
  });
});
