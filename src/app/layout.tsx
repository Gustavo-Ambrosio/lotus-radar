import type { Metadata } from 'next';
import Link from 'next/link';
import { usuarioAtual } from '@/lib/auth/cookie';
import { acaoLogout } from './acoes';
import './globals.css';

/**
 * Casca da aplicacao. Server Component de proposito: quem esta logado e qual
 * plano ele tem vem do banco, entao o cabecalho nao pode ser cacheado como
 * HTML estatico — e' o que permite trocar de plano e ver a interface mudar na
 * hora, sem recarregar a pagina.
 */

/**
 * `metadataBase` e' lido do ambiente diretamente, e nao por `getConfig()`.
 * Este objeto e' avaliado na importacao do modulo — dentro do `next build` —
 * e chamar `getConfig()` aqui derrubaria o build de producao, porque o
 * validador exige `DATABASE_URL` e o `next build` roda sem ela. A URL do
 * app e' justamente o tipo de valor que o prefixo `NEXT_PUBLIC_` existe para
 * expor: e' publica, e o Next a embute no bundle.
 */
const URL_PUBLICA = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  title: 'Lotus Radar — licitações de cultura e tecnologia',
  description:
    'Radar de licitações e editais abertos de cultura e tecnologia no Brasil: federal, estadual e municipal, com busca salva e alerta por e-mail.',
  metadataBase: new URL(URL_PUBLICA),
  openGraph: {
    title: 'Lotus Radar',
    description: 'Licitações de cultura e tecnologia do Brasil, com alerta quando abre.',
    type: 'website',
    locale: 'pt_BR',
  },
};

/**
 * Nada aqui pode ser prerenderizado: o cabecalho depende da sessao e as telas
 * leem do Postgres. Sem este `force-dynamic`, o `next build` tentaria abrir o
 * banco durante a geracao estatica — e em producao isso falha de vez, porque
 * o PGlite de desenvolvimento esta bloqueado fora de `NODE_ENV=development`.
 */
export const dynamic = 'force-dynamic';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const usuario = await usuarioAtual().catch(() => null);

  return (
    <html lang="pt-BR">
      <body>
        <a className="pular" href="#conteudo">
          Pular para o conteúdo
        </a>

        <header className="topo">
          <div className="topo__interno">
            <Link href="/" className="topo__marca">
              <span className="topo__logo" aria-hidden="true">
                ✦
              </span>
              <span>Lotus Radar</span>
            </Link>

            <nav className="topo__nav" aria-label="Navegação principal">
              <Link href="/?seg=cultura">Cultura</Link>
              <Link href="/?seg=tecnologia">Tecnologia</Link>
              <Link href="/planos">Planos</Link>
            </nav>

            <div className="topo__conta">
              {usuario ? (
                <>
                  <Link href="/conta" className="topo__usuario">
                    {usuario.nome.split(' ')[0]}
                    <span className={`selo-plano selo-plano--${usuario.plano}`}>{usuario.plano}</span>
                  </Link>
                  <form action={acaoLogout}>
                    <button type="submit" className="topo__sair">
                      Sair
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link href="/entrar" className="topo__link">
                    Entrar
                  </Link>
                  <Link href="/criar-conta" className="topo__cta">
                    Criar conta
                  </Link>
                </>
              )}
            </div>
          </div>
        </header>

        <main id="conteudo">{children}</main>

        <footer className="rodape">
          <div className="rodape__grade">
            <div>
              <p className="rodape__titulo">Lotus Radar</p>
              <p className="rodape__texto">
                Radar de licitações e editais de cultura e tecnologia. Dados públicos do PNCP, do
                Mapa da Cultura/SNIIC e dos editais do MinC, coletados todos os dias.
              </p>
            </div>
            <div>
              <p className="rodape__titulo">Produto</p>
              <p className="rodape__texto">
                <Link href="/planos">Planos</Link>
                <br />
                <Link href="/criar-conta">Criar conta</Link>
                <br />
                <Link href="/entrar">Entrar</Link>
              </p>
            </div>
          </div>
          <p className="rodape__base">
            A classificação por categoria é automática e serve como ponto de partida — sempre leia
            o edital antes de investir tempo numa proposta.
          </p>
        </footer>
      </body>
    </html>
  );
}
