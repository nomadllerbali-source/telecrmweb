import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl =
  Constants.expoConfig?.extra?.supabaseUrl ||
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  '';

const supabaseAnonKey =
  Constants.expoConfig?.extra?.supabaseAnonKey ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials!');
  console.error('URL:', supabaseUrl ? 'Found' : 'Missing');
  console.error('Key:', supabaseAnonKey ? 'Found' : 'Missing');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

export async function setUserContext(userId: string, userRole?: string) {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase not configured, skipping user context');
      return;
    }
    const { error } = await supabase.rpc('set_user_context', {
      user_id: userId,
    });
    if (error) {
      console.warn('Error setting user context:', error.message);
    }
  } catch (error) {
    console.warn('Failed to set user context:', error);
  }
}
