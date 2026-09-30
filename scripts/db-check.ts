import postgres from 'postgres';
import { getConfig } from '../src/lib/env';

const TABELAS_OBRIGATORIAS = [
  'usuarios',
  'sessoes',
  'tokens',
  'assinaturas',
  'eventos_pagamento',
  'licitacoes',
  'coletas',
  'buscas_salvas',
  'alertas_enviados',
] as const;

async function principal(): Promise<void> {
  const config = getConfig();
  if (config.driver !== 'postgres' || !config.databaseUrl) {
    throw new Error('A checagem exige DB_DRIVER=postgres e DATABASE_URL configurada.');
  }

  const cliente = postgres(config.databaseUrl, { max: 1, connect_timeout: 20, prepare: false });
  try {
    const tabelas = await cliente<{ table_name: string }[]>`
      select table_name
      from information_schema.tables
        where table_schema = 'public'
    `;
    const nomesPublicos = new Set(tabelas.map(({ table_name }) => table_name));
    const encontradas = new Set(TABELAS_OBRIGATORIAS.filter((nome) => nomesPublicos.has(nome)));
    const ausentes = TABELAS_OBRIGATORIAS.filter((nome) => !encontradas.has(nome));
    if (ausentes.length > 0) {
      throw new Error(`Tabelas ausentes: ${ausentes.join(', ')}.`);
    }

    const extensoes = await cliente<{ extname: string }[]>`
      select extname from pg_extension where extname = 'pg_trgm'
    `;
    if (extensoes.length === 0) throw new Error('Extensão pg_trgm ausente.');

    const historico = await cliente<{ quantidade: number }[]>`
      select count(*)::int as quantidade from drizzle.__drizzle_migrations
    `;
    process.stdout.write(
      `[db] PostgreSQL acessível; ${encontradas.size} tabelas, pg_trgm ativo, ` +
      `${historico[0]?.quantidade ?? 0} migrations registradas.\n`,
    );
  } finally {
    await cliente.end({ timeout: 5 });
  }
}

principal().catch((erro: unknown) => {
  const mensagem = erro instanceof Error
    ? [erro.message, 'code' in erro ? `code=${String(erro.code)}` : ''].filter(Boolean).join(' | ')
    : String(erro);
  process.stderr.write(`[db] checagem falhou: ${mensagem || 'erro sem mensagem'}\n`);
  process.exitCode = 1;
});
