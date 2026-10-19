import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (client) return client;
  if (!supabaseUrl || !supabaseKey) return null;
  client = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return client;
}

export function isSupabaseReady(): boolean {
  return !!(supabaseUrl && supabaseKey);
}

// Storage helpers using Supabase Storage bucket 'documents'
const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || 'documents';

export async function uploadToSupabaseStorage(
  id: string,
  data: Uint8Array,
  contentType: string
): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;

  const { error } = await sb.storage.from(BUCKET_NAME).upload(id, data, {
    contentType,
    upsert: true,
  });

  if (error) {
    console.error('Supabase upload error:', error.message);
    throw new Error('Supabase Storage upload failed: ' + error.message);
  }
  return true;
}

export async function getFromSupabaseStorage(
  id: string
): Promise<{ data: Uint8Array; contentType: string } | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const { data, error } = await sb.storage.from(BUCKET_NAME).download(id);
  if (error || !data) return null;

  const arrayBuffer = await data.arrayBuffer();
  return {
    data: new Uint8Array(arrayBuffer),
    contentType: data.type || 'application/octet-stream',
  };
}

export async function deleteFromSupabaseStorage(id: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;

  const { error } = await sb.storage.from(BUCKET_NAME).remove([id]);
  return !error;
}
