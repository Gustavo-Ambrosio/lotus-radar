import { randomUUID } from 'node:crypto';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { tokens, type Token } from '../../db/schema';
import { gerarToken, hashToken } from './sessao';
import type { Database } from '../db';

/**
 * Tokens de uso unico: verificacao de e-mail e redefinicao de senha.
 *
 * Mesmo esquema da sessao — so' o hash vai para o banco — com dois acrescimos
 * que sao o que segura o link de e-mail:
 *  - `expiraEm`, porque um e-mail antigo nao pode virar convite permanente;
 *  - `usadoEm`, porque o link de redefinicao, uma vez clicado, morre. Sem isso
 *    o mesmo link valeria quantas vezes a caixa de entrada fosse encaminhada.
 *
 * O hash e' unico no banco, entao um token anterior para o mesmo fim e'
 * revogado ao emitir um novo.
 */

export const TIPO_VERIFICACAO = 'verificacao-email';
export const TIPO_REDEFINICAO = 'redefinir-senha';

export const MINUTOS_VERIFICACAO = 60 * 24;
export const MINUTOS_REDEFINICAO = 60;

export function expiracaoEm(minutos: number): Date {
  return new Date(Date.now() + minutos * 60 * 1000);
}

/**
 * Emite um token e invalida os anteriores do mesmo tipo. Devolve o valor em
 * claro — ele vai para o link do e-mail e nao pode ser recuperado depois.
 */
export async function emitirToken(
  db: Database,
  usuarioId: string,
  tipo: string,
  minutos: number,
): Promise<string> {
  await db
    .update(tokens)
    .set({ usadoEm: new Date() })
    .where(and(eq(tokens.usuarioId, usuarioId), eq(tokens.tipo, tipo), isNull(tokens.usadoEm)));

  const valor = gerarToken();
  await db.insert(tokens).values({
    id: randomUUID(),
    usuarioId,
    tipo,
    tokenHash: hashToken(valor),
    expiraEm: expiracaoEm(minutos),
  });
  return valor;
}

export type ResultadoConsumo =
  | { ok: true; token: Token }
  | { ok: false; motivo: 'invalido' | 'expirado' | 'ja-usado' };

/**
 * Consome o token. A marcacao como usado acontece na mesma declaracao que
 * valida (`... and usado_em is null`), entao dois cliques simultaneos no mesmo
 * link produzem um sucesso e um `ja-usado` — nunca dois sucessos.
 */
export async function consumirToken(
  db: Database,
  tipo: string,
  valor: string,
): Promise<ResultadoConsumo> {
  if (!valor) return { ok: false, motivo: 'invalido' };

  const candidatos = await db
    .select()
    .from(tokens)
    .where(and(eq(tokens.tipo, tipo), eq(tokens.tokenHash, hashToken(valor))))
    .limit(1);

  const token = candidatos[0];
  if (!token) return { ok: false, motivo: 'invalido' };
  if (token.usadoEm) return { ok: false, motivo: 'ja-usado' };
  if (token.expiraEm.getTime() <= Date.now()) return { ok: false, motivo: 'expirado' };

  const marcadas = await db
    .update(tokens)
    .set({ usadoEm: new Date() })
    .where(and(eq(tokens.id, token.id), isNull(tokens.usadoEm)))
    .returning({ id: tokens.id });

  if (marcadas.length === 0) return { ok: false, motivo: 'ja-usado' };
  return { ok: true, token };
}

export async function revogarTokens(db: Database, usuarioId: string, tipo?: string): Promise<void> {
  const condicoes = [eq(tokens.usuarioId, usuarioId)];
  if (tipo) condicoes.push(eq(tokens.tipo, tipo));
  await db.update(tokens).set({ usadoEm: new Date() }).where(and(...condicoes));
}

/** Tokens expirados ha mais de 7 dias, para a limpeza periodica. */
export async function limparTokensAntigos(db: Database): Promise<number> {
  const removidos = await db
    .delete(tokens)
    .where(sql`${tokens.expiraEm} < now() - interval '7 days'`)
    .returning({ id: tokens.id });
  return removidos.length;
}
