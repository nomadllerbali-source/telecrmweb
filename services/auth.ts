import { supabase } from '@/lib/supabase';
import { User } from '@/types';
import * as Crypto from 'expo-crypto';

export async function loginUser(username: string, password: string): Promise<User> {
  try {
    const passwordHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      password
    );

    const { data, error } = await supabase
      .rpc('authenticate_user', {
        p_username: username,
        p_password_hash: passwordHash
      });

    if (error) {
      console.error('Supabase error:', error);
      throw new Error('Unable to connect to server. Please check your internet connection.');
    }

    if (!data || data.length === 0) throw new Error('Invalid username or password');

    const user = data[0];

    await supabase
      .rpc('set_user_context', {
        user_id: user.id
      });

    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    return user as User;
  } catch (error: any) {
    console.error('Login error:', error);
    if (error.message) {
      throw error;
    }
    throw new Error('An unexpected error occurred. Please try again.');
  }
}

export async function createUser(userData: {
  email: string;
  username: string;
  password: string;
  full_name: string;
  role: 'admin' | 'sales';
  phone?: string;
}): Promise<User> {
  try {
    const passwordHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      userData.password
    );

    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          email: userData.email,
          username: userData.username,
          password_hash: passwordHash,
          full_name: userData.full_name,
          role: userData.role,
          phone: userData.phone || null,
          status: 'active',
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data as User;
  } catch (error) {
    console.error('Create user error:', error);
    throw error;
  }
}
