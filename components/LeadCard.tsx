import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MapPin, Users, Calendar, DollarSign, Phone, MessageCircle, Flame, AlertCircle } from 'lucide-react-native';
import { Lead } from '@/types';
import * as Linking from 'expo-linking';

interface LeadCardProps {
  lead: Lead;
  onPress?: () => void;
  onCall?: () => void;
  onWhatsApp?: () => void;
  showActions?: boolean;
}

export default function LeadCard({ lead, onPress, onCall, onWhatsApp, showActions = false }: LeadCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getLeadTypeColor = () => {
    switch (lead.lead_type) {
      case 'hot':
        return '#ef4444';
      case 'urgent':
        return '#f97316';
      default:
        return '#3b82f6';
    }
  };

  const getLeadTypeBadge = () => {
    if (lead.lead_type === 'hot') {
      return (
        <View style={[styles.badge, { backgroundColor: '#fee2e2' }]}>
          <Flame size={14} color="#ef4444" />
          <Text style={[styles.badgeText, { color: '#ef4444' }]}>Hot Lead</Text>
        </View>
      );
    }
    if (lead.lead_type === 'urgent') {
      return (
        <View style={[styles.badge, { backgroundColor: '#ffedd5' }]}>
          <AlertCircle size={14} color="#f97316" />
          <Text style={[styles.badgeText, { color: '#f97316' }]}>Urgent</Text>
        </View>
      );
    }
    return null;
  };

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: getLeadTypeColor(), borderLeftWidth: 4 }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.clientName}>{lead.client_name}</Text>
          {getLeadTypeBadge()}
        </View>
        {lead.contact_number && (
          <Text style={styles.phone}>{lead.contact_number}</Text>
        )}
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <MapPin size={16} color="#666" />
          <Text style={styles.detailText}>{lead.place}</Text>
        </View>
        <View style={styles.detailRow}>
          <Users size={16} color="#666" />
          <Text style={styles.detailText}>{lead.no_of_pax} Pax</Text>
        </View>
        {(lead.travel_date || lead.travel_month) && (
          <View style={styles.detailRow}>
            <Calendar size={16} color="#666" />
            <Text style={styles.detailText}>
              {lead.travel_date ? formatDate(lead.travel_date) : lead.travel_month}
            </Text>
          </View>
        )}
        {lead.expected_budget > 0 && (
          <View style={styles.detailRow}>
            <DollarSign size={16} color="#666" />
            <Text style={styles.detailText}>₹{lead.expected_budget}</Text>
          </View>
        )}
      </View>

      {showActions && lead.contact_number && (
        <View style={styles.actions}>
          {onCall && (
            <TouchableOpacity style={[styles.actionButton, styles.callButton]} onPress={onCall}>
              <Phone size={18} color="#fff" />
              <Text style={styles.actionButtonText}>Call</Text>
            </TouchableOpacity>
          )}
          {onWhatsApp && (
            <TouchableOpacity style={[styles.actionButton, styles.whatsappButton]} onPress={onWhatsApp}>
              <MessageCircle size={18} color="#fff" />
              <Text style={styles.actionButtonText}>WhatsApp</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    marginBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  clientName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  phone: {
    fontSize: 13,
    color: '#666',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  details: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  callButton: {
    backgroundColor: '#10b981',
  },
  whatsappButton: {
    backgroundColor: '#3b82f6',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
