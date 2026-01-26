import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

// Singleton instance management
let supabaseInstance: SupabaseClient | null = null;
let currentUrl = '';
let currentKey = '';

// Track active channels to prevent duplication
const activeChannels: Map<string, RealtimeChannel> = new Map();

// Helper to get client dynamically with passed credentials, reusing instance if possible
export const getSupabase = (url: string, key: string) => {
    if (!url || !key) {
        return null;
    }
    
    // Reuse existing instance if credentials haven't changed
    if (supabaseInstance && url === currentUrl && key === currentKey) {
        return supabaseInstance;
    }

    // Create new instance
    currentUrl = url;
    currentKey = key;
    
    // Clear old channels on new instance
    activeChannels.forEach(ch => ch.unsubscribe());
    activeChannels.clear();

    supabaseInstance = createClient(url, key, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
        },
        realtime: {
            params: {
                eventsPerSecond: 20, // Increased for better drag responsiveness
            },
        },
    });
    
    return supabaseInstance;
};

// Generic insert/upsert for "Document Store" style
export const syncEntityToSupabase = async (table: string, data: any, url: string, key: string) => {
    const supabase = getSupabase(url, key);
    if (!supabase) return { error: 'Supabase não configurado (URL ou Key ausentes)' };

    // Ensure data is pure JSON
    const cleanContent = JSON.parse(JSON.stringify(data));

    const payload = {
        id: data.id,
        content: cleanContent,
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

        const entities = data.map((row: any) => {
            // Handle potential stringified JSON if column type varies
            if (typeof row.content === 'string') {
                try { return JSON.parse(row.content); } catch (e) { return row.content; }
            }
            return row.content;
        });
        
        return { data: entities, error: null };
    } catch (err) {
        console.error(err);
        return { data: [], error: err };
    }
};

// Unsubscribe helper
export const unsubscribeAll = async () => {
    const promises: Promise<any>[] = [];
    activeChannels.forEach((channel) => {
        promises.push(channel.unsubscribe());
    });
    await Promise.all(promises);
    activeChannels.clear();
    console.log("[Realtime] Todos os canais desconectados.");
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

    const channelName = `public:${table}`;

    // Deduplication: If channel exists and is joined, don't recreate
    if (activeChannels.has(channelName)) {
        const existing = activeChannels.get(channelName);
        if(existing && (existing.state === 'joined' || existing.state === 'joining')) {
            return existing;
        }
        // If closed or errored, remove and recreate
        activeChannels.delete(channelName);
    }

    const channel = supabase
        .channel(channelName)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: table }, (payload) => onInsert(payload.new))
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: table }, (payload) => onUpdate(payload.new))
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: table }, (payload) => onDelete(payload.old))
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log(`[Realtime] Conectado a ${table}`);
            }
            if (status === 'CHANNEL_ERROR') {
                console.error(`[Realtime] Erro no canal ${table}`);
                activeChannels.delete(channelName);
            }
            if (status === 'CLOSED') {
                activeChannels.delete(channelName);
            }
        });
        
    activeChannels.set(channelName, channel);
    return channel;
};