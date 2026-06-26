import { relations, sql } from 'drizzle-orm'
import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

// ponytail: a single schema file is drizzle-kit's expected entry point and keeps the
// trust model's 16 entities readable as one picture. Sensitive fields are stored as
// plain text columns but marked PRIVATE / ADMIN-ONLY in comments; access control lives
// in the server functions, never assume the column is safe to serialize.

const nowMs = sql`(cast(unixepoch('subsecond') * 1000 as integer))`

/* -------------------------------------------------------------------------- */
/* Better Auth required tables (shapes must match the drizzle adapter)        */
/* -------------------------------------------------------------------------- */

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' })
    .default(false)
    .notNull(),
  image: text('image'),
  role: text('role', { enum: ['donor', 'recipient', 'admin'] })
    .default('donor')
    .notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(nowMs).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .default(nowMs)
    .$onUpdate(() => new Date())
    .notNull(),
})

export const session = sqliteTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    token: text('token').notNull().unique(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(nowMs).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(nowMs)
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (t) => [index('session_userId_idx').on(t.userId)],
)

export const account = sqliteTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: integer('access_token_expires_at', {
      mode: 'timestamp_ms',
    }),
    refreshTokenExpiresAt: integer('refresh_token_expires_at', {
      mode: 'timestamp_ms',
    }),
    scope: text('scope'),
    password: text('password'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(nowMs).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(nowMs)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [index('account_userId_idx').on(t.userId)],
)

export const verification = sqliteTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(nowMs).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(nowMs)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [index('verification_identifier_idx').on(t.identifier)],
)

/* -------------------------------------------------------------------------- */
/* Domain: recipients, trust, payouts                                         */
/* -------------------------------------------------------------------------- */

export const recipientProfiles = sqliteTable(
  'recipient_profile',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull().unique(),
    legalName: text('legal_name').notNull(), // PRIVATE
    publicName: text('public_name').notNull(),
    phone: text('phone'), // PRIVATE
    email: text('email'), // PRIVATE
    country: text('country').notNull(),
    region: text('region').notNull(),
    city: text('city').notNull(),
    neighborhood: text('neighborhood'),
    exactAddress: text('exact_address'), // PRIVATE
    approximateLat: real('approximate_lat'), // PRIVATE / admin-only
    approximateLng: real('approximate_lng'), // PRIVATE / admin-only
    bio: text('bio'),
    identityVerificationStatus: text('identity_verification_status', {
      enum: ['unverified', 'pending', 'verified', 'rejected'],
    })
      .default('unverified')
      .notNull(),
    payoutVerificationStatus: text('payout_verification_status', {
      enum: ['unverified', 'pending', 'verified', 'rejected'],
    })
      .default('unverified')
      .notNull(),
    locationVerificationStatus: text('location_verification_status', {
      enum: ['unverified', 'pending', 'verified', 'rejected'],
    })
      .default('unverified')
      .notNull(),
    trustLevel: text('trust_level', {
      enum: ['none', 'basic', 'identity', 'payout', 'location', 'trusted'],
    })
      .default('none')
      .notNull(),
    riskFlagsCount: integer('risk_flags_count').default(0).notNull(),
    frozen: integer('frozen', { mode: 'boolean' }).default(false).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(nowMs).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(nowMs)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [index('recipient_userId_idx').on(t.userId)],
)

export const recipientVerifications = sqliteTable(
  'recipient_verification',
  {
    id: text('id').primaryKey(),
    recipientProfileId: text('recipient_profile_id')
      .notNull()
      .references(() => recipientProfiles.id, { onDelete: 'cascade' }),
    kind: text('kind', {
      enum: ['identity', 'payout', 'location'],
    }).notNull(),
    status: text('status', {
      enum: ['pending', 'approved', 'rejected'],
    })
      .default('pending')
      .notNull(),
    notes: text('notes'),
    reviewerId: text('reviewer_id').references(() => user.id),
    submittedAt: integer('submitted_at', { mode: 'timestamp_ms' }).default(nowMs).notNull(),
    reviewedAt: integer('reviewed_at', { mode: 'timestamp_ms' }),
  },
  (t) => [index('recverification_profile_idx').on(t.recipientProfileId)],
)

export const payoutMethods = sqliteTable(
  'payout_method',
  {
    id: text('id').primaryKey(),
    recipientProfileId: text('recipient_profile_id')
      .notNull()
      .references(() => recipientProfiles.id, { onDelete: 'cascade' }),
    // ponytail: free text for now — recipient picks a label ("Pago móvil",
    // "Cuenta bancaria", "Bizum"…) and writes the how-to-pay details verbatim.
    // No automatic masking: the recipient controls exactly what's shown.
    label: text('label').notNull(),
    details: text('details').notNull(),
    verificationStatus: text('verification_status', {
      enum: ['unverified', 'pending', 'verified', 'rejected'],
    })
      .default('unverified')
      .notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(nowMs).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(nowMs)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [index('payout_profile_idx').on(t.recipientProfileId)],
)

/* -------------------------------------------------------------------------- */
/* Domain: campaigns, donations                                               */
/* -------------------------------------------------------------------------- */

export const campaigns = sqliteTable(
  'campaign',
  {
    id: text('id').primaryKey(),
    recipientProfileId: text('recipient_profile_id')
      .notNull()
      .references(() => recipientProfiles.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    summary: text('summary'),
    goalCents: integer('goal_cents'),
    currency: text('currency').default('USD').notNull(),
    status: text('status', {
      enum: ['draft', 'active', 'paused', 'closed', 'frozen'],
    })
      .default('draft')
      .notNull(),
    coverImageKey: text('cover_image_key'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(nowMs).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .default(nowMs)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [index('campaign_profile_idx').on(t.recipientProfileId)],
)

export const donations = sqliteTable(
  'donation',
  {
    id: text('id').primaryKey(),
    campaignId: text('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    donorUserId: text('donor_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    amountCents: integer('amount_cents').notNull(),
    currency: text('currency').default('USD').notNull(),
    status: text('status', {
      enum: ['pledged', 'sent', 'received', 'disputed'],
    })
      .default('pledged')
      .notNull(),
    reference: text('reference'),
    message: text('message'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(nowMs).notNull(),
  },
  (t) => [index('donation_campaign_idx').on(t.campaignId)],
)

export const donationConfirmations = sqliteTable(
  'donation_confirmation',
  {
    id: text('id').primaryKey(),
    donationId: text('donation_id')
      .notNull()
      .references(() => donations.id, { onDelete: 'cascade' }),
    donorUserId: text('donor_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    amountCents: integer('amount_cents').notNull(),
    currency: text('currency').default('USD').notNull(),
    sentAt: integer('sent_at', { mode: 'timestamp_ms' }),
    transferProofImageId: text('transfer_proof_image_id'), // PRIVATE/admin-only
    methodNote: text('method_note'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(nowMs).notNull(),
  },
  (t) => [index('confirm_donation_idx').on(t.donationId)],
)

/* -------------------------------------------------------------------------- */
/* Domain: expenses + evidence                                                */
/* -------------------------------------------------------------------------- */

export const expenses = sqliteTable(
  'expense',
  {
    id: text('id').primaryKey(),
    campaignId: text('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    recipientProfileId: text('recipient_profile_id')
      .notNull()
      .references(() => recipientProfiles.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    totalCents: integer('total_cents').notNull(),
    currency: text('currency').default('USD').notNull(),
    incurredAt: integer('incurred_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(nowMs).notNull(),
  },
  (t) => [index('expense_campaign_idx').on(t.campaignId)],
)

export const expenseItems = sqliteTable(
  'expense_item',
  {
    id: text('id').primaryKey(),
    expenseId: text('expense_id')
      .notNull()
      .references(() => expenses.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    amountCents: integer('amount_cents').notNull(),
    quantity: integer('quantity').default(1).notNull(),
  },
  (t) => [index('item_expense_idx').on(t.expenseId)],
)

export const evidenceImages = sqliteTable(
  'evidence_image',
  {
    id: text('id').primaryKey(),
    ownerUserId: text('owner_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    objectKey: text('object_key').notNull(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    width: integer('width'),
    height: integer('height'),
    checksum: text('checksum'),
    kind: text('kind', {
      enum: [
        'transfer_proof',
        'invoice',
        'receipt',
        'product_photo',
        'delivery_photo',
        'identity_doc',
      ],
    }).notNull(),
    visibility: text('visibility', {
      enum: ['public', 'private', 'admin_only'],
    })
      .default('private')
      .notNull(),
    moderationStatus: text('moderation_status', {
      enum: ['pending', 'approved', 'rejected', 'redacted'],
    })
      .default('pending')
      .notNull(),
    linkedEntityType: text('linked_entity_type', {
      enum: [
        'donation',
        'expense',
        'campaign',
        'recipient_verification',
        'payout',
      ],
    }),
    linkedEntityId: text('linked_entity_id'),
    caption: text('caption'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(nowMs).notNull(),
  },
  (t) => [
    index('evidence_owner_idx').on(t.ownerUserId),
    index('evidence_link_idx').on(t.linkedEntityType, t.linkedEntityId),
  ],
)

export const donationExpenseLinks = sqliteTable(
  'donation_expense_link',
  {
    id: text('id').primaryKey(),
    donationId: text('donation_id')
      .notNull()
      .references(() => donations.id, { onDelete: 'cascade' }),
    expenseId: text('expense_id')
      .notNull()
      .references(() => expenses.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(nowMs).notNull(),
  },
  (t) => [
    index('link_donation_idx').on(t.donationId),
    index('link_expense_idx').on(t.expenseId),
  ],
)

export const verificationReviews = sqliteTable(
  'verification_review',
  {
    id: text('id').primaryKey(),
    targetType: text('target_type', {
      enum: ['identity', 'payout', 'location', 'evidence'],
    }).notNull(),
    targetId: text('target_id').notNull(),
    recipientProfileId: text('recipient_profile_id').references(() =>
      recipientProfiles.id,
    ),
    reviewerId: text('reviewer_id').references(() => user.id),
    decision: text('decision', {
      enum: ['approved', 'rejected', 'needs_info'],
    }).notNull(),
    notes: text('notes'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(nowMs).notNull(),
  },
  (t) => [index('review_target_idx').on(t.targetType, t.targetId)],
)

export const abuseReports = sqliteTable(
  'abuse_report',
  {
    id: text('id').primaryKey(),
    reporterUserId: text('reporter_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    targetType: text('target_type', {
      enum: ['recipient', 'campaign', 'evidence'],
    }).notNull(),
    targetId: text('target_id').notNull(),
    reason: text('reason').notNull(),
    details: text('details'),
    status: text('status', {
      enum: ['open', 'reviewed', 'dismissed', 'actioned'],
    })
      .default('open')
      .notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(nowMs).notNull(),
  },
  (t) => [index('report_target_idx').on(t.targetType, t.targetId)],
)

/* -------------------------------------------------------------------------- */
/* Relations                                                                  */
/* -------------------------------------------------------------------------- */

export const userRelations = relations(user, ({ many }) => ({
  recipientProfiles: many(recipientProfiles),
  donations: many(donations),
  evidenceImages: many(evidenceImages),
}))

export const recipientProfileRelations = relations(
  recipientProfiles,
  ({ one, many }) => ({
    user: one(user, { fields: [recipientProfiles.userId], references: [user.id] }),
    verifications: many(recipientVerifications),
    payoutMethods: many(payoutMethods),
    campaigns: many(campaigns),
  }),
)

export const campaignRelations = relations(campaigns, ({ one, many }) => ({
  recipientProfile: one(recipientProfiles, {
    fields: [campaigns.recipientProfileId],
    references: [recipientProfiles.id],
  }),
  donations: many(donations),
  expenses: many(expenses),
}))

export const donationRelations = relations(donations, ({ one, many }) => ({
  campaign: one(campaigns, { fields: [donations.campaignId], references: [campaigns.id] }),
  donor: one(user, { fields: [donations.donorUserId], references: [user.id] }),
  confirmations: many(donationConfirmations),
  expenseLinks: many(donationExpenseLinks),
}))

export const expenseRelations = relations(expenses, ({ one, many }) => ({
  campaign: one(campaigns, { fields: [expenses.campaignId], references: [campaigns.id] }),
  recipientProfile: one(recipientProfiles, {
    fields: [expenses.recipientProfileId],
    references: [recipientProfiles.id],
  }),
  items: many(expenseItems),
}))

export const evidenceImageRelations = relations(evidenceImages, ({ one }) => ({
  owner: one(user, { fields: [evidenceImages.ownerUserId], references: [user.id] }),
}))
