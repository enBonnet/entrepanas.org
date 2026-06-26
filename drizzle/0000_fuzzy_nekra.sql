CREATE TABLE `abuse_report` (
	`id` text PRIMARY KEY NOT NULL,
	`reporter_user_id` text,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`reason` text NOT NULL,
	`details` text,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`reporter_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `report_target_idx` ON `abuse_report` (`target_type`,`target_id`);--> statement-breakpoint
CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `campaign` (
	`id` text PRIMARY KEY NOT NULL,
	`recipient_profile_id` text NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`summary` text,
	`goal_cents` integer,
	`currency` text DEFAULT 'USD' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`cover_image_key` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`recipient_profile_id`) REFERENCES `recipient_profile`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `campaign_slug_unique` ON `campaign` (`slug`);--> statement-breakpoint
CREATE INDEX `campaign_profile_idx` ON `campaign` (`recipient_profile_id`);--> statement-breakpoint
CREATE TABLE `donation_confirmation` (
	`id` text PRIMARY KEY NOT NULL,
	`donation_id` text NOT NULL,
	`donor_user_id` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`sent_at` integer,
	`transfer_proof_image_id` text,
	`method_note` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`donation_id`) REFERENCES `donation`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`donor_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `confirm_donation_idx` ON `donation_confirmation` (`donation_id`);--> statement-breakpoint
CREATE TABLE `donation_expense_link` (
	`id` text PRIMARY KEY NOT NULL,
	`donation_id` text NOT NULL,
	`expense_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`donation_id`) REFERENCES `donation`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`expense_id`) REFERENCES `expense`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `link_donation_idx` ON `donation_expense_link` (`donation_id`);--> statement-breakpoint
CREATE INDEX `link_expense_idx` ON `donation_expense_link` (`expense_id`);--> statement-breakpoint
CREATE TABLE `donation` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`donor_user_id` text,
	`amount_cents` integer NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`status` text DEFAULT 'pledged' NOT NULL,
	`reference` text,
	`message` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaign`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`donor_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `donation_campaign_idx` ON `donation` (`campaign_id`);--> statement-breakpoint
CREATE TABLE `evidence_image` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`object_key` text NOT NULL,
	`mime_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`width` integer,
	`height` integer,
	`checksum` text,
	`kind` text NOT NULL,
	`visibility` text DEFAULT 'private' NOT NULL,
	`moderation_status` text DEFAULT 'pending' NOT NULL,
	`linked_entity_type` text,
	`linked_entity_id` text,
	`caption` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `evidence_owner_idx` ON `evidence_image` (`owner_user_id`);--> statement-breakpoint
CREATE INDEX `evidence_link_idx` ON `evidence_image` (`linked_entity_type`,`linked_entity_id`);--> statement-breakpoint
CREATE TABLE `expense_item` (
	`id` text PRIMARY KEY NOT NULL,
	`expense_id` text NOT NULL,
	`title` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`expense_id`) REFERENCES `expense`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `item_expense_idx` ON `expense_item` (`expense_id`);--> statement-breakpoint
CREATE TABLE `expense` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`recipient_profile_id` text NOT NULL,
	`title` text NOT NULL,
	`total_cents` integer NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`incurred_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaign`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recipient_profile_id`) REFERENCES `recipient_profile`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `expense_campaign_idx` ON `expense` (`campaign_id`);--> statement-breakpoint
CREATE TABLE `payout_method` (
	`id` text PRIMARY KEY NOT NULL,
	`recipient_profile_id` text NOT NULL,
	`label` text NOT NULL,
	`details` text NOT NULL,
	`verification_status` text DEFAULT 'unverified' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`recipient_profile_id`) REFERENCES `recipient_profile`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `payout_profile_idx` ON `payout_method` (`recipient_profile_id`);--> statement-breakpoint
CREATE TABLE `recipient_profile` (
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
	`frozen` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `recipient_profile_slug_unique` ON `recipient_profile` (`slug`);--> statement-breakpoint
CREATE INDEX `recipient_userId_idx` ON `recipient_profile` (`user_id`);--> statement-breakpoint
CREATE TABLE `recipient_verification` (
	`id` text PRIMARY KEY NOT NULL,
	`recipient_profile_id` text NOT NULL,
	`kind` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`notes` text,
	`reviewer_id` text,
	`submitted_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`reviewed_at` integer,
	FOREIGN KEY (`recipient_profile_id`) REFERENCES `recipient_profile`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reviewer_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `recverification_profile_idx` ON `recipient_verification` (`recipient_profile_id`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`role` text DEFAULT 'donor' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);--> statement-breakpoint
CREATE TABLE `verification_review` (
	`id` text PRIMARY KEY NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`recipient_profile_id` text,
	`reviewer_id` text,
	`decision` text NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`recipient_profile_id`) REFERENCES `recipient_profile`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewer_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `review_target_idx` ON `verification_review` (`target_type`,`target_id`);