import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { classificar } from '../src/lib/categorias';
import type { Licitacao, Snapshot } from '../src/lib/tipos';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '..');
const ARQUIVO = resolve(RAIZ, 'public/dados/licitacoes.json');
const PNCP_EDITAIS = 'https://pncp.gov.br/app/editais';

const ID_PNCP = /^(\d+)-(\d+)-(\d+)\/(\d{4})$/;

function derivarNumeros(id: string): {
  anoCompra: number | null;
  sequencialCompra: number | null;
  linkPncp: string;
} {
  const partes = ID_PNCP.exec(id);
  if (!partes) return { anoCompra: null, sequencialCompra: null, linkPncp: PNCP_EDITAIS };
  const [, cnpj, , sequencial, ano] = partes;
  return {
    anoCompra: Number(ano),
    sequencialCompra: Number(sequencial),
    linkPncp: `${PNCP_EDITAIS}/${cnpj}/${ano}/${Number(sequencial)}`,
  };
}

function reprocessar(licitacao: Licitacao): Licitacao | null {
  const classificacao = classificar(licitacao.objeto);
  if (!classificacao.principal) return null;

  const derivado = derivarNumeros(licitacao.id);
  const linkAtual = licitacao.link || '';
  const linkPncp =
    licitacao.linkPncp || (/^https?:\/\/pncp\.gov\.br\//i.test(linkAtual) ? linkAtual : derivado.linkPncp);
  const linkSistemaOrigem =
    licitacao.linkSistemaOrigem ??
    (linkAtual && !/^https?:\/\/pncp\.gov\.br\//i.test(linkAtual) ? linkAtual : null);

  return {
    ...licitacao,
    numeroControlePncp: licitacao.numeroControlePncp ?? licitacao.id,
    numeroCompra: licitacao.numeroCompra ?? null,
    anoCompra: licitacao.anoCompra ?? derivado.anoCompra,
    sequencialCompra: licitacao.sequencialCompra ?? derivado.sequencialCompra,
    informacaoComplementar: licitacao.informacaoComplementar ?? null,
    linkPncp,
    linkSistemaOrigem,
    link: linkSistemaOrigem || linkPncp,
    categorias: classificacao.categorias,
    categoriaPrincipal: classificacao.principal,
  };
}

async function principal(): Promise<void> {
  const bruto = await readFile(ARQUIVO, 'utf8');
  const snapshot = JSON.parse(bruto) as Snapshot;

  const reprocessadas: Licitacao[] = [];
  for (const licitacao of snapshot.licitacoes) {
    const resultado = reprocessar(licitacao);
    if (resultado) reprocessadas.push(resultado);
  }

  const atualizado: Snapshot = {
    ...snapshot,
    total: reprocessadas.length,
    observacao: `${snapshot.observacao} Categorias reprocessadas offline em ${new Date().toISOString()}.`,
    licitacoes: reprocessadas,
  };

  await writeFile(ARQUIVO, `${JSON.stringify(atualizado, null, 2)}\n`, 'utf8');
  console.log(
    `[reprocessar] ${snapshot.licitacoes.length} -> ${reprocessadas.length} licitações | snapshot atualizado`,
  );
}

principal()
  .then(() => process.exit(0))
  .catch((erro) => {
    console.error('[reprocessar] erro:', erro);
    process.exit(1);
  });
