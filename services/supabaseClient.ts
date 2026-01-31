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
                eventsPerSecond: 10,
            },
            heartbeatIntervalMs: 5000, // Faster heartbeat to detect disconnects
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

    // Try to determine if we should use 'content' column or flat columns
    // For simplicity in this hybrid approach, we prefer 'content' but if the table is strict relational, this might fail unless we adjust.
    // However, the prompt implies we are using a flexible schema or the user has adapted it.
    // To be safe, we will upsert into 'content' if possible, assuming the schema supports it as per previous design.
    // If the user is using a strict schema, this part of the code might need a different strategy (mapping fields), 
    // but typically with "content" pattern, we just dump JSON.
    
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
            // 1. Try 'content' column (Document Store Pattern)
            if (row.content) {
                if (typeof row.content === 'string') {
                    try { return JSON.parse(row.content); } catch (e) { return row.content; }
                }
                return row.content;
            }
            
            // 2. Fallback: Normalize flat row (Relational Table Pattern)
            // Convert snake_case to camelCase
            const newObj: any = {};
            for (const key in row) {
                const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
                newObj[camelKey] = row[key];
            }
            return newObj;
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
    console.log("[Realtime] Todos canais fechados.");
};

// GLOBAL DATABASE SUBSCRIPTION
export const subscribeToDatabase = (
    url: string,
    key: string,
    onEvent: (payload: any) => void,
    onStatusChange?: (status: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING') => void
): RealtimeChannel | null => {
    const supabase = getSupabase(url, key);
    if (!supabase) return null;

    const channelName = 'public-db-changes';

    // FORCE CLEANUP: Always remove old channel to ensure fresh connection logic
    if (activeChannels.has(channelName)) {
        const oldChannel = activeChannels.get(channelName);
        oldChannel?.unsubscribe();
        activeChannels.delete(channelName);
    }

    if(onStatusChange) onStatusChange('CONNECTING');
    console.log("[Realtime] Iniciando nova conexão...");

    const channel = supabase.channel(channelName)
        .on(
            'postgres_changes',
            { event: '*', schema: 'public' },
            (payload) => onEvent(payload)
        )
        .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') {
                console.log(`[Realtime] Conectado!`);
                if(onStatusChange) onStatusChange('CONNECTED');
            }
            
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                console.warn(`[Realtime] Desconectado (${status})`);
                if(onStatusChange) onStatusChange('DISCONNECTED');
                
                // Remove from active list
                activeChannels.delete(channelName);
            }
        });

    activeChannels.set(channelName, channel);
    return channel;
};