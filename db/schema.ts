import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const workspace = sqliteTable('workspace', { id: text('id').primaryKey(), ownerId: text('owner_id').notNull(), data: text('data').notNull() });
export const projects = sqliteTable('projects', { id: text('id').primaryKey(), data: text('data').notNull() });
export const records = sqliteTable('records', { id: text('id').primaryKey(), projectId: text('project_id').notNull(), kind: text('kind').notNull(), data: text('data').notNull(), createdAt: text('created_at').notNull() });
export const members = sqliteTable('members', { email: text('email').primaryKey(), role: text('role').notNull(), projectIds: text('project_ids').notNull() });
export const files = sqliteTable('files', { id: text('id').primaryKey(), projectId: text('project_id').notNull(), name: text('name').notNull(), type: text('type').notNull(), size: integer('size').notNull(), shared: integer('shared').notNull().default(0) });
export const enquiries = sqliteTable('enquiries', { id: text('id').primaryKey(), data: text('data').notNull(), createdAt: text('created_at').notNull() });
export const auditLog = sqliteTable('audit_log', { id: text('id').primaryKey(), actorId: text('actor_id').notNull(), actorEmail: text('actor_email').notNull(), action: text('action').notNull(), entityId: text('entity_id').notNull(), details: text('details').notNull(), createdAt: text('created_at').notNull() });
export const requestLimits = sqliteTable('request_limits', { key: text('key').primaryKey(), count: integer('count').notNull(), expiresAt: integer('expires_at').notNull() });
