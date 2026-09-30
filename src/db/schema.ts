import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

/* ══════════════════════════════════════════════════════════════
   ENUMS
   ══════════════════════════════════════════════════════════════ */

export const planoEnum = pgEnum('plano', ['gratuito', 'pro', 'equipe']);

export const statusAssinaturaEnum = pgEnum('status_assinatura', [
  'inativa', // nunca assinada
  'pendente', // checkout criado, pagamento nao confirmado
  'ativa',
  'atrasada', // falha de pagamento, ainda dentro da carencia
  'cancelada',
  'expirada', // periodo pago terminou (Pix/boleto unico)
]);

export const statusAlertaEnum = pgEnum('status_alerta', ['pendente', 'enviado', 'erro', 'ignorado']);

/* ══════════════════════════════════════════════════════════════
   USUARIOS E SESSAO
   ══════════════════════════════════════════════════════════════ */

export const usuarios = pgTable(
  'usuarios',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    senhaHash: text('senha_hash').notNull(),
    nome: text('nome').notNull(),

    emailVerificadoEm: timestamp('email_verificado_em', { withTimezone: true }),

    // Perfil mercadologico (coletado no cadastro / checkout).
    documento: text('documento'), // CPF/CNPJ, usado como chave de idempotencia no MP
    telefone: text('telefone'),
    empresa: text('empresa'),
    uf: text('uf'),

    plano: planoEnum('plano').notNull().default('gratuito'),
    // Data em que o plano pago comeca (pode estar no futuro: fila de upgrade).
    planoValidoAte: timestamp('plano_valido_ate', { withTimezone: true }),
    // Momento da ultima verificacao de acesso — evita consulta a MP a cada request.
    planoVerificadoEm: timestamp('plano_verificado_em', { withTimezone: true }),

    papel: text('papel').notNull().default('cliente'), // 'cliente' | 'admin'

    // Marketing
    aceitouTermosEm: timestamp('aceitou_termos_em', { withTimezone: true }),
    cancelouAssinaturaEm: timestamp('cancelou_assinatura_em', { withTimezone: true }),

    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Lowercase no insert garante unicidade case-insensitive.
    uniqueIndex('usuarios_email_unq').on(sql`lower(${t.email})`),
    index('usuarios_plano_idx').on(t.plano),
  ],
);

/**
 * Sessoes persistidas no banco. O cookie httpOnly carrega apenas um token
 * opaco; a autorizacao real vem daqui, o que permite revogar imediatamente
 * (logout em todos os dispositivos) e auditar dispositivos.
 */
export const sessoes = pgTable(
  'sessoes',
  {
    id: text('id').primaryKey(),
    usuarioId: text('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    // SHA-256 do token do cookie. O token em claro nunca e' persistido.
    tokenHash: text('token_hash').notNull(),
    expiraEm: timestamp('expira_em', { withTimezone: true }).notNull(),
    userAgent: text('user_agent'),
    ip: text('ip'),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
    ultimoUsoEm: timestamp('ultimo_uso_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('sessoes_token_unq').on(t.tokenHash),
    index('sessoes_usuario_idx').on(t.usuarioId),
    index('sessoes_expira_idx').on(t.expiraEm),
  ],
);

/**
 * Tokens de uso unico: verificacao de e-mail e redefinicao de senha.
 * Guardamos apenas o hash; `usoEm` impede replay.
 */
export const tokens = pgTable(
  'tokens',
  {
    id: text('id').primaryKey(),
    usuarioId: text('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    tipo: text('tipo').notNull(), // 'verificacao-email' | 'redefinir-senha'
    tokenHash: text('token_hash').notNull(),
    expiraEm: timestamp('expira_em', { withTimezone: true }).notNull(),
    usadoEm: timestamp('usado_em', { withTimezone: true }),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('tokens_hash_unq').on(t.tokenHash),
    index('tokens_usuario_tipo_idx').on(t.usuarioId, t.tipo),
  ],
);

/* ══════════════════════════════════════════════════════════════
   ASSINATURAS (Mercado Pago)
   ══════════════════════════════════════════════════════════════ */

export const assinaturas = pgTable(
  'assinaturas',
  {
    id: text('id').primaryKey(),
    usuarioId: text('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),

    plano: planoEnum('plano').notNull(),

    // IDs do Mercado Pago.
    preapprovalId: text('preapproval_id'), // assinatura recorrente
    paymentId: text('payment_id'), // pagamento avulso (Pix/boleto de 1a compra)
    externalReference: text('external_reference'),

    status: statusAssinaturaEnum('status').notNull().default('pendente'),
    motivoStatus: text('motivo_status'), // texto cru do gateway, para diagnostico

    // Valor efetivamente cobrado, em centavos (MP usa centavos).
    valorCentavos: integer('valor_centavos'),
    moeda: text('moeda').notNull().default('BRL'),
    metodoPagamento: text('metodo_pagamento'), // 'pix' | 'boleto' | 'credit_card'

    // Proxima cobranca (recorrencia) e fim do periodo pago.
    proximaCobrancaEm: timestamp('proxima_cobranca_em', { withTimezone: true }),
    ultimaCobrancaEm: timestamp('ultima_cobranca_em', { withTimezone: true }),
    canceladoEm: timestamp('cancelado_em', { withTimezone: true }),

    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('assinaturas_usuario_unq').on(t.usuarioId),
    uniqueIndex('assinaturas_preapproval_unq').on(t.preapprovalId),
    index('assinaturas_status_idx').on(t.status),
  ],
);

/**
 * Eventos brutos do gateway, gravados antes de qualquer efeito.
 * Garante idempotencia (chave unica por evento) e permite reprocessar
 * um webhook que chegou fora de ordem sem perder transicao de estado.
 */
export const eventosPagamento = pgTable(
  'eventos_pagamento',
  {
    id: text('id').primaryKey(), // id do evento no gateway
    tipo: text('tipo').notNull(),
    assinaturaId: text('assinatura_id').references(() => assinaturas.id, { onDelete: 'set null' }),
    usuarioId: text('usuario_id').references(() => usuarios.id, { onDelete: 'set null' }),
    assinaturaExterna: text('assinatura_externa'),
    pagamentoExterno: text('pagamento_externo'),
    payload: jsonb('payload').notNull(),
    statusProcessamento: text('status_processamento').notNull().default('pendente'),
    erro: text('erro'),
    recebidoEm: timestamp('recebido_em', { withTimezone: true }).notNull().defaultNow(),
    processadoEm: timestamp('processado_em', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('eventos_pagamento_id_unq').on(t.id),
    index('eventos_pagamento_status_idx').on(t.statusProcessamento),
    index('eventos_pagamento_recebido_idx').on(t.recebidoEm),
  ],
);

/* ══════════════════════════════════════════════════════════════
   LICITACOES (espelho do snapshot, indexado e consultavel)
   ══════════════════════════════════════════════════════════════ */

/**
 * Espelho 1:1 de `src/lib/tipos.ts::Licitacao`, com o que a query server-side
 * precisa e o que o cliente nao deveria ter de carregar.
 *
 * `textoBusca` e' a versao normalizada (minusculas, sem acentos) de
 * objeto + orgao + municipio. Permite busca por substring com indice trigram
 * em vez de ILIKE sobre o campo original — que nao usaria indice.
 */
export const licitacoes = pgTable(
  'licitacoes',
  {
    id: text('id').primaryKey(),
    orgao: text('orgao').notNull(),
    cnpj: text('cnpj').notNull().default(''),
    esfera: text('esfera').notNull(),
    uf: text('uf').notNull(),
    municipio: text('municipio').notNull(),
    codigoIbge: text('codigo_ibge').notNull().default(''),

    objeto: text('objeto').notNull(),
    informacaoComplementar: text('informacao_complementar'),
    textoBusca: text('texto_busca').notNull(),

    modalidade: text('modalidade').notNull(),
    numeroCompra: text('numero_compra'),
    numeroControlePncp: text('numero_controle_pncp'),
    anoCompra: integer('ano_compra'),
    sequencialCompra: integer('sequencial_compra'),

    valorEstimado: real('valor_estimado'),

    dataPublicacao: timestamp('data_publicacao', { withTimezone: true }),
    dataAberturaProposta: timestamp('data_abertura_proposta', { withTimezone: true }),
    dataEncerramentoProposta: timestamp('data_encerramento_proposta', { withTimezone: true }),

    link: text('link').notNull().default(''),
    linkPncp: text('link_pncp').notNull().default(''),
    linkSistemaOrigem: text('link_sistema_origem'),

    categorias: text('categorias').array().notNull(),
    categoriaPrincipal: text('categoria_principal'),
    segmentos: text('segmentos').array().notNull(),

    /**
     * Aba em que a licitacao aparece, ja resolvida pela regra de precedencia de
     * `src/lib/segmentos.ts` (leitura direta de cultura > ancora forte de
     * tecnologia > segmento unico; `null` quando cai nas duas sem sinal claro).
     * Materializar isso em colula e' o que permite filtrar por aba com um
     * indice — recalcular a precedencia em SQL, a cada query, nao.
     */
    segmentoExclusivo: text('segmento_exclusivo'),

    situacao: text('situacao').notNull().default(''),
    origem: text('origem').notNull(),

    // Geometria resolvida na ingestao, para o filtro de raio sem JOIN.
    latitude: real('latitude'),
    longitude: real('longitude'),

    // Deduplicacao: "visto em" para o job de alertas nao reenviar o mesmo item.
    vistaEm: timestamp('vista_em', { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Indice GIN sobre arrays atende o operador de sobreposicao (@>) das categorias
    // e dos segmentos — que e' como o filtro de categoria e expresso.
    index('licitacoes_categorias_gin').using('gin', t.categorias),
    index('licitacoes_segmentos_gin').using('gin', t.segmentos),
    // Busca textual: substring sobre textoBusca, acelerado por trigram.
    index('licitacoes_textobusca_trgm').using('gin', t.textoBusca.op('gin_trgm_ops')),

    // Filtros/ordenacoes mais quentes. Composto porque quase sempre filtramos
    // por aba e ordenamos por prazo na mesma query.
    index('licitacoes_segmento_prazo_idx').on(t.segmentoExclusivo, t.dataEncerramentoProposta),
    index('licitacoes_uf_idx').on(t.uf),
    index('licitacoes_municipio_idx').on(t.uf, t.municipio),
    index('licitacoes_esfera_idx').on(t.esfera),
    index('licitacoes_modalidade_idx').on(t.modalidade),
    index('licitacoes_valor_idx').on(t.valorEstimado),
    index('licitacoes_publicacao_idx').on(t.dataPublicacao),
    index('licitacoes_prazo_idx').on(t.dataEncerramentoProposta),
    // Bounding box do filtro de raio antes do refino por haversine.
    index('licitacoes_geo_idx').on(t.latitude, t.longitude),
    index('licitacoes_vista_idx').on(t.vistaEm),
  ],
);

/** Uma linha por execucao da coleta: historico, saude do pipeline e depuracao. */
export const coletas = pgTable(
  'coletas',
  {
    id: text('id').primaryKey(),
    fonte: text('fonte').notNull(),
    geradoEm: timestamp('gerado_em', { withTimezone: true }).notNull(),
    total: integer('total').notNull(),
    inseridas: integer('inseridas').notNull().default(0),
    atualizadas: integer('atualizadas').notNull().default(0),
    removidas: integer('removidas').notNull().default(0),
    truncado: boolean('truncado').notNull().default(false),
    observacao: text('observacao'),
    duracaoMs: integer('duracao_ms'),
    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('coletas_criado_idx').on(t.criadoEm)],
);

/* ══════════════════════════════════════════════════════════════
   MONETIZACAO: BUSCAS SALVAS E ALERTAS
   ══════════════════════════════════════════════════════════════ */

export const buscasSalvas = pgTable(
  'buscas_salvas',
  {
    id: text('id').primaryKey(),
    usuarioId: text('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),

    nome: text('nome').notNull(),
    segmento: text('segmento').notNull().default('cultura'),
    // Filtros serializados: mesma forma de src/lib/filtros.ts::Filtros.
    filtros: jsonb('filtros').notNull(),

    alertasEmail: boolean('alertas_email').notNull().default(false),
    // Frequencia desejada; o job agrupa envios por janela (minimo 1h).
    frequenciaAlerta: text('frequencia_alerta').notNull().default('diario'),

    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp('atualizado_em', { withTimezone: true }).notNull().defaultNow(),
    ultimaExecucaoEm: timestamp('ultima_execucao_em', { withTimezone: true }),
  },
  (t) => [
    index('buscas_usuario_idx').on(t.usuarioId),
    index('buscas_alertas_idx').on(t.alertasEmail, t.ultimaExecucaoEm),
  ],
);

/**
 * Registro de entrega. A chave unica (busca + licitacao) e' o que torna o
 * job de alertas idempotente: reexecutar nunca duplica e-mail, mesmo que o
 * worker seja disparado em paralelo ou retome apos falha.
 */
export const alertasEnviados = pgTable(
  'alertas_enviados',
  {
    id: text('id').primaryKey(),
    buscaSalvaId: text('busca_salva_id')
      .notNull()
      .references(() => buscasSalvas.id, { onDelete: 'cascade' }),
    usuarioId: text('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    licitacaoId: text('licitacao_id')
      .notNull()
      .references(() => licitacoes.id, { onDelete: 'cascade' }),

    status: statusAlertaEnum('status').notNull().default('pendente'),
    tentativas: integer('tentativas').notNull().default(0),
    erro: text('erro'),
    enviadoEm: timestamp('enviado_em', { withTimezone: true }),

    criadoEm: timestamp('criado_em', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('alertas_unq').on(t.buscaSalvaId, t.licitacaoId),
    index('alertas_status_idx').on(t.status),
  ],
);

/* ══════════════════════════════════════════════════════════════
   RELACOES
   ══════════════════════════════════════════════════════════════ */

export const usuariosRelations = relations(usuarios, ({ one, many }) => ({
  sessao: one(sessoes, { fields: [usuarios.id], references: [sessoes.usuarioId] }),
  assinatura: one(assinaturas, { fields: [usuarios.id], references: [assinaturas.usuarioId] }),
  buscas: many(buscasSalvas),
}));

export const sessoesRelations = relations(sessoes, ({ one }) => ({
  usuario: one(usuarios, { fields: [sessoes.usuarioId], references: [usuarios.id] }),
}));

export const assinaturasRelations = relations(assinaturas, ({ one }) => ({
  usuario: one(usuarios, { fields: [assinaturas.usuarioId], references: [usuarios.id] }),
}));

export const buscasSalvasRelations = relations(buscasSalvas, ({ one, many }) => ({
  usuario: one(usuarios, { fields: [buscasSalvas.usuarioId], references: [usuarios.id] }),
  alertas: many(alertasEnviados),
}));

export const alertasEnviadosRelations = relations(alertasEnviados, ({ one }) => ({
  busca: one(buscasSalvas, { fields: [alertasEnviados.buscaSalvaId], references: [buscasSalvas.id] }),
  usuario: one(usuarios, { fields: [alertasEnviados.usuarioId], references: [usuarios.id] }),
  licitacao: one(licitacoes, { fields: [alertasEnviados.licitacaoId], references: [licitacoes.id] }),
}));

/* ══════════════════════════════════════════════════════════════
   TIPOS INFERIDOS
   ══════════════════════════════════════════════════════════════ */

export type Usuario = typeof usuarios.$inferSelect;
export type NovoUsuario = typeof usuarios.$inferInsert;
export type Sessao = typeof sessoes.$inferSelect;
export type Token = typeof tokens.$inferSelect;
export type Assinatura = typeof assinaturas.$inferSelect;
export type EventoPagamento = typeof eventosPagamento.$inferSelect;
export type LicitacaoDb = typeof licitacoes.$inferSelect;
export type NovaLicitacao = typeof licitacoes.$inferInsert;
export type Coleta = typeof coletas.$inferSelect;
export type BuscaSalva = typeof buscasSalvas.$inferSelect;
export type AlertaEnviado = typeof alertasEnviados.$inferSelect;

export type Plano = (typeof planoEnum.enumValues)[number];
export type StatusAssinatura = (typeof statusAssinaturaEnum.enumValues)[number];
export type StatusAlerta = (typeof statusAlertaEnum.enumValues)[number];
