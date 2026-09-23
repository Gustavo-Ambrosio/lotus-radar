import { describe, expect, it } from 'vitest';
import { destacar } from './destaque';

describe('destacar', () => {
  it('mantém o texto integral quando não há busca', () => {
    expect(destacar('Aqui e ali', '')).toEqual([{ texto: 'Aqui e ali', marca: false }]);
  });

  it('marca o termo exato', () => {
    expect(destacar('Feira do livro', 'livro')).toEqual([
      { texto: 'Feira do ', marca: false },
      { texto: 'livro', marca: true },
    ]);
  });

  it('ignora acentos e caixa na comparação', () => {
    const trechos = destacar('Audiovisual e musica', 'MÚSICA');
    const marcados = trechos.filter((t) => t.marca).map((t) => t.texto);
    expect(marcados).toEqual(['musica']);
  });

  it('marca múltiplas ocorrências', () => {
    const trechos = destacar('cultura e mais cultura', 'cultura');
    expect(trechos.filter((t) => t.marca)).toHaveLength(2);
  });

  it('trata termo com várias palavras', () => {
    const trechos = destacar('apoio a producao cultural', 'produção cultural');
    expect(trechos.filter((t) => t.marca).map((t) => t.texto).join('')).toBe(
      'producao cultural',
    );
  });
});