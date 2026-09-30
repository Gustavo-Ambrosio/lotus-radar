'use server';

import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { buscasSalvas } from '@/db/schema';
import { db } from '@/lib/db';
import { exigirUsuario } from '@/lib/auth/cookie';
import { limitesDoPlano } from '@/billing/planos';
import { filtrosDaUrl, montarQuery, segmentoDaUrl } from '@/lib/url';
import {
  MINUTOS_VERIFICACAO,
  TIPO_VERIFICACAO,
  emitirToken,
} from '@/lib/auth/tokens';
import { emailBoasVindas, enviarEmail } from '@/lib/email';
import { getConfig } from '@/lib/env';
import { rotuloSegmento } from '@/lib/segmentos';
import type { Segmento } from '@/lib/tipos';

/**
 * Acoes das buscas salvas. O limite vem do plano e e' conferido aqui, no
 * servidor — a tela apenas mostra o que ja passou por esta regra, entao nao ha
 * como contornar a cota mudando o numero na mao.
 */

function ehViolacaoDeUnicidade(erro: unknown): boolean {
  return (erro as { code?: string } | null)?.code === '23505';
}

/** Le a busca da URL atual e grava com um nome automatico. */
export async function acaoSalvarBusca(formData: FormData): Promise<void> {
  const usuario = await exigirUsuario('/');
  const url = new URLSearchParams();
  for (const [chave, valor] of formData.entries()) {
    if (typeof valor === 'string' && valor !== '') url.set(chave, valor);
  }

  const segmento = segmentoDaUrl(url);
  const filtros = filtrosDaUrl(url);
  const banco = await db();

  const limite = limitesDoPlano(usuario.plano).buscasSalvas;
  const existentes = await banco
    .select({ id: buscasSalvas.id })
    .from(buscasSalvas)
    .where(eq(buscasSalvas.usuarioId, usuario.id));
  if (existentes.length >= limite) {
    redirect(`/conta/buscas?erro=limite&limite=${limite}`);
  }

  const query = montarQuery(segmento, filtros);
  const temFiltro =
    filtros.busca !== '' ||
    filtros.categorias.length > 0 ||
    filtros.uf !== '' ||
    filtros.municipio !== '' ||
    filtros.esfera !== '' ||
    filtros.modalidade !== '' ||
    filtros.prazoMaxDias !== null ||
    filtros.valorMinimo !== null ||
    filtros.valorMaximo !== null;
  if (!temFiltro) {
    redirect(`/?seg=${segmento}&erro=busca-vazia`);
  }

  const nome =
    (formData.get('nome') as string | null)?.trim().slice(0, 120) ||
    rotuloAutomatico(segmento, filtros);

  const alertasEmail = formData.get('alertas') === 'on';

  try {
    await banco.insert(buscasSalvas).values({
      id: randomUUID(),
      usuarioId: usuario.id,
      nome,
      segmento,
      filtros: { ...filtros, ordenacao: filtros.ordenacao, query },
      alertasEmail,
      frequenciaAlerta: 'diario',
    });
  } catch (erro) {
    if (ehViolacaoDeUnicidade(erro)) redirect('/conta/buscas?erro=duplicada');
    throw erro;
  }

  revalidatePath('/conta/buscas');
  redirect('/conta/buscas?salva=1');
}

/** Nome automatico quando a pessoa nao batizou a busca. */
function rotuloAutomatico(segmento: Segmento, filtros: ReturnType<typeof filtrosDaUrl>): string {
  if (filtros.uf) return `${rotuloSegmento(segmento)} — ${filtros.uf}`;
  if (filtros.municipio) return `${filtros.municipio}`;
  if (filtros.busca) return filtros.busca;
  if (filtros.categorias.length > 0) return `${filtros.categorias.length} categoria(s)`;
  return rotuloSegmento(segmento);
}

export async function acaoExcluirBusca(formData: FormData): Promise<void> {
  const usuario = await exigirUsuario('/conta/buscas');
  const id = (formData.get('id') as string | null) ?? '';
  if (!id) redirect('/conta/buscas');

  const banco = await db();
  // O id vem do formulario, entao a condicao de usuario nao e' opcional: sem
  // ela, editar o campo `id` no devtools apagaria a busca de outra pessoa.
  await banco
    .delete(buscasSalvas)
    .where(and(eq(buscasSalvas.id, id), eq(buscasSalvas.usuarioId, usuario.id)));

  revalidatePath('/conta/buscas');
  redirect('/conta/buscas');
}

/** Liga/desliga o alerta. A busca continua salva — so o envio para. */
export async function acaoAlternarAlerta(formData: FormData): Promise<void> {
  const usuario = await exigirUsuario('/conta/buscas');
  const id = (formData.get('id') as string | null) ?? '';
  if (!id) redirect('/conta/buscas');

  const banco = await db();
  const [atual] = await banco
    .select({ alertas: buscasSalvas.alertasEmail })
    .from(buscasSalvas)
    .where(and(eq(buscasSalvas.id, id), eq(buscasSalvas.usuarioId, usuario.id)))
    .limit(1);
  if (!atual) redirect('/conta/buscas');

  await banco
    .update(buscasSalvas)
    .set({ alertasEmail: !atual.alertas, atualizadoEm: new Date() })
    .where(and(eq(buscasSalvas.id, id), eq(buscasSalvas.usuarioId, usuario.id)));

  revalidatePath('/conta/buscas');
  redirect('/conta/buscas');
}

/** Reenvia a confirmação de e-mail — util quando o primeiro foi para o spam. */
export async function acaoReenviarConfirmacao(): Promise<void> {
  const usuario = await exigirUsuario('/conta');
  if (usuario.emailVerificadoEm) redirect('/conta');

  const banco = await db();
  const token = await emitirToken(banco, usuario.id, TIPO_VERIFICACAO, MINUTOS_VERIFICACAO);
  await enviarEmail({
    ...emailBoasVindas(usuario.nome, `${getConfig().urlBase}/verificar-email?token=${token}`),
    para: usuario.email,
  });

  redirect('/conta?confirmacao=reenviada');
}
