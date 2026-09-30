import { describe, expect, it } from 'vitest';
import {
  filtrosDaBusca,
  instanteInicial,
  JANELA_INICIAL_MS,
  situacaoDaBusca,
  janelaDaFrequencia,
  type Frequencia,
} from './alertas';

const AGORA = new Date('2026-03-10T12:00:00Z');
const HORA = 60 * 60 * 1000;

function horasAtras(horas: number): Date {
  return new Date(AGORA.getTime() - horas * HORA);
}

const buscaBase = {
  alertasEmail: true,
  frequenciaAlerta: 'diario',
  ultimaExecucaoEm: horasAtras(30),
};

const usuarioBase = {
  email: 'fulana@exemplo.com.br',
  emailVerificadoEm: horasAtras(1000),
  plano: 'pro' as const,
  planoValidoAte: new Date(AGORA.getTime() + 30 * 24 * HORA),
};

describe('situacaoDaBusca', () => {
  it('deixa entrar a busca com alerta ligado, e-mail confirmado e plano valido', () => {
    const resultado = situacaoDaBusca(buscaBase, usuarioBase, AGORA);
    expect(resultado.ok).toBe(true);
    expect(resultado.motivo).toBeNull();
    expect(resultado.desde).toEqual(buscaBase.ultimaExecucaoEm);
  });

  it('exclui busca com o alerta desligado, mesmo com tudo o mais certo', () => {
    const resultado = situacaoDaBusca({ ...buscaBase, alertasEmail: false }, usuarioBase, AGORA);
    expect(resultado.ok).toBe(false);
    expect(resultado.motivo).toBe('alerta-desligado');
  });

  it('exclui quem nunca confirmou o e-mail — e diz isso como motivo', () => {
    const resultado = situacaoDaBusca(buscaBase, { ...usuarioBase, emailVerificadoEm: null }, AGORA);
    expect(resultado.ok).toBe(false);
    expect(resultado.motivo).toBe('email-nao-verificado');
  });

  it('exclui plano pago vencido', () => {
    const resultado = situacaoDaBusca(
      buscaBase,
      { ...usuarioBase, planoValidoAte: horasAtras(2) },
      AGORA,
    );
    expect(resultado.ok).toBe(false);
    expect(resultado.motivo).toBe('plano-expirado');
  });

  it("nao deixa plano gratuito vencer: sem planoValidoAte ele e' vitalicio", () => {
    const resultado = situacaoDaBusca(
      buscaBase,
      { ...usuarioBase, plano: 'gratuito', planoValidoAte: horasAtras(500) },
      AGORA,
    );
    expect(resultado.ok).toBe(true);
  });

  it('respeita a janela da frequencia: rodada de antes nao conta', () => {
    const resultado = situacaoDaBusca(
      { ...buscaBase, ultimaExecucaoEm: new Date(AGORA.getTime() - 2 * HORA) },
      usuarioBase,
      AGORA,
    );
    expect(resultado.ok).toBe(false);
    expect(resultado.motivo).toBe('aguardando-janela');
  });

  it('usa 24 h no diario e 7 dias no semanal', () => {
    const diario = situacaoDaBusca(
      { ...buscaBase, ultimaExecucaoEm: new Date(AGORA.getTime() - 23 * HORA) },
      usuarioBase,
      AGORA,
    );
    expect(diario.motivo).toBe('aguardando-janela');

    const semanal = situacaoDaBusca(
      { ...buscaBase, frequenciaAlerta: 'semanal', ultimaExecucaoEm: new Date(AGORA.getTime() - 8 * 24 * HORA) },
      usuarioBase,
      AGORA,
    );
    expect(semanal.ok).toBe(true);

    // 48 h Atrás passa da janela diaria, mas nao da semanal.
    const semanalCedo = situacaoDaBusca(
      { ...buscaBase, frequenciaAlerta: 'semanal', ultimaExecucaoEm: new Date(AGORA.getTime() - 48 * HORA) },
      usuarioBase,
      AGORA,
    );
    expect(semanalCedo.motivo).toBe('aguardando-janela');
  });

  it('trata frequencia desconhecida como diario, em vez de barrar o alerta', () => {
    const resultado = situacaoDaBusca(
      { ...buscaBase, frequenciaAlerta: 'a-cada-piscar' },
      usuarioBase,
      AGORA,
    );
    expect(resultado.ok).toBe(true);
  });
});
describe('instanteInicial', () => {
  it('usa a ultima execucao quando existe', () => {
    const anterior = horasAtras(5);
    expect(instanteInicial(anterior, AGORA)).toEqual(anterior);
  });

  it('usa 48 h para busca que nunca rodou, para nao despejar o historico', () => {
    const desde = instanteInicial(null, AGORA);
    expect(AGORA.getTime() - desde.getTime()).toBe(JANELA_INICIAL_MS);
  });
});

describe('janelaDaFrequencia', () => {
  it("imediato e' mais curto que diario", () => {
    const ordens: Frequencia[] = ['imediato', 'diario', 'semanal'];
    for (let i = 1; i < ordens.length; i += 1) {
      const anterior = ordens[i - 1] as Frequencia;
      const atual = ordens[i] as Frequencia;
      expect(janelaDaFrequencia(anterior)).toBeLessThan(janelaDaFrequencia(atual));
    }
  });
});

describe('filtrosDaBusca', () => {
  it('le segmento e query do jsonb gravado', () => {
    expect(filtrosDaBusca({ segmento: 'tecnologia', query: '?seg=tecnologia&uf=SP' })).toEqual({
      segmento: 'tecnologia',
      query: '?seg=tecnologia&uf=SP',
    });
  });

  it("cai para cultura quando o segmento gravado e' invalido", () => {
    expect(filtrosDaBusca({ segmento: 'turismo' }).segmento).toBe('cultura');
    expect(filtrosDaBusca(null).segmento).toBe('cultura');
  });

  it('devolve query nula quando o jsonb nao tem query gravada', () => {
    expect(filtrosDaBusca({ uf: 'PR' }).query).toBeNull();
  });
});
