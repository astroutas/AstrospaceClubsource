import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
  index,
} from 'drizzle-orm/sqlite-core';
export const members = sqliteTable(
  'members',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    phone: text('phone').notNull(),
    major: text('major').notNull(),
    // الرتبة داخل النادي (رئيس النادي، نائب الرئيس…) يكتبها الأدمن
    title: text('title'),
    // ترتيب الظهور في قسم الفريق — الأصغر أولًا
    rankOrder: integer('rank_order').notNull().default(0),
    platformId: text('platform_id'),
    demo: integer('demo').notNull().default(0),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [
    uniqueIndex('idx_members_phone').on(t.phone),
    uniqueIndex('idx_members_platform').on(t.platformId),
    index('idx_members_rank').on(t.rankOrder),
  ],
);
export const events = sqliteTable(
  'events',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    category: text('category').notNull(),
    location: text('location').notNull(),
    startsAt: integer('starts_at').notNull(),
    endsAt: integer('ends_at').notNull(),
    capacity: integer('capacity').notNull(),
    points: integer('points').notNull(),
    badge: text('badge').notNull(),
    status: text('status').notNull().default('published'),
    demo: integer('demo').notNull().default(0),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [index('idx_events_status_starts').on(t.status, t.startsAt)],
);
export const tickets = sqliteTable(
  'tickets',
  {
    id: text('id').primaryKey(),
    token: text('token').notNull(),
    memberId: text('member_id')
      .notNull()
      .references(() => members.id),
    eventId: text('event_id')
      .notNull()
      .references(() => events.id),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [
    uniqueIndex('idx_tickets_token').on(t.token),
    uniqueIndex('idx_tickets_member_event').on(t.memberId, t.eventId),
    index('idx_tickets_event').on(t.eventId),
  ],
);
export const attendance = sqliteTable(
  'attendance',
  {
    ticketId: text('ticket_id')
      .primaryKey()
      .references(() => tickets.id),
    scannedBy: text('scanned_by').notNull(),
    scannedAt: integer('scanned_at').notNull(),
    points: integer('points').notNull(),
    badge: text('badge').notNull(),
    cardId: text('card_id').notNull(),
  },
  (t) => [uniqueIndex('idx_attendance_card').on(t.cardId)],
);
export const sessions = sqliteTable(
  'sessions',
  {
    tokenHash: text('token_hash').primaryKey(),
    memberId: text('member_id')
      .notNull()
      .references(() => members.id),
    mode: text('mode').notNull(),
    platformId: text('platform_id'),
    expiresAt: integer('expires_at').notNull(),
  },
  (t) => [index('idx_sessions_member').on(t.memberId)],
);
export const rateLimits = sqliteTable('rate_limits', {
  key: text('key').primaryKey(),
  count: integer('count').notNull(),
  expiresAt: integer('expires_at').notNull(),
});
export const content = sqliteTable(
  'content',
  {
    id: text('id').primaryKey(),
    kind: text('kind').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    imageUrl: text('image_url'),
    published: integer('published').notNull().default(1),
    demo: integer('demo').notNull().default(0),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [index('idx_content_kind_published').on(t.kind, t.published)],
);
export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  body: text('body').notNull(),
  status: text('status').notNull().default('new'),
  createdAt: integer('created_at').notNull(),
});
