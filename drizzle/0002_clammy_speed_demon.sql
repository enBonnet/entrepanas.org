PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_recipient_profile` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`slug` text NOT NULL,
	`legal_name` text NOT NULL,
	`public_name` text NOT NULL,
	`phone` text,
	`email` text,
	`country` text NOT NULL,
	`region` text NOT NULL,
	`city` text NOT NULL,
	`neighborhood` text,
	`exact_address` text,
	`approximate_lat` real,
	`approximate_lng` real,
	`bio` text,
	`identity_verification_status` text DEFAULT 'unverified' NOT NULL,
	`payout_verification_status` text DEFAULT 'unverified' NOT NULL,
	`location_verification_status` text DEFAULT 'unverified' NOT NULL,
	`trust_level` text DEFAULT 'none' NOT NULL,
	`risk_flags_count` integer DEFAULT 0 NOT NULL,
	`reputation_score` integer DEFAULT 0 NOT NULL,
	`reputation_tier` text DEFAULT 'nuevo' NOT NULL,
	`reputation_updated_at` integer,
	`frozen` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "recipient_reputation_score_range" CHECK("__new_recipient_profile"."reputation_score" between 0 and 100),
	CONSTRAINT "recipient_reputation_tier_values" CHECK("__new_recipient_profile"."reputation_tier" in ('nuevo','en proceso','verificado','confiable'))
);
--> statement-breakpoint
INSERT INTO `__new_recipient_profile`("id", "user_id", "slug", "legal_name", "public_name", "phone", "email", "country", "region", "city", "neighborhood", "exact_address", "approximate_lat", "approximate_lng", "bio", "identity_verification_status", "payout_verification_status", "location_verification_status", "trust_level", "risk_flags_count", "frozen", "created_at", "updated_at") SELECT "id", "user_id", "slug", "legal_name", "public_name", "phone", "email", "country", "region", "city", "neighborhood", "exact_address", "approximate_lat", "approximate_lng", "bio", "identity_verification_status", "payout_verification_status", "location_verification_status", "trust_level", "risk_flags_count", "frozen", "created_at", "updated_at" FROM `recipient_profile`;--> statement-breakpoint
DROP TABLE `recipient_profile`;--> statement-breakpoint
ALTER TABLE `__new_recipient_profile` RENAME TO `recipient_profile`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `recipient_profile_slug_unique` ON `recipient_profile` (`slug`);--> statement-breakpoint
CREATE INDEX `recipient_userId_idx` ON `recipient_profile` (`user_id`);--> statement-breakpoint
-- Backfill the dormant risk_flags_count accumulator from existing actioned
-- recipient-targeted abuse (absolute set → idempotent; re-run is a no-op).
-- The nightly cron later re-derives reputation scores for all recipients.
UPDATE `recipient_profile` SET `risk_flags_count` = (
	SELECT COUNT(*) FROM `abuse_report`
	WHERE `abuse_report`.`target_type` = 'recipient'
		AND `abuse_report`.`target_id` = `recipient_profile`.`id`
		AND `abuse_report`.`status` = 'actioned'
);