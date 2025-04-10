ALTER TABLE "products" ADD COLUMN "has_variants" boolean DEFAULT false NOT NULL;
ALTER TABLE "products" ADD COLUMN "variants" jsonb;
ALTER TABLE "order_items" ADD COLUMN "variant" varchar(50);