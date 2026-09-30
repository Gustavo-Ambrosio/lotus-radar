'use client';

import { useActionState, useId } from 'react';
import { useFormStatus } from 'react-dom';
import type { EstadoFormulario } from '../acoes';
import type { ErrosDeCampo } from '@/lib/validacao';

/**
 * Botao de envio com o `pending` do React. Sem isso, um cadastro com bcrypt
 * (que leva algumas centenas de ms) da a impressao de que o formulario nao
 * respondeu, e a pessoa clica de novo criando duas contas.
 */
export function BotaoEnviar({
  children,
  pendente = 'Enviando…',
}: {
  children: React.ReactNode;
  pendente?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="form__botao" disabled={pending}>
      {pending ? pendente : children}
    </button>
  );
}

/** Aviso de sucesso ou erro, com o papel certo para leitores de tela. */
export function Aviso({ estado }: { estado: EstadoFormulario }) {
  if (estado.mensagem) {
    return (
      <p className="form__aviso" role="status">
        {estado.mensagem}
      </p>
    );
  }
  if (estado.erro) {
    return (
      <p className="form__aviso form__aviso--erro" role="alert">
        {estado.erro}
      </p>
    );
  }
  return null;
}

export interface CampoDescrito {
  nome: string;
  rotulo: string;
  tipo?: string;
  autoComplete?: string;
  dica?: string;
  required?: boolean;
  maxLength?: number;
  minLength?: number;
  linhas?: number;
  opcoes?: { valor: string; rotulo: string }[];
}

function Campo({ campo, erro, valorPadrao }: { campo: CampoDescrito; erro?: string; valorPadrao?: string }) {
  const id = useId();
  const descrito = erro ? `${id}-erro` : campo.dica ? `${id}-dica` : undefined;

  return (
    <div className="form__linha">
      <label htmlFor={id}>{campo.rotulo}</label>
      {campo.opcoes ? (
        <select
          id={id}
          name={campo.nome}
          defaultValue={valorPadrao}
          required={campo.required}
          aria-invalid={erro ? true : undefined}
          aria-describedby={descrito}
        >
          {campo.opcoes.map((opcao) => (
            <option key={opcao.valor} value={opcao.valor}>
              {opcao.rotulo}
            </option>
          ))}
        </select>
      ) : campo.linhas ? (
        <textarea
          id={id}
          name={campo.nome}
          rows={campo.linhas}
          defaultValue={valorPadrao}
          required={campo.required}
          maxLength={campo.maxLength}
          aria-invalid={erro ? true : undefined}
          aria-describedby={descrito}
        />
      ) : (
        <input
          id={id}
          name={campo.nome}
          type={campo.tipo ?? 'text'}
          defaultValue={valorPadrao}
          autoComplete={campo.autoComplete}
          required={campo.required}
          maxLength={campo.maxLength}
          minLength={campo.minLength}
          aria-invalid={erro ? true : undefined}
          aria-describedby={descrito}
        />
      )}
      {erro ? (
        <span className="form__erro" id={`${id}-erro`}>
          {erro}
        </span>
      ) : campo.dica ? (
        <span className="form__dica" id={`${id}-dica`}>
          {campo.dica}
        </span>
      ) : null}
    </div>
  );
}

/**
 * Formulario generico de acao de servidor. Os quatro fluxos de conta (cadastro,
 * login, recuperacao e redefinicao) tem a mesma forma: campos, aviso e botao.
 * Fica num Client Component porque `useActionState` precisa do hook, mas quem
 * valida e executa continua sendo a acao no servidor.
 */
export function FormularioAcao({
  acao,
  campos,
  estadoInicial = {},
  ocultos = {},
  textoEnviar,
  pendente,
  extras,
  avisoInicial,
}: {
  acao: (estado: EstadoFormulario, dados: FormData) => Promise<EstadoFormulario>;
  campos: CampoDescrito[];
  estadoInicial?: EstadoFormulario;
  ocultos?: Record<string, string | undefined>;
  textoEnviar: string;
  pendente?: string;
  extras?: React.ReactNode;
  avisoInicial?: { texto: string; erro?: boolean };
}) {
  const [estado, dispatch] = useActionState(acao, estadoInicial);
  const erros: ErrosDeCampo = estado.campos ?? {};

  return (
    <form action={dispatch} className="form" noValidate>
      {Object.entries(ocultos).map(([nome, valor]) =>
        valor === undefined ? null : <input key={nome} type="hidden" name={nome} value={valor} />,
      )}

      {avisoInicial ? (
        <p className={avisoInicial.erro ? 'form__aviso form__aviso--erro' : 'form__aviso'} role="status">
          {avisoInicial.texto}
        </p>
      ) : null}

      {campos.map((campo) => (
        <Campo key={campo.nome} campo={campo} erro={erros[campo.nome]} />
      ))}

      {estado.mensagem || estado.erro ? <Aviso estado={estado} /> : null}

      {extras}

      <BotaoEnviar pendente={pendente}>{textoEnviar}</BotaoEnviar>
    </form>
  );
}
