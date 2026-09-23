export interface Trecho {
  texto: string;
  marca: boolean;
}

function achatarChars(valor: string): string {
  let saida = '';
  for (const letra of valor) {
    const base = letra.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    saida += (base || letra).toLocaleLowerCase('pt-BR');
  }
  return saida;
}

function escaparRegex(valor: string): string {
  return valor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function destacar(texto: string, termoBruto: string): Trecho[] {
  if (!texto || !termoBruto.trim()) {
    return [{ texto, marca: false }];
  }

  const plano = achatarChars(texto);
  const termoFlat = achatarChars(termoBruto.trim()).replace(/\s+/g, ' ');
  const partesTermo = termoFlat.split(' ');
  const regex = new RegExp(partesTermo.map(escaparRegex).join('\\s+'), 'gi');

  const trechos: Trecho[] = [];
  let fimUltimo = 0;
  let resultado: RegExpExecArray | null;
  while ((resultado = regex.exec(plano)) !== null) {
    const inicio = resultado.index;
    const fim = inicio + resultado[0].length;
    if (inicio > fimUltimo) {
      trechos.push({ texto: texto.slice(fimUltimo, inicio), marca: false });
    }
    trechos.push({ texto: texto.slice(inicio, fim), marca: true });
    fimUltimo = fim;
    if (regex.lastIndex === fim) regex.lastIndex += 1;
  }
  if (fimUltimo < texto.length) {
    trechos.push({ texto: texto.slice(fimUltimo), marca: false });
  }

  return trechos.length > 0 ? trechos : [{ texto, marca: false }];
}