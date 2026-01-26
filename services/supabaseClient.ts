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
                eventsPerSecond: 10, // Reduced slightly to prevent flooding if connection is weak
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

// GLOBAL DATABASE SUBSCRIPTION
export const subscribeToDatabase = (
    url: string,
    key: string,
    onEvent: (payload: any) => void,
    retryCount = 0
): RealtimeChannel | null => {
    const supabase = getSupabase(url, key);
    if (!supabase) return null;

    const channelName = 'public-db-changes';

    // Deduplication: Return existing if connected
    if (activeChannels.has(channelName)) {
        const existing = activeChannels.get(channelName);
        if(existing && (existing.state === 'joined' || existing.state === 'joining')) {
            return existing;
        }
        // If it's in a bad state, clean it up
        supabase.removeChannel(existing!);
        activeChannels.delete(channelName);
    }

    const channel = supabase.channel(channelName)
        .on(
            'postgres_changes',
            { event: '*', schema: 'public' },
            (payload) => onEvent(payload)
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log(`[Realtime] Monitorando alterações no banco de dados.`);
            }
            
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                // Only log warning if it's the first few failures to avoid console spam
                if (retryCount < 3) {
                    console.warn(`[Realtime] Erro de conexão (${status}). Tentando reconectar...`);
                }
                
                // Cleanup current failing channel
                activeChannels.delete(channelName);
                supabase.removeChannel(channel);

                // Retry Logic with Backoff (Max 10 retries)
                if (retryCount < 10) {
                    const delay = Math.min(1000 * Math.pow(2, retryCount), 10000); // 1s, 2s, 4s, 8s, 10s...
                    setTimeout(() => {
                        subscribeToDatabase(url, key, onEvent, retryCount + 1);
                    }, delay);
                } else {
                    console.error("[Realtime] Falha permanente na conexão. Verifique suas credenciais do Supabase.");
                }
            }
            
            if (status === 'CLOSED') {
                activeChannels.delete(channelName);
            }
        });

    activeChannels.set(channelName, channel);
    return channel;
};

// Deprecated single table subscription (kept for compatibility if needed)
export const subscribeToTable = (
    table: string, 
    url: string, 
    key: string, 
    onInsert: (payload: any) => void,
    onUpdate: (payload: any) => void,
    onDelete: (payload: any) => void
): RealtimeChannel | null => {
    return subscribeToDatabase(url, key, (payload) => {
        if(payload.table === table) {
            if(payload.eventType === 'INSERT') onInsert(payload.new);
            if(payload.eventType === 'UPDATE') onUpdate(payload.new);
            if(payload.eventType === 'DELETE') onDelete(payload.old);
        }
    });
};