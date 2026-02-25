import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { User, ChatMessage } from '@/types';
import { ArrowLeft, Send, MessageCircle, MoreVertical, Search, CheckCheck } from 'lucide-react-native';
import { Colors, Layout } from '@/constants/Colors';

export default function AdminChatScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<(ChatMessage & { sender?: User; receiver?: User })[]>([]);
  const [salesPersons, setSalesPersons] = useState<User[]>([]);
  const [selectedSalesPerson, setSelectedSalesPerson] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');

  useEffect(() => {
    fetchSalesPersons();
  }, []);

  useEffect(() => {
    if (selectedSalesPerson) {
      fetchMessages();
      const subscription = subscribeToMessages();
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [selectedSalesPerson]);

  const fetchSalesPersons = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'sales')
        .eq('status', 'active');

      if (error) throw error;
      setSalesPersons(data || []);
      if (data && data.length > 0 && !selectedSalesPerson) {
        setSelectedSalesPerson(data[0].id);
      }
    } catch (err: any) {
      console.error('Error fetching sales persons:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!selectedSalesPerson) return;

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          sender:users!sender_id(*),
          receiver:users!receiver_id(*)
        `)
        .or(`and(sender_id.eq.${user?.id},receiver_id.eq.${selectedSalesPerson}),and(sender_id.eq.${selectedSalesPerson},receiver_id.eq.${user?.id})`)
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
      .channel('admin_chat_messages')
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
    if (!messageText.trim() || !selectedSalesPerson) return;

    setSending(true);
    try {
      const { error } = await supabase.from('chat_messages').insert([
        {
          sender_id: user?.id,
          receiver_id: selectedSalesPerson,
          message: messageText.trim(),
          is_read: false,
        },
      ]);

      if (error) throw error;

      await supabase.from('notifications').insert([
        {
          user_id: selectedSalesPerson,
          type: 'message',
          title: 'New Message from Admin',
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

  const selectedPerson = salesPersons.find(p => p.id === selectedSalesPerson);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <View style={styles.iconButton}>
            <ArrowLeft size={24} color={Colors.text.primary} />
          </View>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Team Chat</Text>
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Admin Center</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.iconButton}>
          <MoreVertical size={20} color={Colors.text.secondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.mainContainer}>
        {/* Sidebar */}
        <View style={styles.sidebar}>
          <View style={styles.sidebarHeader}>
            <View style={styles.sidebarSearch}>
              <Search size={16} color={Colors.text.tertiary} />
              <TextInput
                placeholder="Search team..."
                placeholderTextColor={Colors.text.tertiary}
                style={styles.sidebarSearchInput}
              />
            </View>
          </View>
          <ScrollView style={styles.sidebarList}>
            {salesPersons.map((person) => (
              <TouchableOpacity
                key={person.id}
                style={[
                  styles.personItem,
                  selectedSalesPerson === person.id && styles.personItemActive,
                ]}
                onPress={() => setSelectedSalesPerson(person.id)}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{person.full_name?.charAt(0)}</Text>
                  <View style={styles.onlineBadge} />
                </View>
                {selectedSalesPerson === person.id && <View style={styles.activeIndicator} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Chat Area */}
        <View style={styles.chatArea}>
          {!selectedSalesPerson ? (
            <View style={styles.emptyState}>
              <MessageCircle size={64} color={Colors.surfaceHighlight} />
              <Text style={styles.emptyTitle}>Your Workspace</Text>
              <Text style={styles.emptySubtitle}>Select a team member to start a secure conversation.</Text>
            </View>
          ) : (
            <KeyboardAvoidingView
              style={styles.chatContent}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
              <View style={styles.chatHeader}>
                <View>
                  <Text style={styles.chatWith}>{selectedPerson?.full_name}</Text>
                  <Text style={styles.chatStatus}>Sales Executive</Text>
                </View>
              </View>

              <ScrollView
                ref={scrollViewRef}
                style={styles.messagesContainer}
                contentContainerStyle={styles.messagesContent}
                onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
              >
                {messages.length === 0 ? (
                  <View style={styles.firstMessageInfo}>
                    <CheckCheck size={20} color={Colors.primary} />
                    <Text style={styles.firstMessageText}>End-to-end encrypted chat</Text>
                  </View>
                ) : null}
                {messages.map((message) => {
                  const isMe = message.sender_id === user?.id;
                  return (
                    <View
                      key={message.id}
                      style={[
                        styles.messageRow,
                        isMe ? styles.myMessageRow : styles.theirMessageRow,
                      ]}
                    >
                      <View
                        style={[
                          styles.bubble,
                          isMe ? styles.myBubble : styles.theirBubble,
                        ]}
                      >
                        <Text style={[styles.messageText, isMe && styles.myMessageText]}>
                          {message.message}
                        </Text>
                        <View style={styles.bubbleFooter}>
                          <Text style={[styles.timeText, isMe && styles.myTimeText]}>
                            {formatTime(message.created_at)}
                          </Text>
                          {isMe && <CheckCheck size={12} color={message.is_read ? Colors.primaryLight : Colors.text.tertiary} />}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>

              <View style={styles.inputBar}>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={messageText}
                    onChangeText={setMessageText}
                    placeholder="Message..."
                    placeholderTextColor={Colors.text.tertiary}
                    multiline
                    maxLength={500}
                    editable={!sending}
                  />
                  <TouchableOpacity
                    style={[styles.sendButton, !messageText.trim() && { opacity: 0.5 }]}
                    onPress={sendMessage}
                    disabled={!messageText.trim() || sending}
                  >
                    {sending ? (
                      <ActivityIndicator size="small" color={Colors.text.inverse} />
                    ) : (
                      <Send size={18} color={Colors.text.inverse} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Layout.spacing.lg,
    paddingTop: 60,
    paddingBottom: Layout.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    marginLeft: -Layout.spacing.sm,
  },
  iconButton: {
    padding: 8,
    borderRadius: Layout.radius.full,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerInfo: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.status.success,
  },
  statusText: {
    fontSize: 10,
    color: Colors.text.tertiary,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  mainContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 80,
    backgroundColor: Colors.surface,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  sidebarHeader: {
    padding: 12,
    alignItems: 'center',
  },
  sidebarSearch: {
    display: 'none', // Hide for now in compact sidebar
  },
  sidebarList: {
    flex: 1,
  },
  personItem: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  personItemActive: {
    backgroundColor: Colors.surfaceHighlight,
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: '25%',
    height: '50%',
    width: 3,
    backgroundColor: Colors.primary,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.status.success,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  chatArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: 20,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.text.tertiary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    padding: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  chatWith: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  chatStatus: {
    fontSize: 12,
    color: Colors.text.tertiary,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 20,
    gap: 16,
  },
  firstMessageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceHighlight,
    padding: 10,
    borderRadius: Layout.radius.md,
    marginBottom: 20,
  },
  firstMessageText: {
    fontSize: 12,
    color: Colors.text.secondary,
    fontWeight: '600',
  },
  messageRow: {
    flexDirection: 'row',
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  theirMessageRow: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '85%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    ...Layout.shadows.sm,
  },
  myBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  messageText: {
    fontSize: 15,
    color: Colors.text.primary,
    lineHeight: 22,
  },
  myMessageText: {
    color: Colors.text.inverse,
  },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 4,
  },
  timeText: {
    fontSize: 10,
    color: Colors.text.tertiary,
    fontWeight: '600',
  },
  myTimeText: {
    color: Colors.text.inverse + '80',
  },
  inputBar: {
    padding: 20,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.surface,
    borderRadius: 24,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  input: {
    flex: 1,
    color: Colors.text.primary,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxHeight: 120,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  sidebarSearchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text.primary,
    marginLeft: 8,
    height: '100%',
  },
});
