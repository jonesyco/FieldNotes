import { nanoid } from 'nanoid';
import { supabase, isSupabaseConfigured } from './supabase';
import type { POI } from '../types';
import type { Category } from '../types/categories';

export interface Collection {
  id: string;
  title: string | null;
  pois: POI[];
  categories?: Category[];
  created_at: string;
  user_id?: string | null;
}

export async function saveCollection(
  pois: POI[],
  title?: string,
  userId?: string,
  categories?: Category[]
): Promise<string> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.');
  }
  const id = nanoid(8);
  const { error } = await supabase
    .from('collections')
    .insert({ 
      id, 
      pois, 
      categories: categories ?? undefined,
      title: title ?? null, 
      user_id: userId ?? null 
    });
  if (error) throw error;
  return id;
}

export async function loadUserCollections(userId: string): Promise<Collection[]> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured.');
  }
  const { data, error } = await supabase
    .from('collections')
    .select('id, title, created_at, user_id, pois, categories')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Collection[];
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
