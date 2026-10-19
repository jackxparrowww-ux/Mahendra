import { getSupabase, isSupabaseReady, uploadToSupabaseStorage, getFromSupabaseStorage, deleteFromSupabaseStorage } from './supabase';

export interface DBStatement {
  bind(...args: any[]): {
    first(): Promise<any>;
    all(): Promise<{ results: any[] }>;
    run(): Promise<any>;
  };
  all(): Promise<{ results: any[] }>;
}

export interface DBAdapter {
  prepare(sql: string): DBStatement;
  batch(statements: any[]): Promise<any[]>;
}

// In-memory / mock storage for when neither Supabase nor Cloudflare is configured
const memoryStore = new Map<string, any>();
const memoryFiles = new Map<string, { body: Uint8Array; contentType: string }>();

export function getDatabaseAdapter(rawDb?: any): DBAdapter {
  if (rawDb && typeof rawDb.prepare === 'function') {
    return rawDb;
  }

  // If Supabase is configured, map queries to Supabase
  if (isSupabaseReady()) {
    const sb = getSupabase()!;
    return {
      async batch(statements: any[]) {
        const results = [];
        for (const st of statements) {
          results.push(await st.run());
        }
        return results;
      },
      prepare(sql: string) {
        return {
          bind(...args: any[]) {
            return {
              async first() {
                return executeSupabaseQueryFirst(sb, sql, args);
              },
              async all() {
                const results = await executeSupabaseQueryAll(sb, sql, args);
                return { results };
              },
              async run() {
                return executeSupabaseRun(sb, sql, args);
              },
            };
          },
          async all() {
            const results = await executeSupabaseQueryAll(sb, sql, []);
            return { results };
          },
        };
      },
    };
  }

  // Local fallback memory store (ensures test/local runs without credentials never crash)
  return createMemoryDatabaseAdapter();
}

// --- Supabase query execution helpers ---

async function executeSupabaseQueryFirst(sb: any, sql: string, args: any[]) {
  const norm = sql.trim().toLowerCase();

  if (norm.startsWith('select * from workspace where id')) {
    const { data } = await sb.from('workspace').select('*').eq('id', args[0] || 'main').maybeSingle();
    return data || null;
  }

  if (norm.startsWith('select * from members where email')) {
    const { data } = await sb.from('members').select('*').eq('email', (args[0] || '').toLowerCase()).maybeSingle();
    return data || null;
  }

  if (norm.startsWith('select * from files where id')) {
    const { data } = await sb.from('files').select('*').eq('id', args[0]).maybeSingle();
    return data || null;
  }

  if (norm.startsWith('select id from projects where id')) {
    const { data } = await sb.from('projects').select('id').eq('id', args[0]).maybeSingle();
    return data || null;
  }

  if (norm.startsWith('select * from records where id')) {
    const { data } = await sb.from('records').select('*').eq('id', args[0]).maybeSingle();
    return data || null;
  }

  if (norm.startsWith('select data from workspace where id')) {
    const { data } = await sb.from('workspace').select('data').eq('id', args[0] || 'main').maybeSingle();
    return data || null;
  }

  if (norm.startsWith('select id from workspace where id')) {
    const { data } = await sb.from('workspace').select('id').eq('id', args[0] || 'main').maybeSingle();
    return data || null;
  }

  if (norm.includes('from enquiries where')) {
    const { data } = await sb.from('enquiries').select('id').order('created_at', { ascending: false }).limit(1).maybeSingle();
    return data || null;
  }

  if (norm.startsWith('insert into request_limits')) {
    const key = args[0];
    const expiresAt = args[1];
    const { data } = await sb.from('request_limits').select('count').eq('key', key).maybeSingle();
    const count = (data?.count || 0) + 1;
    await sb.from('request_limits').upsert({ key, count, expires_at: expiresAt });
    return { count };
  }

  return null;
}

async function executeSupabaseQueryAll(sb: any, sql: string, args: any[]): Promise<any[]> {
  const norm = sql.trim().toLowerCase();

  if (norm.startsWith('select * from projects') || norm.startsWith('select data from projects')) {
    const { data } = await sb.from('projects').select('*');
    return data || [];
  }

  if (norm.startsWith('select * from records')) {
    const { data } = await sb.from('records').select('*').order('created_at', { ascending: false });
    return data || [];
  }

  if (norm.startsWith('select * from files')) {
    const { data } = await sb.from('files').select('*');
    return data || [];
  }

  if (norm.startsWith('select * from members')) {
    const { data } = await sb.from('members').select('*');
    return data || [];
  }

  if (norm.startsWith('select * from audit_log')) {
    const { data } = await sb.from('audit_log').select('*').order('created_at', { ascending: false }).limit(100);
    return data || [];
  }

  if (norm.startsWith('select * from enquiries')) {
    const { data } = await sb.from('enquiries').select('*').order('created_at', { ascending: false });
    return data || [];
  }

  return [];
}

async function executeSupabaseRun(sb: any, sql: string, args: any[]) {
  const norm = sql.trim().toLowerCase();

  if (norm.startsWith('insert into workspace')) {
    await sb.from('workspace').upsert({ id: args[0], owner_id: args[1], data: args[2] });
    return { success: true };
  }

  if (norm.startsWith('update workspace set data')) {
    await sb.from('workspace').update({ data: args[0] }).eq('id', args[1] || 'main');
    return { success: true };
  }

  if (norm.startsWith('insert into projects')) {
    await sb.from('projects').upsert({ id: args[0], data: args[1] });
    return { success: true };
  }

  if (norm.startsWith('insert into records')) {
    await sb.from('records').upsert({
      id: args[0],
      project_id: args[1],
      kind: args[2],
      data: args[3],
      created_at: args[4] || new Date().toISOString(),
    });
    return { success: true };
  }

  if (norm.startsWith('delete from records where id')) {
    await sb.from('records').delete().eq('id', args[0]);
    return { success: true };
  }

  if (norm.startsWith('insert into members')) {
    await sb.from('members').upsert({
      email: (args[0] || '').toLowerCase(),
      role: args[1],
      project_ids: args[2],
    });
    return { success: true };
  }

  if (norm.startsWith('delete from members where email')) {
    await sb.from('members').delete().eq('email', (args[0] || '').toLowerCase());
    return { success: true };
  }

  if (norm.startsWith('insert into files')) {
    await sb.from('files').insert({
      id: args[0],
      project_id: args[1],
      name: args[2],
      type: args[3],
      size: args[4],
      shared: args[5],
    });
    return { success: true };
  }

  if (norm.startsWith('insert into audit_log')) {
    await sb.from('audit_log').insert({
      id: args[0],
      actor_id: args[1],
      actor_email: args[2],
      action: args[3],
      entity_id: args[4],
      details: args[5],
      created_at: args[6] || new Date().toISOString(),
    });
    return { success: true };
  }

  if (norm.startsWith('insert into enquiries')) {
    await sb.from('enquiries').insert({
      id: args[0],
      data: args[1],
      created_at: args[2] || new Date().toISOString(),
    });
    return { success: true };
  }

  if (norm.startsWith('delete from request_limits')) {
    await sb.from('request_limits').delete().lt('expires_at', args[0]);
    return { success: true };
  }

  return { success: true };
}

// In-memory fallback adapter for tests or offline local run
function createMemoryDatabaseAdapter(): DBAdapter {
  return {
    async batch(statements: any[]) {
      const results = [];
      for (const st of statements) results.push(await st.run());
      return results;
    },
    prepare(sql: string) {
      return {
        bind(...args: any[]) {
          return {
            async first() {
              return memoryQueryFirst(sql, args);
            },
            async all() {
              return { results: memoryQueryAll(sql, args) };
            },
            async run() {
              return memoryRun(sql, args);
            },
          };
        },
        async all() {
          return { results: memoryQueryAll(sql, []) };
        },
      };
    },
  };
}

function memoryQueryFirst(sql: string, args: any[]) {
  const norm = sql.trim().toLowerCase();
  if (norm.startsWith('select * from workspace')) return memoryStore.get('workspace:' + (args[0] || 'main')) || null;
  if (norm.startsWith('select * from members where email')) return memoryStore.get('member:' + (args[0] || '').toLowerCase()) || null;
  if (norm.startsWith('select * from files where id')) return memoryStore.get('file:' + args[0]) || null;
  if (norm.startsWith('select id from projects where id')) return memoryStore.has('project:' + args[0]) ? { id: args[0] } : null;
  if (norm.startsWith('select * from records where id')) return memoryStore.get('record:' + args[0]) || null;
  if (norm.startsWith('select data from workspace')) {
    const w = memoryStore.get('workspace:' + (args[0] || 'main'));
    return w ? { data: w.data } : null;
  }
  if (norm.startsWith('select id from workspace')) {
    const w = memoryStore.get('workspace:' + (args[0] || 'main'));
    return w ? { id: w.id } : null;
  }
  if (norm.startsWith('insert into request_limits')) return { count: 1 };
  return null;
}

function memoryQueryAll(sql: string, args: any[]): any[] {
  const norm = sql.trim().toLowerCase();
  const list: any[] = [];
  if (norm.startsWith('select * from projects') || norm.startsWith('select data from projects')) {
    for (const [k, v] of memoryStore.entries()) if (k.startsWith('project:')) list.push(v);
    return list;
  }
  if (norm.startsWith('select * from records')) {
    for (const [k, v] of memoryStore.entries()) if (k.startsWith('record:')) list.push(v);
    return list.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  if (norm.startsWith('select * from files')) {
    for (const [k, v] of memoryStore.entries()) if (k.startsWith('file:')) list.push(v);
    return list;
  }
  if (norm.startsWith('select * from members')) {
    for (const [k, v] of memoryStore.entries()) if (k.startsWith('member:')) list.push(v);
    return list;
  }
  if (norm.startsWith('select * from audit_log')) {
    for (const [k, v] of memoryStore.entries()) if (k.startsWith('audit:')) list.push(v);
    return list.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 100);
  }
  if (norm.startsWith('select * from enquiries')) {
    for (const [k, v] of memoryStore.entries()) if (k.startsWith('enquiry:')) list.push(v);
    return list.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  return list;
}

function memoryRun(sql: string, args: any[]) {
  const norm = sql.trim().toLowerCase();
  if (norm.startsWith('insert into workspace')) {
    memoryStore.set('workspace:' + args[0], { id: args[0], owner_id: args[1], data: args[2] });
  } else if (norm.startsWith('update workspace set data')) {
    const existing = memoryStore.get('workspace:' + (args[1] || 'main')) || { id: 'main', owner_id: 'owner' };
    memoryStore.set('workspace:' + (args[1] || 'main'), { ...existing, data: args[0] });
  } else if (norm.startsWith('insert into projects')) {
    memoryStore.set('project:' + args[0], { id: args[0], data: args[1] });
  } else if (norm.startsWith('insert into records')) {
    memoryStore.set('record:' + args[0], { id: args[0], project_id: args[1], kind: args[2], data: args[3], created_at: args[4] || new Date().toISOString() });
  } else if (norm.startsWith('delete from records where id')) {
    memoryStore.delete('record:' + args[0]);
  } else if (norm.startsWith('insert into members')) {
    memoryStore.set('member:' + (args[0] || '').toLowerCase(), { email: (args[0] || '').toLowerCase(), role: args[1], project_ids: args[2] });
  } else if (norm.startsWith('delete from members where email')) {
    memoryStore.delete('member:' + (args[0] || '').toLowerCase());
  } else if (norm.startsWith('insert into files')) {
    memoryStore.set('file:' + args[0], { id: args[0], project_id: args[1], name: args[2], type: args[3], size: args[4], shared: args[5] });
  } else if (norm.startsWith('insert into audit_log')) {
    memoryStore.set('audit:' + args[0], { id: args[0], actor_id: args[1], actor_email: args[2], action: args[3], entity_id: args[4], details: args[5], created_at: args[6] || new Date().toISOString() });
  } else if (norm.startsWith('insert into enquiries')) {
    memoryStore.set('enquiry:' + args[0], { id: args[0], data: args[1], created_at: args[2] || new Date().toISOString() });
  }
  return { success: true };
}

// Storage unified helpers (Supabase Storage -> Cloudflare BUCKET -> Memory)
export async function putStorageObject(bucket: any, id: string, data: Uint8Array, contentType: string) {
  if (isSupabaseReady()) {
    await uploadToSupabaseStorage(id, data, contentType);
    return;
  }
  if (bucket && typeof bucket.put === 'function') {
    await bucket.put(id, data, { httpMetadata: { contentType } });
    return;
  }
  memoryFiles.set(id, { body: data, contentType });
}

export async function getStorageObject(bucket: any, id: string): Promise<{ body: Uint8Array; contentType?: string } | null> {
  if (isSupabaseReady()) {
    const item = await getFromSupabaseStorage(id);
    if (!item) return null;
    return { body: item.data, contentType: item.contentType };
  }
  if (bucket && typeof bucket.get === 'function') {
    const obj = await bucket.get(id);
    if (!obj) return null;
    const body = obj.body instanceof Uint8Array ? obj.body : new Uint8Array(await obj.arrayBuffer?.() || []);
    return { body, contentType: obj.httpMetadata?.contentType };
  }
  const mem = memoryFiles.get(id);
  return mem ? { body: mem.body, contentType: mem.contentType } : null;
}

export async function deleteStorageObject(bucket: any, id: string) {
  if (isSupabaseReady()) {
    await deleteFromSupabaseStorage(id);
    return;
  }
  if (bucket && typeof bucket.delete === 'function') {
    await bucket.delete(id);
    return;
  }
  memoryFiles.delete(id);
}
