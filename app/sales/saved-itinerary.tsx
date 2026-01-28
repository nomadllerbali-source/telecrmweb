import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Clipboard,
} from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { ArrowLeft, Plus, Copy, Edit, Search, Filter, X } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface Itinerary {
  id: string;
  name: string;
  days: number;
  no_of_pax: number;
  full_itinerary: string;
  inclusions: string;
  exclusions: string;
  cost_usd: number;
  created_by: string;
  created_at: string;
  destination_id: string | null;
}

export default function SavedItineraryScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [filteredItineraries, setFilteredItineraries] = useState<Itinerary[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(83);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTransportMode, setEditingTransportMode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterDays, setFilterDays] = useState('');
  const [filterPax, setFilterPax] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    destination: '',
    name: '',
    days: '1',
    no_of_pax: '2',
    full_itinerary: '',
    driver_inclusions: '',
    driver_exclusions: '',
    driver_cost_usd: '',
    selfDrive_inclusions: '',
    selfDrive_exclusions: '',
    selfDrive_cost_usd: '',
    scooter_inclusions: '',
    scooter_exclusions: '',
    scooter_cost_usd: '',
  });

  const [destinations, setDestinations] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetchItineraries();
    fetchExchangeRate();
    fetchDestinations();
  }, []);

  const fetchDestinations = async () => {
    try {
      const { data, error } = await supabase
        .from('destinations')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setDestinations(data || []);
    } catch (error) {
      console.error('Error fetching destinations:', error);
    }
  };

  useEffect(() => {
    filterItineraries();
  }, [itineraries, searchQuery, filterDays, filterPax]);

  const filterItineraries = () => {
    let filtered = [...itineraries];

    if (searchQuery) {
      filtered = filtered.filter((itinerary) =>
        itinerary.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterDays) {
      filtered = filtered.filter((itinerary) => itinerary.days === parseInt(filterDays));
    }

    if (filterPax) {
      filtered = filtered.filter((itinerary) => itinerary.no_of_pax === parseInt(filterPax));
    }

    setFilteredItineraries(filtered);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterDays('');
    setFilterPax('');
  };

  const fetchExchangeRate = async () => {
    try {
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const data = await response.json();
      if (data.rates && data.rates.INR) {
        setExchangeRate(data.rates.INR);
      }
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
    }
  };

  const fetchItineraries = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('itineraries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItineraries(data || []);
    } catch (error) {
      console.error('Error fetching itineraries:', error);
      Alert.alert('Error', 'Failed to load itineraries');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (itinerary: Itinerary) => {
    const nameWithoutTransport = itinerary.name.split(' (')[0];
    const transportMode = itinerary.name.includes('(')
      ? itinerary.name.split('(')[1].replace(')', '')
      : '';

    const destination = destinations.find(d => d.id === itinerary.destination_id)?.name || '';

    setFormData({
      destination: destination,
      name: nameWithoutTransport,
      days: itinerary.days.toString(),
      no_of_pax: itinerary.no_of_pax.toString(),
      full_itinerary: itinerary.full_itinerary,
      driver_inclusions: transportMode === 'Driver with cab' ? itinerary.inclusions : '',
      driver_exclusions: transportMode === 'Driver with cab' ? itinerary.exclusions : '',
      driver_cost_usd: transportMode === 'Driver with cab' ? itinerary.cost_usd.toString() : '',
      selfDrive_inclusions: transportMode === 'Self drive cab' ? itinerary.inclusions : '',
      selfDrive_exclusions: transportMode === 'Self drive cab' ? itinerary.exclusions : '',
      selfDrive_cost_usd: transportMode === 'Self drive cab' ? itinerary.cost_usd.toString() : '',
      scooter_inclusions: transportMode === 'Self drive scooter' ? itinerary.inclusions : '',
      scooter_exclusions: transportMode === 'Self drive scooter' ? itinerary.exclusions : '',
      scooter_cost_usd: transportMode === 'Self drive scooter' ? itinerary.cost_usd.toString() : '',
    });
    setEditingTransportMode(transportMode);
    setEditingId(itinerary.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    let isValid = true;
    if (
      !formData.destination ||
      !formData.name ||
      !formData.days ||
      !formData.no_of_pax ||
      !formData.full_itinerary
    ) {
      isValid = false;
    }

    if (isValid) {
      if (editingId && editingTransportMode) {
        // Validate only the active transport mode
        if (editingTransportMode === 'Driver with cab' && !formData.driver_cost_usd) isValid = false;
        if (editingTransportMode === 'Self drive cab' && !formData.selfDrive_cost_usd) isValid = false;
        if (editingTransportMode === 'Self drive scooter' && !formData.scooter_cost_usd) isValid = false;
      } else {
        // Validate all for new itinerary
        if (
          !formData.driver_cost_usd ||
          !formData.selfDrive_cost_usd ||
          !formData.scooter_cost_usd
        ) {
          isValid = false;
        }
      }
    }

    if (!isValid) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);

      const selectedDest = destinations.find(d => d.name === formData.destination);
      const destinationId = selectedDest ? selectedDest.id : null;

      const baseData = {
        days: parseInt(formData.days),
        no_of_pax: parseInt(formData.no_of_pax),
        full_itinerary: formData.full_itinerary,
        created_by: user?.id,
        updated_at: new Date().toISOString(),
        destination_id: destinationId,
      };

      if (editingId) {
        const { error } = await supabase
          .from('itineraries')
          .update(baseData)
          .eq('id', editingId);

        if (error) throw error;
        Alert.alert('Success', 'Itinerary updated successfully');
      } else {
        const itinerariesToInsert = [
          {
            ...baseData,
            name: `${formData.name} (Driver with cab)`,
            inclusions: formData.driver_inclusions,
            exclusions: formData.driver_exclusions,
            cost_usd: parseFloat(formData.driver_cost_usd),
          },
          {
            ...baseData,
            name: `${formData.name} (Self drive cab)`,
            inclusions: formData.selfDrive_inclusions,
            exclusions: formData.selfDrive_exclusions,
            cost_usd: parseFloat(formData.selfDrive_cost_usd),
          },
          {
            ...baseData,
            name: `${formData.name} (Self drive scooter)`,
            inclusions: formData.scooter_inclusions,
            exclusions: formData.scooter_exclusions,
            cost_usd: parseFloat(formData.scooter_cost_usd),
          },
        ];

        const { error } = await supabase
          .from('itineraries')
          .insert(itinerariesToInsert);

        if (error) throw error;
        Alert.alert('Success', 'All 3 itineraries saved successfully!');
      }

      setFormData({
        destination: '',
        name: '',
        days: '1',
        no_of_pax: '2',
        full_itinerary: '',
        driver_inclusions: '',
        driver_exclusions: '',
        driver_cost_usd: '',
        selfDrive_inclusions: '',
        selfDrive_exclusions: '',
        selfDrive_cost_usd: '',
        scooter_inclusions: '',
        scooter_exclusions: '',
        scooter_cost_usd: '',
      });
      setEditingId(null);
      setEditingTransportMode(null);
      setShowForm(false);
      fetchItineraries();
    } catch (error) {
      console.error('Error saving itinerary:', error);
      Alert.alert('Error', 'Failed to save itinerary');
    } finally {
      setSaving(false);
    }
  };

  const copyPackage = (itinerary: Itinerary) => {
    const finalExchangeRate = exchangeRate + 2;
    const costINR = (itinerary.cost_usd * finalExchangeRate).toFixed(2);

    const packageText = `
🏝️🌴 *NOMADLLER PVT LTD – EXCLUSIVE BALI PACKAGE* 🇮🇩

🌟 *${itinerary.name}*
━━━━━━━━━━━━━━━━━━━━

📅 *Duration:* ${itinerary.days} Days
👥 *Number of Passengers:* ${itinerary.no_of_pax}

📍 *FULL ITINERARY:*
${itinerary.full_itinerary}

✅ *INCLUSIONS:*
${itinerary.inclusions}

❌ *EXCLUSIONS:*
${itinerary.exclusions}

💰 *PACKAGE COST:*
• USD: $${itinerary.cost_usd}
• INR: ₹${costINR}
(Exchange Rate: ${finalExchangeRate.toFixed(2)})

━━━━━━━━━━━━━━━━━━━━
*Package prepared by*
*NOMADLLER PVT LTD*
    `.trim();

    Clipboard.setString(packageText);
    Alert.alert('Success', 'Package details copied to clipboard!');
  };

  const calculateINR = (usd: string) => {
    if (!usd) return '0.00';
    const finalRate = exchangeRate + 2;
    return (parseFloat(usd) * finalRate).toFixed(2);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              router.replace('/sales');
            }
          }}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Itineraries</Text>
        <TouchableOpacity
          onPress={() => {
            setShowForm(!showForm);
            if (showForm) {
              setEditingId(null);
              setEditingTransportMode(null);
              setFormData({
                destination: '',
                name: '',
                days: '1',
                no_of_pax: '2',
                full_itinerary: '',
                driver_inclusions: '',
                driver_exclusions: '',
                driver_cost_usd: '',
                selfDrive_inclusions: '',
                selfDrive_exclusions: '',
                selfDrive_cost_usd: '',
                scooter_inclusions: '',
                scooter_exclusions: '',
                scooter_cost_usd: '',
              });
            }
          }}
          style={styles.addButton}
        >
          <Plus size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color="#8E8E93" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search itineraries..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={20} color="#8E8E93" />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Filter size={20} color={showFilters ? '#007AFF' : '#8E8E93'} />
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={styles.filterContainer}>
          <View style={styles.filterRow}>
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Days</Text>
              <TextInput
                style={styles.filterInput}
                placeholder="e.g., 7"
                value={filterDays}
                onChangeText={setFilterDays}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Passengers</Text>
              <TextInput
                style={styles.filterInput}
                placeholder="e.g., 2"
                value={filterPax}
                onChangeText={setFilterPax}
                keyboardType="numeric"
              />
            </View>
          </View>
          {(filterDays || filterPax) && (
            <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
              <Text style={styles.clearFiltersText}>Clear Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <ScrollView style={styles.content}>
        {showForm ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>
              {editingId ? 'Edit Itinerary' : 'Add New Itinerary'}
            </Text>

            <Text style={styles.label}>Destination *</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.destinationContainer}
            >
              {destinations.map((dest) => (
                <TouchableOpacity
                  key={dest.id}
                  style={[
                    styles.destinationTag,
                    formData.destination === dest.name && styles.destinationTagActive,
                  ]}
                  onPress={() => setFormData({ ...formData, destination: dest.name })}
                >
                  <Text
                    style={[
                      styles.destinationTagText,
                      formData.destination === dest.name && styles.destinationTagTextActive,
                    ]}
                  >
                    {dest.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Itinerary Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="e.g., Bali Adventure Package"
            />

            <Text style={styles.label}>Number of Days *</Text>
            <TextInput
              style={styles.input}
              value={formData.days}
              onChangeText={(text) => setFormData({ ...formData, days: text })}
              placeholder="e.g., 7"
              keyboardType="numeric"
            />

            <Text style={styles.label}>Number of Passengers *</Text>
            <TextInput
              style={styles.input}
              value={formData.no_of_pax}
              onChangeText={(text) => setFormData({ ...formData, no_of_pax: text })}
              placeholder="e.g., 2"
              keyboardType="numeric"
            />

            <Text style={styles.label}>Full Itinerary *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.full_itinerary}
              onChangeText={(text) => setFormData({ ...formData, full_itinerary: text })}
              placeholder="Day 1: Arrival and hotel check-in&#10;Day 2: City tour..."
              multiline
              numberOfLines={6}
            />

            {(!editingId || editingTransportMode === 'Driver with cab') && (
              <>
                <View style={styles.transportModeSeparator} />
                <Text style={styles.transportModeTitle}>Driver with Cab</Text>

                <Text style={styles.label}>Inclusions</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.driver_inclusions}
                  onChangeText={(text) => setFormData({ ...formData, driver_inclusions: text })}
                  placeholder="• Hotel accommodation&#10;• Daily breakfast&#10;• Driver..."
                  multiline
                  numberOfLines={4}
                />

                <Text style={styles.label}>Exclusions</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.driver_exclusions}
                  onChangeText={(text) => setFormData({ ...formData, driver_exclusions: text })}
                  placeholder="• International flights&#10;• Personal expenses..."
                  multiline
                  numberOfLines={4}
                />

                <Text style={styles.label}>Cost in USD *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.driver_cost_usd}
                  onChangeText={(text) => setFormData({ ...formData, driver_cost_usd: text })}
                  placeholder="e.g., 1500"
                  keyboardType="decimal-pad"
                />

                {formData.driver_cost_usd && (
                  <View style={styles.conversionBox}>
                    <Text style={styles.conversionText}>
                      Exchange Rate: {(exchangeRate + 2).toFixed(2)}
                    </Text>
                    <Text style={styles.conversionAmount}>
                      INR: ₹{calculateINR(formData.driver_cost_usd)}
                    </Text>
                  </View>
                )}
              </>
            )}

            {(!editingId || editingTransportMode === 'Self drive cab') && (
              <>
                <View style={styles.transportModeSeparator} />
                <Text style={styles.transportModeTitle}>Self Drive Cab</Text>

                <Text style={styles.label}>Inclusions</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.selfDrive_inclusions}
                  onChangeText={(text) => setFormData({ ...formData, selfDrive_inclusions: text })}
                  placeholder="• Hotel accommodation&#10;• Daily breakfast&#10;• Car rental..."
                  multiline
                  numberOfLines={4}
                />

                <Text style={styles.label}>Exclusions</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.selfDrive_exclusions}
                  onChangeText={(text) => setFormData({ ...formData, selfDrive_exclusions: text })}
                  placeholder="• International flights&#10;• Personal expenses..."
                  multiline
                  numberOfLines={4}
                />

                <Text style={styles.label}>Cost in USD *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.selfDrive_cost_usd}
                  onChangeText={(text) => setFormData({ ...formData, selfDrive_cost_usd: text })}
                  placeholder="e.g., 1500"
                  keyboardType="decimal-pad"
                />

                {formData.selfDrive_cost_usd && (
                  <View style={styles.conversionBox}>
                    <Text style={styles.conversionText}>
                      Exchange Rate: {(exchangeRate + 2).toFixed(2)}
                    </Text>
                    <Text style={styles.conversionAmount}>
                      INR: ₹{calculateINR(formData.selfDrive_cost_usd)}
                    </Text>
                  </View>
                )}
              </>
            )}

            {(!editingId || editingTransportMode === 'Self drive scooter') && (
              <>
                <View style={styles.transportModeSeparator} />
                <Text style={styles.transportModeTitle}>Self Drive Scooter</Text>

                <Text style={styles.label}>Inclusions</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.scooter_inclusions}
                  onChangeText={(text) => setFormData({ ...formData, scooter_inclusions: text })}
                  placeholder="• Hotel accommodation&#10;• Daily breakfast&#10;• Scooter rental..."
                  multiline
                  numberOfLines={4}
                />

                <Text style={styles.label}>Exclusions</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.scooter_exclusions}
                  onChangeText={(text) => setFormData({ ...formData, scooter_exclusions: text })}
                  placeholder="• International flights&#10;• Personal expenses..."
                  multiline
                  numberOfLines={4}
                />

                <Text style={styles.label}>Cost in USD *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.scooter_cost_usd}
                  onChangeText={(text) => setFormData({ ...formData, scooter_cost_usd: text })}
                  placeholder="e.g., 1500"
                  keyboardType="decimal-pad"
                />

                {formData.scooter_cost_usd && (
                  <View style={styles.conversionBox}>
                    <Text style={styles.conversionText}>
                      Exchange Rate: {(exchangeRate + 2).toFixed(2)}
                    </Text>
                    <Text style={styles.conversionAmount}>
                      INR: ₹{calculateINR(formData.scooter_cost_usd)}
                    </Text>
                  </View>
                )}
              </>
            )}

            <View style={styles.formButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setEditingTransportMode(null);
                  setFormData({
                    destination: '',
                    name: '',
                    days: '1',
                    no_of_pax: '2',
                    full_itinerary: '',
                    driver_inclusions: '',
                    driver_exclusions: '',
                    driver_cost_usd: '',
                    selfDrive_inclusions: '',
                    selfDrive_exclusions: '',
                    selfDrive_cost_usd: '',
                    scooter_inclusions: '',
                    scooter_exclusions: '',
                    scooter_cost_usd: '',
                  });
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingId ? 'Update Itinerary' : 'Save All 3 Itineraries'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : null
        }

        {
          filteredItineraries.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                {itineraries.length === 0 ? 'No saved itineraries yet' : 'No itineraries match your filters'}
              </Text>
              <Text style={styles.emptySubtext}>
                {itineraries.length === 0 ? 'Tap + to add your first itinerary' : 'Try adjusting your search or filters'}
              </Text>
            </View>
          ) : (
            filteredItineraries.map((itinerary) => (
              <View key={itinerary.id} style={styles.itineraryCard}>
                <View style={styles.itineraryHeader}>
                  <Text style={styles.itineraryName}>{itinerary.name}</Text>
                  <TouchableOpacity
                    onPress={() => handleEdit(itinerary)}
                    style={styles.actionButton}
                  >
                    <Edit size={20} color="#007AFF" />
                  </TouchableOpacity>
                </View>

                <View style={styles.itineraryMeta}>
                  <Text style={styles.itineraryDays}>{itinerary.days} Days</Text>
                  <Text style={styles.itineraryPax}>👥 {itinerary.no_of_pax} Passengers</Text>
                </View>

                <View style={styles.itinerarySection}>
                  <Text style={styles.sectionTitle}>Itinerary:</Text>
                  <Text style={styles.sectionText} numberOfLines={3}>
                    {itinerary.full_itinerary}
                  </Text>
                </View>

                {itinerary.inclusions && (
                  <View style={styles.itinerarySection}>
                    <Text style={styles.sectionTitle}>Inclusions:</Text>
                    <Text style={styles.sectionText} numberOfLines={2}>
                      {itinerary.inclusions}
                    </Text>
                  </View>
                )}

                {itinerary.exclusions && (
                  <View style={styles.itinerarySection}>
                    <Text style={styles.sectionTitle}>Exclusions:</Text>
                    <Text style={styles.sectionText} numberOfLines={2}>
                      {itinerary.exclusions}
                    </Text>
                  </View>
                )}

                <View style={styles.costContainer}>
                  <View>
                    <Text style={styles.costLabel}>Cost:</Text>
                    <Text style={styles.costUSD}>${itinerary.cost_usd}</Text>
                    <Text style={styles.costINR}>
                      ₹{(itinerary.cost_usd * (exchangeRate + 2)).toFixed(2)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.copyButton}
                    onPress={() => copyPackage(itinerary)}
                  >
                    <Copy size={20} color="#fff" />
                    <Text style={styles.copyButtonText}>Copy Package</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )
        }
      </ScrollView >
    </View >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  addButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: '#000',
  },
  filterButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
  },
  filterContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 12,
  },
  filterItem: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8E93',
    marginBottom: 6,
  },
  filterInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#F9F9F9',
  },
  clearFiltersButton: {
    marginTop: 12,
    alignItems: 'center',
  },
  clearFiltersText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF3B30',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#F9F9F9',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  conversionBox: {
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  conversionText: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 4,
  },
  conversionAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F2F2F7',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
  },
  itineraryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  itineraryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itineraryName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  actionButton: {
    padding: 4,
  },
  itineraryMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  itineraryDays: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  itineraryPax: {
    fontSize: 14,
    color: '#34C759',
    fontWeight: '500',
  },
  itinerarySection: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  sectionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  costContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  costLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  costUSD: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  costINR: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#34C759',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  destinationContainer: {
    marginBottom: 12,
  },
  destinationTag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  destinationTagActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  destinationTagText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  destinationTagTextActive: {
    color: '#fff',
  },
  transportModeSeparator: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: 16,
  },
  transportModeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 12,
  },
});
