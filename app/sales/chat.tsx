import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { User, ChatMessage } from '@/types';
import { ArrowLeft, Send } from 'lucide-react-native';

export default function ChatScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<(ChatMessage & { sender?: User; receiver?: User })[]>([]);
  const [admins, setAdmins] = useState<User[]>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');

  useEffect(() => {
    fetchAdmins();
  }, []);

  useEffect(() => {
    if (selectedAdmin) {
      fetchMessages();
      const subscription = subscribeToMessages();
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [selectedAdmin]);

  const fetchAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'admin')
        .eq('status', 'active');

      if (error) throw error;
      setAdmins(data || []);
      if (data && data.length > 0) {
        setSelectedAdmin(data[0].id);
      }
    } catch (err: any) {
      console.error('Error fetching admins:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!selectedAdmin) return;

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          sender:users!sender_id(*),
          receiver:users!receiver_id(*)
        `)
        .or(`and(sender_id.eq.${user?.id},receiver_id.eq.${selectedAdmin}),and(sender_id.eq.${selectedAdmin},receiver_id.eq.${user?.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);

      const unreadMessages = data?.filter(
        (msg: ChatMessage) => msg.receiver_id === user?.id && !msg.is_read
      );

      if (unreadMessages && unreadMessages.length > 0) {
        await supabase
          .from('chat_messages')
          .update({ is_read: true })
          .in('id', unreadMessages.map((msg: ChatMessage) => msg.id));
      }

      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err: any) {
      console.error('Error fetching messages:', err);
    }
  };

  const subscribeToMessages = () => {
    return supabase
      .channel('chat_messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedAdmin) return;

    setSending(true);
    try {
      const { error } = await supabase.from('chat_messages').insert([
        {
          sender_id: user?.id,
          receiver_id: selectedAdmin,
          message: messageText.trim(),
          is_read: false,
        },
      ]);

      if (error) throw error;

      await supabase.from('notifications').insert([
        {
          user_id: selectedAdmin,
          type: 'message',
          title: 'New Message',
          message: `You have a new message from ${user?.full_name}: ${messageText.trim().substring(0, 50)}${messageText.trim().length > 50 ? '...' : ''}`,
        },
      ]);

      setMessageText('');
      fetchMessages();
    } catch (err: any) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <View style={styles.iconContainer}>
            <ArrowLeft size={24} color="#1a1a1a" />
          </View>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Chat with Admin</Text>
          {selectedAdmin && (
            <Text style={styles.headerSubtitle}>
              {admins.find(a => a.id === selectedAdmin)?.full_name}
            </Text>
          )}
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((message) => {
          const isMe = message.sender_id === user?.id;
          return (
            <View
              key={message.id}
              style={[
                styles.messageContainer,
                isMe ? styles.myMessageContainer : styles.theirMessageContainer,
              ]}
            >
              <View
                style={[
                  styles.messageBubble,
                  isMe ? styles.myMessageBubble : styles.theirMessageBubble,
                ]}
              >
                <Text style={[styles.messageText, isMe && styles.myMessageText]}>
                  {message.message}
                </Text>
                <Text style={[styles.messageTime, isMe && styles.myMessageTime]}>
                  {formatTime(message.created_at)}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={messageText}
          onChangeText={setMessageText}
          placeholder="Type a message..."
          multiline
          maxLength={500}
          returnKeyType="send"
          blurOnSubmit={false}
          editable={!sending}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!messageText.trim() || sending) && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!messageText.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Send size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    paddingTop: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  backButton: {
    padding: 4,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 12,
  },
  myMessageContainer: {
    alignItems: 'flex-end',
  },
  theirMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
  },
  myMessageBubble: {
    backgroundColor: '#3b82f6',
    borderBottomRightRadius: 4,
  },
  theirMessageBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    color: '#1a1a1a',
    marginBottom: 4,
  },
  myMessageText: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 11,
    color: '#666',
  },
  myMessageTime: {
    color: '#e0f2fe',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
});
