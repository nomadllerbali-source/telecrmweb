import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Linking, Modal } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Lead } from '@/types';
import { ArrowLeft, Calendar, Clock, Phone, MessageCircle, X, History } from 'lucide-react-native';
import { Colors, Layout } from '@/constants/Colors';

interface FollowUpWithLead {
  id: string;
  follow_up_date: string;
  status: string;
  follow_up_note: string;
  lead: {
    id: string;
    client_name: string;
    place: string;
    no_of_pax: number;
    contact_number: string | null;
  };
}

interface FollowUpHistory {
  id: string;
  action_type: string;
  follow_up_note: string;
  created_at: string;
  next_follow_up_date: string | null;
  next_follow_up_time: string | null;
  itinerary_id: string | null;
  total_amount: number | null;
  advance_amount: number | null;
  due_amount: number | null;
  transaction_id: string | null;
  dead_reason: string | null;
}

export default function AlmostConfirmedLeadsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [followUps, setFollowUps] = useState<FollowUpWithLead[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [currentLead, setCurrentLead] = useState<any | null>(null);
  const [followUpHistory, setFollowUpHistory] = useState<FollowUpHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    fetchAlmostConfirmedLeads();
  }, [user?.id]);

  const fetchAlmostConfirmedLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('follow_ups')
        .select(`
          *,
          lead:leads(id, client_name, place, no_of_pax, contact_number)
        `)
        .eq('sales_person_id', user?.id)
        .eq('action_type', 'almost_confirmed')
        .order('follow_up_date', { ascending: true });

      if (error) throw error;
      setFollowUps(data || []);
    } catch (err: any) {
      console.error('Error fetching almost confirmed leads:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  };

  const handleFollowUp = async (followUp: FollowUpWithLead) => {
    const { data: leadData } = await supabase
      .from('leads')
      .select('*')
      .eq('id', followUp.lead.id)
      .maybeSingle();

    if (leadData) {
      setCurrentLead(leadData);
      await fetchFollowUpHistory(followUp.lead.id);
      setShowHistoryModal(true);
    }
  };

  const fetchFollowUpHistory = async (leadId: string) => {
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('follow_ups')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFollowUpHistory(data || []);
    } catch (err: any) {
      console.error('Error fetching follow-up history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleCall = (phoneNumber: string, lead: any) => {
    const url = `tel:${phoneNumber}`;
    Linking.openURL(url).catch((err) => {
      console.error('Error opening dialer:', err);
    });
  };

  const handleWhatsApp = (phoneNumber: string, clientName: string, place: string) => {
    const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
    const message = `Hello ${clientName}, I'm reaching out regarding your travel inquiry for ${place}.`;
    const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch((err) => {
      console.error('Error opening WhatsApp:', err);
    });
  };

  const formatHistoryDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getActionTypeLabel = (actionType: string) => {
    const actionTypes: { [key: string]: string } = {
      'itinerary_sent': 'Itinerary Sent',
      'itinerary_updated': 'Itinerary Updated',
      'follow_up': 'Follow Up',
      'almost_confirmed': 'Almost Confirmed',
      'confirmed_advance_paid': 'Confirm and Advance Paid',
      'dead': 'Dead',
    };
    return actionTypes[actionType] || actionType;
  };

  const handleCloseHistoryModal = () => {
    setShowHistoryModal(false);
    setCurrentLead(null);
    setFollowUpHistory([]);
  };

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
          <View style={styles.iconContainer}>
            <ArrowLeft size={24} color={Colors.text.primary} />
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Almost Confirmed Leads</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {followUps.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No almost confirmed leads</Text>
          </View>
        ) : (
          followUps.map((followUp) => {
            const { date, time } = formatDateTime(followUp.follow_up_date);
            return (
              <View
                key={followUp.id}
                style={styles.followUpCard}
              >
                <View style={styles.followUpHeader}>
                  <Text style={styles.leadName}>{followUp.lead.client_name}</Text>
                </View>

                <View style={styles.followUpDetails}>
                  <Text style={styles.leadDetail}>
                    {followUp.lead.place} - {followUp.lead.no_of_pax} Pax
                  </Text>

                  <View style={styles.dateTimeRow}>
                    <View style={styles.dateTimeItem}>
                      <View style={styles.dateTimeContent}>
                        <View style={styles.iconContainer}>
                          <Calendar size={14} color={Colors.text.secondary} />
                        </View>
                        <Text style={styles.dateTimeText}>{date}</Text>
                      </View>
                    </View>
                    <View style={styles.dateTimeItem}>
                      <View style={styles.dateTimeContent}>
                        <View style={styles.iconContainer}>
                          <Clock size={14} color={Colors.text.secondary} />
                        </View>
                        <Text style={styles.dateTimeText}>{time}</Text>
                      </View>
                    </View>
                  </View>

                  {followUp.follow_up_note && (
                    <View style={styles.remarkContainer}>
                      <Text style={styles.remarkText}>{followUp.follow_up_note}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.cardActionButtons}>
                  <TouchableOpacity
                    style={styles.cardActionButton}
                    onPress={() => handleFollowUp(followUp)}
                  >
                    <View style={styles.buttonIconContainer}>
                      <History size={16} color={Colors.primary} />
                    </View>
                    <Text style={styles.cardActionButtonText}>History</Text>
                  </TouchableOpacity>
                  {followUp.lead.contact_number && (
                    <TouchableOpacity
                      style={styles.cardActionButton}
                      onPress={() => handleWhatsApp(followUp.lead.contact_number!, followUp.lead.client_name, followUp.lead.place)}
                    >
                      <View style={styles.buttonIconContainer}>
                        <MessageCircle size={16} color="#25D366" />
                      </View>
                      <Text style={styles.cardActionButtonText}>WhatsApp</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.cardActionButton}
                    onPress={() => handleCall(followUp.lead.contact_number || '', followUp.lead)}
                  >
                    <View style={styles.buttonIconContainer}>
                      <Phone size={16} color={Colors.status.error} />
                    </View>
                    <Text style={styles.cardActionButtonText}>Call</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={showHistoryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseHistoryModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Follow-Up History</Text>
              <TouchableOpacity onPress={handleCloseHistoryModal}>
                <View style={styles.iconContainer}>
                  <X size={24} color={Colors.text.primary} />
                </View>
              </TouchableOpacity>
            </View>

            {currentLead && (
              <View style={styles.leadInfo}>
                <View style={styles.leadInfoHeader}>
                  <View style={styles.leadInfoText}>
                    <Text style={styles.leadInfoName}>{currentLead.client_name}</Text>
                    <Text style={styles.leadInfoDetail}>{currentLead.place} • {currentLead.no_of_pax} Pax</Text>
                    {currentLead.contact_number && (
                      <Text style={styles.leadInfoContact}>{currentLead.contact_number}</Text>
                    )}
                  </View>
                  {currentLead.contact_number && (
                    <View style={styles.leadInfoActions}>
                      <TouchableOpacity
                        style={styles.leadInfoActionButton}
                        onPress={() => handleCall(currentLead.contact_number, currentLead)}
                      >
                        <Phone size={18} color={Colors.text.inverse} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.leadInfoActionButton, styles.whatsappButton]}
                        onPress={() => handleWhatsApp(currentLead.contact_number, currentLead.client_name, currentLead.place)}
                      >
                        <MessageCircle size={18} color={Colors.text.inverse} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            )}

            <ScrollView style={styles.historyScroll} contentContainerStyle={styles.historyScrollContent} keyboardShouldPersistTaps="handled">
              {historyLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                </View>
              ) : followUpHistory.length === 0 ? (
                <View style={styles.emptyHistoryContainer}>
                  <View style={styles.iconContainer}>
                    <History size={48} color={Colors.text.tertiary} />
                  </View>
                  <Text style={styles.emptyHistoryText}>No follow-up history</Text>
                </View>
              ) : (
                followUpHistory.map((history) => (
                  <View key={history.id} style={styles.historyCard}>
                    <View style={styles.historyHeader}>
                      <Text style={styles.historyActionType}>{getActionTypeLabel(history.action_type)}</Text>
                      <Text style={styles.historyDate}>{formatHistoryDate(history.created_at)}</Text>
                    </View>

                    {history.follow_up_note && (
                      <View style={styles.historyNote}>
                        <Text style={styles.historyNoteLabel}>Note:</Text>
                        <Text style={styles.historyNoteText}>{history.follow_up_note}</Text>
                      </View>
                    )}

                    {history.next_follow_up_date && (
                      <View style={styles.historyDetail}>
                        <View style={styles.historyDetailRow}>
                          <View style={styles.iconContainer}>
                            <Calendar size={14} color={Colors.text.secondary} />
                          </View>
                          <Text style={styles.historyDetailText}>
                            {`Next Follow-Up: ${new Date(history.next_follow_up_date).toLocaleDateString()}${history.next_follow_up_time ? ` at ${history.next_follow_up_time.slice(0, 5)}` : ''}`}
                          </Text>
                        </View>
                      </View>
                    )}

                    {history.itinerary_id && (
                      <View style={styles.historyDetail}>
                        <Text style={styles.historyDetailLabel}>Itinerary ID:</Text>
                        <Text style={styles.historyDetailValue}>{history.itinerary_id}</Text>
                      </View>
                    )}

                    {history.total_amount && (
                      <View style={styles.historyAmounts}>
                        <View style={styles.historyAmountRow}>
                          <Text style={styles.historyAmountLabel}>Total:</Text>
                          <Text style={styles.historyAmountValue}>₹{history.total_amount}</Text>
                        </View>
                        <View style={styles.historyAmountRow}>
                          <Text style={styles.historyAmountLabel}>Advance:</Text>
                          <Text style={styles.historyAmountValue}>₹{history.advance_amount}</Text>
                        </View>
                        <View style={styles.historyAmountRow}>
                          <Text style={styles.historyAmountLabel}>Due:</Text>
                          <Text style={[styles.historyAmountValue, styles.dueAmountText]}>₹{history.due_amount}</Text>
                        </View>
                      </View>
                    )}

                    {history.transaction_id && (
                      <View style={styles.historyDetail}>
                        <Text style={styles.historyDetailLabel}>Transaction ID:</Text>
                        <Text style={styles.historyDetailValue}>{history.transaction_id}</Text>
                      </View>
                    )}

                    {history.dead_reason && (
                      <View style={styles.historyDetail}>
                        <Text style={styles.historyDetailLabel}>Reason:</Text>
                        <Text style={styles.historyDetailValue}>{history.dead_reason}</Text>
                      </View>
                    )}
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    padding: 4,
    borderRadius: Layout.radius.full,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Layout.spacing.lg,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
  followUpCard: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.xl,
    padding: Layout.spacing.lg,
    marginBottom: 16,
    ...Layout.shadows.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  followUpHeader: {
    marginBottom: 8,
  },
  leadName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  followUpDetails: {
    gap: 8,
  },
  leadDetail: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 16,
  },
  dateTimeItem: {
    flex: 1,
  },
  dateTimeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateTimeText: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  remarkContainer: {
    backgroundColor: Colors.surfaceHighlight,
    padding: 12,
    borderRadius: Layout.radius.lg,
    marginTop: 4,
  },
  remarkText: {
    fontSize: 14,
    color: Colors.text.primary,
  },
  cardActionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  cardActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: Layout.radius.lg,
    backgroundColor: Colors.background,
  },
  buttonIconContainer: {
    marginRight: 6,
  },
  cardActionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Layout.spacing.xl,
    maxHeight: '85%',
    ...Layout.shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  leadInfo: {
    backgroundColor: Colors.surfaceHighlight,
    padding: 12,
    borderRadius: Layout.radius.lg,
    marginBottom: 20,
  },
  leadInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  leadInfoText: {
    flex: 1,
    marginRight: 12,
  },
  leadInfoName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  leadInfoDetail: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  leadInfoContact: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
  },
  leadInfoActions: {
    flexDirection: 'row',
    gap: 8,
  },
  leadInfoActionButton: {
    width: 40,
    height: 40,
    borderRadius: Layout.radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Layout.shadows.sm,
  },
  whatsappButton: {
    backgroundColor: '#25D366',
  },
  historyScroll: {
    flex: 1,
  },
  historyScrollContent: {
    paddingBottom: 20,
  },
  emptyHistoryContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyHistoryText: {
    fontSize: 16,
    color: Colors.text.tertiary,
    marginTop: 16,
  },
  historyCard: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  historyActionType: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    flex: 1,
  },
  historyDate: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginLeft: 8,
  },
  historyNote: {
    backgroundColor: Colors.surfaceHighlight,
    padding: 12,
    borderRadius: Layout.radius.md,
    marginBottom: 12,
  },
  historyNoteLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 4,
  },
  historyNoteText: {
    fontSize: 14,
    color: Colors.text.primary,
    lineHeight: 20,
  },
  historyDetail: {
    marginBottom: 8,
  },
  historyDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyDetailText: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  historyDetailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: 2,
  },
  historyDetailValue: {
    fontSize: 14,
    color: Colors.text.primary,
  },
  historyAmounts: {
    backgroundColor: Colors.surfaceHighlight,
    padding: 12,
    borderRadius: Layout.radius.md,
    marginBottom: 8,
  },
  historyAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyAmountLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  historyAmountValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  dueAmountText: {
    color: Colors.primary,
  },
});
