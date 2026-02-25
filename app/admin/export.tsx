import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Download, FileText, CheckCircle2, CloudDownload, ChevronRight } from 'lucide-react-native';
import { Paths, File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Colors, Layout } from '@/constants/Colors';

export default function ExportScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activeExport, setActiveExport] = useState<'leads' | 'confirmations' | null>(null);

  const exportData = async (type: 'leads' | 'confirmations') => {
    setLoading(true);
    setActiveExport(type);
    try {
      let data: any[] = [];
      let filename = '';

      if (type === 'leads') {
        const { data: leadsData, error } = await supabase
          .from('leads')
          .select(`
            *,
            sales_person:users!assigned_to(full_name, email),
            admin:users!assigned_by(full_name)
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;
        data = leadsData || [];
        filename = 'leads_export.csv';
      } else {
        const { data: confirmationsData, error } = await supabase
          .from('confirmations')
          .select(`
            *,
            lead:leads(client_name, place),
            sales_person:users(full_name, email)
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;
        data = confirmationsData || [];
        filename = 'confirmations_export.csv';
      }

      if (data.length === 0) {
        Alert.alert('No Data', 'There is no data to export');
        return;
      }

      let csvContent = '';
      if (type === 'leads') {
        csvContent = 'ID,Client Name,Lead Type,No of Pax,Place,Travel Date,Expected Budget,Status,Source,Sales Person,Created At\n';
        data.forEach((item: any) => {
          csvContent += `${item.id},${item.client_name},${item.lead_type},${item.no_of_pax},${item.place},${item.travel_date || item.travel_month || 'N/A'},${item.expected_budget},${item.status},${item.lead_source || 'N/A'},${item.sales_person?.full_name || 'N/A'},${item.created_at}\n`;
        });
      } else {
        csvContent = 'ID,Client Name,Place,Total Amount,Advance Amount,Transaction ID,Itinerary ID,Travel Date,Sales Person,Created At\n';
        data.forEach((item: any) => {
          csvContent += `${item.id},${item.lead?.client_name || 'N/A'},${item.lead?.place || 'N/A'},${item.total_amount},${item.advance_amount},${item.transaction_id},${item.itinerary_id},${item.travel_date},${item.sales_person?.full_name || 'N/A'},${item.created_at}\n`;
        });
      }

      const file = new File(Paths.document, filename);
      await file.write(csvContent);

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(file.uri);
      } else {
        Alert.alert('Success', `File saved to ${file.uri}`);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to export data');
    } finally {
      setLoading(false);
      setActiveExport(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <View style={styles.iconButton}>
            <ArrowLeft size={24} color={Colors.text.primary} />
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Data Export Center</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.infoBox}>
          <Text style={styles.description}>
            Download your business data as CSV files for analysis. Files can be opened in Excel, Google Sheets, or Numbers.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Available Reports</Text>

        <TouchableOpacity
          style={[styles.exportCard, loading && styles.exportCardDisabled]}
          onPress={() => exportData('leads')}
          disabled={loading}
        >
          <View style={[styles.iconContainer, { backgroundColor: Colors.primary + '15' }]}>
            <FileText size={28} color={Colors.primary} />
          </View>
          <View style={styles.exportInfo}>
            <Text style={styles.exportTitle}>Full Leads Registry</Text>
            <Text style={styles.exportDescription}>
              Client details, trip type, budgets, and assignment history.
            </Text>
          </View>
          {loading && activeExport === 'leads' ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <ChevronRight size={20} color={Colors.text.tertiary} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.exportCard, loading && styles.exportCardDisabled]}
          onPress={() => exportData('confirmations')}
          disabled={loading}
        >
          <View style={[styles.iconContainer, { backgroundColor: Colors.status.success + '15' }]}>
            <CheckCircle2 size={28} color={Colors.status.success} />
          </View>
          <View style={styles.exportInfo}>
            <Text style={styles.exportTitle}>Confirmation Records</Text>
            <Text style={styles.exportDescription}>
              Confirmed bookings, payment IDs, and sales person attribution.
            </Text>
          </View>
          {loading && activeExport === 'confirmations' ? (
            <ActivityIndicator size="small" color={Colors.status.success} />
          ) : (
            <ChevronRight size={20} color={Colors.text.tertiary} />
          )}
        </TouchableOpacity>

        <View style={styles.securityNotice}>
          <CloudDownload size={20} color={Colors.text.tertiary} />
          <Text style={styles.securityText}>Only authorized admins can access these downloads.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Layout.spacing.lg,
  },
  infoBox: {
    marginBottom: 32,
    marginTop: 8,
  },
  description: {
    fontSize: 15,
    color: Colors.text.secondary,
    lineHeight: 22,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
    marginLeft: 4,
  },
  exportCard: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.xl,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.shadows.md,
  },
  exportCardDisabled: {
    opacity: 0.6,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: Layout.radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  exportInfo: {
    flex: 1,
  },
  exportTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  exportDescription: {
    fontSize: 13,
    color: Colors.text.tertiary,
    lineHeight: 18,
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    gap: 10,
    opacity: 0.6,
  },
  securityText: {
    fontSize: 12,
    color: Colors.text.tertiary,
    fontWeight: '600',
  },
});
