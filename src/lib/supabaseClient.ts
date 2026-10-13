import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config, isSupabaseConfigured } from './config';

let client: SupabaseClient | null = null;
if (isSupabaseConfigured) {
  client = createClient(config.supabaseUrl, config.supabaseAnonKey);
}

export const supabase = client;
export { isSupabaseConfigured };
