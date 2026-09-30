import { describe, expect, it } from 'vitest';
import { emailAlertas, emailBoasVindas } from './email';

describe('modelos de e-mail', () => {
  it('escapa HTML vindo de nomes e dados de oportunidades', () => {
    const mensagem = emailAlertas(
      '<script>alert(1)</script>',
      '<img src=x onerror=alert(1)>',
      [
        {
          objeto: '<svg onload=alert(1)>',
          orgao: 'Órgão & Companhia',
          municipio: 'São <Paulo>',
          uf: 'SP',
          prazo: null,
          valor: null,
        },
      ],
      'https://exemplo.com/?busca=arte',
    );

    expect(mensagem.html).not.toContain('<script>');
    expect(mensagem.html).not.toContain('<svg');
    expect(mensagem.html).toContain('&lt;svg onload=alert(1)&gt;');
    expect(mensagem.html).toContain('Órgão &amp; Companhia');
    expect(mensagem.assunto).not.toMatch(/[\r\n\t]/);
    expect(mensagem.assunto.length).toBeLessThan(200);
  });

  it('omite botão com URL fora dos protocolos permitidos', () => {
    const mensagem = emailBoasVindas('Ana', 'javascript:alert(1)');
    expect(mensagem.html).not.toContain('javascript:');
    expect(mensagem.html).not.toContain('href="null"');
  });
});
