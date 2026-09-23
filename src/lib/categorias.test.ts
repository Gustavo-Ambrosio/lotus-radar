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

  it('detecta festival de música eletrônica', () => {
    const resultado = classificar('Festival de psytrance e darkpsy');
    expect(resultado.categorias).toContain('musica-eletronica');
    expect(resultado.principal).toBe('musica-eletronica');
  });

  it('detecta reggae como música', () => {
    expect(classificar('Contratação de banda de reggae para a festa da cidade').categorias).toContain(
      'musica',
    );
  });

  it('detecta evento multicultural', () => {
    expect(classificar('Realização de evento multicultural de música, dança e gastronomia').categorias).toContain(
      'multicultural',
    );
  });

  it('detecta arte experimental e digital', () => {
    const resultado = classificar('Mostra de música experimental e arte digital');
    expect(resultado.categorias).toContain('experimental');
  });

  it('detecta cinema e teatro em festival', () => {
    const resultado = classificar('Festival de cinema e mostra de teatro municipal');
    expect(resultado.categorias).toContain('audiovisual');
    expect(resultado.categorias).toContain('artes-cenicas');
  });

  it('detecta ensaio fotográfico como artes visuais', () => {
    expect(classificar('Ensaio fotográfico artístico de acervo municipal').categorias).toContain(
      'artes-visuais',
    );
  });

  it('não trata placas eletrônicas como cultura', () => {
    expect(ehCultura('Manutenção de placas eletrônicas de sinalização de trânsito')).toBe(false);
  });

  it('detecta eventos literários', () => {
    const resultado = classificar('Realização de festival literário e feira do livro municipal');
    expect(resultado.categorias).toContain('eventos-literarios');
    expect(resultado.principal).toBe('eventos-literarios');
  });

  it('detecta publicações literárias', () => {
    const resultado = classificar('Publicação de livro de contos e poesias');
    expect(resultado.categorias).toContain('publicacoes-literarias');
    expect(resultado.principal).toBe('publicacoes-literarias');
  });

  it('detecta premiações', () => {
    const resultado = classificar('Prêmio municipal de cultura de projetos artísticos');
    expect(resultado.categorias).toContain('premiacoes');
    expect(resultado.principal).toBe('premiacoes');
  });

  it('detecta produção cultural', () => {
    const resultado = classificar('Produção cultural de evento para o município');
    expect(resultado.categorias).toContain('producao-cultural');
    expect(resultado.principal).toBe('producao-cultural');
  });

  it('detecta evento artístico', () => {
    const resultado = classificar('Contratação para realização de evento artístico de rua');
    expect(resultado.categorias).toContain('eventos-artisticos');
    expect(resultado.principal).toBe('eventos-artisticos');
  });

  it('detecta audiovisual com trilha sonora e música', () => {
    const resultado = classificar('Produção de vídeo com trilha sonora e música original');
    expect(resultado.categorias).toContain('audiovisual');
    expect(resultado.categorias).toContain('musica');
  });
});
