import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, TextInput, Modal, FlatList, StatusBar as RNStatusBar } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Lead, Itinerary, FollowUp, User } from '@/types';
import { ArrowLeft, Search, Phone, MapPin, Users, Calendar, X, Clock, FileText, ChevronRight, UserCircle, Target, CheckCircle2 } from 'lucide-react-native';
import { Colors, Layout } from '@/constants/Colors';

export default function SalesPersonLeadsScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const [loading, setLoading] = useState(true);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [salesPersonName, setSalesPersonName] = useState('');

    // Detail Modal State
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [leadItinerary, setLeadItinerary] = useState<Itinerary | null>(null);
    const [leadFollowUps, setLeadFollowUps] = useState<FollowUp[]>([]);

    // Reassignment State
    const [showReassignModal, setShowReassignModal] = useState(false);
    const [salesPersons, setSalesPersons] = useState<User[]>([]);
    const [reassigning, setReassigning] = useState(false);

    useEffect(() => {
        if (id) {
            fetchSalesPersonName();
            fetchLeads();
            fetchSalesPersons();
        }
    }, [id]);

    useEffect(() => {
        filterLeads();
    }, [searchQuery, leads]);

    const fetchSalesPersonName = async () => {
        const { data } = await supabase.from('users').select('full_name').eq('id', id).single();
        if (data) setSalesPersonName(data.full_name);
    };

    const fetchLeads = async () => {
        try {
            const { data, error } = await supabase
                .from('leads')
                .select('*')
                .eq('assigned_to', id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setLeads(data || []);
            setFilteredLeads(data || []);
        } catch (err: any) {
            console.error('Error fetching leads:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchSalesPersons = async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('role', 'sales')
                .eq('status', 'active');
            if (error) throw error;
            setSalesPersons(data || []);
        } catch (err: any) {
            console.error('Error fetching sales persons:', err);
        }
    };

    const handleReassign = async (targetUserId: string) => {
        if (!selectedLead) return;

        setReassigning(true);
        try {
            const { error: updateError } = await supabase
                .from('leads')
                .update({ assigned_to: targetUserId })
                .eq('id', selectedLead.id);

            if (updateError) throw updateError;

            // Log follow up for reassignment
            await supabase.from('follow_ups').insert({
                lead_id: selectedLead.id,
                sales_person_id: targetUserId,
                follow_up_date: new Date().toISOString(),
                status: 'completed',
                update_type: 'follow_up',
                remark: `Lead reassigned from ${salesPersonName}`,
            });

            // Send notification
            const targetSP = salesPersons.find(sp => sp.id === targetUserId);
            if (targetSP) {
                await supabase.from('notifications').insert({
                    user_id: targetUserId,
                    type: 'lead_assigned',
                    title: 'New Lead Reassigned',
                    message: `${selectedLead.client_name} from ${selectedLead.place} has been reassigned to you from ${salesPersonName}.`,
                    lead_id: selectedLead.id,
                });
            }

            setShowReassignModal(false);
            setShowDetailModal(false);
            fetchLeads();
        } catch (err: any) {
            console.error('Error reassigning lead:', err);
        } finally {
            setReassigning(false);
        }
    };

    const filterLeads = () => {
        if (!searchQuery.trim()) {
            setFilteredLeads(leads);
            return;
        }
        const query = searchQuery.toLowerCase();
        const filtered = leads.filter(
            (lead) =>
                (lead.client_name?.toLowerCase().includes(query) || '') ||
                (lead.contact_number?.includes(query) || '')
        );
        setFilteredLeads(filtered);
    };

    const handleLeadClick = async (lead: Lead) => {
        setSelectedLead(lead);
        setShowDetailModal(true);
        setLoadingDetails(true);
        setLeadItinerary(null);
        setLeadFollowUps([]);

        try {
            // Fetch latest itinerary linking to this lead (via follow_ups)
            const { data: itineraryData } = await supabase
                .from('follow_ups')
                .select('itinerary_id')
                .eq('lead_id', lead.id)
                .not('itinerary_id', 'is', null)
                .order('created_at', { ascending: false })
                .limit(1);

            if (itineraryData && itineraryData.length > 0) {
                const itinId = itineraryData[0].itinerary_id;
                const { data: fullItin } = await supabase
                    .from('itineraries')
                    .select('*')
                    .eq('id', itinId)
                    .single();
                setLeadItinerary(fullItin);
            }

            // Fetch all follow-ups
            const { data: followUpsData } = await supabase
                .from('follow_ups')
                .select('*')
                .eq('lead_id', lead.id)
                .order('created_at', { ascending: false });

            setLeadFollowUps(followUpsData || []);

        } catch (error) {
            console.error("Error fetching lead details", error);
        } finally {
            setLoadingDetails(false);
        }
    };

    const formatDateTime = (dateString: string) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleString();
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
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>Assigned Guests</Text>
                    <View style={styles.executiveBadge}>
                        <UserCircle size={10} color={Colors.primary} />
                        <Text style={styles.headerSubtitle}>{salesPersonName}</Text>
                    </View>
                </View>
                <View style={{ width: 44 }} />
            </View>

            <View style={styles.searchContainer}>
                <Search size={20} color={Colors.text.tertiary} style={{ marginRight: 12 }} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by name or phone..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor={Colors.text.tertiary}
                    selectionColor={Colors.primary}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                        <X size={16} color={Colors.text.secondary} />
                    </TouchableOpacity>
                )}
            </View>

            <FlatList
                data={filteredLeads}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                    <TouchableOpacity style={styles.card} onPress={() => handleLeadClick(item)}>
                        <View style={styles.cardHeader}>
                            <View>
                                <Text style={styles.clientName}>{item.client_name}</Text>
                                <View style={styles.locRow}>
                                    <MapPin size={12} color={Colors.text.tertiary} />
                                    <Text style={styles.cardSubtitle}>{item.place}</Text>
                                </View>
                            </View>
                            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
                                <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                                    {item.status.toUpperCase()}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.cardDivider} />

                        <View style={styles.cardFooter}>
                            <View style={styles.footerItem}>
                                <Users size={14} color={Colors.text.tertiary} />
                                <Text style={styles.cardText}>{item.no_of_pax} Pax</Text>
                            </View>
                            <View style={styles.footerItem}>
                                <Calendar size={14} color={Colors.text.tertiary} />
                                <Text style={styles.cardText}>
                                    {item.travel_date ? new Date(item.travel_date).toLocaleDateString() : item.travel_month || 'TBD'}
                                </Text>
                            </View>
                            <ChevronRight size={16} color={Colors.text.tertiary} />
                        </View>
                    </TouchableOpacity>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Target size={64} color={Colors.surfaceHighlight} />
                        <Text style={styles.emptyText}>No leads assigned yet.</Text>
                        <Text style={styles.emptySubtext}>Assigned leads will appear here for monitoring.</Text>
                    </View>
                }
                ListFooterComponent={<View style={{ height: 40 }} />}
            />

            {/* Detail Modal */}
            <Modal
                visible={showDetailModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowDetailModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <View style={styles.modalHeaderLine} />
                        <View style={styles.modalHeaderContent}>
                            <Text style={styles.modalTitle}>Guest Evaluation</Text>
                            <TouchableOpacity onPress={() => setShowDetailModal(false)} style={styles.modalCloseButton}>
                                <X size={20} color={Colors.text.primary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {loadingDetails ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={Colors.primary} />
                        </View>
                    ) : (
                        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                            {/* Guest Info */}
                            <View style={styles.section}>
                                <View style={styles.sectionHeaderRow}>
                                    <Text style={styles.sectionTitle}>Profile Brief</Text>
                                    <TouchableOpacity
                                        style={styles.reassignButton}
                                        onPress={() => setShowReassignModal(true)}
                                    >
                                        <Users size={14} color={Colors.text.inverse} />
                                        <Text style={styles.reassignButtonText}>Reassign Lead</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.profileSection}>
                                    <View style={styles.profileAvatar}>
                                        <Text style={styles.profileAvatarText}>{selectedLead?.client_name?.charAt(0)}</Text>
                                    </View>
                                    <View>
                                        <Text style={styles.detailName}>{selectedLead?.client_name}</Text>
                                        <Text style={styles.detailPhone}>{selectedLead?.contact_number}</Text>
                                    </View>
                                </View>
                                <View style={styles.gridInfo}>
                                    <View style={styles.gridItem}>
                                        <Text style={styles.gridLabel}>Travel to</Text>
                                        <Text style={styles.gridValue}>{selectedLead?.place}</Text>
                                    </View>
                                    <View style={styles.gridItem}>
                                        <Text style={styles.gridLabel}>No. of Pax</Text>
                                        <Text style={styles.gridValue}>{selectedLead?.no_of_pax} People</Text>
                                    </View>
                                    <View style={styles.gridItem}>
                                        <Text style={styles.gridLabel}>Budget</Text>
                                        <Text style={styles.gridValue}>{selectedLead?.expected_budget || 'N/A'}</Text>
                                    </View>
                                    <View style={styles.gridItem}>
                                        <Text style={styles.gridLabel}>Source</Text>
                                        <Text style={styles.gridValue}>{selectedLead?.lead_source || 'Unknown'}</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Itinerary Details */}
                            <View style={styles.section}>
                                <View style={styles.sectionHeaderRow}>
                                    <Text style={styles.sectionTitle}>Shared Itinerary</Text>
                                    {leadItinerary && (
                                        <View style={styles.activeBadge}>
                                            <CheckCircle2 size={12} color={Colors.status.success} />
                                            <Text style={styles.activeText}>Active</Text>
                                        </View>
                                    )}
                                </View>
                                {leadItinerary ? (
                                    <View style={styles.itineraryCardDetails}>
                                        <View style={styles.itinTitleRow}>
                                            <FileText size={20} color={Colors.primary} />
                                            <Text style={styles.itineraryName}>{leadItinerary.name}</Text>
                                        </View>
                                        <Text style={styles.itineraryDetail}>{leadItinerary.days} Days • {leadItinerary.no_of_pax} Pax • {leadItinerary.mode_of_transport?.replace(/_/g, ' ')}</Text>
                                        <View style={styles.costBadge}>
                                            <Text style={styles.itineraryCost}>₹{leadItinerary.cost_inr.toLocaleString()}</Text>
                                        </View>

                                        <Text style={styles.subHeader}>Package Details:</Text>
                                        <View style={styles.itinScrollContent}>
                                            <Text style={styles.itineraryText}>{leadItinerary.full_itinerary}</Text>
                                        </View>
                                    </View>
                                ) : (
                                    <View style={styles.emptyCard}>
                                        <FileText size={40} color={Colors.surfaceHighlight} />
                                        <Text style={styles.emptySectionText}>No itinerary has been shared yet.</Text>
                                    </View>
                                )}
                            </View>

                            {/* Follow-up History */}
                            <View style={[styles.section, { marginBottom: 40 }]}>
                                <Text style={styles.sectionTitle}>Engagement History</Text>
                                {leadFollowUps.length === 0 ? (
                                    <View style={styles.emptyCard}>
                                        <Clock size={40} color={Colors.surfaceHighlight} />
                                        <Text style={styles.emptySectionText}>No activities recorded.</Text>
                                    </View>
                                ) : (
                                    <View style={styles.timelineContainer}>
                                        {leadFollowUps.map((fu, index) => (
                                            <View key={fu.id} style={[styles.timelineItem, index === leadFollowUps.length - 1 && { borderLeftWidth: 0 }]}>
                                                <View style={styles.timelinePoint}>
                                                    <View style={[styles.dot, { backgroundColor: getUpdateTypeColor(fu.update_type) }]} />
                                                </View>
                                                <View style={styles.timelineContent}>
                                                    <View style={styles.timelineHeader}>
                                                        <Text style={styles.timelineType}>
                                                            {fu.update_type?.replace(/_/g, ' ').toUpperCase() || 'UPDATE'}
                                                        </Text>
                                                        <Text style={styles.timelineDate}>{formatDateTime(fu.created_at)}</Text>
                                                    </View>
                                                    <View style={styles.remarkBox}>
                                                        <Text style={styles.timelineRemark}>{fu.remark}</Text>
                                                    </View>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>
                        </ScrollView>
                    )}
                </View>
            </Modal>

            {/* Reassign Modal */}
            <Modal
                visible={showReassignModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowReassignModal(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowReassignModal(false)}
                >
                    <View style={styles.selectionModal}>
                        <View style={styles.selectionHeader}>
                            <Text style={styles.selectionTitle}>Select Assignee</Text>
                            <TouchableOpacity onPress={() => setShowReassignModal(false)}>
                                <X size={24} color={Colors.text.primary} />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={salesPersons.filter(sp => sp.id !== id)}
                            keyExtractor={(item) => item.id}
                            style={{ maxHeight: 400 }}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.selectionItem}
                                    onPress={() => handleReassign(item.id)}
                                >
                                    <View style={styles.selectionAvatar}>
                                        <Text style={styles.selectionAvatarText}>{item.full_name?.charAt(0)}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.selectionItemTitle}>{item.full_name}</Text>
                                        <Text style={styles.selectionItemSubtitle}>{item.email}</Text>
                                    </View>
                                    <ChevronRight size={18} color={Colors.text.tertiary} />
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={
                                <Text style={styles.emptyTextSmall}>No other active sales persons available.</Text>
                            }
                        />
                        {reassigning && (
                            <View style={styles.reassigningOverlay}>
                                <ActivityIndicator size="large" color={Colors.primary} />
                                <Text style={styles.reassigningText}>Processing reassignment...</Text>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const getStatusColor = (status: string) => {
    switch (status) {
        case 'hot': return Colors.status.error;
        case 'confirmed': return Colors.status.success;
        case 'dead': return Colors.text.tertiary;
        default: return Colors.primary;
    }
};

const getUpdateTypeColor = (type: string | null) => {
    if (!type) return Colors.text.tertiary;
    if (type.includes('itinerary')) return Colors.primary;
    if (type.includes('confirmed')) return Colors.status.success;
    if (type.includes('dead')) return Colors.text.tertiary;
    return Colors.status.info;
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
    headerCenter: {
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text.primary,
    },
    headerSubtitle: {
        fontSize: 11,
        color: Colors.text.primary,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    executiveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: Colors.primary + '15',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: Layout.radius.xs,
        marginTop: 4,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        margin: Layout.spacing.lg,
        paddingHorizontal: 16,
        borderRadius: Layout.radius.lg,
        height: 50,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: Colors.text.primary,
    },
    clearButton: {
        padding: 4,
    },
    listContent: {
        paddingHorizontal: Layout.spacing.lg,
    },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: Layout.radius.xl,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Layout.shadows.md,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    clientName: {
        fontSize: 18,
        fontWeight: '800',
        color: Colors.text.primary,
        marginBottom: 4,
    },
    locRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    cardSubtitle: {
        fontSize: 13,
        color: Colors.text.tertiary,
        fontWeight: '600',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: Layout.radius.full,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    cardDivider: {
        height: 1,
        backgroundColor: Colors.divider,
        marginVertical: 12,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    footerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    cardText: {
        fontSize: 13,
        color: Colors.text.secondary,
        fontWeight: '600',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 80,
        gap: 16,
    },
    emptyText: {
        color: Colors.text.secondary,
        fontSize: 18,
        fontWeight: '700',
    },
    emptySubtext: {
        color: Colors.text.tertiary,
        fontSize: 14,
        textAlign: 'center',
    },
    // Modal Styles
    modalContainer: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    modalHeader: {
        alignItems: 'center',
        backgroundColor: Colors.surface,
        paddingTop: 8,
    },
    modalHeaderLine: {
        width: 40,
        height: 4,
        backgroundColor: Colors.divider,
        borderRadius: 2,
        marginBottom: 8,
    },
    modalHeaderContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: Colors.text.primary,
    },
    modalCloseButton: {
        backgroundColor: Colors.background,
        padding: 8,
        borderRadius: Layout.radius.full,
    },
    modalContent: {
        flex: 1,
        padding: 20,
    },
    section: {
        backgroundColor: Colors.surface,
        borderRadius: Layout.radius.xl,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: Colors.text.primary,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider,
    },
    profileSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 24,
    },
    profileAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: Colors.primary + '20',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.primary,
    },
    profileAvatarText: {
        fontSize: 24,
        fontWeight: '800',
        color: Colors.primary,
    },
    detailName: {
        fontSize: 22,
        fontWeight: '800',
        color: Colors.text.primary,
        marginBottom: 4,
    },
    detailPhone: {
        fontSize: 15,
        color: Colors.primary,
        fontWeight: '700',
    },
    gridInfo: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    gridItem: {
        width: '45%',
    },
    gridLabel: {
        fontSize: 11,
        color: Colors.text.tertiary,
        fontWeight: '700',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    gridValue: {
        fontSize: 14,
        color: Colors.text.secondary,
        fontWeight: '700',
    },
    reassignButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: Layout.radius.sm,
        gap: 8,
    },
    reassignButtonText: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.text.inverse,
    },
    activeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: Colors.status.success + '15',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: Layout.radius.xs,
    },
    activeText: {
        fontSize: 10,
        fontWeight: '800',
        color: Colors.status.success,
    },
    itineraryCardDetails: {
        gap: 12,
    },
    itinTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    itineraryName: {
        fontSize: 18,
        fontWeight: '800',
        color: Colors.text.primary,
        flex: 1,
    },
    itineraryDetail: {
        fontSize: 14,
        color: Colors.text.secondary,
        fontWeight: '600',
    },
    costBadge: {
        alignSelf: 'flex-start',
        backgroundColor: Colors.status.success + '15',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: Layout.radius.sm,
    },
    itineraryCost: {
        fontSize: 18,
        fontWeight: '800',
        color: Colors.status.success,
    },
    subHeader: {
        fontSize: 14,
        fontWeight: '800',
        color: Colors.text.primary,
        marginTop: 8,
    },
    itinScrollContent: {
        backgroundColor: Colors.background,
        padding: 16,
        borderRadius: Layout.radius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    itineraryText: {
        fontSize: 14,
        color: Colors.text.secondary,
        lineHeight: 22,
    },
    emptyCard: {
        alignItems: 'center',
        padding: 32,
        gap: 12,
    },
    emptySectionText: {
        color: Colors.text.tertiary,
        fontSize: 14,
        textAlign: 'center',
    },
    // Timeline Styles
    timelineContainer: {
        paddingLeft: 10,
    },
    timelineItem: {
        flexDirection: 'row',
        borderLeftWidth: 1,
        borderLeftColor: Colors.divider,
        paddingBottom: 24,
    },
    timelinePoint: {
        width: 12,
        height: 12,
        marginLeft: -6,
        marginRight: 16,
        marginTop: 4,
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: Colors.primary,
        borderWidth: 2,
        borderColor: Colors.surface,
    },
    timelineContent: {
        flex: 1,
    },
    timelineHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    timelineType: {
        fontSize: 12,
        fontWeight: '800',
        color: Colors.primary,
    },
    timelineDate: {
        fontSize: 11,
        color: Colors.text.tertiary,
        fontWeight: '600',
    },
    remarkBox: {
        backgroundColor: Colors.background,
        padding: 12,
        borderRadius: Layout.radius.lg,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    timelineRemark: {
        fontSize: 13,
        color: Colors.text.secondary,
        lineHeight: 18,
    },
    // Selection Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectionModal: {
        width: '90%',
        backgroundColor: Colors.surface,
        borderRadius: Layout.radius.xl,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    selectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: Colors.background,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    selectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: Colors.text.primary,
    },
    selectionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider,
        gap: 16,
    },
    selectionAvatar: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: Colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectionAvatarText: {
        fontSize: 18,
        fontWeight: '800',
        color: Colors.primary,
    },
    selectionItemTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text.primary,
    },
    selectionItemSubtitle: {
        fontSize: 12,
        color: Colors.text.tertiary,
    },
    emptyTextSmall: {
        padding: 40,
        textAlign: 'center',
        color: Colors.text.tertiary,
    },
    reassigningOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    },
    reassigningText: {
        color: Colors.text.primary,
        fontWeight: '700',
        fontSize: 16,
    }
});
