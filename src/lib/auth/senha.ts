import bcrypt from 'bcryptjs';

/**
 * Hash de senha com bcrypt (custo 12). E' o unico ponto do sistema que roda por
 * tentativas, entao o custo nao pode virar experiencia de login.
 *
 * Detalhe que costuma ser esquecido: o bcrypt ignora o que passa de 72 bytes.
 * Sem o truncamento explicito abaixo, duas senhas com o mesmo prefixo de 72
 * bytes seriam aceitas como iguais, o que nao e' o que o usuario digitou.
 */

const CUSTO = 12;
const LIMITE_BYTES = 72;

/** Corta em 72 bytes, decodificando sem erro para nao gerar caractere invalido. */
export function limitarParaBcrypt(senha: string): string {
  const bytes = Buffer.from(senha, 'utf8');
  if (bytes.length <= LIMITE_BYTES) return senha;
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes.subarray(0, LIMITE_BYTES));
}

export async function gerarHashSenha(senha: string): Promise<string> {
  return bcrypt.hash(limitarParaBcrypt(senha), CUSTO);
}

/**
 * `compare` em tempo constante, para nao vazar quanto da senha acertou.
 * Hash corrompido devolve `false` em vez de estourar: um registro inconsistente
 * nao pode derrubar o login dos outros.
 */
export async function conferirSenha(senha: string, hash: string): Promise<boolean> {
  if (!hash) return false;
  try {
    return await bcrypt.compare(limitarParaBcrypt(senha), hash);
  } catch {
    return false;
  }
}

export const TAMANHO_MINIMO_SENHA = 8;

/** Motivo da recusa, ou `null` quando a senha pode ser usada. */
export function problemaDaSenha(senha: string): string | null {
  if (senha.length < TAMANHO_MINIMO_SENHA) {
    return `A senha precisa de ao menos ${TAMANHO_MINIMO_SENHA} caracteres.`;
  }
  if (!/[a-zA-Z]/.test(senha) || !/[0-9]/.test(senha)) {
    return 'A senha precisa ter pelo menos uma letra e um numero.';
  }
  return null;
}
