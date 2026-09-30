# Análise visual atual — Lotus Radar

Layout aprovado (referência): <https://gustavo-ambrosio.github.io/lotus-radar>.

Estado atual analisado: `../layoutatual.png`, captura da aplicação local em
`http://localhost:3000` (desktop, imagem de aproximadamente 2000 × 844 px).
Também há uma captura anterior `../situação visual.png`, da aplicação pública no
Railway: <https://lotus-radar-production.up.railway.app>. Ambas ficam fora do
repositório; se não estiverem disponíveis numa próxima sessão, solicitar que o
usuário as anexe ou copie para este projeto.

Ao trabalhar no visual, comparar a referência aprovada do Pages com a versão
atual do Railway no mesmo viewport. O Pages orienta a identidade, hierarquia e
organização visual; a captura do Railway ajuda a identificar diferenças e
regressões. Preservar recursos e fluxos novos do SaaS ao adaptar a SPA antiga.

## O que funciona

- A identidade violeta/índigo e o hero contrastam com a área de resultados.
- A navegação superior é compacta e os prazos das oportunidades recebem bom
  destaque visual.
- A tela deixa evidente o propósito do produto e mostra as fontes dos dados.

## Pontos a investigar e priorizar

1. **Links com aparência padrão do navegador.** Na captura, títulos de
   oportunidades, a aba de segmento e o CTA de salvar busca estão sublinhados.
   O CSS define `a { color: var(--primario) }`, mas não remove a decoração em
   `.cartao__objeto a`, `.segmento` e `.ferramenta`. Corrigir por seletores
   específicos, mantendo estados hover/foco reconhecíveis.
2. **Composição do hero.** Título e subtítulo aparecem na mesma linha. O JSX da
   home usa a classe `.marca`, cujo `display: flex` foi originalmente pensado
   para marca/logo. Avaliar uma composição responsiva própria para o título,
   texto de apoio e resumo de dados.
3. **Painel de filtros.** Na proporção capturada, o painel lateral parece
   apertado; labels, campos, chips e botão de aplicar merecem revisão de
   espaçamento, alinhamento e leitura.
4. **Leitura dos cartões.** O texto sublinhado e em caixa alta domina o cartão.
   Avaliar uma hierarquia mais confortável para o objeto, mantendo prazo,
   órgão, município e ações fáceis de localizar.
5. **Responsividade e estados.** A captura só cobre desktop. Conferir layout em
   celular, navegação por teclado, foco, hover, dados longos e ausência de
   overflow horizontal.

## Ajustes incrementais em andamento

- Em `layoutatual.png`, o conteúdo do hero aparece sem o título principal e os
  controles de ordenar/filtrar extrapolam a coluna lateral em direção aos
  resultados. O título precisa ser verificado no navegador após reiniciar ou
  atualizar a aplicação local; o CSS o mantém como bloco branco e permite
  quebra de linha.
- Corrigida a grade interna do painel SaaS para duas colunas com largura mínima
  zero, inputs/selects fluidos e uma coluna em telas muito estreitas. A coluna
  dos resultados também pode encolher sem provocar overflow.
- A segunda captura também evidencia desalinhamento vertical entre o cabeçalho
  dos resultados e o painel, ausência aparente do título do hero e chips de
  categoria com aparência de link padrão. O hero foi separado das classes
  genéricas legadas para manter título/subtítulo explícitos; o painel recebeu
  espaçamento interno, a lista foi alinhada ao topo e os chips deixaram de ser
  sublinhados. O campo de ordenação ocupa uma linha inteira para que suas opções
  não sejam cortadas na sidebar estreita.
- Ajustes foram feitos no CSS; sem navegador/captura posterior, não considerar
  a validação visual concluída.

Esta análise registra diferenças do estado atual frente à referência aprovada;
não autoriza uma reformulação fora dessa direção. Implementar cada ajuste em
etapas pequenas e validar visualmente contra o Pages aprovado.
