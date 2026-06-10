ALTER TABLE "execution_events" ADD COLUMN "tenant_id" text;--> statement-breakpoint
ALTER TABLE "executions" ADD COLUMN "tenant_id" text;--> statement-breakpoint
CREATE INDEX "execution_events_tenant_id_idx" ON "execution_events" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "executions_tenant_id_idx" ON "executions" USING btree ("tenant_id");