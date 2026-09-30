import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

/**
 * Configuracao do ambiente, validada uma unica vez por processo.
 *
 * Duas entradas distintas de proposito:
 * - `next dev|build|start` ja popula `process.env` a partir de `.env.local`;
 * - os scripts (`tsx scripts/*.ts`) rodam fora do Next e precisam carregar os
 *   mesmos arquivos. `carregarEnvDeArquivos` faz isso, e `getConfig()` chama
 *   antes de ler qualquer variavel — assim nao existe caminho que leia env sem
 *   passar pela validacao.
 *
 * Regra de ouro: em producao, `DATABASE_URL` e `SESSION_SECRET` sao
 * obrigatorias e nao tem fallback. O dev e' que ganha padroes, para que
 * `npm run dev` funcione com zero configuracao.
 */

export const ARQUIVOS_ENV = ['.env.local', '.env'] as const;

const esquema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  DATABASE_URL: z.string().min(1).optional(),
  DB_DRIVER: z.enum(['postgres', 'pglite']).optional(),
  SESSION_SECRET: z.string().min(32).optional(),
  MERCADOPAGO_ACCESS_TOKEN: z.string().min(1).optional(),
  MERCADOPAGO_WEBHOOK_SECRET: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  MAIL_FROM: z.string().min(1).default('Lotus Radar <alertas@lotusradar.com.br>'),
  PLANO_LIMITE_BUSCAS_GRATIS: z.coerce.number().int().min(0).optional(),
  NEXT_PUBLIC_CHECKOUT_RETURN_URL: z.string().url().optional(),
});

/** Segredo so' para desenvolvimento — jamais usado em producao. */
const SEGREDO_DEV = 'desenvolvimento-apenas-nao-use-em-producao-0000';

export type DriverBanco = 'postgres' | 'pglite';

export interface Config {
  nodeEnv: 'development' | 'test' | 'production';
  emProducao: boolean;
  /** Raiz da aplicacao, sem barra final (usada em links de e-mail e redirecionamentos). */
  urlBase: string;
  urlRetornoCheckout: string;
  driver: DriverBanco;
  databaseUrl: string | null;
  sessionSecret: string;
  mercadoPagoToken: string | null;
  mercadoPagoWebhookSecret: string | null;
  resendApiKey: string | null;
  mailFrom: string;
  limiteBuscasGratis: number | null;
}

function semBarraFinal(url: string): string {
  return url.replace(/\/+$/, '');
}

/**
 * Parser do formato `.env`. Funcao pura de proposito: e' o unico pedaco de
 * logica real desse arquivo e o que a suite de testes cobre.
 *
 * Aceita `export` a frente do nome, comentarios, valores entre aspas simples ou
 * duplas e sequencias de escape dentro de aspas duplas — o subconjunto que o
 * Next aceita e que aparece em credenciais de gateway.
 */
export function analisarEnv(conteudo: string): Record<string, string> {
  const saida: Record<string, string> = {};
  for (const linhaBruta of conteudo.split(/\r?\n/)) {
    const linha = linhaBruta.trim();
    if (!linha || linha.startsWith('#')) continue;

    const semExport = linha.startsWith('export ') ? linha.slice(7).trim() : linha;
    const separador = semExport.indexOf('=');
    if (separador <= 0) continue;

    const chave = semExport.slice(0, separador).trim();
    if (!chave) continue;
    saida[chave] = desvalorizar(semExport.slice(separador + 1).trim());
  }
  return saida;
}

function desvalorizar(bruto: string): string {
  const aspas = bruto[0];
  if (aspas === '"' || aspas === "'") {
    const fim = bruto.lastIndexOf(aspas);
    const corpo = fim > 0 ? bruto.slice(1, fim) : bruto.slice(1);
    return aspas === '"' ? corpo.replace(/\\n/g, '\n').replace(/\\"/g, '"') : corpo;
  }
  // Valor sem aspas: comentario so' conta a partir de um `#` precedido de espaco.
  const comentario = bruto.search(/\s#/);
  return (comentario >= 0 ? bruto.slice(0, comentario) : bruto).trim();
}

/**
 * Carrega `.env.local` e `.env` sem sobrescrever o que ja vier do ambiente.
 * `.env.local` tem precedencia (mesma ordem do Next). Silencioso quando o
 * arquivo nao existe — dev sem `.env.local` e' o caso normal.
 */
export function carregarEnvDeArquivos(base: string = process.cwd()): string[] {
  const carregados: string[] = [];
  for (const nome of ARQUIVOS_ENV) {
    const caminho = resolve(base, nome);
    if (!existsSync(caminho)) continue;
    const valores = analisarEnv(readFileSync(caminho, 'utf8'));
    let aplicados = 0;
    for (const [chave, valor] of Object.entries(valores)) {
      // Campos opcionais vazios no `.env` significam "nao configurado".
      // Mantem os defaults do schema e evita validar string vazia como segredo.
      if (process.env[chave] !== undefined || valor.length === 0) continue;
      process.env[chave] = valor;
      aplicados += 1;
    }
    carregados.push(`${nome} (${aplicados} variavel(is))`);
  }
  return carregados;
}

function exigirEmProducao(chave: string, valor: string | undefined): string {
  if (valor && valor.length > 0) return valor;
  throw new Error(
    `[lotus-radar] ${chave} e' obrigatorio em producao. Defina a variavel no painel do host.`,
  );
}

function construirConfig(bruto: Record<string, unknown>): Config {
  const valores = esquema.parse(bruto);
  const emProducao = valores.NODE_ENV === 'production';

  const databaseUrl = valores.DATABASE_URL ?? null;
  // Sem DATABASE_URL cai para o PGlite embarcado — util em dev, proibido em prod.
  const driver: DriverBanco = valores.DB_DRIVER ?? (databaseUrl ? 'postgres' : 'pglite');
  if (emProducao && driver === 'pglite') {
    throw new Error(
      '[lotus-radar] PGlite nao pode ser usado em producao. Defina DATABASE_URL (Postgres gerenciado).',
    );
  }

  const sessionSecret = emProducao
    ? exigirEmProducao('SESSION_SECRET', valores.SESSION_SECRET)
    : (valores.SESSION_SECRET ?? SEGREDO_DEV);

  return {
    nodeEnv: valores.NODE_ENV,
    emProducao,
    urlBase: semBarraFinal(valores.NEXT_PUBLIC_APP_URL),
    urlRetornoCheckout: semBarraFinal(
      valores.NEXT_PUBLIC_CHECKOUT_RETURN_URL ?? `${semBarraFinal(valores.NEXT_PUBLIC_APP_URL)}/planos?checkout=retorno`,
    ),
    driver,
    databaseUrl,
    sessionSecret,
    mercadoPagoToken: valores.MERCADOPAGO_ACCESS_TOKEN ?? null,
    mercadoPagoWebhookSecret: valores.MERCADOPAGO_WEBHOOK_SECRET ?? null,
    resendApiKey: valores.RESEND_API_KEY ?? null,
    mailFrom: valores.MAIL_FROM,
    limiteBuscasGratis: valores.PLANO_LIMITE_BUSCAS_GRATIS ?? null,
  };
}

let config: Config | null = null;

/**
 * Config do processo. Memoizada: validar a cada chamada seria trabalho
 * jogado fora em todo request.
 */
export function getConfig(): Config {
  if (config) return config;
  carregarEnvDeArquivos();
  config = construirConfig(process.env);
  return config;
}

/** Usado pelos testes para forjar um ambiente sem tocar no singleton. */
export function resetConfig(): void {
  config = null;
}
