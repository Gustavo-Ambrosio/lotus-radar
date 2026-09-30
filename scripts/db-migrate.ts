import { resolve } from 'node:path';
import { sql } from 'drizzle-orm';
import { criarDb, fecharDb } from '../src/lib/db';

/**
 * Aplica as migrations de `drizzle/` no banco configurado.
 *
 * A extensao `pg_trgm` e' criada antes de tudo: o indice GIN de busca textual
 * da tabela `licitacoes` usa `gin_trgm_ops` e a migration falha sem ela. Em
 * Postgres gerenciado ela ja vem instalada; o IF NOT EXISTS torna a chamada
 * inofensiva.
 */
const PASTA_MIGRATIONS = resolve(process.cwd(), 'drizzle');

async function principal(): Promise<void> {
  const { db, driver, migrar } = await criarDb();

  process.stdout.write(`[db] driver: ${driver}\n`);
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
  await migrar(PASTA_MIGRATIONS);

  process.stdout.write('[db] migrations aplicadas\n');
  await fecharDb();
}

principal().catch(async (erro: unknown) => {
  const detalhes = erro instanceof Error
    ? [erro.message, 'code' in erro ? `code=${String(erro.code)}` : '', `name=${erro.name}`]
        .filter(Boolean)
        .join(' | ')
    : String(erro);
  process.stderr.write(`[db] falhou: ${detalhes || 'erro sem mensagem'}\n`);
  await fecharDb().catch(() => undefined);
  process.exitCode = 1;
});
