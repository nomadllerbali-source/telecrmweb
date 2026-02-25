import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, LayoutAnimation, Image } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { loginUser } from '@/services/auth';
import { Lock, User, Briefcase, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Layout } from '@/constants/Colors';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user, isLoading, login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && !isLoading) {
      // Delay navigation slightly to ensure router is ready
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
      colors={[Colors.primary, '#4338ca', '#312e81']} // Indigo gradient from Colors
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.card}>
          <View style={styles.headerContainer}>
            <Text style={styles.appName}>Nomadller Solutions</Text>
            <Text style={styles.tagline}>CRM & Sales Management</Text>
          </View>

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
        </View>

        <Text style={styles.copyright}>© 2024 Nomadller Solutions</Text>
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
  logoContainer: {
    marginBottom: Layout.spacing.md,
  },
  logo: {
    width: 280,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -20,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text.primary,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 24,
    fontWeight: '300',
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Layout.spacing.lg,
    marginTop: -4,
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
});

