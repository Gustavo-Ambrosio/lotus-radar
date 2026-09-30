import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { and, eq, gt, sql } from 'drizzle-orm';
import { sessoes, usuarios, type Usuario } from '../../db/schema';
import type { Database } from '../db';

/**
 * Sessoes persistidas.
 *
 * O cookie carrega um token opaco de 256 bits; no banco fica apenas o SHA-256.
 * Duas consequencias que valem o custo do digest a cada request:
 *  - o token vazado do banco nao da login (precisa do cookie em claro);
 *  - revogar e' um DELETE, entao "sair de todos os dispositivos" funciona de
 *    verdade, e nao so no navegador que pediu o logout.
 *
 * Este modulo nao importa `next/headers`: o nucleo fica testavel e o cookie e'
 * manipulado em `cookie.ts`.
 */

export const COOKIE_SESSAO = 'lr_sessao';
export const DIAS_VALIDADE = 30;

export function gerarToken(): string {
  return randomBytes(32).toString('base64url');
}

/** SHA-256 em hex. Deterministico — e' o que permite buscar a sessao pelo token. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export interface MetadadosSessao {
  userAgent?: string | null;
  ip?: string | null;
}

export interface SessaoComUsuario {
  sessao: { id: string; expiraEm: Date };
  usuario: Usuario;
}

/**
 * Cria a sessao e devolve o token **em claro**, que so existe no cookie.
 * Nao ha como recuperar esse valor depois — se o cliente o perde, e' nova sessao.
 */
export async function criarSessao(
  db: Database,
  usuarioId: string,
  meta: MetadadosSessao = {},
): Promise<{ token: string; expiraEm: Date }> {
  const token = gerarToken();
  const expiraEm = new Date(Date.now() + DIAS_VALIDADE * 24 * 60 * 60 * 1000);
  await db.insert(sessoes).values({
    id: randomUUID(),
    usuarioId,
    tokenHash: hashToken(token),
    expiraEm,
    userAgent: meta.userAgent ?? null,
    ip: meta.ip ?? null,
  });
  return { token, expiraEm };
}

/**
 * Resolve o token do cookie em usuario. Sessao expirada e' apagada na hora: o
 * login novamente cria outra linha, e a tabela nao cresce sem limite.
 */
export async function sessaoDeToken(
  db: Database,
  token: string | null | undefined,
): Promise<SessaoComUsuario | null> {
  if (!token) return null;
  const agora = new Date();

  const achada = await db
    .select({ sessao: sessoes, usuario: usuarios })
    .from(sessoes)
    .innerJoin(usuarios, eq(usuarios.id, sessoes.usuarioId))
    .where(and(eq(sessoes.tokenHash, hashToken(token)), gt(sessoes.expiraEm, agora)))
    .limit(1);

  const linha = achada[0];
  if (!linha) return null;

  // Escrita best-effort: um falha de atualizacao nao pode impedir o acesso.
  await db
    .update(sessoes)
    .set({ ultimoUsoEm: agora })
    .where(eq(sessoes.id, linha.sessao.id))
    .catch(() => undefined);

  return { sessao: linha.sessao, usuario: linha.usuario };
}

export async function encerrarSessao(db: Database, token: string): Promise<void> {
  await db.delete(sessoes).where(eq(sessoes.tokenHash, hashToken(token)));
}

export async function encerrarSessoesDoUsuario(db: Database, usuarioId: string): Promise<void> {
  await db.delete(sessoes).where(eq(sessoes.usuarioId, usuarioId));
}

/** Limpeza periodica: sessoes vencidas nunca mais usadas. */
export async function limparSessoesExpiradas(db: Database): Promise<number> {
  const removidas = await db
    .delete(sessoes)
    .where(sql`${sessoes.expiraEm} < now() - interval '7 days'`)
    .returning({ id: sessoes.id });
  return removidas.length;
}
