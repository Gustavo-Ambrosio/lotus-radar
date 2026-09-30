import { drizzle } from 'drizzle-orm/postgres-js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { migrate as migrarPostgres } from 'drizzle-orm/postgres-js/migrator';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { migrate as migrarPglite } from 'drizzle-orm/pglite/migrator';
import postgres from 'postgres';
import * as schema from '../../db/schema';
import { getConfig, type DriverBanco } from '../env';

/**
 * Cliente de banco unico para os dois drivers suportados.
 *
 * - `postgres` (producao): Postgres gerenciado, via `postgres` (node-postgres)
 *   sobre conexao TCP.
 * - `pglite` (dev sem DATABASE_URL): Postgres compilado para WASM, persistido
 *   em `.pgdata/`. Mesmo SQL, mesmo Drizzle, sem servidor para subir.
 *
 * O tipo e' o do driver `postgres` mesmo no caso PGlite: os dois produzem o
 * mesmo dialeto SQL a partir do mesmo schema, entao o construtor de queries e'
 * identico. Manter um unico tipo evita `union` no meio do codigo de aplicacao.
 */
export type Database = PostgresJsDatabase<typeof schema>;

export interface Instancia {
  db: Database;
  driver: DriverBanco;
  /** Encerra o pool/conexao. Chamar em scripts e no shutdown do servidor. */
  fechar: () => Promise<void>;
  /**
   * Aplica as migrations de `drizzle/`. Vive aqui, e nao no script, porque cada
   * driver tem seu proprio migrator — que precisa do handle *real* do driver,
   * nao o `db` unificado. Chamar o migrator errado quebra em runtime.
   */
  migrar: (pastaMigrations: string) => Promise<void>;
}

/** Diretorio do banco embarcado (ignorado pelo git). */
export const DIR_PGLITE = '.pgdata';

type Singleton = { promessa: Promise<Instancia> };

const global = globalThis as typeof globalThis & { __lotusRadarDb?: Singleton };

function criarPostgres(url: string): Instancia {
  // `postgres` e' o client do node-postgres: pool de 10 conexoes e `prepare`
  // desligado por compatibilidade com poolers em modo transacional (Neon,
  // Supabase, RDS Proxy), que nao suportam prepared statements.
  const cliente = postgres(url, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 20,
    prepare: false,
  });
  return {
    db: drizzle(cliente, { schema }),
    driver: 'postgres',
    fechar: () => cliente.end({ timeout: 5 }),
    migrar: (pasta) => migrarPostgres(drizzle(cliente, { schema }), { migrationsFolder: pasta }),
  };
}

async function criarPglite(): Promise<Instancia> {
  const { PGlite } = await import('@electric-sql/pglite');
  const { pg_trgm } = await import('@electric-sql/pglite/contrib/pg_trgm');
  // pg_trgm e' carregado como extensao: o indice de busca textual da tabela
  // `licitacoes` depende dele (ver src/db/schema.ts).
  const cliente = new PGlite(DIR_PGLITE, { extensions: { pg_trgm } });
  await cliente.waitReady;
  const real = drizzlePglite(cliente, { schema });
  return {
    // O `as never` resolve a sobrecarga de `drizzle` para o driver postgres-js;
    // o cast final fixa o tipo unico de Database (ver a nota no topo do arquivo).
    db: real as unknown as Database,
    driver: 'pglite',
    fechar: () => cliente.close(),
    migrar: (pasta) => migrarPglite(real, { migrationsFolder: pasta }),
  };
}

/**
 * Instancia compartilhada do processo. O cache global existe porque o
 * `next dev` reavalia modulos a cada alteracao: sem ele, cada HMR abriria um
 * novo pool — e, no PGlite, um segundo processo de escrita sobre o mesmo
 * arquivo em `.pgdata/`.
 *
 * E' a *promessa* que fica no cache, nao a instancia: assim chamadas
 * concorrentes (comum no primeiro request) aguardam a mesma inicializacao em
 * vez de abrir duas conexoes.
 */
export function criarDb(): Promise<Instancia> {
  const existente = global.__lotusRadarDb;
  if (existente) return existente.promessa;

  const config = getConfig();
  const promessa =
    config.driver === 'postgres'
      ? Promise.resolve(criarPostgres(config.databaseUrl as string))
      : criarPglite();

  global.__lotusRadarDb = { promessa };
  return promessa;
}

/** Atalho para o uso comum: o `db` ja pronto. */
export async function db(): Promise<Database> {
  return (await criarDb()).db;
}

export async function fecharDb(): Promise<void> {
  const existente = global.__lotusRadarDb;
  if (!existente) return;
  global.__lotusRadarDb = undefined;
  await (await existente.promessa).fechar();
}
