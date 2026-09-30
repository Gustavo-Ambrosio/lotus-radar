CREATE TYPE "public"."plano" AS ENUM('gratuito', 'pro', 'equipe');--> statement-breakpoint
CREATE TYPE "public"."status_alerta" AS ENUM('pendente', 'enviado', 'erro', 'ignorado');--> statement-breakpoint
CREATE TYPE "public"."status_assinatura" AS ENUM('inativa', 'pendente', 'ativa', 'atrasada', 'cancelada', 'expirada');--> statement-breakpoint
CREATE TABLE "alertas_enviados" (
	"id" text PRIMARY KEY NOT NULL,
	"busca_salva_id" text NOT NULL,
	"usuario_id" text NOT NULL,
	"licitacao_id" text NOT NULL,
	"status" "status_alerta" DEFAULT 'pendente' NOT NULL,
	"tentativas" integer DEFAULT 0 NOT NULL,
	"erro" text,
	"enviado_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assinaturas" (
	"id" text PRIMARY KEY NOT NULL,
	"usuario_id" text NOT NULL,
	"plano" "plano" NOT NULL,
	"preapproval_id" text,
	"payment_id" text,
	"external_reference" text,
	"status" "status_assinatura" DEFAULT 'pendente' NOT NULL,
	"motivo_status" text,
	"valor_centavos" integer,
	"moeda" text DEFAULT 'BRL' NOT NULL,
	"metodo_pagamento" text,
	"proxima_cobranca_em" timestamp with time zone,
	"ultima_cobranca_em" timestamp with time zone,
	"cancelado_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "buscas_salvas" (
	"id" text PRIMARY KEY NOT NULL,
	"usuario_id" text NOT NULL,
	"nome" text NOT NULL,
	"segmento" text DEFAULT 'cultura' NOT NULL,
	"filtros" jsonb NOT NULL,
	"alertas_email" boolean DEFAULT false NOT NULL,
	"frequencia_alerta" text DEFAULT 'diario' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"ultima_execucao_em" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "coletas" (
	"id" text PRIMARY KEY NOT NULL,
	"fonte" text NOT NULL,
	"gerado_em" timestamp with time zone NOT NULL,
	"total" integer NOT NULL,
	"inseridas" integer DEFAULT 0 NOT NULL,
	"atualizadas" integer DEFAULT 0 NOT NULL,
	"removidas" integer DEFAULT 0 NOT NULL,
	"truncado" boolean DEFAULT false NOT NULL,
	"observacao" text,
	"duracao_ms" integer,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "eventos_pagamento" (
	"id" text PRIMARY KEY NOT NULL,
	"tipo" text NOT NULL,
	"assinatura_id" text,
	"usuario_id" text,
	"assinatura_externa" text,
	"pagamento_externo" text,
	"payload" jsonb NOT NULL,
	"status_processamento" text DEFAULT 'pendente' NOT NULL,
	"erro" text,
	"recebido_em" timestamp with time zone DEFAULT now() NOT NULL,
	"processado_em" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "licitacoes" (
	"id" text PRIMARY KEY NOT NULL,
	"orgao" text NOT NULL,
	"cnpj" text DEFAULT '' NOT NULL,
	"esfera" text NOT NULL,
	"uf" text NOT NULL,
	"municipio" text NOT NULL,
	"codigo_ibge" text DEFAULT '' NOT NULL,
	"objeto" text NOT NULL,
	"informacao_complementar" text,
	"texto_busca" text NOT NULL,
	"modalidade" text NOT NULL,
	"numero_compra" text,
	"numero_controle_pncp" text,
	"ano_compra" integer,
	"sequencial_compra" integer,
	"valor_estimado" real,
	"data_publicacao" timestamp with time zone,
	"data_abertura_proposta" timestamp with time zone,
	"data_encerramento_proposta" timestamp with time zone,
	"link" text DEFAULT '' NOT NULL,
	"link_pncp" text DEFAULT '' NOT NULL,
	"link_sistema_origem" text,
	"categorias" text[] NOT NULL,
	"categoria_principal" text,
	"segmentos" text[] NOT NULL,
	"segmento_exclusivo" text,
	"situacao" text DEFAULT '' NOT NULL,
	"origem" text NOT NULL,
	"latitude" real,
	"longitude" real,
	"vista_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessoes" (
	"id" text PRIMARY KEY NOT NULL,
	"usuario_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"user_agent" text,
	"ip" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"ultimo_uso_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"usuario_id" text NOT NULL,
	"tipo" text NOT NULL,
	"token_hash" text NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"usado_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"senha_hash" text NOT NULL,
	"nome" text NOT NULL,
	"email_verificado_em" timestamp with time zone,
	"documento" text,
	"telefone" text,
	"empresa" text,
	"uf" text,
	"plano" "plano" DEFAULT 'gratuito' NOT NULL,
	"plano_valido_ate" timestamp with time zone,
	"plano_verificado_em" timestamp with time zone,
	"papel" text DEFAULT 'cliente' NOT NULL,
	"aceitou_termos_em" timestamp with time zone,
	"cancelou_assinatura_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "alertas_enviados" ADD CONSTRAINT "alertas_enviados_busca_salva_id_buscas_salvas_id_fk" FOREIGN KEY ("busca_salva_id") REFERENCES "public"."buscas_salvas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alertas_enviados" ADD CONSTRAINT "alertas_enviados_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alertas_enviados" ADD CONSTRAINT "alertas_enviados_licitacao_id_licitacoes_id_fk" FOREIGN KEY ("licitacao_id") REFERENCES "public"."licitacoes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assinaturas" ADD CONSTRAINT "assinaturas_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buscas_salvas" ADD CONSTRAINT "buscas_salvas_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eventos_pagamento" ADD CONSTRAINT "eventos_pagamento_assinatura_id_assinaturas_id_fk" FOREIGN KEY ("assinatura_id") REFERENCES "public"."assinaturas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eventos_pagamento" ADD CONSTRAINT "eventos_pagamento_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tokens" ADD CONSTRAINT "tokens_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "alertas_unq" ON "alertas_enviados" USING btree ("busca_salva_id","licitacao_id");--> statement-breakpoint
CREATE INDEX "alertas_status_idx" ON "alertas_enviados" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "assinaturas_usuario_unq" ON "assinaturas" USING btree ("usuario_id");--> statement-breakpoint
CREATE UNIQUE INDEX "assinaturas_preapproval_unq" ON "assinaturas" USING btree ("preapproval_id");--> statement-breakpoint
CREATE INDEX "assinaturas_status_idx" ON "assinaturas" USING btree ("status");--> statement-breakpoint
CREATE INDEX "buscas_usuario_idx" ON "buscas_salvas" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "buscas_alertas_idx" ON "buscas_salvas" USING btree ("alertas_email","ultima_execucao_em");--> statement-breakpoint
CREATE INDEX "coletas_criado_idx" ON "coletas" USING btree ("criado_em");--> statement-breakpoint
CREATE UNIQUE INDEX "eventos_pagamento_id_unq" ON "eventos_pagamento" USING btree ("id");--> statement-breakpoint
CREATE INDEX "eventos_pagamento_status_idx" ON "eventos_pagamento" USING btree ("status_processamento");--> statement-breakpoint
CREATE INDEX "eventos_pagamento_recebido_idx" ON "eventos_pagamento" USING btree ("recebido_em");--> statement-breakpoint
CREATE INDEX "licitacoes_categorias_gin" ON "licitacoes" USING gin ("categorias");--> statement-breakpoint
CREATE INDEX "licitacoes_segmentos_gin" ON "licitacoes" USING gin ("segmentos");--> statement-breakpoint
CREATE INDEX "licitacoes_textobusca_trgm" ON "licitacoes" USING gin ("texto_busca" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "licitacoes_segmento_prazo_idx" ON "licitacoes" USING btree ("segmento_exclusivo","data_encerramento_proposta");--> statement-breakpoint
CREATE INDEX "licitacoes_uf_idx" ON "licitacoes" USING btree ("uf");--> statement-breakpoint
CREATE INDEX "licitacoes_municipio_idx" ON "licitacoes" USING btree ("uf","municipio");--> statement-breakpoint
CREATE INDEX "licitacoes_esfera_idx" ON "licitacoes" USING btree ("esfera");--> statement-breakpoint
CREATE INDEX "licitacoes_modalidade_idx" ON "licitacoes" USING btree ("modalidade");--> statement-breakpoint
CREATE INDEX "licitacoes_valor_idx" ON "licitacoes" USING btree ("valor_estimado");--> statement-breakpoint
CREATE INDEX "licitacoes_publicacao_idx" ON "licitacoes" USING btree ("data_publicacao");--> statement-breakpoint
CREATE INDEX "licitacoes_prazo_idx" ON "licitacoes" USING btree ("data_encerramento_proposta");--> statement-breakpoint
CREATE INDEX "licitacoes_geo_idx" ON "licitacoes" USING btree ("latitude","longitude");--> statement-breakpoint
CREATE INDEX "licitacoes_vista_idx" ON "licitacoes" USING btree ("vista_em");--> statement-breakpoint
CREATE UNIQUE INDEX "sessoes_token_unq" ON "sessoes" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessoes_usuario_idx" ON "sessoes" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "sessoes_expira_idx" ON "sessoes" USING btree ("expira_em");--> statement-breakpoint
CREATE UNIQUE INDEX "tokens_hash_unq" ON "tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "tokens_usuario_tipo_idx" ON "tokens" USING btree ("usuario_id","tipo");--> statement-breakpoint
CREATE UNIQUE INDEX "usuarios_email_unq" ON "usuarios" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "usuarios_plano_idx" ON "usuarios" USING btree ("plano");