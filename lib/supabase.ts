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

// Helper to resolve host via Google DNS-over-HTTPS (DoH)
const resolveHostWithDoH = async (hostname: string) => {
  try {
    const res = await fetch(`https://dns.google/resolve?name=${hostname}&type=A`);
    const data = await res.json();
    if (data.Answer && data.Answer.length > 0) {
      return data.Answer[0].data;
    }
  } catch (e) {
    console.error("DoH Resolution failed:", e);
  }
  return null;
};

const PROXIES = [
  (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  (u: string) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
  (u: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
  (u: string) => `https://thingproxy.freeboard.io/fetch/${u}`
];

// Global log for diagnostics
export const networkLog: string[] = [];
const addToLog = (msg: string) => {
  const time = new Date().toLocaleTimeString();
  networkLog.push(`[${time}] ${msg}`);
  if (networkLog.length > 50) networkLog.shift();
  console.log(msg);
};

// Robust fetcher that handles common SSL, DNS, and Firewall issues
const customFetch = async (url: string, options: any) => {
  try {
    return await fetch(url, options);
  } catch (err: any) {
    const errMsg = err.message || 'Unknown Error';
    const errName = err.name || 'Error';
    addToLog(`⚠️ Fetch Failed: ${errName} - ${errMsg}`);

    const isNetworkError = errMsg.includes('Failed to fetch') ||
      errMsg.includes('Network request failed') ||
      errName === 'TypeError' ||
      errMsg.includes('SSL library') ||
      errMsg.includes('Software caused connection abort');

    if (isNetworkError) {
      const urlObj = new URL(url);
      addToLog(`🔄 Attempting Fallbacks for ${urlObj.hostname}...`);

      // Step 1: DNS-over-HTTPS fallback (Direct IP)
      addToLog(`📡 Resolving via DoH...`);
      const ip = await resolveHostWithDoH(urlObj.hostname);
      if (ip) {
        addToLog(`📍 Resolved IP: ${ip}. Retrying...`);
        const ipUrl = url.replace(urlObj.hostname, ip);
        const headers = { ...options.headers, 'Host': urlObj.hostname };
        try {
          const res = await fetch(ipUrl, { ...options, headers });
          if (res.ok) {
            addToLog(`✅ DoH Success!`);
            return res;
          }
        } catch (ipErr: any) {
          addToLog(`❌ IP Fallback failed: ${ipErr.message}`);
        }
      }

      // Step 2: Proxy Rotation fallback
      for (const getProxyUrl of PROXIES) {
        const proxyUrlString = getProxyUrl(url);
        const proxyHost = new URL(proxyUrlString).hostname;
        try {
          addToLog(`🌐 Trying Proxy: ${proxyHost}...`);

          // Add apikey in URL as fallback for header-stripping proxies
          const urlWithKey = url.includes('?') ? `${url}&apikey=${supabaseAnonKey}` : `${url}?apikey=${supabaseAnonKey}`;
          const finalProxyUrl = getProxyUrl(urlWithKey);

          const res = await fetch(finalProxyUrl, options);
          if (res.ok) {
            addToLog(`✅ Proxy Success: ${proxyHost}`);
            return res;
          }
          addToLog(`⚠️ Proxy ${proxyHost} returned ${res.status}`);
        } catch (proxyErr: any) {
          addToLog(`❌ Proxy ${proxyHost} failed: ${proxyErr.message}`);
        }
      }
    }
    addToLog(`🔴 All connection attempts failed.`);
    throw err;
  }
};

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
    global: {
      fetch: customFetch as any
    }
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
      user_role: userRole || 'sales', // Default to sales if not provided
    });
    if (error) {
      console.warn('Error setting user context:', error.message);
    }
  } catch (error) {
    console.warn('Failed to set user context:', error);
  }
}
