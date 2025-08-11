-- Add password reset fields to users table
ALTER TABLE "users" ADD COLUMN "reset_token" varchar(255);
ALTER TABLE "users" ADD COLUMN "reset_token_expiry" timestamp;