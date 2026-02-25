import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Linking, Share } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Lead } from '@/types';
import { ArrowLeft, Phone, MessageCircle, MapPin, Users, Calendar, DollarSign, Download } from 'lucide-react-native';
import { Colors, Layout } from '@/constants/Colors';

export default function NoResponseLeadsScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [leads, setLeads] = useState<Lead[]>([]);

    useEffect(() => {
        fetchNoResponseLeads();
    }, []);

    const fetchNoResponseLeads = async () => {
        try {
            const { data, error } = await supabase
                .from('leads')
                .select('*')
                .eq('assigned_to', user?.id)
                .eq('status', 'no_response')
                .order('updated_at', { ascending: false });

            if (error) throw error;
            setLeads(data || []);
        } catch (err: any) {
            console.error('Error fetching no-response leads:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCall = (phoneNumber: string) => {
        const url = `tel:${phoneNumber}`;
        Linking.openURL(url).catch((err) => {
            console.error('Error opening dialer:', err);
        });
    };

    const handleWhatsApp = (phoneNumber: string, clientName: string, place: string) => {
        const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
        const message = `Hello ${clientName}, I'm following up regarding your travel inquiry for ${place}.`;
        const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
        Linking.openURL(url).catch((err) => {
            console.error('Error opening WhatsApp:', err);
        });
    };

    const handleExport = async () => {
        if (leads.length === 0) {
            alert('No data to export');
            return;
        }

        const csvHeader = 'Name,Contact,Place,Pax,Budget,Call Count,Last Updated\n';
        const csvData = leads.map(lead =>
            `"${lead.client_name}","${lead.contact_number || ''}","${lead.place}",${lead.no_of_pax},"₹${lead.expected_budget || 0}",${lead.call_count || 0},"${new Date(lead.updated_at).toLocaleDateString()}"`
        ).join('\n');

        const csv = csvHeader + csvData;

        try {
            await Share.share({
                message: csv,
                title: 'No Response Leads Export',
            });
        } catch (err: any) {
            console.error('Error sharing data:', err);
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
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <View style={styles.iconContainer}>
                        <ArrowLeft size={24} color={Colors.text.primary} />
                    </View>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>No Response Leads</Text>
                <TouchableOpacity onPress={handleExport} style={styles.exportButton}>
                    <Download size={20} color={Colors.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
                {leads.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No unresponsive leads</Text>
                        <Text style={styles.emptySubtext}>Leads marked as no response will appear here</Text>
                    </View>
                ) : (
                    leads.map((lead) => (
                        <View key={lead.id} style={styles.leadCard}>
                            <View style={styles.leadHeader}>
                                <Text style={styles.leadName}>{lead.client_name}</Text>
                                <View style={styles.callBadge}>
                                    <Text style={styles.callBadgeText}>{lead.call_count || 0} calls</Text>
                                </View>
                            </View>

                            <View style={styles.leadDetails}>
                                <View style={styles.detailRow}>
                                    <View style={styles.detailRowContent}>
                                        <View style={styles.iconContainer}>
                                            <MapPin size={16} color={Colors.text.secondary} />
                                        </View>
                                        <Text style={styles.detailText}>{lead.place}</Text>
                                    </View>
                                </View>
                                <View style={styles.detailRow}>
                                    <View style={styles.detailRowContent}>
                                        <View style={styles.iconContainer}>
                                            <Users size={16} color={Colors.text.secondary} />
                                        </View>
                                        <Text style={styles.detailText}>{lead.no_of_pax} Pax</Text>
                                    </View>
                                </View>
                                <View style={styles.detailRow}>
                                    <View style={styles.detailRowContent}>
                                        <View style={styles.iconContainer}>
                                            <Calendar size={16} color={Colors.text.secondary} />
                                        </View>
                                        <Text style={styles.detailText}>
                                            {lead.travel_date || lead.travel_month || 'Date TBD'}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.detailRow}>
                                    <View style={styles.detailRowContent}>
                                        <View style={styles.iconContainer}>
                                            <DollarSign size={16} color={Colors.text.secondary} />
                                        </View>
                                        <Text style={styles.detailText}>₹{lead.expected_budget || 0}</Text>
                                    </View>
                                </View>
                            </View>

                            {lead.remark && (
                                <View style={styles.remarkContainer}>
                                    <Text style={styles.remarkLabel}>Remark:</Text>
                                    <Text style={styles.remarkText}>{lead.remark}</Text>
                                </View>
                            )}

                            <View style={styles.actionButtons}>
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.callButton, !lead.contact_number && styles.disabledButton]}
                                    onPress={() => lead.contact_number && handleCall(lead.contact_number)}
                                    disabled={!lead.contact_number}
                                >
                                    <View style={styles.buttonContent}>
                                        <View style={styles.iconContainer}>
                                            <Phone size={20} color={Colors.text.inverse} />
                                        </View>
                                        <Text style={styles.actionButtonText}>Retry Call</Text>
                                    </View>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.actionButton, styles.whatsappButton, !lead.contact_number && styles.disabledButton]}
                                    onPress={() => lead.contact_number && handleWhatsApp(lead.contact_number, lead.client_name, lead.place)}
                                    disabled={!lead.contact_number}
                                >
                                    <View style={styles.buttonContent}>
                                        <View style={styles.iconContainer}>
                                            <MessageCircle size={20} color={Colors.text.inverse} />
                                        </View>
                                        <Text style={styles.actionButtonText}>WhatsApp</Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>
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
        ...Layout.shadows.sm,
    },
    backButton: {
        padding: 4,
        borderRadius: Layout.radius.full,
    },
    exportButton: {
        padding: 8,
        borderRadius: Layout.radius.md,
        backgroundColor: Colors.background,
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
        fontWeight: '600',
        color: Colors.text.secondary,
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: Colors.text.tertiary,
        textAlign: 'center',
    },
    leadCard: {
        backgroundColor: Colors.surface,
        borderRadius: Layout.radius.xl,
        padding: Layout.spacing.lg,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: Colors.status.warning,
        ...Layout.shadows.sm,
    },
    leadHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    leadName: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text.primary,
        flex: 1,
    },
    callBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: Layout.radius.sm,
        backgroundColor: Colors.status.warning,
    },
    callBadgeText: {
        color: Colors.text.inverse,
        fontSize: 12,
        fontWeight: '700',
    },
    leadDetails: {
        gap: 8,
        marginBottom: 12,
    },
    detailRow: {
        marginBottom: 4,
    },
    detailRowContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    iconContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    detailText: {
        fontSize: 14,
        color: Colors.text.secondary,
    },
    remarkContainer: {
        backgroundColor: Colors.surfaceHighlight,
        padding: 12,
        borderRadius: Layout.radius.md,
        marginBottom: 12,
    },
    remarkLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.text.secondary,
        marginBottom: 4,
    },
    remarkText: {
        fontSize: 14,
        color: Colors.text.primary,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
        flex: 1,
        padding: 12,
        borderRadius: Layout.radius.lg,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    callButton: {
        backgroundColor: Colors.primary,
    },
    whatsappButton: {
        backgroundColor: '#25D366',
    },
    actionButtonText: {
        color: Colors.text.inverse,
        fontSize: 14,
        fontWeight: '600',
    },
    disabledButton: {
        opacity: 0.5,
    },
});
