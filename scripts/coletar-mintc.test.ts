import { describe, expect, it } from 'vitest';
import { dataDaPagina } from './coletar-mintc';

const AGORA = new Date(2026, 8, 24, 12, 0, 0).getTime(); // 24/09/2026

describe('dataDaPagina (prazos de inscrição do MinC)', () => {
  it('extrai encerramento explícito do prazo de inscrição', () => {
    const texto = 'Cronograma do processo de seleção. Encerramento do prazo de inscrição 13/10/2026, às 23h59min59s.';
    expect(dataDaPagina(texto, AGORA)).toBe('2026-10-13T23:59:59-03:00');
  });

  it('extrai data por extenso após encerramento do prazo', () => {
    const texto = 'Encerramento do prazo de inscrição 30 de novembro de 2026, às 23h59min59s.';
    expect(dataDaPagina(texto, AGORA)).toBe('2026-11-30T23:59:59-03:00');
  });

  it('ignora datas de resultado/divulgação sem âncora de inscrição', () => {
    const texto = 'Divulgação do resultado provisório Até 27/11/2026. Resultado final até 30/12/2026.';
    expect(dataDaPagina(texto, AGORA)).toBeNull();
  });

  it('prefere encerramento de inscrição a datas de resultado no mesmo cronograma', () => {
    const texto = [
      'Cronograma do processo de seleção',
      'Início das inscrições no sistema Salic 15/08/2026',
      'Encerramento do prazo de inscrição 13/10/2026, às 23h59min59s',
      'Divulgação do resultado provisório Até 27/11/2026',
      'Período para apresentação de recursos Até 07/12/2026',
      'Publicação do resultado final da seleção Até 30/12/2026',
    ].join(' ');
    expect(dataDaPagina(texto, AGORA)).toBe('2026-10-13T23:59:59-03:00');
  });

  it('extrai fim de período com inscrições até data', () => {
    const texto = 'As inscrições são gratuitas e estarão abertas, em regime de fluxo contínuo, permanecendo disponíveis até as 18h (dezoito horas) do dia 06 de novembro de 2026.';
    expect(dataDaPagina(texto, AGORA)).toBe('2026-11-06T23:59:59-03:00');
  });

  it('marca como EXPIRADA prazo de inscrição já encerrado', () => {
    const texto = 'As inscrições estarão abertas das 8h do dia 29 de julho até as 18h do dia 12 de agosto de 2026.';
    expect(dataDaPagina(texto, AGORA)).toBe('EXPIRADA');
  });

  it('marca como EXPIRADA data limite de submissão no passado', () => {
    const texto = 'Data limite para submissão das propostas: 10 de agosto de 2026.';
    expect(dataDaPagina(texto, AGORA)).toBe('EXPIRADA');
  });

  it('marca como EXPIRADA período de inscrição passado', () => {
    const texto = 'Inscrições de 04/05/2026 a 08/06/2026.';
    expect(dataDaPagina(texto, AGORA)).toBe('EXPIRADA');
  });

  it('retorna null quando não há menção a prazo de inscrição', () => {
    const texto = 'O Ministério da Cultura divulga o presente edital com o objetivo de selecionar projetos.';
    expect(dataDaPagina(texto, AGORA)).toBeNull();
  });

  it('aceita período com ano por extenso', () => {
    const texto = 'Período de inscrição: de 16 de junho de 2026 ao 13 de outubro de 2026.';
    expect(dataDaPagina(texto, AGORA)).toBe('2026-10-13T23:59:59-03:00');
  });
});