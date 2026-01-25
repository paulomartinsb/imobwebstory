import { createClient } from '@supabase/supabase-js';
import { useStore } from '../store';

// Helper to get client only when needed to ensure we use latest settings
export const getSupabase = () => {
    const settings = useStore.getState().systemSettings;
    const url = settings.supabaseUrl;
    const key = settings.supabaseAnonKey;

    if (!url || !key) {
        return null;
    }

    return createClient(url, key);
};

// Generic insert/upsert for "Document Store" style
// We will store main entities as JSONB in a 'content' column to preserve the exact TS structure
// Tables required: 'properties', 'clients', 'logs', 'pipelines'

export const syncEntityToSupabase = async (table: string, data: any) => {
    const supabase = getSupabase();
    if (!supabase) return { error: 'Supabase não configurado' };

    // We assume the table has an 'id' column and a 'content' jsonb column
    // We upsert the whole object into 'content' and set the explicit 'id'
    const payload = {
        id: data.id,
        content: data,
        updated_at: new Date().toISOString()
    };

    const { error } = await supabase
        .from(table)
        .upsert(payload, { onConflict: 'id' });

    return { error };
};

export const fetchEntitiesFromSupabase = async (table: string) => {
    const supabase = getSupabase();
    if (!supabase) return { data: null, error: 'Supabase não configurado' };

    const { data, error } = await supabase
        .from(table)
        .select('*');

    if (error) return { data: null, error };

    // Unwrap content
    const entities = data.map((row: any) => row.content);
    return { data: entities, error: null };
};
