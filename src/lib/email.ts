import { getConfig } from './env';
import { urlSegura } from './seguranca';

/**
 * Envio de e-mail.
 *
 * Sem `RESEND_API_KEY` o envio vira log no console em vez de erro: o fluxo de
 * cadastro e o job de alertas precisam poder rodar inteiro em dev, e um
 * provider ausente nao pode virar a unica razao de um teste passar.
 *
 * Todo link de e-mail passa por `urlSegura` — a URL vem de `NEXT_PUBLIC_APP_URL`
 * e uma barra invertida ali viraria um link de phishing com a marca do produto.
 */

export interface Mensagem {
  para: string;
  assunto: string;
  html: string;
  texto: string;
}

export type ResultadoEnvio =
  | { ok: true; id: string; simulado: boolean }
  | { ok: false; erro: string };

export async function enviarEmail(mensagem: Mensagem): Promise<ResultadoEnvio> {
  const config = getConfig();
  if (!config.resendApiKey) {
    // Nunca registrar links de verificacao/redefinicao: carregam tokens de uso
    // unico. Em dev, o destino do envio pode ser conferido sem expor o segredo.
    process.stdout.write(`[email] (simulado) para=${mensagem.para} assunto="${mensagem.assunto}"\n`);
    return { ok: true, id: `simulado-${Date.now()}`, simulado: true };
  }

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(config.resendApiKey);
    const resposta = await resend.emails.send({
      from: config.mailFrom,
      to: mensagem.para,
      subject: mensagem.assunto,
      html: mensagem.html,
      text: mensagem.texto,
    });
    if (resposta.error) return { ok: false, erro: resposta.error.message };
    return { ok: true, id: resposta.data?.id ?? '', simulado: false };
  } catch (erro) {
    return { ok: false, erro: erro instanceof Error ? erro.message : String(erro) };
  }
}

/* ── Moldura visual ────────────────────────────────────────────── */

function moldura(titulo: string, corpoHtml: string, rodape: string): string {
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escaparHtml(titulo)}</title></head>
<body style="margin:0;padding:24px;background:#f4f4f5;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#18181b">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7">
    <tr><td style="padding:20px 28px;border-bottom:1px solid #e4e4e7">
      <span style="font-size:15px;font-weight:600;letter-spacing:-0.01em">Lotus Radar</span>
      <span style="color:#71717a;font-size:13px"> &middot; licitacoes de cultura e tecnologia</span>
    </td></tr>
    <tr><td style="padding:28px">
      <h1 style="margin:0 0 12px;font-size:19px;line-height:1.3">${escaparHtml(titulo)}</h1>
      ${corpoHtml}
    </td></tr>
    <tr><td style="padding:16px 28px;background:#fafafa;border-top:1px solid #e4e4e7;color:#71717a;font-size:12px;line-height:1.5">
      ${rodape}
    </td></tr>
  </table>
</body></html>`;
}

function escaparHtml(valor: string): string {
  return valor.replace(/[&<>"']/g, (caractere) => {
    switch (caractere) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      default: return '&#39;';
    }
  });
}

function botao(rotulo: string, url: string): string {
  const segura = urlSegura(url);
  if (!segura) return '';
  return `<p style="margin:24px 0"><a href="${escaparHtml(segura)}" style="display:inline-block;background:#18181b;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;font-size:14px">${escaparHtml(rotulo)}</a></p>
  <p style="margin:0;font-size:13px;color:#71717a;word-break:break-all">Se o botao nao funcionar, copie este endereco:<br>${escaparHtml(segura)}</p>`;
}

/* ── Modelos ───────────────────────────────────────────────────── */

export function emailBoasVindas(nome: string, urlVerificacao: string): Mensagem {
  const primeiro = nome.trim().split(' ')[0] || 'la';
  return {
    para: '',
    assunto: 'Confirme seu e-mail no Lotus Radar',
    html: moldura(
      'Confirme seu e-mail',
      `<p style="margin:0 0 8px;color:#3f3f46;font-size:15px;line-height:1.6">Ola, ${escaparHtml(primeiro)}. Falta um passo para comecar a receber os alertas das suas buscas.</p>
       <p style="margin:0;color:#3f3f46;font-size:15px;line-height:1.6">Seu endereco nunca e' publicado e nao sai da lista.</p>
       ${botao('Confirmar e-mail', urlVerificacao)}`,
      'Link valido por 24 horas. Se nao foi voce, pode ignorar esta mensagem.',
    ),
    texto: `Ola, ${primeiro}!\n\nConfirme seu e-mail para comecar a receber os alertas:\n${urlVerificacao}\n\nO link vale por 24 horas. Se nao foi voce, ignore esta mensagem.`,
  };
}

export function emailRedefinicao(url: string): Mensagem {
  return {
    para: '',
    assunto: 'Redefinir sua senha do Lotus Radar',
    html: moldura(
      'Redefinir senha',
      `<p style="margin:0 0 8px;color:#3f3f46;font-size:15px;line-height:1.6">Recebemos um pedido para redefinir a senha da sua conta.</p>
       ${botao('Criar nova senha', url)}`,
      'Link valido por 1 hora e some depois do primeiro uso. Se nao foi voce, troque a senha: alguem pode ter acessado sua conta.',
    ),
    texto: `Recebemos um pedido para redefinir a senha da sua conta:\n${url}\n\nO link vale por 1 hora e some depois do primeiro uso. Se nao foi voce, troque a senha.`,
  };
}

export function emailAlertas(nome: string, busca: string, itens: ResumoItem[], urlLista: string): Mensagem {
  const primeiro = nome.trim().split(' ')[0] || 'la';
  const buscaAssunto = busca.replace(/[\r\n\t]+/g, ' ').slice(0, 120).trim();
  const linhas = itens
    .map(
      (item) => `<tr>
        <td style="padding:12px 0;border-bottom:1px solid #f4f4f5">
        <div style="font-size:14px;font-weight:600;line-height:1.4;color:#18181b">${escaparHtml(item.objeto)}</div>
          <div style="font-size:13px;color:#71717a;margin-top:3px">${escaparHtml(item.orgao)} &middot; ${escaparHtml(item.municipio)}/${escaparHtml(item.uf)}</div>
          <div style="font-size:13px;margin-top:3px">${item.prazo ? `Encerra em ${escaparHtml(item.prazo)}`: 'Prazo nao informado'}${item.valor ? ` &middot; ${escaparHtml(item.valor)}` : ''}</div>
        </td></tr>`,
    )
    .join('');

  return {
    para: '',
    assunto: `${itens.length} nova(s) oportunidade(s) em "${buscaAssunto}"`,
    html: moldura(
      `${itens.length} nova(s) em "${buscaAssunto}"`,
      `<p style="margin:0 0 8px;color:#3f3f46;font-size:15px;line-height:1.6">Ola, ${escaparHtml(primeiro)}. apareceram oportunidades abertas com as suas palavras-chave.</p>
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px">${linhas}</table>
       ${botao('Ver todas e candidatar-se', urlLista)}`,
      'Voce recebe este aviso porque salvou esta busca. Para cancelar, remova a busca na sua conta.',
    ),
    texto: [
      `Ola, ${primeiro}!`,
      `${itens.length} nova(s) oportunidade(s) em "${buscaAssunto}":`,
      '',
      ...itens.map(
        (i) => `- ${i.objeto} (${i.orgao}, ${i.municipio}/${i.uf})${i.prazo ? ` — encerra em ${i.prazo}` : ''}${i.valor ? ` — ${i.valor}` : ''}`,
      ),
      '',
      `Ver todas: ${urlLista}`,
      'Para cancelar, remova a busca na sua conta.',
    ].join('\n'),
  };
}

export interface ResumoItem {
  objeto: string;
  orgao: string;
  municipio: string;
  uf: string;
  prazo: string | null;
  valor: string | null;
}
