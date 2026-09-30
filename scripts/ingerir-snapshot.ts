import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { inArray, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { criarDb, fecharDb } from '../src/lib/db';
import { coletas, licitacoes } from '../src/db/schema';
import { definirMunicipios, municipioPorNome } from '../src/lib/geo';
import { paraLinha } from '../src/lib/ingestao';
import { MUNICIPIOS_BR } from '../src/lib/municipios-br';
import { estaEncerrada } from '../src/lib/vigencia';
import type { Licitacao, Snapshot } from '../src/lib/tipos';

/**
 * Ingestao: `public/dados/licitacoes.json` -> tabela `licitacoes`.
 *
 * O snapshot e' o formato de transporte dos coletores; a partir daqui a fonte
 * da verdade e' o banco. A ingestao e' idempotente (upsert por `id`) e remove
 * o que saiu do snapshot, para que o radar nao sirva oportunidade encerrada
 * entre uma coleta e a seguinte.
 *
 *   npm run ingest              # snapshot padrao
 *   npm run ingest -- arquivo.json
 *
 * Se o snapshot veio marcado como `truncado` (coleta cortada por tempo/pagina),
 * a remocao e' pulada: um snapshot parcial nao autoriza apagar o que ele nao
 * viu.
 */

const ARQUIVO_PADRAO = resolve(process.cwd(), 'public/dados/licitacoes.json');
const LOTE = 200;

function log(mensagem: string): void {
  process.stdout.write(`[ingest] ${mensagem}\n`);
}

async function principal(): Promise<void> {
  const inicio = Date.now();
  const caminho = process.argv[2] ? resolve(process.cwd(), process.argv[2]) : ARQUIVO_PADRAO;

  const snapshot = JSON.parse(await readFile(caminho, 'utf8')) as Snapshot;
  const fonte = snapshot.fontes?.join(' | ') ?? snapshot.fonte ?? 'desconhecida';
  log(`snapshot ${caminho} — ${snapshot.licitacoes.length} itens, gerado em ${snapshot.geradoEm}`);

  definirMunicipios(MUNICIPIOS_BR);

  // Reaplica a regra de "live" na hora de gravar: entre a coleta e a ingestao
  // alguns prazos venceram, e o que esta encerrado nao deve virar opportunity.
  const vivas = snapshot.licitacoes.filter(
    (item) => !estaEncerrada(item.dataEncerramentoProposta, item.situacao),
  );
  const encerradas = snapshot.licitacoes.length - vivas.length;
  if (encerradas > 0) log(`${encerradas} item(ns) descartado(s): prazo vencido desde a coleta`);

  const linhas = vivas.map((item: Licitacao) => paraLinha(item, coordenadasDe(item)));
  const semGeo = linhas.filter((l) => l.latitude === null).length;
  if (semGeo > 0) log(`${semGeo} item(ns) sem coordenada (municipio fora da lista do IBGE)`);

  const { db, driver } = await criarDb();
  log(`banco: ${driver}`);

  // Campos que a coleta reescreve a cada rodada. `vista_em` fica de fora de
  // proposito: e' o que impede o job de alertas de reenviar o mesmo item.
  const atualizados = {
    orgao: sql`excluded.orgao`,
    cnpj: sql`excluded.cnpj`,
    esfera: sql`excluded.esfera`,
    uf: sql`excluded.uf`,
    municipio: sql`excluded.municipio`,
    codigoIbge: sql`excluded.codigo_ibge`,
    objeto: sql`excluded.objeto`,
    informacaoComplementar: sql`excluded.informacao_complementar`,
    textoBusca: sql`excluded.texto_busca`,
    modalidade: sql`excluded.modalidade`,
    numeroCompra: sql`excluded.numero_compra`,
    numeroControlePncp: sql`excluded.numero_controle_pncp`,
    anoCompra: sql`excluded.ano_compra`,
    sequencialCompra: sql`excluded.sequencial_compra`,
    valorEstimado: sql`excluded.valor_estimado`,
    dataPublicacao: sql`excluded.data_publicacao`,
    dataAberturaProposta: sql`excluded.data_abertura_proposta`,
    dataEncerramentoProposta: sql`excluded.data_encerramento_proposta`,
    link: sql`excluded.link`,
    linkPncp: sql`excluded.link_pncp`,
    linkSistemaOrigem: sql`excluded.link_sistema_origem`,
    categorias: sql`excluded.categorias`,
    categoriaPrincipal: sql`excluded.categoria_principal`,
    segmentos: sql`excluded.segmentos`,
    situacao: sql`excluded.situacao`,
    origem: sql`excluded.origem`,
    latitude: sql`excluded.latitude`,
    longitude: sql`excluded.longitude`,
    atualizadoEm: sql`now()`,
  } as const;

  for (let inicioLote = 0; inicioLote < linhas.length; inicioLote += LOTE) {
    const lote = linhas.slice(inicioLote, inicioLote + LOTE);
    await db
      .insert(licitacoes)
      .values(lote)
      .onConflictDoUpdate({ target: licitacoes.id, set: atualizados });
  }
  log(`${linhas.length} licitacao(oes) gravada(s)`);

  let removidas = 0;
  if (!snapshot.truncado) {
    const ids = new Set(linhas.map((l) => l.id));
    const existentes = await db.select({ id: licitacoes.id }).from(licitacoes);
    const obsoletos = existentes.map((r) => r.id).filter((id) => !ids.has(id));
    if (obsoletos.length > 0) {
      for (let i = 0; i < obsoletos.length; i += 500) {
        await db.delete(licitacoes).where(inArray(licitacoes.id, obsoletos.slice(i, i + 500)));
      }
      removidas = obsoletos.length;
      log(`${removidas} licitacao(oes) removida(s): nao estao mais no snapshot`);
    }
  } else {
    log('snapshot truncado — remocao pulada para nao apagar o que nao foi coletado');
  }

  const contagem = await db.select({ total: sql<number>`count(*)::int` }).from(licitacoes);
  log(`total na tabela: ${contagem[0]?.total ?? 0}`);

  await db.insert(coletas).values({
    id: randomUUID(),
    fonte,
    geradoEm: new Date(snapshot.geradoEm),
    total: snapshot.licitacoes.length,
    inseridas: linhas.length,
    atualizadas: linhas.length,
    removidas,
    truncado: snapshot.truncado,
    observacao: snapshot.observacao,
    duracaoMs: Date.now() - inicio,
  });

  await fecharDb();
  log(`concluido em ${((Date.now() - inicio) / 1000).toFixed(1)}s`);
}

function coordenadasDe(licitacao: Licitacao): { lat: number; lng: number } | null {
  const municipio = municipioPorNome(licitacao.municipio, licitacao.uf);
  if (!municipio) return null;
  return { lat: municipio.lat, lng: municipio.lng };
}

principal().catch(async (erro: unknown) => {
  process.stderr.write(`[ingest] falhou: ${erro instanceof Error ? erro.message : String(erro)}\n`);
  await fecharDb().catch(() => undefined);
  process.exitCode = 1;
});
