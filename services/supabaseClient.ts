import { createClient, RealtimeChannel } from '@supabase/supabase-js';

// Helper to get client dynamically with passed credentials
export const getSupabase = (url: string, key: string) => {
    if (!url || !key) {
        return null;
    }
    return createClient(url, key);
};

// Generic insert/upsert for "Document Store" style
export const syncEntityToSupabase = async (table: string, data: any, url: string, key: string) => {
    const supabase = getSupabase(url, key);
    if (!supabase) return { error: 'Supabase não configurado (URL ou Key ausentes)' };

    const payload = {
        id: data.id,
        content: data,
        updated_at: new Date().toISOString()
    };

    const { error } = await supabase
        .from(table)
        .upsert(payload, { onConflict: 'id' });

    if (error) console.error(`Erro sync ${table}:`, error);
    return { error };
};

// Generic delete
export const deleteEntityFromSupabase = async (table: string, id: string, url: string, key: string) => {
    const supabase = getSupabase(url, key);
    if (!supabase) return { error: 'Supabase não configurado' };

    const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);

    if (error) console.error(`Erro delete ${table}:`, error);
    return { error };
}

export const fetchEntitiesFromSupabase = async (table: string, url: string, key: string) => {
    const supabase = getSupabase(url, key);
    if (!supabase) return { data: null, error: 'Supabase não configurado' };

    try {
        const { data, error } = await supabase
            .from(table)
            .select('*');

        if (error) {
            console.warn(`Erro ao buscar tabela ${table}:`, error.message);
            return { data: [], error };
        }

        const entities = data.map((row: any) => row.content);
        return { data: entities, error: null };
    } catch (err) {
        console.error(err);
        return { data: [], error: err };
    }
};

// Realtime Subscription Helper
export const subscribeToTable = (
    table: string, 
    url: string, 
    key: string, 
    onInsert: (payload: any) => void,
    onUpdate: (payload: any) => void,
    onDelete: (payload: any) => void
): RealtimeChannel | null => {
    const supabase = getSupabase(url, key);
    if (!supabase) return null;

    return supabase
        .channel(`public:${table}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: table }, (payload) => onInsert(payload.new))
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: table }, (payload) => onUpdate(payload.new))
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: table }, (payload) => onDelete(payload.old))
        .subscribe();
};