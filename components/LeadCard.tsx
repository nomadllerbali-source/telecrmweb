import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MapPin, Users, Calendar, DollarSign, Phone, MessageCircle, Flame, AlertCircle } from 'lucide-react-native';
import { Lead } from '@/types';
import * as Linking from 'expo-linking';
import { Colors, Layout } from '@/constants/Colors';

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
        return Colors.status.error;
      case 'urgent':
        return Colors.status.warning;
      default:
        return Colors.status.info;
    }
  };

  const getLeadTypeBadge = () => {
    const color = getLeadTypeColor();
    if (lead.lead_type === 'hot') {
      return (
        <View style={[styles.badge, { backgroundColor: color + '20' }]}>
          <Flame size={12} color={color} />
          <Text style={[styles.badgeText, { color: color }]}>HOT LEAD</Text>
        </View>
      );
    }
    if (lead.lead_type === 'urgent') {
      return (
        <View style={[styles.badge, { backgroundColor: color + '20' }]}>
          <AlertCircle size={12} color={color} />
          <Text style={[styles.badgeText, { color: color }]}>URGENT</Text>
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
          <View style={styles.phoneContainer}>
            <Phone size={12} color={Colors.text.tertiary} />
            <Text style={styles.phone}>{lead.contact_number}</Text>
          </View>
        )}
      </View>

      <View style={styles.details}>
        <View style={styles.detailGrid}>
          <View style={styles.detailRow}>
            <MapPin size={14} color={Colors.primary} />
            <Text style={styles.detailText} numberOfLines={1}>{lead.place}</Text>
          </View>
          <View style={styles.detailRow}>
            <Users size={14} color={Colors.text.tertiary} />
            <Text style={styles.detailText}>{lead.no_of_pax} Pax</Text>
          </View>
        </View>

        <View style={styles.detailGrid}>
          {(lead.travel_date || lead.travel_month) && (
            <View style={styles.detailRow}>
              <Calendar size={14} color={Colors.text.tertiary} />
              <Text style={styles.detailText}>
                {lead.travel_date ? formatDate(lead.travel_date) : lead.travel_month}
              </Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <DollarSign size={14} color={Colors.secondary} />
            <Text style={[styles.detailText, { color: Colors.text.primary, fontWeight: '700' }]}>
              ₹{lead.expected_budget || 0}
            </Text>
          </View>
        </View>
      </View>

      {showActions && lead.contact_number && (
        <View style={styles.actions}>
          {onCall && (
            <TouchableOpacity style={[styles.actionButton, styles.callButton]} onPress={onCall}>
              <Phone size={16} color={Colors.background} />
              <Text style={styles.actionButtonText}>Call</Text>
            </TouchableOpacity>
          )}
          {onWhatsApp && (
            <TouchableOpacity style={[styles.actionButton, styles.whatsappButton]} onPress={onWhatsApp}>
              <MessageCircle size={16} color={Colors.background} />
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
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.lg,
    padding: 16,
    marginBottom: 12,
    ...Layout.shadows.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  clientName: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.text.primary,
    flex: 1,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  phone: {
    fontSize: 12,
    color: Colors.text.tertiary,
    fontWeight: '600',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Layout.radius.sm,
    gap: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  details: {
    gap: 10,
    marginBottom: 12,
  },
  detailGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  detailRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingTop: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: Layout.radius.md,
    gap: 8,
  },
  callButton: {
    backgroundColor: Colors.secondary,
  },
  whatsappButton: {
    backgroundColor: Colors.primary,
  },
  actionButtonText: {
    color: Colors.background,
    fontSize: 14,
    fontWeight: '700',
  },
});
