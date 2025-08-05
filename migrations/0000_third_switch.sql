CREATE TABLE "admin_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" text NOT NULL,
	"role" varchar(50) DEFAULT 'admin' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "food_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"breakfast_price" numeric(10, 2) DEFAULT '50' NOT NULL,
	"lunch_price" numeric(10, 2) DEFAULT '100' NOT NULL,
	"dinner_price" numeric(10, 2) DEFAULT '100' NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "id_proofs" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_id" integer NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_type" varchar(100) DEFAULT 'image/jpeg' NOT NULL,
	"file_path" text NOT NULL,
	"id_type" varchar(50) DEFAULT 'government_id' NOT NULL,
	"guest_name" varchar(255),
	"uploaded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "otp_verifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"mobile" varchar(20) NOT NULL,
	"otp" varchar(6) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"verified" boolean DEFAULT false,
	"attempts" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "payment_gateways" (
	"id" serial PRIMARY KEY NOT NULL,
	"gateway_name" varchar(50) NOT NULL,
	"display_name" varchar(100) NOT NULL,
	"is_active" boolean DEFAULT false,
	"is_test_mode" boolean DEFAULT true,
	"public_key" text,
	"secret_key" text,
	"merchant_id" text,
	"merchant_key" text,
	"webhook_secret" text,
	"supported_currencies" text DEFAULT 'INR',
	"minimum_amount" numeric(10, 2) DEFAULT '1.00',
	"maximum_amount" numeric(10, 2),
	"processing_fee" numeric(5, 2) DEFAULT '0.00',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payment_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_id" integer NOT NULL,
	"gateway_id" integer NOT NULL,
	"transaction_id" varchar(100) NOT NULL,
	"gateway_transaction_id" varchar(200),
	"order_id" varchar(100),
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'INR',
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"payment_method" varchar(50),
	"gateway_response" text,
	"failure_reason" text,
	"refund_amount" numeric(10, 2),
	"refund_status" varchar(50),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "payment_transactions_transaction_id_unique" UNIQUE("transaction_id")
);
--> statement-breakpoint
CREATE TABLE "room_bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_id" varchar(50) NOT NULL,
	"user_id" integer NOT NULL,
	"room_category_id" integer NOT NULL,
	"checkin_date" timestamp NOT NULL,
	"checkout_date" timestamp NOT NULL,
	"guests" integer DEFAULT 1 NOT NULL,
	"status" varchar(50) DEFAULT 'confirmed' NOT NULL,
	"payment_status" varchar(50) DEFAULT 'unpaid' NOT NULL,
	"payment_method" varchar(50),
	"is_auto_booking" boolean DEFAULT false,
	"total_amount" numeric(10, 2) NOT NULL,
	"room_number" varchar(20),
	"rooms_booked" integer DEFAULT 1,
	"payment_reference" varchar(100),
	"primary_guest_name" varchar(255),
	"primary_guest_email" varchar(255),
	"primary_guest_phone" varchar(20),
	"address_line1" varchar(255),
	"address_line2" varchar(255),
	"city" varchar(100),
	"state" varchar(100),
	"pin_code" varchar(20),
	"country" varchar(100),
	"arriving_from" varchar(255),
	"going_to" varchar(255),
	"eta" varchar(100),
	"etd" varchar(100),
	"estimated_arrival_time" timestamp,
	"estimated_departure_time" timestamp,
	"actual_checkin_time" timestamp,
	"actual_checkout_time" timestamp,
	"food_breakfast" boolean DEFAULT false,
	"food_lunch" boolean DEFAULT false,
	"food_dinner" boolean DEFAULT false,
	"breakfast_days" integer DEFAULT 0,
	"lunch_days" integer DEFAULT 0,
	"dinner_days" integer DEFAULT 0,
	"food_amount" numeric(10, 2) DEFAULT '0',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "room_bookings_booking_id_unique" UNIQUE("booking_id")
);
--> statement-breakpoint
CREATE TABLE "room_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"price" numeric(10, 2) NOT NULL,
	"total_units" integer NOT NULL,
	"max_occupancy" integer DEFAULT 2 NOT NULL,
	"bed_configuration" varchar(100) DEFAULT '1 Double Bed' NOT NULL,
	"image_url" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "trustee_reserved_dates" (
	"id" serial PRIMARY KEY NOT NULL,
	"reserved_date" date NOT NULL,
	"is_enabled" boolean DEFAULT true,
	"description" varchar(255) DEFAULT 'Trustee Reserved Day',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255),
	"mobile" varchar(20) NOT NULL,
	"password" varchar(255) NOT NULL,
	"address" text,
	"city" varchar(100),
	"state" varchar(100),
	"pincode" varchar(20),
	"country" varchar(100) DEFAULT 'India',
	"is_trustee" boolean DEFAULT false,
	"trustee_auto_book_dates" varchar(100),
	"trustee_room_category_id" integer,
	"trustee_status" varchar(20) DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_mobile_unique" UNIQUE("mobile")
);
--> statement-breakpoint
CREATE TABLE "whatsapp_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"access_token" text NOT NULL,
	"phone_number_id" text NOT NULL,
	"business_account_id" text NOT NULL,
	"webhook_verify_token" text,
	"is_enabled" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "whatsapp_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"notification_type" varchar(50) NOT NULL,
	"template_name" varchar(100) NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "id_proofs" ADD CONSTRAINT "id_proofs_booking_id_room_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."room_bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_booking_id_room_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."room_bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_gateway_id_payment_gateways_id_fk" FOREIGN KEY ("gateway_id") REFERENCES "public"."payment_gateways"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_bookings" ADD CONSTRAINT "room_bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_bookings" ADD CONSTRAINT "room_bookings_room_category_id_room_categories_id_fk" FOREIGN KEY ("room_category_id") REFERENCES "public"."room_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_trustee_room_category_id_room_categories_id_fk" FOREIGN KEY ("trustee_room_category_id") REFERENCES "public"."room_categories"("id") ON DELETE no action ON UPDATE no action;