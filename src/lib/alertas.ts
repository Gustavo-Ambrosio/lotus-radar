/**
 * Regras do job de alertas, isoladas de I/O.
 *
 * Todas as(decisoes) aqui sao funcoes puras de data/boolean, porque e' o tipo de
 * coisa que o job faz toda noite e que ninguem lembra de conferir: quem entra
 * na fila, quem fica de fora e por que. O script `disparar-alertas.ts` so
 * traduz isso em SQL e em chamadas de e-mail.
 */

export const FREQUENCIAS = ['imediato', 'diario', 'semanal'] as const;
export type Frequencia = (typeof FREQUENCIAS)[number];

export function ehFrequencia(valor: string): valor is Frequencia {
  return (FREQUENCIAS as readonly string[]).includes(valor);
}

const JANELAS_MS: Record<Frequencia, number> = {
  imediato: 60 * 60 * 1000,
  diario: 24 * 60 * 60 * 1000,
  semanal: 7 * 24 * 60 * 60 * 1000,
};

/** Intervalo minimo entre duas rodadas da mesma busca. */
export function janelaDaFrequencia(frequencia: Frequencia): number {
  return JANELAS_MS[frequencia];
}

/**
 * Quanto olhamos para tras quando a busca nunca rodou. 48 h, e nao 24: a
 * janela maior cobre o caso em que o cron ficou dois dias fora do ar sem que a
 * primeira busca recebesse um tsunami de itens accumulated.
 */
export const JANELA_INICIAL_MS = 48 * 60 * 60 * 1000;

export function instanteInicial(ultimaExecucaoEm: Date | null, agora: Date): Date {
  if (ultimaExecucaoEm) return ultimaExecucaoEm;
  return new Date(agora.getTime() - JANELA_INICIAL_MS);
}

export type Motivo = 'alerta-desligado' | 'email-nao-verificado' | 'plano-expirado' | 'aguardando-janela';

export interface SituacaoAlerta {
  /** `motivo` preenchido = nao entra na fila. `ok` e' o inverso disso. */
  ok: boolean;
  motivo: Motivo | null;
  /** Instante a partir do qual vale procurar novidade. */
  desde: Date;
}

/**
 * Decide se uma busca entra na rodada de agora.
 *
 * A ordem das regras importa: cada `return` e' a primeira razao que a pessoa
 * veria se perguntasse "por que nao recebi o alerta?". Por isso o plano
 * expirado vem antes da janela — cobrar do cliente que o plano venceu nao
 * ajuda ninguem, e a resposta honesta e' sobre o plano.
 */
export function situacaoDaBusca(
  busca: {
    alertasEmail: boolean;
    frequenciaAlerta: string;
    ultimaExecucaoEm: Date | null;
  },
  usuario: {
    email: string;
    emailVerificadoEm: Date | null;
    plano: 'gratuito' | 'pro' | 'equipe';
    planoValidoAte: Date | null;
  },
  agora: Date,
): SituacaoAlerta {
  const desde = instanteInicial(busca.ultimaExecucaoEm, agora);

  if (!busca.alertasEmail) return { ok: false, motivo: 'alerta-desligado', desde };

  // E-mail nao confirmado e' a causa numero um de alerta perdido: o Resend
  // aceita, o Gmail manda para o spam, e a pessoa nunca sabe que houve aviso.
  if (!usuario.emailVerificadoEm) return { ok: false, motivo: 'email-nao-verificado', desde };

  if (
    usuario.plano !== 'gratuito' &&
    usuario.planoValidoAte !== null &&
    usuario.planoValidoAte.getTime() <= agora.getTime()
  ) {
    return { ok: false, motivo: 'plano-expirado', desde };
  }

  const frequencia = ehFrequencia(busca.frequenciaAlerta) ? busca.frequenciaAlerta : 'diario';
  if (
    busca.ultimaExecucaoEm !== null &&
    agora.getTime() - busca.ultimaExecucaoEm.getTime() < janelaDaFrequencia(frequencia)
  ) {
    return { ok: false, motivo: 'aguardando-janela', desde };
  }

  return { ok: true, motivo: null, desde };
}

/**
 * A janela de tempo que a busca foi salva e' a copia fiel do recorte. Sem ela,
 * um filtro que a versao atual do app nao conhece voltaria como "sem filtro" —
 * e o cliente passaria a receber alertas de tudo.
 */
export function filtrosDaBusca(armazenados: unknown): { segmento: 'cultura' | 'tecnologia'; query: string | null } {
  const bruto = (armazenados ?? {}) as { segmento?: unknown; query?: unknown };
  return {
    segmento: bruto.segmento === 'tecnologia' ? 'tecnologia' : 'cultura',
    query: typeof bruto.query === 'string' && bruto.query !== '' ? bruto.query : null,
  };
}
