import { z } from 'zod';
import { TAMANHO_MINIMO_SENHA } from './auth/senha';

/**
 * Schemas de entrada das telas publicas. Ficam juntos porque a regra que importa
 * aqui e' a mesma: o que chega do formulario passa por zod antes de chegar perto
 * do banco, e a mensagem de erro e' escrita para o usuario final — nunca com o
 * nome da coluna ou o detalhe da constraint.
 */

const email = z
  .string()
  .trim()
  .min(5, 'Informe um e-mail válido.')
  .max(254, 'E-mail muito longo.')
  .email('Informe um e-mail válido.')
  .transform((valor) => valor.toLowerCase());

const senha = z
  .string()
  .min(TAMANHO_MINIMO_SENHA, `A senha precisa de ao menos ${TAMANHO_MINIMO_SENHA} caracteres.`)
  .max(200, 'Senha muito longa.');

export const esquemaCadastro = z.object({
  nome: z.string().trim().min(2, 'Informe seu nome.').max(120),
  email,
  senha,
  empresa: z.string().trim().max(160).optional().or(z.literal('')),
  documento: z
    .string()
    .trim()
    .max(20)
    .optional()
    .or(z.literal(''))
    .transform((valor) => (valor ? valor.replace(/[^\d]/g, '') : '')),
});

export type DadosCadastro = z.infer<typeof esquemaCadastro>;

export const esquemaLogin = z.object({
  email,
  senha: z.string().min(1, 'Informe a senha.').max(200),
});

export const esquemaRecuperacao = z.object({ email });

export const esquemaRedefinicao = z.object({
  senha,
  confirmacao: z.string(),
}).refine((dados) => dados.senha === dados.confirmacao, {
  message: 'As senhas nao conferem.',
  path: ['confirmacao'],
});

/** Placa de digitacao: so' digitos, 11 (CPF) ou 14 (CNPJ) caracteres. */
export function documentoValido(valor: string): boolean {
  return valor === '' || /^\d{11}$/.test(valor) || /^\d{14}$/.test(valor);
}

export interface ErrosDeCampo {
  [campo: string]: string | undefined;
}

/** Achata o erro do zod no formato que os formularios consomem. */
export function errosDoZod(erro: z.ZodError): ErrosDeCampo {
  const saida: ErrosDeCampo = {};
  for (const item of erro.issues) {
    const chave = item.path.join('.') || 'formulario';
    if (!saida[chave]) saida[chave] = item.message;
  }
  return saida;
}

export function mensagemDoZod(erro: z.ZodError): string {
  return erro.issues[0]?.message ?? 'Dados invalidos.';
}
