# Diretrizes de produto, negócio, UX e UI — Lotus Radar

Este documento dá contexto às decisões de experiência. É um resumo baseado em
`AGENTS.md`, `README.md`, `ROADMAP.md` e no produto implementado; não substitui
nem inventa a referência visual aprovada pelo usuário.

## Produto e proposta de valor

O Lotus Radar é um SaaS brasileiro para descobrir licitações e editais abertos
de cultura e tecnologia, acompanhar oportunidades compatíveis e agir antes do
encerramento. As fontes incluem PNCP, SIC Cultura, MinC e PNAB; cobertura e
classificação dependem das fontes públicas e devem ser comunicadas com
transparência.

### Tarefas principais

1. Encontrar oportunidades por segmento, categoria, estado/município, valor e
   prazo.
2. Avaliar rapidamente objeto, órgão, localização, valor, datas e fonte oficial.
3. Salvar um recorte de busca e ativar alertas por e-mail.
4. Consultar a oportunidade original e preparar acompanhamento individual ou
   com uma equipe.
5. Entender limites e escolher, alterar ou cancelar um plano sem surpresas.

Públicos como produtoras culturais, organizações culturais, fornecedores de
tecnologia e equipes comerciais são segmentos plausíveis com base no produto;
trate-os como hipóteses até haver pesquisa com usuários.

## Objetivos de negócio e jornada

- **Aquisição/confiança:** explicar imediatamente o que o radar reúne, de onde
  vêm os dados e as limitações da classificação automática.
- **Ativação:** ajudar a pessoa a encontrar um resultado relevante, entender a
  busca e perceber o benefício de criar conta/salvar busca.
- **Retenção:** tornar alertas, buscas salvas e retornos ao radar previsíveis e
  fáceis de gerenciar.
- **Receita:** explicar a diferença entre Gratuito, Pro e Equipe com clareza;
  levar ao checkout sem ocultar preço, periodicidade, limites ou condições.
- **Confiança contínua:** dar feedback inequívoco em verificação de e-mail,
  pagamento, falhas, cancelamento e mudanças de plano.

Não otimizar conversão à custa de compreensão, confiança ou controle da pessoa.
Sem dados de analytics/pesquisa, apresentar impacto como hipótese, não como
resultado comprovado.

## Regras comerciais que a interface deve respeitar

`src/billing/planos.ts` é a única fonte de verdade dos preços, limites e
benefícios. Valores atuais documentados no código:

- **Gratuito:** R$ 0; 1 busca salva, 1 alerta por dia, 50 resultados por página,
  2 exportações por dia e histórico de alertas por 7 dias.
- **Pro:** R$ 89/mês; até 25 buscas salvas, alertas sem limite diário, 500
  resultados por página, 50 exportações por dia, histórico por 180 dias e mapa
  por raio de até 1.000 km.
- **Equipe:** R$ 249/mês; até 200 buscas salvas, alertas sem limite diário,
  2.000 resultados por página, exportações sem limite diário e histórico por
  365 dias.

Antes de qualquer mudança de texto ou layout comercial, conferir o código: estes
valores podem mudar. Não inventar recursos, garantias, desconto, urgência,
depoimentos ou economia.

## Direção de experiência

- A descoberta e a leitura de oportunidades são a experiência central. Dar
  prioridade a relevância, prazo, localização, fonte e clareza do objeto.
- Filtros precisam ser compreensíveis, recuperáveis por URL e usáveis em
  celular; filtros ativos, limpar, aplicar e resultados vazios devem ter estados
  visíveis.
- Alertas pedem controle explícito de frequência/ativação e explicação do que
  será enviado; é fácil ligar, pausar e cancelar.
- CTA deve refletir a próxima ação realmente disponível no estado atual da
  pessoa (visitante, conta gratuita, plano pago, pagamento pendente etc.).
- A interface e UX writing permanecem em pt-BR, com linguagem direta, humana e
  sem jargão desnecessário.
- Acessibilidade, teclado, contraste, foco, feedback e responsividade são
  critérios de aceite, não acabamento opcional.

## Layout aprovado e limite documental

O layout aprovado e a referência visual oficial estão publicados em
<https://gustavo-ambrosio.github.io/lotus-radar>. Essa referência é vinculante:
preservar identidade, hierarquia, linguagem visual e organização aprovadas. A
captura `../situação visual.png` é do estado atual no Railway e serve para
identificar diferenças/regressões; não substitui o layout aprovado.

`ROADMAP.md` neste checkout continua documentando fontes e coletores. A URL do
GitHub Pages é a fonte de verdade visual, independentemente do escopo técnico do
arquivo ROADMAP.

Ao adaptar o layout aprovado para a aplicação SaaS, o agente deve:

1. Manter layout e navegação atuais em mudanças incrementais de acabamento e
   usabilidade.
2. Não redesenhar macroestrutura, hero, ordem de conteúdo, arquitetura de
   informação ou fluxo comercial por iniciativa própria.
3. Se a diferença entre o layout aprovado e um requisito funcional SaaS exigir
   mudança estrutural, explicar a tensão e implementar a adaptação mínima que
   preserve os dois objetivos; perguntar ao usuário se ainda houver conflito.

## Fonte de verdade para implementação

- <https://gustavo-ambrosio.github.io/lotus-radar>: layout/decisões visuais
  aprovadas pelo usuário e fonte prioritária de design.
- `src/billing/planos.ts`: preços, limites e benefícios comerciais.
- Código de páginas e actions: fluxos e comportamento efetivamente existentes.
- `ROADMAP.md`: direção de coletores e fontes de dados.
- `docs/ANALISE_VISUAL_ATUAL.md`: comparação de problemas observados no Railway
  com o layout aprovado do Pages.
