-- =========================================================================
-- Mahendra Real Estate - Supabase Schema Setup
-- Run this script in your Supabase Project -> SQL Editor -> New Query -> Run
-- =========================================================================

-- 1. Enable UUID Extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Workspace Table (Stores business profile & ownership)
CREATE TABLE IF NOT EXISTS public.workspace (
    id TEXT PRIMARY KEY DEFAULT 'main',
    owner_id TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Projects Table (Stores independent homes and societies)
CREATE TABLE IF NOT EXISTS public.projects (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Records Table (Estimates, agreements, expenses, labour, payments, site updates)
CREATE TABLE IF NOT EXISTS public.records (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL
);

-- Index for faster record queries per project & kind
CREATE INDEX IF NOT EXISTS idx_records_project ON public.records(project_id);
CREATE INDEX IF NOT EXISTS idx_records_kind ON public.records(kind);

-- 5. Files Metadata Table (Documents, drawings, cover images)
CREATE TABLE IF NOT EXISTS public.files (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    size BIGINT NOT NULL,
    shared INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_files_project ON public.files(project_id);

-- 6. Members Table (Role-based access: contractor, supervisor, client)
CREATE TABLE IF NOT EXISTS public.members (
    email TEXT PRIMARY KEY,
    role TEXT NOT NULL,
    project_ids TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Audit Log Table (Before/after change tracking)
CREATE TABLE IF NOT EXISTS public.audit_log (
    id TEXT PRIMARY KEY,
    actor_id TEXT NOT NULL,
    actor_email TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    details TEXT NOT NULL,
    created_at TEXT NOT NULL
);

-- 8. Enquiries Table (Public website enquiries)
CREATE TABLE IF NOT EXISTS public.enquiries (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    created_at TEXT NOT NULL
);

-- 9. Request Limits (Rate limiting for public enquiry form)
CREATE TABLE IF NOT EXISTS public.request_limits (
    key TEXT PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 1,
    expires_at BIGINT NOT NULL
);

-- =========================================================================
-- Supabase Storage Bucket Setup
-- =========================================================================
-- Create the 'documents' bucket for architectural plans, photos, and bills
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow public read access to images and documents in the bucket
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'documents');

-- Allow service role / authenticated uploads
CREATE POLICY "Allow Uploads"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Allow Updates"
ON storage.objects FOR UPDATE
USING (bucket_id = 'documents');

CREATE POLICY "Allow Deletes"
ON storage.objects FOR DELETE
USING (bucket_id = 'documents');
