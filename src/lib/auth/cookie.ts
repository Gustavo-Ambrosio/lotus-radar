import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '../db';
import { COOKIE_SESSAO, encerrarSessao, sessaoDeToken, type SessaoComUsuario } from './sessao';
import { getConfig } from '../env';
import type { Usuario } from '../../db/schema';
import { planoEfetivo } from '../../billing/planos';

/**
 * Ponte entre a sessao no banco e o cookie httpOnly.
 *
 * O cookie e' httpOnly + sameSite=lax + secure em producao: nenhum JavaScript da
 * pagina le o token, e um link de terceiro nao consegue arrastar a sessao num
 * POST. O `secure` e' conditional porque sem HTTPS local o cookie seria
 * descartado e o login local deixaria de funcionar.
 */

function opcoesCookie(expiraEm: Date) {
  const seguro = getConfig().emProducao;
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: seguro,
    path: '/',
    expires: expiraEm,
  };
}

export async function gravarCookieSessao(token: string, expiraEm: Date): Promise<void> {
  const loja = await cookies();
  loja.set(COOKIE_SESSAO, token, opcoesCookie(expiraEm));
}

export async function limparCookieSessao(): Promise<void> {
  const loja = await cookies();
  loja.set(COOKIE_SESSAO, '', opcoesCookie(new Date(0)));
}

/** Sessao do request atual, ou `null`. Usado em paginas e Server Actions. */
export async function sessaoAtual(): Promise<SessaoComUsuario | null> {
  const loja = await cookies();
  return sessaoDeToken(await db(), loja.get(COOKIE_SESSAO)?.value);
}

export async function usuarioAtual(): Promise<Usuario | null> {
  const sessao = await sessaoAtual();
  if (!sessao) return null;
  const usuario = sessao.usuario;
  const plano = planoEfetivo(usuario.plano, usuario.planoValidoAte);
  return plano === usuario.plano ? usuario : { ...usuario, plano };
}

/** Usuario ou redirect para o login com o destino preservado. */
export async function exigirUsuario(destino = '/conta'): Promise<Usuario> {
  const usuario = await usuarioAtual();
  if (!usuario) redirect(`/entrar?destino=${encodeURIComponent(destino)}`);
  return usuario;
}

export async function encerrarSessaoAtual(): Promise<void> {
  const loja = await cookies();
  const token = loja.get(COOKIE_SESSAO)?.value;
  if (token) await encerrarSessao(await db(), token);
  await limparCookieSessao();
}

export async function metadadosDoRequest(): Promise<{ userAgent: string | null; ip: string | null }> {
  const cab = await headers();
  return {
    userAgent: cab.get('user-agent'),
    ip:
      cab.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      cab.get('x-real-ip') ??
      null,
  };
}
