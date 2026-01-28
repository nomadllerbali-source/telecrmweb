import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Download } from 'lucide-react-native';
import { Paths, File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export default function ExportScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const exportData = async (type: 'leads' | 'confirmations') => {
    setLoading(true);
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
        csvContent = 'ID,Client Name,Lead Type,No of Pax,Place,Travel Date,Expected Budget,Status,Sales Person,Created At\n';
        data.forEach((item: any) => {
          csvContent += `${item.id},${item.client_name},${item.lead_type},${item.no_of_pax},${item.place},${item.travel_date || item.travel_month || 'N/A'},${item.expected_budget},${item.status},${item.sales_person?.full_name || 'N/A'},${item.created_at}\n`;
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
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Export Data</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.description}>
          Export your data as CSV files. You can download leads sheet or confirmation sheet.
        </Text>

        <TouchableOpacity
          style={[styles.exportCard, loading && styles.exportCardDisabled]}
          onPress={() => exportData('leads')}
          disabled={loading}
        >
          <View style={[styles.iconContainer, { backgroundColor: '#e0f2fe' }]}>
            <Download size={28} color="#3b82f6" />
          </View>
          <View style={styles.exportInfo}>
            <Text style={styles.exportTitle}>Export Leads Sheet</Text>
            <Text style={styles.exportDescription}>
              Download all leads with client details, assignments, and status
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.exportCard, loading && styles.exportCardDisabled]}
          onPress={() => exportData('confirmations')}
          disabled={loading}
        >
          <View style={[styles.iconContainer, { backgroundColor: '#d1fae5' }]}>
            <Download size={28} color="#10b981" />
          </View>
          <View style={styles.exportInfo}>
            <Text style={styles.exportTitle}>Export Confirmation Sheet</Text>
            <Text style={styles.exportDescription}>
              Download all confirmed bookings with payment details and itinerary
            </Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    lineHeight: 24,
  },
  exportCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  exportCardDisabled: {
    opacity: 0.6,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  exportInfo: {
    flex: 1,
  },
  exportTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  exportDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
