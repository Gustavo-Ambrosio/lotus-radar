'use server';

import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { usuarios } from '@/db/schema';
import { db } from '@/lib/db';
import { getConfig } from '@/lib/env';
import { conferirSenha, gerarHashSenha, problemaDaSenha } from '@/lib/auth/senha';
import { criarSessao } from '@/lib/auth/sessao';
import {
  TIPO_REDEFINICAO,
  TIPO_VERIFICACAO,
  MINUTOS_REDEFINICAO,
  MINUTOS_VERIFICACAO,
  consumirToken,
  emitirToken,
  revogarTokens,
} from '@/lib/auth/tokens';
import {
  encerrarSessaoAtual,
  gravarCookieSessao,
  metadadosDoRequest,
} from '@/lib/auth/cookie';
import { enviarEmail, emailBoasVindas, emailRedefinicao } from '@/lib/email';
import {
  documentoValido,
  errosDoZod,
  esquemaCadastro,
  esquemaLogin,
  esquemaRecuperacao,
  esquemaRedefinicao,
  type ErrosDeCampo,
} from '@/lib/validacao';
import { sessoes } from '@/db/schema';

/**
 * Acoes das telas de conta. Todas seguem o mesmo contrato de estado para o
 * `useActionState`: devolvem `{ campos, erro, ok }` em vez de lancar, para que o
 * formulario preserve o que a pessoa digitou e mostre o erro no lugar certo.
 */

export interface EstadoFormulario {
  erro?: string;
  campos?: ErrosDeCampo;
  ok?: boolean;
  mensagem?: string;
}

function destinoSeguro(destino: string | null | undefined): string {
  // Sem isto, `?destino=` aceitaria uma URL externa e o login seria um
  // redirecionamento aberto (phishing com a marca, a partir do proprio app).
  if (!destino) return '/';
  if (!destino.startsWith('/') || destino.startsWith('//') || destino.includes('\\')) return '/';
  try {
    const base = 'https://lotus-radar.invalid';
    const resolvido = new URL(destino, base);
    if (resolvido.origin !== base) return '/';
    return `${resolvido.pathname}${resolvido.search}${resolvido.hash}`;
  } catch {
    return '/';
  }
}

function ehViolacaoDeUnicidade(erro: unknown): boolean {
  return (erro as { code?: string } | null)?.code === '23505';
}

export async function acaoCadastro(
  _estado: EstadoFormulario,
  dados: FormData,
): Promise<EstadoFormulario> {
  const analisado = esquemaCadastro.safeParse({
    nome: dados.get('nome'),
    email: dados.get('email'),
    senha: dados.get('senha'),
    empresa: dados.get('empresa') ?? '',
    documento: dados.get('documento') ?? '',
  });
  if (!analisado.success) return { campos: errosDoZod(analisado.error), erro: 'Confira os campos destacados.' };

  const { nome, email, senha, empresa, documento } = analisado.data;

  const problemaSenha = problemaDaSenha(senha);
  if (problemaSenha) return { campos: { senha: problemaSenha }, erro: problemaSenha };

  if (!documentoValido(documento)) {
    return { campos: { documento: 'Informe um CPF (11 digitos) ou CNPJ (14 digitos).' }, erro: 'Documento invalido.' };
  }

  const banco = await db();
  const existente = await banco
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(sql`lower(${usuarios.email}) = ${email}`)
    .limit(1);
  if (existente[0]) {
    return { campos: { email: 'Ja existe uma conta com este e-mail.' }, erro: 'E-mail ja cadastrado.' };
  }

  const id = randomUUID();
  try {
    await banco.insert(usuarios).values({
      id,
      email,
      senhaHash: await gerarHashSenha(senha),
      nome,
      empresa: empresa || null,
      documento: documento || null,
      aceitouTermosEm: new Date(),
    });
  } catch (erro) {
    // Duas abas abriram o cadastro no mesmo instante: o indice unico decide,
    // e a mensagem precisa ser a mesma do caminho feliz.
    if (ehViolacaoDeUnicidade(erro)) {
      return { campos: { email: 'Ja existe uma conta com este e-mail.' }, erro: 'E-mail ja cadastrado.' };
    }
    throw erro;
  }

  const token = await emitirToken(banco, id, TIPO_VERIFICACAO, MINUTOS_VERIFICACAO);
  const mensagem = emailBoasVindas(nome, `${getConfig().urlBase}/verificar-email?token=${token}`);
  await enviarEmail({ ...mensagem, para: email });

  const { token: tokenSessao, expiraEm } = await criarSessao(banco, id, await metadadosDoRequest());
  await gravarCookieSessao(tokenSessao, expiraEm);

  redirect('/planos?boas-vindas=1');
}

export async function acaoLogin(
  _estado: EstadoFormulario,
  dados: FormData,
): Promise<EstadoFormulario> {
  const analisado = esquemaLogin.safeParse({ email: dados.get('email'), senha: dados.get('senha') });
  if (!analisado.success) return { campos: errosDoZod(analisado.error), erro: 'Confira os campos destacados.' };

  const { email, senha } = analisado.data;
  const banco = await db();

  const encontrados = await banco
    .select()
    .from(usuarios)
    .where(sql`lower(${usuarios.email}) = ${email}`)
    .limit(1);
  const usuario = encontrados[0];

  // Mesma resposta para e-mail inexistente e senha errada: a diferenca seria um
  // oraculo de quais e-mails tem conta no produto.
  if (!usuario || !(await conferirSenha(senha, usuario.senhaHash))) {
    return { erro: 'E-mail ou senha incorretos.' };
  }

  const { token, expiraEm } = await criarSessao(banco, usuario.id, await metadadosDoRequest());
  await gravarCookieSessao(token, expiraEm);

  redirect(destinoSeguro(dados.get('destino') as string | null));
}

export async function acaoLogout(): Promise<void> {
  await encerrarSessaoAtual();
  redirect('/');
}

/**
 * Resposta identica exista ou nao a conta — o fluxo de recuperacao nao pode
 * confirmar quais e-mails estao cadastrados. O envio acontece em segundo plano
 * para o formulario responder na hora.
 */
export async function acaoRecuperar(
  _estado: EstadoFormulario,
  dados: FormData,
): Promise<EstadoFormulario> {
  const analisado = esquemaRecuperacao.safeParse({ email: dados.get('email') });
  if (!analisado.success) return { campos: errosDoZod(analisado.error), erro: 'Informe um e-mail válido.' };

  const banco = await db();
  const encontrados = await banco
    .select({ id: usuarios.id, nome: usuarios.nome, email: usuarios.email })
    .from(usuarios)
    .where(sql`lower(${usuarios.email}) = ${analisado.data.email}`)
    .limit(1);

  const usuario = encontrados[0];
  if (usuario) {
    const token = await emitirToken(banco, usuario.id, TIPO_REDEFINICAO, MINUTOS_REDEFINICAO);
    await enviarEmail({
      ...emailRedefinicao(`${getConfig().urlBase}/redefinir-senha?token=${token}`),
      para: usuario.email,
    });
  }

  return {
    ok: true,
    mensagem: 'Se houver uma conta com este e-mail, enviamos o link de redefinicao agora.',
  };
}

export async function acaoRedefinir(
  _estado: EstadoFormulario,
  dados: FormData,
): Promise<EstadoFormulario> {
  const analisado = esquemaRedefinicao.safeParse({
    senha: dados.get('senha'),
    confirmacao: dados.get('confirmacao'),
  });
  if (!analisado.success) return { campos: errosDoZod(analisado.error), erro: 'Confira os campos destacados.' };

  const problema = problemaDaSenha(analisado.data.senha);
  if (problema) return { campos: { senha: problema }, erro: problema };

  const bruto = (dados.get('token') as string | null) ?? '';
  const banco = await db();

  const consumo = await consumirToken(banco, TIPO_REDEFINICAO, bruto);
  if (!consumo.ok) {
    const motivo =
      consumo.motivo === 'expirado'
        ? 'Este link expirou. Peca um novo.'
        : consumo.motivo === 'ja-usado'
          ? 'Este link ja foi usado. Entre com a senha nova ou peca outro link.'
          : 'Link invalido.';
    return { erro: motivo };
  }

  await banco
    .update(usuarios)
    .set({ senhaHash: await gerarHashSenha(analisado.data.senha), atualizadoEm: new Date() })
    .where(eq(usuarios.id, consumo.token.usuarioId));

  // Quem pediu a redefinicao pode ser o proprio dono, ou alguem que entrou na
  // conta. Encerra as sessoes em qualquer dos casos e entrega uma nova.
  await banco.delete(sessoes).where(eq(sessoes.usuarioId, consumo.token.usuarioId));
  await revogarTokens(banco, consumo.token.usuarioId);

  const { token, expiraEm } = await criarSessao(banco, consumo.token.usuarioId, await metadadosDoRequest());
  await gravarCookieSessao(token, expiraEm);

  redirect('/conta?senha=alterada');
}

/** Chamado pela tela de "verificar e-mail"; consome o token e confirma a conta. */
export async function confirmarEmail(token: string): Promise<{ ok: boolean; erro?: string }> {
  const banco = await db();
  const consumo = await consumirToken(banco, TIPO_VERIFICACAO, token);
  if (!consumo.ok) {
    return {
      ok: false,
      erro:
        consumo.motivo === 'expirado'
          ? 'O link expirou. Peça um novo e-mail de confirmação.'
          : consumo.motivo === 'ja-usado'
            ? 'Este link já foi usado. Se a confirmação não aparecer, entre na sua conta.'
            : 'Link inválido.',
    };
  }

  await banco
    .update(usuarios)
    .set({ emailVerificadoEm: new Date(), atualizadoEm: new Date() })
    .where(eq(usuarios.id, consumo.token.usuarioId));

  return { ok: true };
}
