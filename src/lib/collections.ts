import { nanoid } from 'nanoid';
import { supabase, isSupabaseConfigured } from './supabase';
import type { POI } from '../types';

export interface Collection {
  id: string;
  title: string | null;
  pois: POI[];
  created_at: string;
}

export async function saveCollection(pois: POI[], title?: string): Promise<string> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.');
  }
  const id = nanoid(8);
  const { error } = await supabase
    .from('collections')
    .insert({ id, pois, title: title ?? null });
  if (error) throw error;
  return id;
}

export async function loadCollection(id: string): Promise<Collection> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }
  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as Collection;
}
