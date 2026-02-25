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
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft, Plus, Copy, Trash2, Edit, Search, Filter, X,
  Calendar, Users, MapPin, Package, ChevronRight, DollarSign,
  TrendingUp, Info, Zap, ShieldCheck, Clock, Share2
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Colors, Layout } from '@/constants/Colors';

interface Itinerary {
  id: string;
  name: string;
  days: number;
  no_of_pax: number;
  full_itinerary: string;
  inclusions: string;
  exclusions: string;
  cost_usd: number;
  cost_inr: number;
  created_by: string;
  created_at: string;
  destination_id: string | null;
}

export default function SavedItineraryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [filteredItineraries, setFilteredItineraries] = useState<Itinerary[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(83);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterDays, setFilterDays] = useState('');
  const [filterPax, setFilterPax] = useState('');
  const [editingMode, setEditingMode] = useState<string | null>(null);

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

  const [selectionModalVisible, setSelectionModalVisible] = useState(false);
  const [itinerarySearch, setItinerarySearch] = useState('');
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
    setEditingId(itinerary.id);
    setEditingMode(transportMode);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (
      !formData.destination ||
      !formData.name ||
      !formData.days ||
      !formData.no_of_pax ||
      !formData.full_itinerary
    ) {
      Alert.alert('Error', 'Please fill in mandatory fields (Location, Title, Days, Pax, Itinerary)');
      return;
    }

    // Cost validation
    if (editingId) {
      // When editing, only the current variant's cost is required
      const currentCost = editingMode === 'Driver with cab' ? formData.driver_cost_usd :
        editingMode === 'Self drive cab' ? formData.selfDrive_cost_usd :
          formData.scooter_cost_usd;
      if (!currentCost) {
        Alert.alert('Error', 'Cost is required for the variant being edited');
        return;
      }
    } else {
      // When creating new, all 3 costs are conventionally required in this app
      if (!formData.driver_cost_usd || !formData.selfDrive_cost_usd || !formData.scooter_cost_usd) {
        Alert.alert('Error', 'Please provide costs for all 3 variants');
        return;
      }
    }

    try {
      setSaving(true);

      const selectedDest = destinations.find(d => d.name === formData.destination);
      const destinationId = selectedDest ? selectedDest.id : null;
      const finalExchangeRate = exchangeRate + 2;

      const baseData = {
        days: parseInt(formData.days),
        no_of_pax: parseInt(formData.no_of_pax),
        full_itinerary: formData.full_itinerary,
        created_by: user?.id,
        updated_at: new Date().toISOString(),
        destination_id: destinationId,
      };

      if (editingId) {
        // Prepare specific update data based on the variant
        let updateData: any = { ...baseData };

        if (editingMode === 'Driver with cab') {
          updateData.name = `${formData.name} (Driver with cab)`;
          updateData.inclusions = formData.driver_inclusions;
          updateData.exclusions = formData.driver_exclusions;
          updateData.cost_usd = parseFloat(formData.driver_cost_usd);
          updateData.cost_inr = Math.round(parseFloat(formData.driver_cost_usd) * finalExchangeRate);
        } else if (editingMode === 'Self drive cab') {
          updateData.name = `${formData.name} (Self drive cab)`;
          updateData.inclusions = formData.selfDrive_inclusions;
          updateData.exclusions = formData.selfDrive_exclusions;
          updateData.cost_usd = parseFloat(formData.selfDrive_cost_usd);
          updateData.cost_inr = Math.round(parseFloat(formData.selfDrive_cost_usd) * finalExchangeRate);
        } else {
          updateData.name = `${formData.name} (Self drive scooter)`;
          updateData.inclusions = formData.scooter_inclusions;
          updateData.exclusions = formData.scooter_exclusions;
          updateData.cost_usd = parseFloat(formData.scooter_cost_usd);
          updateData.cost_inr = Math.round(parseFloat(formData.scooter_cost_usd) * finalExchangeRate);
        }

        const { error } = await supabase
          .from('itineraries')
          .update(updateData)
          .eq('id', editingId);

        if (error) throw error;
        Alert.alert('Success', 'Itinerary variant updated successfully');
      } else {
        const itinerariesToInsert = [
          {
            ...baseData,
            name: `${formData.name} (Driver with cab)`,
            inclusions: formData.driver_inclusions,
            exclusions: formData.driver_exclusions,
            cost_usd: parseFloat(formData.driver_cost_usd),
            cost_inr: Math.round(parseFloat(formData.driver_cost_usd) * finalExchangeRate),
          },
          {
            ...baseData,
            name: `${formData.name} (Self drive cab)`,
            inclusions: formData.selfDrive_inclusions,
            exclusions: formData.selfDrive_exclusions,
            cost_usd: parseFloat(formData.selfDrive_cost_usd),
            cost_inr: Math.round(parseFloat(formData.selfDrive_cost_usd) * finalExchangeRate),
          },
          {
            ...baseData,
            name: `${formData.name} (Self drive scooter)`,
            inclusions: formData.scooter_inclusions,
            exclusions: formData.scooter_exclusions,
            cost_usd: parseFloat(formData.scooter_cost_usd),
            cost_inr: Math.round(parseFloat(formData.scooter_cost_usd) * finalExchangeRate),
          },
        ];

        const { error } = await supabase
          .from('itineraries')
          .insert(itinerariesToInsert);

        if (error) throw error;
        Alert.alert('Success', 'All 3 variants (Driver, Self-Drive, Scooter) saved successfully!');
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
      setEditingMode(null);
      setShowForm(false);
      fetchItineraries();
    } catch (error) {
      console.error('Error saving itinerary:', error);
      Alert.alert('Error', 'Failed to save itinerary');
    } finally {
      setSaving(false);
    }
  };

  const populateFromExisting = (itinerary: Itinerary) => {
    const nameWithoutTransport = itinerary.name.split(' (')[0];
    const transportMode = itinerary.name.includes('(')
      ? itinerary.name.split('(')[1].replace(')', '')
      : '';

    const destination = destinations.find(d => d.id === itinerary.destination_id)?.name || '';

    setFormData({
      ...formData,
      destination: destination,
      name: nameWithoutTransport,
      days: itinerary.days.toString(),
      no_of_pax: itinerary.no_of_pax.toString(),
      full_itinerary: itinerary.full_itinerary,
      driver_inclusions: transportMode === 'Driver with cab' ? itinerary.inclusions : formData.driver_inclusions,
      driver_exclusions: transportMode === 'Driver with cab' ? itinerary.exclusions : formData.driver_exclusions,
      driver_cost_usd: transportMode === 'Driver with cab' ? itinerary.cost_usd.toString() : formData.driver_cost_usd,
      selfDrive_inclusions: transportMode === 'Self drive cab' ? itinerary.inclusions : formData.selfDrive_inclusions,
      selfDrive_exclusions: transportMode === 'Self drive cab' ? itinerary.exclusions : formData.selfDrive_exclusions,
      selfDrive_cost_usd: transportMode === 'Self drive cab' ? itinerary.cost_usd.toString() : formData.selfDrive_cost_usd,
      scooter_inclusions: transportMode === 'Self drive scooter' ? itinerary.inclusions : formData.scooter_inclusions,
      scooter_exclusions: transportMode === 'Self drive scooter' ? itinerary.exclusions : formData.scooter_exclusions,
      scooter_cost_usd: transportMode === 'Self drive scooter' ? itinerary.cost_usd.toString() : formData.scooter_cost_usd,
    });
    setSelectionModalVisible(false);
    Alert.alert('Success', 'Form populated from existing itinerary. You can now modify it.');
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Delete Itinerary',
      'Are you sure you want to delete this itinerary?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('itineraries')
                .delete()
                .eq('id', id);

              if (error) throw error;
              fetchItineraries();
            } catch (error) {
              console.error('Error deleting itinerary:', error);
              Alert.alert('Error', 'Failed to delete itinerary');
            }
          },
        },
      ]
    );
  };

  const copyPackage = (itinerary: Itinerary) => {
    const finalExchangeRate = exchangeRate + 2;
    const costINR = itinerary.cost_inr || (itinerary.cost_usd * finalExchangeRate);

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
• INR: ₹${costINR.toFixed(2)}
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
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>ITINERARIES</Text>
          <Text style={styles.headerSubtitle}>{itineraries.length} Packages Saved</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            setShowForm(!showForm);
            if (showForm) {
              setEditingId(null);
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
          style={styles.iconButton}
        >
          {showForm ? <X size={24} color={Colors.status.error} /> : <Plus size={24} color={Colors.primary} />}
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color={Colors.text.tertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search itineraries..."
            placeholderTextColor={Colors.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={20} color={Colors.text.tertiary} />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={[styles.filterIconButton, showFilters && { backgroundColor: Colors.primary + '20' }]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Filter size={20} color={showFilters ? Colors.primary : Colors.text.secondary} />
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={styles.filterContainer}>
          <View style={styles.filterRow}>
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Days Range</Text>
              <TextInput
                style={styles.filterInput}
                placeholder="e.g., 7"
                placeholderTextColor={Colors.text.tertiary}
                value={filterDays}
                onChangeText={setFilterDays}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Group Size</Text>
              <TextInput
                style={styles.filterInput}
                placeholder="e.g., 2"
                placeholderTextColor={Colors.text.tertiary}
                value={filterPax}
                onChangeText={setFilterPax}
                keyboardType="numeric"
              />
            </View>
          </View>
          {(filterDays || filterPax) && (
            <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
              <Text style={styles.clearFiltersText}>Reset View</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {showForm && (
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <View>
                <Text style={styles.formTitle}>
                  {editingId ? 'Refine Package' : 'Create Collection'}
                </Text>
                <Text style={styles.formSubtitle}>
                  {editingId ? 'Modify this variant' : 'Generates 3 transport options'}
                </Text>
              </View>
              {!editingId && (
                <TouchableOpacity
                  style={styles.selectExistingButton}
                  onPress={() => setSelectionModalVisible(true)}
                >
                  <Zap size={16} color={Colors.primary} />
                  <Text style={styles.selectExistingButtonText}>FROM TEMPLATE</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.sectionDivider}>
              <MapPin size={14} color={Colors.primary} />
              <Text style={styles.sectionDividerText}>LOCATION & BRANDING</Text>
            </View>

            <Text style={styles.label}>Select Destination *</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.destinationContainer}
              contentContainerStyle={{ gap: 10, paddingRight: 20 }}
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

            <Text style={styles.label}>Package Title *</Text>
            <View style={styles.inputWithIcon}>
              <Edit size={18} color={Colors.text.tertiary} style={styles.fieldIcon} />
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="e.g., Bali Adventure Special"
                placeholderTextColor={Colors.text.tertiary}
              />
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Nights / Days *</Text>
                <View style={styles.inputWithIcon}>
                  <Clock size={16} color={Colors.text.tertiary} style={styles.fieldIcon} />
                  <TextInput
                    style={styles.input}
                    value={formData.days}
                    onChangeText={(text) => setFormData({ ...formData, days: text })}
                    placeholder="7"
                    placeholderTextColor={Colors.text.tertiary}
                    keyboardType="numeric"
                  />
                </View>
              </View>
              <View style={{ width: 16 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Base Pax *</Text>
                <View style={styles.inputWithIcon}>
                  <Users size={16} color={Colors.text.tertiary} style={styles.fieldIcon} />
                  <TextInput
                    style={styles.input}
                    value={formData.no_of_pax}
                    onChangeText={(text) => setFormData({ ...formData, no_of_pax: text })}
                    placeholder="2"
                    placeholderTextColor={Colors.text.tertiary}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>

            <View style={styles.sectionDivider}>
              <TrendingUp size={14} color={Colors.primary} />
              <Text style={styles.sectionDividerText}>DETAILED ITINERARY</Text>
            </View>

            <Text style={styles.label}>Daily Breakdown *</Text>
            <View style={styles.textAreaWrapper}>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.full_itinerary}
                onChangeText={(text) => setFormData({ ...formData, full_itinerary: text })}
                placeholder="Day 1: Arrival & Transfer to Hotel...&#10;Day 2: Full day city tour with lunch..."
                placeholderTextColor={Colors.text.tertiary}
                multiline
                numberOfLines={8}
              />
            </View>

            <View style={styles.transportModeSeparator}>
              <Text style={styles.separatorText}>TRANSPORT VARIANTS</Text>
            </View>

            {/* Variant 1: Driver */}
            {(!editingId || editingMode === 'Driver with cab') && (
              <View style={[styles.variantCard, { borderLeftColor: Colors.status.info, borderLeftWidth: 4 }]}>
                <View style={styles.variantHeader}>
                  <View style={[styles.variantBadge, { backgroundColor: Colors.status.info + '20' }]}>
                    <Package size={14} color={Colors.status.info} />
                  </View>
                  <Text style={styles.variantTitle}>Private Driver & Cab</Text>
                </View>

                <Text style={styles.label}>Inclusions</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { height: 80 }]}
                  value={formData.driver_inclusions}
                  onChangeText={(text) => setFormData({ ...formData, driver_inclusions: text })}
                  placeholder="Private transport, Petrol, Parking..."
                  placeholderTextColor={Colors.text.tertiary}
                  multiline
                />

                <Text style={styles.label}>Exclusions</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { height: 80 }]}
                  value={formData.driver_exclusions}
                  onChangeText={(text) => setFormData({ ...formData, driver_exclusions: text })}
                  placeholder="Flights, Personal expenses, Tips..."
                  placeholderTextColor={Colors.text.tertiary}
                  multiline
                />

                <Text style={styles.label}>USD Cost *</Text>
                <View style={styles.costRow}>
                  <View style={styles.costInputWrapper}>
                    <DollarSign size={18} color={Colors.primary} />
                    <TextInput
                      style={styles.costInput}
                      value={formData.driver_cost_usd}
                      onChangeText={(text) => setFormData({ ...formData, driver_cost_usd: text })}
                      placeholder="0.00"
                      placeholderTextColor={Colors.text.tertiary}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  {formData.driver_cost_usd && (
                    <View style={styles.conversionLabel}>
                      <Text style={styles.conversionAmount}>≈ ₹{calculateINR(formData.driver_cost_usd)}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Variant 2: Self Drive */}
            {(!editingId || editingMode === 'Self drive cab') && (
              <View style={[styles.variantCard, { borderLeftColor: Colors.status.warning, borderLeftWidth: 4 }]}>
                <View style={styles.variantHeader}>
                  <View style={[styles.variantBadge, { backgroundColor: Colors.status.warning + '20' }]}>
                    <Zap size={14} color={Colors.status.warning} />
                  </View>
                  <Text style={styles.variantTitle}>Self Drive Car</Text>
                </View>

                <Text style={styles.label}>Inclusions</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { height: 80 }]}
                  value={formData.selfDrive_inclusions}
                  onChangeText={(text) => setFormData({ ...formData, selfDrive_inclusions: text })}
                  placeholder="Rental car, Insurance, Map..."
                  placeholderTextColor={Colors.text.tertiary}
                  multiline
                />

                <Text style={styles.label}>Exclusions</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { height: 80 }]}
                  value={formData.selfDrive_exclusions}
                  onChangeText={(text) => setFormData({ ...formData, selfDrive_exclusions: text })}
                  placeholder="Petrol, Parking, Insurance excess..."
                  placeholderTextColor={Colors.text.tertiary}
                  multiline
                />

                <Text style={styles.label}>USD Cost *</Text>
                <View style={styles.costRow}>
                  <View style={styles.costInputWrapper}>
                    <DollarSign size={18} color={Colors.primary} />
                    <TextInput
                      style={styles.costInput}
                      value={formData.selfDrive_cost_usd}
                      onChangeText={(text) => setFormData({ ...formData, selfDrive_cost_usd: text })}
                      placeholder="0.00"
                      placeholderTextColor={Colors.text.tertiary}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  {formData.selfDrive_cost_usd && (
                    <View style={styles.conversionLabel}>
                      <Text style={styles.conversionAmount}>≈ ₹{calculateINR(formData.selfDrive_cost_usd)}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Variant 3: Scooter */}
            {(!editingId || editingMode === 'Self drive scooter') && (
              <View style={[styles.variantCard, { borderLeftColor: Colors.primary, borderLeftWidth: 4 }]}>
                <View style={styles.variantHeader}>
                  <View style={[styles.variantBadge, { backgroundColor: Colors.primary + '20' }]}>
                    <MapPin size={14} color={Colors.primary} />
                  </View>
                  <Text style={styles.variantTitle}>Rental Scooter</Text>
                </View>

                <Text style={styles.label}>Inclusions</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { height: 80 }]}
                  value={formData.scooter_inclusions}
                  onChangeText={(text) => setFormData({ ...formData, scooter_inclusions: text })}
                  placeholder="Scooter rental, Helmets, Insurance..."
                  placeholderTextColor={Colors.text.tertiary}
                  multiline
                />

                <Text style={styles.label}>Exclusions</Text>
                <TextInput
                  style={[styles.input, styles.textArea, { height: 80 }]}
                  value={formData.scooter_exclusions}
                  onChangeText={(text) => setFormData({ ...formData, scooter_exclusions: text })}
                  placeholder="Petrol, Damage, Fines..."
                  placeholderTextColor={Colors.text.tertiary}
                  multiline
                />

                <Text style={styles.label}>USD Cost *</Text>
                <View style={styles.costRow}>
                  <View style={styles.costInputWrapper}>
                    <DollarSign size={18} color={Colors.primary} />
                    <TextInput
                      style={styles.costInput}
                      value={formData.scooter_cost_usd}
                      onChangeText={(text) => setFormData({ ...formData, scooter_cost_usd: text })}
                      placeholder="0.00"
                      placeholderTextColor={Colors.text.tertiary}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  {formData.scooter_cost_usd && (
                    <View style={styles.conversionLabel}>
                      <Text style={styles.conversionAmount}>≈ ₹{calculateINR(formData.scooter_cost_usd)}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            <View style={styles.formButtons}>
              <TouchableOpacity
                style={[styles.button, styles.saveButton, saving && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={Colors.background} />
                ) : (
                  <View style={styles.buttonInner}>
                    <ShieldCheck size={20} color={Colors.background} />
                    <Text style={styles.saveButtonText}>
                      {editingId ? 'COMMIT CHANGES' : 'PUBLISH COLLECTION'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.listContainer}>
          {filteredItineraries.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Package size={48} color={Colors.divider} />
              </View>
              <Text style={styles.emptyText}>
                {itineraries.length === 0 ? 'No Collections Found' : 'No matches for your search'}
              </Text>
              <Text style={styles.emptySubtext}>
                {itineraries.length === 0 ? 'Create your first premium tour package' : 'Broaden your search criteria'}
              </Text>
            </View>
          ) : (
            filteredItineraries.map((itinerary) => {
              const nameParts = itinerary.name ? itinerary.name.split(' (') : ['Unknown'];
              const displayName = nameParts[0];
              const transportMode = nameParts[1] ? nameParts[1].replace(')', '') : 'General';

              const getTransportIcon = () => {
                const mode = transportMode.toLowerCase();
                if (mode.includes('driver')) return <Package size={14} color={Colors.status.info} />;
                if (mode.includes('car')) return <Zap size={14} color={Colors.status.warning} />;
                return <MapPin size={14} color={Colors.primary} />;
              };

              const getTransportColor = () => {
                const mode = transportMode.toLowerCase();
                if (mode.includes('driver')) return Colors.status.info;
                if (mode.includes('car')) return Colors.status.warning;
                return Colors.primary;
              };

              // Fallback INR if DB value is 0
              const displayINRValue = itinerary.cost_inr && itinerary.cost_inr > 0
                ? itinerary.cost_inr
                : parseFloat(calculateINR(itinerary.cost_usd.toString()));

              const badgeText = transportMode.toLowerCase().includes('drive')
                ? transportMode.replace(' drive ', '-').toUpperCase()
                : transportMode.toUpperCase();

              return (
                <View key={itinerary.id} style={styles.itineraryCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                      <View style={styles.packageIcon}>
                        <Package size={22} color={Colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                          <Text style={styles.itineraryName} numberOfLines={1}>{displayName}</Text>
                          <View style={[styles.transportBadge, { backgroundColor: getTransportColor() + '15', borderColor: getTransportColor() + '30' }]}>
                            {getTransportIcon()}
                            <Text style={[styles.transportBadgeText, { color: getTransportColor() }]}>{badgeText}</Text>
                          </View>
                        </View>
                        <View style={styles.metaRow}>
                          <Clock size={12} color={Colors.text.tertiary} />
                          <Text style={styles.metaText}>{itinerary.days}D</Text>
                          <View style={styles.metaDivider} />
                          <Users size={12} color={Colors.text.tertiary} />
                          <Text style={styles.metaText}>{itinerary.no_of_pax} Pax</Text>
                          {itinerary.destination_id && (
                            <>
                              <View style={styles.metaDivider} />
                              <MapPin size={12} color={Colors.primary} />
                              <Text style={[styles.metaText, { color: Colors.primary }]}>
                                {destinations.find(d => d.id === itinerary.destination_id)?.name}
                              </Text>
                            </>
                          )}
                        </View>
                      </View>
                    </View>
                    <View style={styles.actionRow}>
                      <TouchableOpacity onPress={() => copyPackage(itinerary)} style={styles.actionIcon}>
                        <Share2 size={16} color={Colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleEdit(itinerary)} style={styles.actionIcon}>
                        <Edit size={16} color={Colors.text.secondary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(itinerary.id)} style={styles.actionIcon}>
                        <Trash2 size={16} color={Colors.status.error} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.priceGrid}>
                    <View style={styles.priceColumn}>
                      <View style={styles.priceTag}>
                        <DollarSign size={12} color={Colors.text.tertiary} />
                        <Text style={styles.priceLabel}>USD</Text>
                      </View>
                      <Text style={styles.priceMain}>${itinerary.cost_usd.toLocaleString()}</Text>
                    </View>
                    <View style={styles.priceDivider} />
                    <View style={styles.priceColumn}>
                      <View style={styles.priceTag}>
                        <Text style={styles.priceLabelINR}>₹</Text>
                        <Text style={styles.priceLabel}>EST. INR</Text>
                      </View>
                      <Text style={styles.priceMain}>₹{displayINRValue.toLocaleString()}</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.cardFooter}
                    onPress={() => handleEdit(itinerary)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.itineraryPreview} numberOfLines={2}>
                      {itinerary.full_itinerary}
                    </Text>
                    <ChevronRight size={14} color={Colors.text.tertiary} />
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>
        <View style={styles.spacer} />
      </ScrollView>

      {/* Selection Modal for Templates */}
      <Modal
        visible={selectionModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalDragHandle} />
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Templates Library</Text>
                <Text style={styles.modalSubtitle}>Select and customize collections</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectionModalVisible(false)} style={styles.closeModalButton}>
                <X size={22} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearch}>
              <Search size={18} color={Colors.text.tertiary} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search master templates..."
                placeholderTextColor={Colors.text.tertiary}
                value={itinerarySearch}
                onChangeText={setItinerarySearch}
              />
            </View>

            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              {itineraries
                .filter(i => i.name.toLowerCase().includes(itinerarySearch.toLowerCase()))
                .map((itinerary) => (
                  <TouchableOpacity
                    key={itinerary.id}
                    style={styles.templateItem}
                    onPress={() => populateFromExisting(itinerary)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.templateIcon}>
                      <Package size={20} color={Colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.templateName}>{itinerary.name}</Text>
                      <View style={styles.templateMetaRow}>
                        <Clock size={12} color={Colors.text.tertiary} />
                        <Text style={styles.templateMeta}>{itinerary.days} Days</Text>
                        <View style={styles.metaDividerSmall} />
                        <Users size={12} color={Colors.text.tertiary} />
                        <Text style={styles.templateMeta}>{itinerary.no_of_pax} Passengers</Text>
                      </View>
                    </View>
                    <View style={styles.templateAction}>
                      <ChevronRight size={18} color={Colors.primary} />
                    </View>
                  </TouchableOpacity>
                ))}
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
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.text.primary,
    letterSpacing: 1.5,
  },
  headerSubtitle: {
    fontSize: 10,
    color: Colors.text.tertiary,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 2,
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
  searchContainer: {
    flexDirection: 'row',
    padding: Layout.spacing.lg,
    gap: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: Layout.radius.lg,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    color: Colors.text.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  filterIconButton: {
    width: 48,
    height: 48,
    borderRadius: Layout.radius.lg,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterContainer: {
    padding: Layout.spacing.lg,
    backgroundColor: Colors.surfaceHighlight,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 12,
  },
  filterItem: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.text.tertiary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterInput: {
    backgroundColor: Colors.background,
    borderRadius: Layout.radius.md,
    padding: 12,
    color: Colors.text.primary,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  clearFiltersButton: {
    marginTop: 16,
    alignItems: 'center',
    padding: 8,
  },
  clearFiltersText: {
    color: Colors.primary,
    fontWeight: '800',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  content: {
    flex: 1,
  },
  formCard: {
    padding: Layout.spacing.lg,
    backgroundColor: Colors.surface,
    marginHorizontal: Layout.spacing.lg,
    marginTop: Layout.spacing.lg,
    borderRadius: Layout.radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.shadows.lg,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.text.primary,
    letterSpacing: -0.5,
  },
  formSubtitle: {
    fontSize: 13,
    color: Colors.text.tertiary,
    marginTop: 4,
    fontWeight: '500',
  },
  selectExistingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Layout.radius.md,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  selectExistingButtonText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '900',
  },
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  sectionDividerText: {
    fontSize: 11,
    fontWeight: '900',
    color: Colors.text.tertiary,
    letterSpacing: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text.secondary,
    marginBottom: 10,
    marginTop: 16,
    marginLeft: 4,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: Layout.radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
  },
  fieldIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    color: Colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  textAreaWrapper: {
    backgroundColor: Colors.background,
    borderRadius: Layout.radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 4,
  },
  textArea: {
    height: 140,
    textAlignVertical: 'top',
    padding: 12,
  },
  row: {
    flexDirection: 'row',
  },
  destinationContainer: {
    marginBottom: 8,
  },
  destinationTag: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Layout.radius.full,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  destinationTagActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  destinationTagText: {
    color: Colors.text.secondary,
    fontWeight: '700',
    fontSize: 13,
  },
  destinationTagTextActive: {
    color: Colors.background,
  },
  transportModeSeparator: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separatorText: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
  },
  variantCard: {
    backgroundColor: Colors.background,
    padding: 20,
    borderRadius: Layout.radius.xl,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.shadows.sm,
  },
  variantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  variantBadge: {
    width: 32,
    height: 32,
    borderRadius: Layout.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  variantTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.text.primary,
  },
  costRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  costInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceHighlight,
    borderRadius: Layout.radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
  },
  costInput: {
    flex: 1,
    paddingVertical: 14,
    marginLeft: 8,
    color: Colors.text.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  conversionLabel: {
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Layout.radius.md,
  },
  conversionAmount: {
    color: Colors.primary,
    fontWeight: '800',
    fontSize: 14,
  },
  formButtons: {
    marginTop: 32,
    marginBottom: 8,
  },
  button: {
    height: 60,
    borderRadius: Layout.radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    ...Layout.shadows.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  listContainer: {
    padding: Layout.spacing.lg,
    gap: 16,
  },
  itineraryCard: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.xl,
    padding: Layout.spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Layout.shadows.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  cardHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  packageIcon: {
    width: 48,
    height: 48,
    borderRadius: Layout.radius.xl,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary + '20',
  },
  itineraryName: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 12,
    color: Colors.text.tertiary,
    fontWeight: '700',
  },
  metaDivider: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.border,
  },
  transportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Layout.radius.sm,
    borderWidth: 1,
  },
  transportBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: Layout.radius.md,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  priceGrid: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    padding: 16,
    borderRadius: Layout.radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  priceColumn: {
    flex: 1,
    alignItems: 'center',
  },
  priceDivider: {
    width: 1,
    backgroundColor: Colors.divider,
    marginHorizontal: 4,
  },
  priceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  priceLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.text.tertiary,
    letterSpacing: 1,
  },
  priceLabelINR: {
    fontSize: 10,
    fontWeight: '900',
    color: Colors.primary,
  },
  priceMain: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.text.primary,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingTop: 16,
    gap: 12,
  },
  itineraryPreview: {
    flex: 1,
    fontSize: 13,
    color: Colors.text.tertiary,
    lineHeight: 18,
    fontWeight: '500',
  },
  emptyState: {
    padding: 80,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surfaceHighlight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Layout.radius.xl * 1.5,
    borderTopRightRadius: Layout.radius.xl * 1.5,
    paddingBottom: 40,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalDragHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.divider,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Layout.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.text.primary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: Colors.text.tertiary,
    fontWeight: '600',
    marginTop: 2,
  },
  closeModalButton: {
    padding: 8,
  },
  modalSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    margin: Layout.spacing.lg,
    paddingHorizontal: 16,
    height: 52,
    borderRadius: Layout.radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalSearchInput: {
    flex: 1,
    marginLeft: 12,
    color: Colors.text.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  modalList: {
    paddingHorizontal: Layout.spacing.lg,
  },
  templateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.background,
    borderRadius: Layout.radius.xl,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 16,
  },
  templateIcon: {
    width: 48,
    height: 48,
    borderRadius: Layout.radius.lg,
    backgroundColor: Colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  templateName: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text.primary,
  },
  templateMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  templateMeta: {
    fontSize: 12,
    color: Colors.text.tertiary,
    fontWeight: '600',
  },
  metaDividerSmall: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.divider,
  },
  templateAction: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spacer: {
    height: 100,
  }
});
