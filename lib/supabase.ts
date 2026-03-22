import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function rpc<T = unknown>(fnName: string, params: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.rpc(fnName, params);
  if (error) throw new Error(`RPC ${fnName}: ${error.message}`);
  return data as T;
}
