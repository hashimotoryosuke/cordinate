CREATE TABLE "clothing_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"image_url" text NOT NULL,
	"thumbnail_url" text,
	"category" varchar(50) DEFAULT 'other' NOT NULL,
	"colors" jsonb DEFAULT '[]'::jsonb,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"brand" varchar(100),
	"embedding" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coordinate_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"inspiration_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"suggestions" jsonb,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coordinates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"inspiration_image_url" text NOT NULL,
	"inspiration_source" varchar(50),
	"item_ids" jsonb DEFAULT '[]'::jsonb,
	"description" text,
	"style_note" text,
	"match_score" real,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inspirations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"image_url" text NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"analysis_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coordinate_id" uuid NOT NULL,
	"name" text NOT NULL,
	"brand" varchar(100),
	"image_url" text NOT NULL,
	"price" integer NOT NULL,
	"product_url" text NOT NULL,
	"category" varchar(50),
	"source" varchar(50) NOT NULL,
	"external_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "refresh_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(100) NOT NULL,
	"password_hash" text,
	"avatar_url" text,
	"provider" varchar(50) DEFAULT 'email',
	"provider_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "clothing_items" ADD CONSTRAINT "clothing_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coordinate_jobs" ADD CONSTRAINT "coordinate_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coordinate_jobs" ADD CONSTRAINT "coordinate_jobs_inspiration_id_inspirations_id_fk" FOREIGN KEY ("inspiration_id") REFERENCES "public"."inspirations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coordinates" ADD CONSTRAINT "coordinates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspirations" ADD CONSTRAINT "inspirations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_suggestions" ADD CONSTRAINT "product_suggestions_coordinate_id_coordinates_id_fk" FOREIGN KEY ("coordinate_id") REFERENCES "public"."coordinates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clothing_items_user_id_idx" ON "clothing_items" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "coordinate_jobs_user_id_idx" ON "coordinate_jobs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "coordinates_user_id_idx" ON "coordinates" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "inspirations_user_id_idx" ON "inspirations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "product_suggestions_coordinate_id_idx" ON "product_suggestions" USING btree ("coordinate_id");--> statement-breakpoint
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens" USING btree ("user_id");