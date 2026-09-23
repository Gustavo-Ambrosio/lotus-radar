# ROADMAP — lotus-radar

Plano de evolução para estender o radar de licitações de cultura e
tecnologia a fontes federais além do que o coletor atual alcança.

## Fontes federais (Min•C / PNAB)

• O Min•C publica editais de fomento no gov.br (Drupal), sem API JSON ou
  endpoint de “editais abertos”; os prazos ficam no texto das páginas.
• A Política Nacional Aldir Blanc (PNAB) usa o Transferegov e o Mapa da
  Cultura; não há endpoint público de prazos de inscrição.

## Abordagem aprovada (coleta HTML monitorada)

• Spider de páginas de edital do Min•C lê objeto, período de inscrição
  e UF a partir do texto, com cronograma de validação.
• Mesma classificação de segmento já existente em src/lib/segmentos.ts;
  a fonte federal vira mais uma origem em scripts/coletar-radar.ts (~165).
• Encoste: scripts/coletar-mintc.ts e scripts/coletar-pnab.ts (esboço —
  ver o plano completo na issue criada com gh).

## Já descartado (documentado demais)

• Classificar pela informacaoComplementar: medido, gera falsos positivos
  massivos (ex.: “meio de cultura” de laboratório vira cultura; “construção de
  creche” vira tecnologia). Mantida a classificação apenas pelo objeto.
• Min•C como fonte estruturada hoje: não existe catálogo/API; depende de
  spider sobre o Drupal.

## Prioridade em fila

• (Dev) Exclusividade de segmento por precedência (leitura direta de cultura
  vence; senão âncora forte de tecnologia; senão primeiro segmento) — feito.
• (Dev) Botão “Limpar filtros” sempre visível nas 2 abas — feito.
• (Fonte) Coletor HTML monitorado Min•C → cultura federal.
• (Fonte) PNAB via Transferegov / Mapa da Cultura.

Fecho: todo esse plano também virou GH issue (gh issue create).