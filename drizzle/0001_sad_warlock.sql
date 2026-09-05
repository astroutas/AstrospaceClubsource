ALTER TABLE `members` ADD `title` text;--> statement-breakpoint
ALTER TABLE `members` ADD `rank_order` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_members_rank` ON `members` (`rank_order`);