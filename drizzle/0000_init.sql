CREATE TYPE "public"."map_kind" AS ENUM('svg', 'points', 'static');--> statement-breakpoint
CREATE TYPE "public"."map_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TABLE "admin_users" (
	"email" text PRIMARY KEY NOT NULL,
	"added_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "categories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"intro" text DEFAULT '' NOT NULL,
	"sort" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "images" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "images_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"bytes" "bytea" NOT NULL,
	"mime" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"alt" text DEFAULT '' NOT NULL,
	"caption" text,
	"credit" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maps" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "maps_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"no" integer,
	"slug" text NOT NULL,
	"status" "map_status" DEFAULT 'draft' NOT NULL,
	"category_id" integer NOT NULL,
	"title" text NOT NULL,
	"dek" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"kind" "map_kind" NOT NULL,
	"basemap" text,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"legend_title" text,
	"projection_label" text,
	"center_label" text,
	"source_text" text,
	"source_url" text,
	"alt_text" text DEFAULT '' NOT NULL,
	"static_image_id" integer,
	"fallback_image_id" integer,
	"og_image_id" integer,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"published_at" timestamp with time zone,
	"content_updated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "maps_no_unique" UNIQUE("no"),
	CONSTRAINT "maps_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "maps" ADD CONSTRAINT "maps_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maps" ADD CONSTRAINT "maps_static_image_id_images_id_fk" FOREIGN KEY ("static_image_id") REFERENCES "public"."images"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maps" ADD CONSTRAINT "maps_fallback_image_id_images_id_fk" FOREIGN KEY ("fallback_image_id") REFERENCES "public"."images"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maps" ADD CONSTRAINT "maps_og_image_id_images_id_fk" FOREIGN KEY ("og_image_id") REFERENCES "public"."images"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "maps_status_published_at_idx" ON "maps" USING btree ("status","published_at");