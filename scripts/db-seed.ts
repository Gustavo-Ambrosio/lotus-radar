import { eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { usuarios, type Plano } from '../src/db/schema';
import { criarDb, fecharDb } from '../src/lib/db';
import { gerarHashSenha } from '../src/lib/auth/senha';
import { getConfig } from '../src/lib/env';

/**
 * Seed — `npm run db:seed`.
 *
 * Faz duas coisas, e nenhuma das duas inventa dado:
 *
 * 1. Cria a conta de administracao, se `SEED_ADMIN_EMAIL` e `SEED_ADMIN_SENHA`
 *    estiverem no ambiente. Fora de desenvolvimento isso nao acontece: um script
 *    que cria login com senha padrao num banco de producao e' a forma mais
 *    rapida de perder o produto. Nao existe valor padrao para a senha — quem
 *    roda o seed escolhe.
 *
 * 2. Confere se o catalogo de planos esta coerente com o enum do Postgres. Os
 *    planos nao tem tabela (sao codigo, em `src/billing/planos.ts`), entao essa
 *    verificacao e' a unica rede contra um plano novo que entrou no TypeScript
 *    e nao entrou no banco — o que faria a migracao seguinte falhar em
 *    producao, no meio do deploy.
 *
 *   npm run db:seed
 *   npm run db:seed -- --plano=admin
 */

interface Opcoes {
  admin: boolean;
  plano: Plano;
}

function opcoes(): Opcoes {
  const args = process.argv.slice(2);
  const plano = args.find((a) => a.startsWith('--plano='))?.split('=')[1];
  const validos: Plano[] = ['gratuito', 'pro', 'equipe'];

  if (plano && !validos.includes(plano as Plano)) {
    throw new Error(`--plano invalido: ${plano}. Use ${validos.join(', ')}.`);
  }

  return { admin: !args.includes('--sem-admin'), plano: (plano as Plano) ?? 'gratuito' };
}

function log(mensagem: string): void {
  process.stdout.write(`[seed] ${mensagem}\n`);
}

/**
 * `db.execute` devolve um array no driver `postgres` e `{ rows }` no PGlite.
 * O tipo `Database` e' unificado, mas o formato do `execute` no runtime nao
 * coincide — esta funcao normaliza para nao repetir a checagem nos dois lados.
 */
function linhas(resultado: unknown): Record<string, unknown>[] {
  if (Array.isArray(resultado)) return resultado as Record<string, unknown>[];
  const embrulhado = resultado as { rows?: unknown[] } | null;
  return Array.isArray(embrulhado?.rows) ? (embrulhado.rows as Record<string, unknown>[]) : [];
}

/** Confere que todo plano do catalogo tem o enum correspondente no Postgres. */
async function conferirPlanos(db: Awaited<ReturnType<typeof criarDb>>['db']): Promise<void> {
  const { PLANOS, ORDEM_PLANOS } = await import('../src/billing/planos');
  const { planoEnum } = await import('../src/db/schema');

  const resultado = await db.execute<{ enumlabel: string }>(
    sql`select unnest(enum_range(null::${planoEnum}))::text as enumlabel`,
  );
  const rotulos = new Set(linhas(resultado).map((linha) => String(linha['enumlabel'])));

  const faltando = ORDEM_PLANOS.filter((id) => !rotulos.has(id));
  if (faltando.length > 0) {
    throw new Error(
      `O enum 'plano' do banco nao tem: ${faltando.join(', ')}. ` +
        'Rode `npm run db:generate && npm run db:migrate` antes do seed.',
    );
  }

  const pagos = ORDEM_PLANOS.filter((id) => PLANOS[id].precoMensalCentavos > 0);
  log(`planos no catalogo: ${ORDEM_PLANOS.join(', ')} (${pagos.length} pago(s))`);
}

async function criarAdmin(
  db: Awaited<ReturnType<typeof criarDb>>['db'],
  plano: Plano,
): Promise<void> {
  const config = getConfig();
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const senha = process.env.SEED_ADMIN_SENHA;

  if (!email || !senha) {
    log('SEED_ADMIN_EMAIL/SEED_ADMIN_SENHA ausentes — admin nao criado (normal em dev)');
    return;
  }

  // Em producao isso exigiria uma senha digitada no painel do host, que e' o
  // unico lugar onde a conta vai existir. Sem ela, o seed nao cria nada.
  if (config.emProducao && !process.env.SEED_ADMIN_CONFIRMAR) {
    log('producao: defina SEED_ADMIN_CONFIRMAR=1 para criar o admin');
    return;
  }

  if (senha.length < 12) {
    throw new Error('SEED_ADMIN_SENHA precisa de ao menos 12 caracteres.');
  }

  const [existente] = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(sql`lower(${usuarios.email}) = ${email}`)
    .limit(1);

  const senhaHash = await gerarHashSenha(senha);
  const agora = new Date();

  if (existente) {
    await db
      .update(usuarios)
      .set({
        senhaHash,
        papel: 'admin',
        plano,
        planoValidoAte: plano === 'gratuito' ? null : new Date(agora.getTime() + 365 * 24 * 60 * 60 * 1000),
        emailVerificadoEm: agora,
        atualizadoEm: agora,
      })
      .where(eq(usuarios.id, existente.id));
    log(`admin atualizado: ${email} (plano ${plano})`);
    return;
  }

  await db.insert(usuarios).values({
    id: randomUUID(),
    email,
    senhaHash,
    nome: 'Administracao',
    papel: 'admin',
    plano,
    planoValidoAte: plano === 'gratuito' ? null : new Date(agora.getTime() + 365 * 24 * 60 * 60 * 1000),
    emailVerificadoEm: agora,
    aceitouTermosEm: agora,
  });
  log(`admin criado: ${email} (plano ${plano})`);
}

async function principal(): Promise<void> {
  const { admin, plano } = opcoes();
  const { db, driver } = await criarDb();
  log(`banco: ${driver}`);

  await conferirPlanos(db);
  if (admin) await criarAdmin(db, plano);

  const [total] = await db.select({ n: sql<number>`count(*)::int` }).from(usuarios);
  log(`usuarios na base: ${total?.n ?? 0}`);

  await fecharDb();
}

principal().catch(async (erro: unknown) => {
  process.stderr.write(`[seed] falhou: ${erro instanceof Error ? erro.message : String(erro)}\n`);
  await fecharDb().catch(() => undefined);
  process.exitCode = 1;
});
