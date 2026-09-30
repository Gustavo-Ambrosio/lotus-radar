import { and, asc, eq, inArray, or, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { alertasEnviados, buscasSalvas, licitacoes, usuarios } from '../src/db/schema';
import { criarDb, fecharDb, type Database } from '../src/lib/db';
import { buscarLicitacoes, consultaInicial, type ConsultaLicitacoes } from '../src/lib/licitacoes';
import { emailAlertas, enviarEmail, type ResumoItem } from '../src/lib/email';
import { diasRestantes, formatarMoeda, rotuloPrazo } from '../src/lib/formato';
import { filtrosDaBusca, situacaoDaBusca, type Motivo } from '../src/lib/alertas';
import { filtrosDaUrl, montarQuery } from '../src/lib/url';
import { getConfig } from '../src/lib/env';
import { definirMunicipios } from '../src/lib/geo';
import { MUNICIPIOS_BR } from '../src/lib/municipios-br';
import { ehFrequencia } from '../src/lib/alertas';

/**
 * Job de alertas — `npm run alertas:disparar`.
 *
 * Roda por fora do request (cron do host), em duas etapas separadas:
 *
 * 1. **Marcar.** Para cada busca salva elegivel, acha as licitacoes que entraram
 *    no recorte depois da ultima execucao e grava uma linha em
 *    `alertas_enviados`. O indice unico em (busca, licitacao) e' o que torna a
 *    etapa idempotente: rodar duas vezes, ou ser morto no meio e rodar de novo,
 *    nao duplica nada.
 *
 * 2. **Enviar.** Um e-mail por busca, com todos os itens. Nunca um e-mail por
 *    licitacao — quem salva "cultura no PR" receberia doze mensagens num dia e
 *    passaria a marcar o remetente como lixo.
 *
 * A janela de tempo e' `licitacoes.vista_em` (preenchido na primeira ingestao
 * em que a licitacao aparece), e nao a data de publicacao: um edital publicado
 * ha tres semanas que acabou de entrar no recorte e' novidade para quem le o
 * radar, mas nao para o mundo.
 *
 * As regras de "quem entra na fila" estao em `src/lib/alertas.ts`, com teste.
 * Aqui so' ha SQL e envio.
 *
 *   npm run alertas:disparar
 *   npm run alertas:disparar -- --dry-run      # mostra, sem alterar o banco
 *   npm run alertas:disparar -- --limite=20    # so' as 20 primeiras buscas
 *   npm run alertas:disparar -- --reenviar     # reenvia o que ficou com erro
 */

/** Teto por rodada: protege o gateway de e-mail de uma avalanche. */
const MAX_BUSCAS_POR_RODADA = 500;
const MAX_ITENS_POR_EMAIL = 40;
const MAX_TENTATIVAS = 3;

function log(mensagem: string): void {
  process.stdout.write(`[alertas] ${mensagem}\n`);
}

function opcoes(): { dryRun: boolean; limite: number; reenviar: boolean } {
  const args = process.argv.slice(2);
  const limite = args.find((a) => a.startsWith('--limite='))?.split('=')[1];
  return {
    dryRun: args.includes('--dry-run'),
    reenviar: args.includes('--reenviar'),
    limite: Number(limite) > 0 ? Number(limite) : MAX_BUSCAS_POR_RODADA,
  };
}

/**
 * Reconstroi a consulta da busca salva. O `query` gravado tem preferencia
 * sobre o jsonb de filtros: ele e' a URL exata que a pessoa viu na tela, entao
 * e' o recorte que ela espera receber.
 */
function consultaDaBusca(armazenados: unknown): ConsultaLicitacoes {
  const { segmento, query } = filtrosDaBusca(armazenados);
  const base = consultaInicial(segmento, 1, MAX_ITENS_POR_EMAIL);
  if (!query) return base;
  return { ...base, filtros: filtrosDaUrl(new URLSearchParams(query)) };
}

/** Grava a linha de `alertas_enviados` e devolve quantas entraram de fato. */
async function marcarPendentes(
  db: Database,
  consulta: ConsultaLicitacoes,
  buscaId: string,
  usuarioId: string,
  desde: Date,
): Promise<number> {
  const { itens } = await buscarLicitacoes(db, {
    ...consulta,
    pagina: 1,
    porPagina: MAX_ITENS_POR_EMAIL,
    vistaDepoisDe: desde,
  });

  let novos = 0;
  for (const item of itens) {
    const inseridas = await db
      .insert(alertasEnviados)
      .values({
        id: randomUUID(),
        buscaSalvaId: buscaId,
        usuarioId,
        licitacaoId: item.id,
        status: 'pendente',
      })
      // O conflito e' a idempotencia: se o par (busca, licitacao) ja existe,
      // nao inserimos de novo — logo, nao ha como reenviar.
      .onConflictDoNothing({ target: [alertasEnviados.buscaSalvaId, alertasEnviados.licitacaoId] })
      .returning({ id: alertasEnviados.id });
    if (inseridas.length > 0) novos += 1;
  }
  return novos;
}

interface ItemPendente {
  id: string;
  objeto: string;
  orgao: string;
  municipio: string;
  uf: string;
  valorEstimado: number | null;
  dataEncerramentoProposta: Date | null;
  tentativas: number;
}

async function pendentesDaBusca(db: Database, buscaId: string): Promise<ItemPendente[]> {
  return db
    .select({
      id: alertasEnviados.id,
      objeto: licitacoes.objeto,
      orgao: licitacoes.orgao,
      municipio: licitacoes.municipio,
      uf: licitacoes.uf,
      valorEstimado: licitacoes.valorEstimado,
      dataEncerramentoProposta: licitacoes.dataEncerramentoProposta,
      tentativas: alertasEnviados.tentativas,
    })
    .from(alertasEnviados)
    .innerJoin(licitacoes, eq(licitacoes.id, alertasEnviados.licitacaoId))
    .where(
      and(
        eq(alertasEnviados.buscaSalvaId, buscaId),
        or(eq(alertasEnviados.status, 'pendente'), eq(alertasEnviados.status, 'erro')),
        sql`${alertasEnviados.tentativas} < ${MAX_TENTATIVAS}`,
      ),
    );
}

function resumoDosItens(itens: ItemPendente[]): ResumoItem[] {
  return itens.map((item) => ({
    objeto: item.objeto,
    orgao: item.orgao,
    municipio: item.municipio,
    uf: item.uf,
    prazo: rotuloPrazo(diasRestantes(item.dataEncerramentoProposta?.toISOString() ?? null)),
    valor: formatarMoeda(item.valorEstimado),
  }));
}

async function principal(): Promise<void> {
  const inicio = Date.now();
  const { dryRun, limite, reenviar } = opcoes();
  const config = getConfig();

  if (!dryRun && !config.resendApiKey) {
    throw new Error('RESEND_API_KEY ausente — nenhum alerta sairia. Use --dry-run para inspecionar.');
  }

  definirMunicipios(MUNICIPIOS_BR);
  const { db, driver } = await criarDb();
  log(`banco: ${driver}${dryRun ? ' (dry-run: nada sera enviado)' : ''}`);

  const agora = new Date();
  const contagens: Record<Motivo, number> = {
    'alerta-desligado': 0,
    'email-nao-verificado': 0,
    'plano-expirado': 0,
    'aguardando-janela': 0,
  };

  const candidatas = await db
    .select({
      busca: buscasSalvas,
      nome: usuarios.nome,
      email: usuarios.email,
      emailVerificadoEm: usuarios.emailVerificadoEm,
      plano: usuarios.plano,
      planoValidoAte: usuarios.planoValidoAte,
    })
    .from(buscasSalvas)
    .innerJoin(usuarios, eq(usuarios.id, buscasSalvas.usuarioId))
    .where(eq(buscasSalvas.alertasEmail, true))
    .orderBy(asc(buscasSalvas.ultimaExecucaoEm), asc(buscasSalvas.criadoEm))
    .limit(Math.min(limite, MAX_BUSCAS_POR_RODADA));

  let enviados = 0;
  let semNovidade = 0;
  let falhas = 0;
  let marcados = 0;

  for (const candidata of candidatas) {
    const { busca, nome, email, emailVerificadoEm, plano, planoValidoAte } = candidata;

    const situacao = situacaoDaBusca(
      {
        alertasEmail: busca.alertasEmail,
        frequenciaAlerta: ehFrequencia(busca.frequenciaAlerta) ? busca.frequenciaAlerta : 'diario',
        ultimaExecucaoEm: busca.ultimaExecucaoEm,
      },
      { email, emailVerificadoEm, plano, planoValidoAte },
      agora,
    );

    if (!situacao.ok && situacao.motivo && !(reenviar && situacao.motivo === 'aguardando-janela')) {
      contagens[situacao.motivo] += 1;
      continue;
    }

    const consulta = consultaDaBusca(busca.filtros);
    const novos = dryRun
      ? (await buscarLicitacoes(db, {
          ...consulta,
          pagina: 1,
          porPagina: MAX_ITENS_POR_EMAIL,
          vistaDepoisDe: situacao.desde,
        })).itens.length
      : await marcarPendentes(db, consulta, busca.id, busca.usuarioId, situacao.desde);

    if (dryRun) {
      if (novos > 0) {
        log(`  "${busca.nome}" -> ${email}: ${novos} novidade(s) [dry-run]`);
      } else {
        semNovidade += 1;
      }
      continue;
    }

    const itens = await pendentesDaBusca(db, busca.id);
    if (itens.length === 0) {
      await db
        .update(buscasSalvas)
        .set({ ultimaExecucaoEm: agora })
        .where(eq(buscasSalvas.id, busca.id));
      semNovidade += 1;
      continue;
    }

    marcados += novos;
    const url = `${config.urlBase}/${montarQuery(consulta.segmento, consulta.filtros)}`;
    const idsItens = itens.map((item) => item.id);

    const resultado = await enviarEmail({
      ...emailAlertas(nome, busca.nome, resumoDosItens(itens), url),
      para: email,
    });

    if (resultado.ok) {
      await db
        .update(alertasEnviados)
        .set({
          status: 'enviado',
          enviadoEm: new Date(),
          tentativas: sql`${alertasEnviados.tentativas} + 1`,
          erro: null,
        })
        .where(inArray(alertasEnviados.id, idsItens));
      enviados += 1;
    } else {
      const tentativas = itens.reduce((maior, item) => Math.max(maior, item.tentativas), 0) + 1;
      await db
        .update(alertasEnviados)
        .set({
          // Esgotou as tentativas: marca como ignorado para a proxima rodada
          // parar de insistir num endereco que o gateway rejeita.
          status: tentativas >= MAX_TENTATIVAS ? 'ignorado' : 'erro',
          erro: resultado.erro.slice(0, 500),
          tentativas,
        })
        .where(inArray(alertasEnviados.id, idsItens));
      falhas += 1;
      log(`  falhou para ${email}: ${resultado.erro}`);
    }

    // A marca vai para frente mesmo depois de falha: sem isso, a proxima rodada
    // pegaria a mesma janela e a pessoa receberia o mesmo alerta repetido.
    await db
      .update(buscasSalvas)
      .set({ ultimaExecucaoEm: agora, atualizadoEm: agora })
      .where(eq(buscasSalvas.id, busca.id));
  }

  await fecharDb();

  log(`buscas: ${candidatas.length} | marcados: ${marcados} | enviados: ${enviados}`);
  log(`sem novidade: ${semNovidade} | falhas: ${falhas}`);
  const foraDaFila = Object.entries(contagens)
    .filter(([, total]) => total > 0)
    .map(([motivo, total]) => `${motivo}=${total}`)
    .join(' | ');
  if (foraDaFila) log(`fora da fila — ${foraDaFila}`);
  log(`concluido em ${((Date.now() - inicio) / 1000).toFixed(1)}s`);
}

principal().catch(async (erro: unknown) => {
  process.stderr.write(
    `[alertas] falhou: ${erro instanceof Error ? erro.message : String(erro)}\n`,
  );
  await fecharDb().catch(() => undefined);
  process.exitCode = 1;
});
