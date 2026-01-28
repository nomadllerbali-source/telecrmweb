import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '@/types';
import { supabase, setUserContext } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (user: User) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Delay loading to ensure everything is initialized
    const timer = setTimeout(() => {
      loadUser().catch(err => {
        console.error('Failed to load user:', err);
        setIsLoading(false);
      });
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const loadUser = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        try {
          const parsed = JSON.parse(userData);
          if (parsed && parsed.id && parsed.role) {
            // Set user context but don't block on it
            setUserContext(parsed.id, parsed.role).catch(err => {
              console.warn('Failed to set user context:', err);
            });
            setUser(parsed);
          } else {
            console.warn('Invalid user data structure');
            await AsyncStorage.removeItem('user');
          }
        } catch (parseError) {
          console.error('Error parsing user data:', parseError);
          await AsyncStorage.removeItem('user');
        }
      }
    } catch (error) {
      console.error('Error loading user:', error);
      try {
        await AsyncStorage.removeItem('user');
      } catch (e) {
        console.error('Error clearing corrupted user data:', e);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (userData: User) => {
    try {
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      // Set user context but don't block on it
      setUserContext(userData.id, userData.role).catch(err => {
        console.warn('Failed to set user context:', err);
      });
      setUser(userData);
    } catch (error) {
      console.error('Error saving user:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('user');
      setUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
