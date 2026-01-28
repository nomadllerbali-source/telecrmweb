import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Lead } from '@/types';
import { ArrowLeft, MapPin, Users, Calendar, Briefcase, DollarSign, FileText } from 'lucide-react-native';

interface FollowUp {
  id: string;
  action_type: string;
  created_at: string;
  follow_up_note: string;
  next_follow_up_date: string;
  next_follow_up_time: string;
  itinerary_id: string;
  total_amount: number;
  advance_amount: number;
  due_amount: number;
}

export default function LeadDetailScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { leadId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [lead, setLead] = useState<Lead | null>(null);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);

  useEffect(() => {
    fetchLeadDetails();
  }, [leadId]);

  const fetchLeadDetails = async () => {
    try {
      const [{ data: leadData }, { data: followUpData }] = await Promise.all([
        supabase.from('leads').select('*').eq('id', leadId).maybeSingle(),
        supabase
          .from('follow_ups')
          .select('*')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false })
      ]);

      if (leadData) setLead(leadData);
      if (followUpData) setFollowUps(followUpData);
    } catch (err: any) {
      console.error('Error fetching lead details:', err);
    } finally {
      setLoading(false);
    }
  };

  const getLatestFollowUp = () => {
    return followUps.length > 0 ? followUps[0] : null;
  };

  const latest = getLatestFollowUp();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  if (!lead) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <View style={styles.iconContainer}>
              <ArrowLeft size={24} color="#1a1a1a" />
            </View>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Lead Details</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Lead not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <View style={styles.iconContainer}>
            <ArrowLeft size={24} color="#1a1a1a" />
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lead Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.card}>
          <Text style={styles.clientName}>{lead.client_name}</Text>
          <Text style={styles.contactNumber}>{lead.contact_number || 'No contact'}</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            <View style={styles.detailRow}>
              <MapPin size={16} color="#8b5cf6" />
              <Text style={styles.detailLabel}>Location:</Text>
              <Text style={styles.detailValue}>{lead.place}</Text>
            </View>
            <View style={styles.detailRow}>
              <Users size={16} color="#8b5cf6" />
              <Text style={styles.detailLabel}>Travelers:</Text>
              <Text style={styles.detailValue}>{lead.no_of_pax} Pax</Text>
            </View>
            <View style={styles.detailRow}>
              <Calendar size={16} color="#8b5cf6" />
              <Text style={styles.detailLabel}>Travel Date:</Text>
              <Text style={styles.detailValue}>
                {lead.travel_date || lead.travel_month || 'Date TBD'}
              </Text>
            </View>
            {lead.expected_budget && (
              <View style={styles.detailRow}>
                <DollarSign size={16} color="#8b5cf6" />
                <Text style={styles.detailLabel}>Budget:</Text>
                <Text style={styles.detailValue}>₹{lead.expected_budget}</Text>
              </View>
            )}
            {lead.remark && (
              <View style={styles.detailRow}>
                <FileText size={16} color="#8b5cf6" />
                <Text style={styles.detailLabel}>Remark:</Text>
              </View>
            )}
            {lead.remark && (
              <Text style={styles.remarkText}>{lead.remark}</Text>
            )}
          </View>

          {latest && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Financial Information</Text>
              {latest.itinerary_id && (
                <View style={styles.detailRow}>
                  <FileText size={16} color="#8b5cf6" />
                  <Text style={styles.detailLabel}>Itinerary Code:</Text>
                  <Text style={styles.detailValue}>{latest.itinerary_id}</Text>
                </View>
              )}
              {latest.total_amount && (
                <View style={styles.amountBox}>
                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>Total Amount:</Text>
                    <Text style={styles.amountValue}>₹{latest.total_amount}</Text>
                  </View>
                </View>
              )}
              {latest.advance_amount !== null && (
                <View style={styles.amountBox}>
                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>Advance Paid:</Text>
                    <Text style={styles.amountValue}>₹{latest.advance_amount}</Text>
                  </View>
                </View>
              )}
              {latest.due_amount !== null && (
                <View style={styles.amountBox}>
                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>Due Amount:</Text>
                    <Text style={[styles.amountValue, styles.dueAmount]}>₹{latest.due_amount}</Text>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>

        {followUps.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>All Follow-Ups ({followUps.length})</Text>
            {followUps.map((followUp, index) => (
              <View key={followUp.id} style={[styles.followUpItem, index !== followUps.length - 1 && styles.followUpItemBorder]}>
                <View style={styles.followUpHeader}>
                  <Text style={styles.followUpType}>{followUp.action_type || 'Follow-up'}</Text>
                  <Text style={styles.followUpDate}>
                    {new Date(followUp.created_at).toLocaleDateString()}
                  </Text>
                </View>
                {followUp.follow_up_note && (
                  <Text style={styles.followUpNote}>{followUp.follow_up_note}</Text>
                )}
                {followUp.next_follow_up_date && (
                  <Text style={styles.followUpNext}>
                    Next: {new Date(followUp.next_follow_up_date).toLocaleDateString()}
                    {followUp.next_follow_up_time ? ` at ${followUp.next_follow_up_time.slice(0, 5)}` : ''}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  clientName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  contactNumber: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  section: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8b5cf6',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
    minWidth: 110,
  },
  detailValue: {
    fontSize: 13,
    color: '#1a1a1a',
    fontWeight: '500',
    flex: 1,
  },
  remarkText: {
    fontSize: 13,
    color: '#1a1a1a',
    marginLeft: 24,
    marginBottom: 12,
    lineHeight: 18,
  },
  amountBox: {
    backgroundColor: '#f9f5ff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#8b5cf6',
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
  },
  amountValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  dueAmount: {
    color: '#d97706',
  },
  followUpItem: {
    paddingVertical: 12,
  },
  followUpItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  followUpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  followUpType: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8b5cf6',
    textTransform: 'uppercase',
  },
  followUpDate: {
    fontSize: 12,
    color: '#999',
  },
  followUpNote: {
    fontSize: 13,
    color: '#1a1a1a',
    marginBottom: 6,
    lineHeight: 18,
  },
  followUpNext: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
});
