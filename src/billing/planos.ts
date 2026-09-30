import { getConfig } from '../lib/env';
import type { Plano } from '../db/schema';

/**
 * Definicao comercial dos planos. E' a unica fonte de verdade sobre o que cada
 * plano custa e o que ele libera — a pagina de vendas, o checkout, os limites
 * aplicados no servidor e a tela de conta leem daqui.
 *
 * Precos em centavos porque e' o que o Mercado Pago cobra; exibir em reais
 * nunca e' uma divisao manual e' um risco de arredondamento.
 */

export interface LimitesPlano {
  /** Buscas salvas (com ou sem alerta). */
  buscasSalvas: number;
  /** Alertas enviados por dia. `null` = ilimitado. */
  alertasPorDia: number | null;
  /** Resultados por pagina no radar. */
  resultadosPorPagina: number;
  /** Exportacoes CSV/JSON por dia. `null` = ilimitado. */
  exportacoesPorDia: number | null;
  /** Dias de retencao do historico de alertas no e-mail. */
  historicoAlertasDias: number;
}

export interface DefinicaoPlano {
  id: Plano;
  nome: string;
  resumo: string;
  /** Preco mensal em centavos. 0 = gratuito. */
  precoMensalCentavos: number;
  periodicidade: 'mensal';
  limites: LimitesPlano;
  destaques: string[];
  /** Plano exibido em destaque na landing page. */
  destaque: boolean;
}

export const PLANOS: Record<Plano, DefinicaoPlano> = {
  gratuito: {
    id: 'gratuito',
    nome: 'Gratuito',
    resumo: 'Para conhecer o radar e acompanhar o essencial.',
    precoMensalCentavos: 0,
    periodicidade: 'mensal',
    limites: {
      buscasSalvas: 1,
      alertasPorDia: 1,
      resultadosPorPagina: 50,
      exportacoesPorDia: 2,
      historicoAlertasDias: 7,
    },
    destaques: [
      'Radar completo de cultura e tecnologia',
      'Filtros por estado, município, valor e prazo',
      '1 busca salva com alerta por e-mail',
    ],
    destaque: false,
  },
  pro: {
    id: 'pro',
    nome: 'Pro',
    resumo: 'Para quem concorre a licitação e precisa saber antes dos outros.',
    precoMensalCentavos: 8900,
    periodicidade: 'mensal',
    limites: {
      buscasSalvas: 25,
      alertasPorDia: null,
      resultadosPorPagina: 500,
      exportacoesPorDia: 50,
      historicoAlertasDias: 180,
    },
    destaques: [
      'Alertas imediatos de cada licitação nova',
      'Buscas salvas por categoria e estado',
      'Exportacao CSV/JSON sem travar o dia',
      'Mapa por raio de ate 1.000 km',
    ],
    destaque: true,
  },
  equipe: {
    id: 'equipe',
    nome: 'Equipe',
    resumo: 'Para a equipe comercial acompanhar as mesmas oportunidades.',
    precoMensalCentavos: 24900,
    periodicidade: 'mensal',
    limites: {
      buscasSalvas: 200,
      alertasPorDia: null,
      resultadosPorPagina: 2000,
      exportacoesPorDia: null,
      historicoAlertasDias: 365,
    },
    destaques: [
      'Tudo do Pro, sem limite de buscas e alertas',
      'Resultados por pagina 4x maiores',
      'Exportacao e historico por um ano',
      'Faturamento para pessoa juridica',
    ],
    destaque: false,
  },
};

export const ORDEM_PLANOS: Plano[] = ['gratuito', 'pro', 'equipe'];

export function planosPagos(): DefinicaoPlano[] {
  return ORDEM_PLANOS.map((id) => PLANOS[id]).filter((p) => p.precoMensalCentavos > 0);
}

export function planoPorPreco(precoMensalCentavos: number): DefinicaoPlano | null {
  return planosPagos().find((p) => p.precoMensalCentavos === precoMensalCentavos) ?? null;
}

/** Plano efetivo em requests: validade vencida nunca mantém benefícios pagos. */
export function planoEfetivo(
  plano: Plano,
  validoAte: Date | null,
  agora = new Date(),
): Plano {
  if (plano !== 'gratuito' && validoAte !== null && validoAte.getTime() <= agora.getTime()) {
    return 'gratuito';
  }
  return plano;
}

/**
 * Limites do plano, ja com o override de `PLANO_LIMITE_BUSCAS_GRATIS`.
 * Permite fechar a conta no plano gratuito sem novo deploy, que e' o que
 * costuma travar um lancamento comercial.
 */
export function limitesDoPlano(plano: Plano): LimitesPlano {
  const base = PLANOS[plano].limites;
  if (plano !== 'gratuito') return base;

  const override = getConfig().limiteBuscasGratis;
  if (override === null) return base;
  return { ...base, buscasSalvas: override };
}

/** Rotulo pronto para tela ("R$ 89,00/mês", "Grátis"). */
export function precoFormatado(plano: DefinicaoPlano): string {
  if (plano.precoMensalCentavos === 0) return 'Grátis';
  const reais = plano.precoMensalCentavos / 100;
  return `R$ ${reais.toFixed(2).replace('.', ',')}/mês`;
}
