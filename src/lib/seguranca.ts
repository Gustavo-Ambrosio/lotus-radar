export function urlSegura(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const limpo = String(valor).trim();
  if (limpo.length === 0 || limpo.length > 2048) return null;
  try {
    const u = new URL(limpo);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    if (u.username || u.password) return null;
    return u.href;
  } catch {
    return null;
  }
}