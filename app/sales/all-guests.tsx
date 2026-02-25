import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TextInput, TouchableOpacity, Alert, Modal, RefreshControl, Platform } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Lead } from '@/types';
import { ArrowLeft, Search, Trash2, Edit2, Phone, MapPin, Users, Calendar, X, Save } from 'lucide-react-native';
import { Colors, Layout } from '@/constants/Colors';
import DateTimePickerComponent from '@/components/DateTimePicker';

export default function AllGuestsScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    // Edit State
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingLead, setEditingLead] = useState<Lead | null>(null);
    const [editForm, setEditForm] = useState({
        client_name: '',
        contact_number: '',
        place: '',
        no_of_pax: '',
        travel_date: null as Date | null,
        travel_month: '',
        expected_budget: '',
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchLeads();
    }, [user?.id]);

    useEffect(() => {
        filterLeads();
    }, [searchQuery, leads]);

    const fetchLeads = async () => {
        try {
            const { data, error } = await supabase
                .from('leads')
                .select('*')
                .eq('assigned_to', user?.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setLeads(data || []);
            setFilteredLeads(data || []);
        } catch (err: any) {
            console.error('Error fetching leads:', err);
            Alert.alert('Error', 'Failed to fetch guests');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchLeads();
    }, []);

    const filterLeads = () => {
        if (!searchQuery.trim()) {
            setFilteredLeads(leads);
            return;
        }

        const query = searchQuery.toLowerCase();
        const filtered = leads.filter((lead) =>
            (lead.client_name?.toLowerCase().includes(query) || '') ||
            (lead.contact_number?.includes(query) || '') ||
            (lead.place?.toLowerCase().includes(query) || '')
        );
        setFilteredLeads(filtered);
    };

    const performDelete = async (leadId: string) => {
        try {
            // Optimistic update
            setLeads(prev => prev.filter(l => l.id !== leadId));
            setFilteredLeads(prev => prev.filter(l => l.id !== leadId));

            const { error } = await supabase
                .from('leads')
                .delete()
                .eq('id', leadId);

            if (error) {
                fetchLeads(); // Revert on error
                throw error;
            }

            if (Platform.OS !== 'web') {
                Alert.alert('Success', 'Guest deleted successfully');
            }
        } catch (err: any) {
            console.error('Error deleting lead:', err);
            Alert.alert('Error', 'Failed to delete guest');
        }
    };

    const handleDelete = (leadId: string) => {
        if (Platform.OS === 'web') {
            if (window.confirm('Are you sure you want to delete this guest?')) {
                performDelete(leadId);
            }
        } else {
            Alert.alert(
                'Delete Guest',
                'Are you sure you want to delete this guest? This action cannot be undone.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => performDelete(leadId)
                    }
                ]
            );
        }
    };

    const handleEdit = (lead: Lead) => {
        setEditingLead(lead);
        setEditForm({
            client_name: lead.client_name || '',
            contact_number: lead.contact_number || '',
            place: lead.place || '',
            no_of_pax: lead.no_of_pax?.toString() || '',
            travel_date: lead.travel_date ? new Date(lead.travel_date) : null,
            travel_month: lead.travel_month || '',
            expected_budget: lead.expected_budget?.toString() || '',
        });
        setShowEditModal(true);
    };

    const handleSaveEdit = async () => {
        if (!editingLead) return;

        setSaving(true);
        try {
            const updates = {
                client_name: editForm.client_name,
                contact_number: editForm.contact_number,
                place: editForm.place,
                no_of_pax: parseInt(editForm.no_of_pax) || 0,
                expected_budget: parseFloat(editForm.expected_budget) || 0,
                travel_date: editForm.travel_date ? editForm.travel_date.toISOString().split('T')[0] : null,
                travel_month: editForm.travel_month || null,
                updated_at: new Date().toISOString(),
            };

            const { error } = await supabase
                .from('leads')
                .update(updates)
                .eq('id', editingLead.id);

            if (error) throw error;

            setShowEditModal(false);
            setEditingLead(null);
            fetchLeads();
            Alert.alert('Success', 'Guest details updated');
        } catch (err: any) {
            console.error('Error updating lead:', err);
            Alert.alert('Error', 'Failed to update guest');
        } finally {
            setSaving(false);
        }
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
                <TouchableOpacity
                    onPress={() => {
                        if (router.canGoBack()) {
                            router.back();
                        } else {
                            router.replace('/sales');
                        }
                    }}
                    style={styles.backButton}
                >
                    <ArrowLeft size={24} color={Colors.text.primary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>All Guests</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.searchContainer}>
                <Search size={20} color={Colors.text.tertiary} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by name or phone..."
                    placeholderTextColor={Colors.text.tertiary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <X size={20} color={Colors.text.tertiary} />
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.contentContainer}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {filteredLeads.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No guests found</Text>
                    </View>
                ) : (
                    filteredLeads.map((lead) => (
                        <View key={lead.id} style={styles.card}>
                            <View style={styles.cardHeader}>
                                <View>
                                    <Text style={styles.cardTitle}>{lead.client_name}</Text>
                                    <View style={styles.phoneContainer}>
                                        <Phone size={14} color={Colors.text.secondary} />
                                        <Text style={styles.phoneText}>{lead.contact_number}</Text>
                                    </View>
                                </View>
                                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(lead.status) + '20' }]}>
                                    <Text style={[styles.statusText, { color: getStatusColor(lead.status) }]}>
                                        {lead.status?.replace(/_/g, ' ').toUpperCase()}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.cardBody}>
                                <View style={styles.infoRow}>
                                    <MapPin size={14} color={Colors.primary} />
                                    <Text style={styles.infoText}>{lead.place}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Users size={14} color={Colors.primary} />
                                    <Text style={styles.infoText}>{lead.no_of_pax} Pax</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Calendar size={14} color={Colors.primary} />
                                    <Text style={styles.infoText}>
                                        {lead.travel_date || lead.travel_month || 'TBD'}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.cardActions}>
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.editButton]}
                                    onPress={() => handleEdit(lead)}
                                >
                                    <Edit2 size={18} color={Colors.primary} />
                                    <Text style={styles.actionButtonText}>Edit</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.actionButton, styles.deleteButton]}
                                    onPress={() => handleDelete(lead.id)}
                                >
                                    <Trash2 size={18} color={Colors.status.error} />
                                    <Text style={[styles.actionButtonText, styles.deleteText]}>Delete</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>

            <Modal
                visible={showEditModal}
                animationType="slide"
                transparent={false}
                onRequestClose={() => setShowEditModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Edit Guest Details</Text>
                        <TouchableOpacity onPress={() => setShowEditModal(false)}>
                            <X size={24} color={Colors.text.primary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalContent}>
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Client Name</Text>
                            <TextInput
                                style={styles.input}
                                value={editForm.client_name}
                                onChangeText={(t) => setEditForm(prev => ({ ...prev, client_name: t }))}
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Contact Number</Text>
                            <TextInput
                                style={styles.input}
                                value={editForm.contact_number}
                                onChangeText={(t) => setEditForm(prev => ({ ...prev, contact_number: t }))}
                                keyboardType="phone-pad"
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Destination</Text>
                            <TextInput
                                style={styles.input}
                                value={editForm.place}
                                onChangeText={(t) => setEditForm(prev => ({ ...prev, place: t }))}
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>No. of Pax</Text>
                            <TextInput
                                style={styles.input}
                                value={editForm.no_of_pax}
                                onChangeText={(t) => setEditForm(prev => ({ ...prev, no_of_pax: t }))}
                                keyboardType="numeric"
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Budget</Text>
                            <TextInput
                                style={styles.input}
                                value={editForm.expected_budget}
                                onChangeText={(t) => setEditForm(prev => ({ ...prev, expected_budget: t }))}
                                keyboardType="numeric"
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Travel Date</Text>
                            <DateTimePickerComponent
                                value={editForm.travel_date}
                                onChange={(d) => setEditForm(prev => ({ ...prev, travel_date: d }))}
                                mode="date"
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Or Travel Month</Text>
                            <TextInput
                                style={styles.input}
                                value={editForm.travel_month}
                                onChangeText={(t) => setEditForm(prev => ({ ...prev, travel_month: t }))}
                                placeholder="e.g. October 2024"
                            />
                        </View>
                    </ScrollView>

                    <View style={styles.modalFooter}>
                        <TouchableOpacity
                            style={[styles.saveButton, saving && styles.disabledButton]}
                            onPress={handleSaveEdit}
                            disabled={saving}
                        >
                            {saving ? (
                                <ActivityIndicator color={Colors.text.inverse} />
                            ) : (
                                <>
                                    <Save size={20} color={Colors.text.inverse} />
                                    <Text style={styles.saveButtonText}>Save Changes</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const getStatusColor = (status: string | undefined) => {
    switch (status) {
        case 'confirmed': return Colors.status.success;
        case 'hot': return '#ef4444';
        case 'dead': return Colors.text.tertiary;
        default: return Colors.primary;
    }
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
        padding: 8,
        borderRadius: Layout.radius.full,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.text.primary,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        margin: Layout.spacing.lg,
        paddingHorizontal: Layout.spacing.md,
        borderRadius: Layout.radius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        height: 50,
    },
    searchInput: {
        flex: 1,
        height: '100%',
        marginLeft: 10,
        color: Colors.text.primary,
        fontSize: 16,
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: Layout.spacing.lg,
        paddingTop: 0,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 40,
    },
    emptyText: {
        fontSize: 16,
        color: Colors.text.tertiary,
    },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: Layout.radius.lg,
        padding: Layout.spacing.md,
        marginBottom: Layout.spacing.md,
        ...Layout.shadows.sm,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text.primary,
        marginBottom: 4,
    },
    phoneContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    phoneText: {
        fontSize: 14,
        color: Colors.text.secondary,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: Layout.radius.sm,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700',
    },
    cardBody: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    infoText: {
        fontSize: 14,
        color: Colors.text.secondary,
    },
    cardActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: Layout.radius.md,
        borderWidth: 1,
    },
    editButton: {
        borderColor: Colors.primary,
        backgroundColor: Colors.surface,
    },
    deleteButton: {
        borderColor: Colors.status.error,
        backgroundColor: Colors.surface,
    },
    actionButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.primary,
    },
    deleteText: {
        color: Colors.status.error,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    modalHeader: {
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
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.text.primary,
    },
    modalContent: {
        flex: 1,
        padding: Layout.spacing.lg,
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text.secondary,
        marginBottom: 8,
    },
    input: {
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Layout.radius.lg,
        padding: 14,
        fontSize: 16,
        color: Colors.text.primary,
    },
    modalFooter: {
        padding: Layout.spacing.lg,
        backgroundColor: Colors.surface,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    saveButton: {
        backgroundColor: Colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: Layout.radius.lg,
        gap: 8,
    },
    saveButtonText: {
        color: Colors.text.inverse,
        fontSize: 16,
        fontWeight: '700',
    },
    disabledButton: {
        opacity: 0.7,
    },
});
