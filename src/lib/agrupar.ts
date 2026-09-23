import type { Licitacao } from './tipos';

export interface GrupoDia {
  chave: string;
  rotulo: string;
  itens: Licitacao[];
}

const DATA_CHAVE = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'America/Sao_Paulo',
});

function chaveDeIso(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : DATA_CHAVE.format(d);
}

export function rotuloDoGroupo(chave: string): string {
  const hoje = DATA_CHAVE.format(new Date());
  const ontem = DATA_CHAVE.format(new Date(Date.now() - 24 * 60 * 60 * 1000));
  if (chave === hoje) return 'Hoje';
  if (chave === ontem) return 'Ontem';
  return chave;
}

export function agruparPorDia(lista: Licitacao[]): GrupoDia[] {
  const grupos = new Map<string, Licitacao[]>();
  const semData: Licitacao[] = [];

  for (const item of lista) {
    const chave = chaveDeIso(item.dataPublicacao);
    if (chave === null) {
      semData.push(item);
      continue;
    }
    const atual = grupos.get(chave) ?? [];
    atual.push(item);
    grupos.set(chave, atual);
  }

  const ordenadas = [...grupos.entries()].sort((a, b) => b[0].localeCompare(a[0], 'pt-BR'));

  const resultado: GrupoDia[] = ordenadas.map(([chave, itens]) => ({
    chave,
    rotulo: rotuloDoGroupo(chave),
    itens,
  }));

  if (semData.length > 0) {
    resultado.push({ chave: 'sem-data', rotulo: 'Sem data de publicação', itens: semData });
  }

  return resultado;
}