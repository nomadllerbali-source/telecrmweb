import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { loginUser } from '@/services/auth';
import { Lock, User, ChevronRight, Info, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Layout } from '@/constants/Colors';
import { networkLog } from '@/lib/supabase';
import Constants from 'expo-constants';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const { user, isLoading, login } = useAuth();
  const router = useRouter();

  const appVersion = Constants.expoConfig?.version || '1.0.7';

  useEffect(() => {
    if (user && !isLoading) {
      const timer = setTimeout(() => {
        try {
          if (user.role === 'admin') {
            router.replace('/admin');
          } else {
            router.replace('/sales');
          }
        } catch (error) {
          console.error('Navigation error:', error);
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [user, isLoading, router]);

  const handleTitleClick = () => {
    const nextCount = clickCount + 1;
    setClickCount(nextCount);
    if (nextCount >= 5) {
      setShowDiagnostics(true);
      setClickCount(0);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Please enter username and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const userData = await loginUser(username, password);
      await login(userData);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={[Colors.primary, '#4338ca', '#312e81']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.card}>
          <TouchableOpacity activeOpacity={1} onPress={handleTitleClick}>
            <View style={styles.headerContainer}>
              <Text style={styles.appName}>Nomadller Solutions</Text>
              <Text style={styles.tagline}>CRM & Sales Management</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.separator} />

          <Text style={styles.welcomeText}>Welcome Back</Text>

          <View style={styles.inputContainer}>
            <User size={20} color={Colors.text.tertiary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor={Colors.text.tertiary}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Lock size={20} color={Colors.text.tertiary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={Colors.text.tertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.text.inverse} />
            ) : (
              <View style={styles.buttonContent}>
                <Text style={styles.buttonText}>Login</Text>
                <ChevronRight size={20} color={Colors.text.inverse} />
              </View>
            )}
          </TouchableOpacity>

          <Text style={styles.versionLabel}>Version {appVersion}</Text>
        </View>

        <Text style={styles.copyright}>© 2024 Nomadller Solutions</Text>

        {showDiagnostics && (
          <View style={styles.diagnosticsOverlay}>
            <View style={styles.diagnosticsCard}>
              <View style={styles.diagHeader}>
                <Text style={styles.diagTitle}>Network Diagnostics</Text>
                <TouchableOpacity onPress={() => setShowDiagnostics(false)}>
                  <X size={24} color={Colors.text.primary} />
                </TouchableOpacity>
              </View>
              <ScrollView
                style={styles.diagScroll}
                contentContainerStyle={{ padding: 10 }}
              >
                {networkLog.length === 0 ? (
                  <Text style={styles.diagText}>No logs yet. Try logging in.</Text>
                ) : (
                  networkLog.map((log, i) => (
                    <Text key={i} style={styles.diagText}>{log}</Text>
                  ))
                )}
              </ScrollView>
              <TouchableOpacity
                style={styles.diagCloseBtn}
                onPress={() => setShowDiagnostics(false)}
              >
                <Text style={styles.diagCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Layout.spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.xl,
    paddingHorizontal: 32,
    paddingVertical: 40,
    ...Layout.shadows.lg,
    alignItems: 'center',
  },
  separator: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    marginBottom: Layout.spacing.xl,
  },
  welcomeText: {
    fontSize: 16,
    color: Colors.text.secondary,
    marginBottom: Layout.spacing.lg,
    fontWeight: '500',
    alignSelf: 'flex-start',
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Layout.radius.lg,
    marginBottom: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.md,
    backgroundColor: Colors.background,
    width: '100%',
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: Layout.radius.md,
    marginBottom: Layout.spacing.md,
    width: '100%',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  button: {
    backgroundColor: Colors.primary,
    height: 56,
    width: '100%',
    borderRadius: Layout.radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Layout.spacing.md,
    ...Layout.shadows.lg,
  },
  buttonDisabled: {
    backgroundColor: Colors.text.tertiary,
    shadowOpacity: 0.1,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: Colors.text.inverse,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  versionLabel: {
    marginTop: 20,
    fontSize: 12,
    color: Colors.text.tertiary,
    fontWeight: '600',
  },
  copyright: {
    position: 'absolute',
    bottom: 30,
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: Layout.spacing.lg,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 4,
  },
  tagline: {
    fontSize: 16,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  diagnosticsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 1000,
  },
  diagnosticsCard: {
    backgroundColor: 'white',
    width: '100%',
    maxHeight: '80%',
    borderRadius: 20,
    padding: 20,
  },
  diagHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  diagTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  diagScroll: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  diagText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    color: '#475569',
    marginBottom: 4,
  },
  diagCloseBtn: {
    marginTop: 15,
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  diagCloseText: {
    color: 'white',
    fontWeight: 'bold',
  }
});

