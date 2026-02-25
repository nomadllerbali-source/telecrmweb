import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase, setUserContext } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { User } from '@/types';
import { ArrowLeft, ChevronDown, Check, Save, Target as TargetIcon, Calendar, Users, TrendingUp, Award, Wallet } from 'lucide-react-native';
import { Colors, Layout } from '@/constants/Colors';

interface Target {
    id?: string;
    user_id: string;
    month: string;
    year: number;
    target_leads: number;
    target_conversions: number;
    target_revenue: number;
}

export default function ManageTargetsScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [salesPersons, setSalesPersons] = useState<User[]>([]);
    const [targets, setTargets] = useState<Record<string, Target>>({});

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const currentMonth = months[new Date().getMonth()];
    const currentYear = new Date().getFullYear();

    const [selectedMonth, setSelectedMonth] = useState(currentMonth);
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [showMonthPicker, setShowMonthPicker] = useState(false);

    const years = Array.from({ length: 3 }, (_, i) => currentYear - 1 + i);

    useEffect(() => {
        fetchInitialData();
    }, [selectedMonth, selectedYear]);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            // Set user context for RLS
            if (user) {
                await setUserContext(user.id, user.role);
            }

            // Fetch Sales Persons
            const { data: users, error: usersError } = await supabase
                .from('users')
                .select('*')
                .eq('role', 'sales')
                .eq('status', 'active');

            if (usersError) throw usersError;
            setSalesPersons(users || []);

            // Fetch existing targets for selected month/year
            const { data: existingTargets, error: targetsError } = await supabase
                .from('targets')
                .select('*')
                .eq('month', selectedMonth)
                .eq('year', selectedYear);

            if (targetsError) throw targetsError;

            const targetMap: Record<string, Target> = {};
            users?.forEach(user => {
                const existing = existingTargets?.find(t => t.user_id === user.id);
                targetMap[user.id] = existing || {
                    user_id: user.id,
                    month: selectedMonth,
                    year: selectedYear,
                    target_leads: 0,
                    target_conversions: 0,
                    target_revenue: 0,
                };
            });
            setTargets(targetMap);
        } catch (err: any) {
            console.error('Error fetching targets data:', err);
            Alert.alert('Error', 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateTarget = (userId: string, field: keyof Target, value: string) => {
        const numValue = value === '' ? 0 : parseFloat(value);
        setTargets(prev => ({
            ...prev,
            [userId]: {
                ...prev[userId],
                [field]: isNaN(numValue) ? 0 : numValue
            }
        }));
    };

    const handleSave = async () => {
        if (Object.keys(targets).length === 0) {
            Alert.alert('Info', 'No targets to save');
            return;
        }

        setSaving(true);
        try {
            const targetsToSave = Object.values(targets).map(t => ({
                user_id: t.user_id,
                month: t.month,
                year: Number(t.year),
                target_leads: Math.round(Number(t.target_leads) || 0),
                target_conversions: Math.round(Number(t.target_conversions) || 0),
                target_revenue: Number(t.target_revenue) || 0
            }));

            const { error } = await supabase.rpc('upsert_monthly_targets', {
                target_data: targetsToSave
            });

            if (error) throw error;

            Alert.alert('Success', 'Targets saved successfully');
            fetchInitialData();
        } catch (err: any) {
            console.error('Catch error in handleSave:', err);
            Alert.alert('Error', `Failed to save targets: ${err.message || 'Check console logs'}`);
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
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <View style={styles.iconButton}>
                        <ArrowLeft size={24} color={Colors.text.primary} />
                    </View>
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Monthly Targets</Text>
                    <Text style={styles.headerSubtitle}>Set goals for your team</Text>
                </View>
                <TouchableOpacity
                    onPress={handleSave}
                    disabled={saving}
                    style={[styles.saveButton, saving && { opacity: 0.5 }]}
                >
                    {saving ? (
                        <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                        <View style={styles.saveButtonInner}>
                            <Save size={20} color={Colors.primary} />
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            <View style={styles.filterBar}>
                <TouchableOpacity style={styles.pickerButton} onPress={() => setShowMonthPicker(true)}>
                    <View style={styles.pickerIconBg}>
                        <Calendar size={18} color={Colors.primary} />
                    </View>
                    <Text style={styles.pickerButtonText}>{selectedMonth} {selectedYear}</Text>
                    <ChevronDown size={20} color={Colors.text.tertiary} />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
                <View style={styles.teamHeader}>
                    <Users size={18} color={Colors.text.secondary} />
                    <Text style={styles.teamTitle}>Sales Team ({salesPersons.length})</Text>
                </View>

                {salesPersons.map((person) => (
                    <View key={person.id} style={styles.targetCard}>
                        <View style={styles.cardHeader}>
                            <View style={styles.avatarSmall}>
                                <Text style={styles.avatarSmallText}>{person.full_name.charAt(0)}</Text>
                            </View>
                            <Text style={styles.personName}>{person.full_name}</Text>
                        </View>

                        <View style={styles.inputGrid}>
                            <View style={[styles.inputItem, { flex: 1 }]}>
                                <View style={styles.inputLabelRow}>
                                    <TrendingUp size={12} color={Colors.text.tertiary} />
                                    <Text style={styles.inputLabel}>Leads</Text>
                                </View>
                                <TextInput
                                    style={styles.input}
                                    keyboardType="numeric"
                                    placeholder="0"
                                    placeholderTextColor={Colors.text.tertiary}
                                    value={(targets[person.id]?.target_leads ?? 0).toString()}
                                    onChangeText={(val) => handleUpdateTarget(person.id, 'target_leads', val)}
                                />
                            </View>

                            <View style={[styles.inputItem, { flex: 1 }]}>
                                <View style={styles.inputLabelRow}>
                                    <Award size={12} color={Colors.text.tertiary} />
                                    <Text style={styles.inputLabel}>Wins</Text>
                                </View>
                                <TextInput
                                    style={styles.input}
                                    keyboardType="numeric"
                                    placeholder="0"
                                    placeholderTextColor={Colors.text.tertiary}
                                    value={(targets[person.id]?.target_conversions ?? 0).toString()}
                                    onChangeText={(val) => handleUpdateTarget(person.id, 'target_conversions', val)}
                                />
                            </View>

                            <View style={[styles.inputItem, { flex: 2 }]}>
                                <View style={styles.inputLabelRow}>
                                    <Wallet size={12} color={Colors.text.tertiary} />
                                    <Text style={styles.inputLabel}>Revenue (₹)</Text>
                                </View>
                                <TextInput
                                    style={styles.input}
                                    keyboardType="numeric"
                                    placeholder="0.00"
                                    placeholderTextColor={Colors.text.tertiary}
                                    value={(targets[person.id]?.target_revenue ?? 0).toString()}
                                    onChangeText={(val) => handleUpdateTarget(person.id, 'target_revenue', val)}
                                />
                            </View>
                        </View>
                    </View>
                ))}

                {salesPersons.length === 0 && (
                    <View style={styles.emptyContainer}>
                        <Users size={48} color={Colors.surfaceHighlight} />
                        <Text style={styles.emptyText}>No active sales persons found</Text>
                    </View>
                )}

                <View style={styles.spacer} />
            </ScrollView>

            <Modal visible={showMonthPicker} transparent animationType="fade">
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowMonthPicker(false)}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Period</Text>
                            <TouchableOpacity onPress={() => setShowMonthPicker(false)} style={styles.modalClose}>
                                <Text style={styles.modalCloseText}>Done</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                            {years.map(year => (
                                <View key={year} style={styles.yearSection}>
                                    <View style={styles.yearHeaderRow}>
                                        <Text style={styles.yearLabel}>{year}</Text>
                                        <View style={styles.yearDivider} />
                                    </View>
                                    <View style={styles.monthGrid}>
                                        {months.map(month => (
                                            <TouchableOpacity
                                                key={`${month}-${year}`}
                                                style={[
                                                    styles.monthChip,
                                                    selectedMonth === month && selectedYear === year && styles.activeMonthChip
                                                ]}
                                                onPress={() => {
                                                    setSelectedMonth(month);
                                                    setSelectedYear(year);
                                                    setShowMonthPicker(false);
                                                }}
                                            >
                                                <Text style={[
                                                    styles.monthChipText,
                                                    selectedMonth === month && selectedYear === year && styles.activeMonthChipText
                                                ]}>{month.substring(0, 3)}</Text>
                                                {selectedMonth === month && selectedYear === year && (
                                                    <View style={styles.activeDot} />
                                                )}
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>
        </KeyboardAvoidingView>
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
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.text.primary,
    },
    headerSubtitle: {
        fontSize: 12,
        color: Colors.text.secondary,
        marginTop: 2,
        fontWeight: '500',
    },
    backButton: {
        marginLeft: -Layout.spacing.sm,
    },
    iconButton: {
        padding: 8,
        borderRadius: Layout.radius.full,
        backgroundColor: Colors.background,
    },
    saveButton: {
        marginRight: -Layout.spacing.sm,
    },
    saveButtonInner: {
        padding: 8,
        borderRadius: Layout.radius.full,
        backgroundColor: Colors.primary + '15',
        borderWidth: 1,
        borderColor: Colors.primary + '30',
    },
    filterBar: {
        padding: Layout.spacing.lg,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    pickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.background,
        borderRadius: Layout.radius.xl,
        padding: 12,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    pickerIconBg: {
        width: 32,
        height: 32,
        borderRadius: Layout.radius.md,
        backgroundColor: Colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    pickerButtonText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text.primary,
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: Layout.spacing.lg,
    },
    teamHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    teamTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: Colors.text.secondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    targetCard: {
        backgroundColor: Colors.surface,
        borderRadius: Layout.radius.xl,
        padding: Layout.spacing.lg,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Layout.shadows.md,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20,
    },
    avatarSmall: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.primary + '30',
    },
    avatarSmallText: {
        fontSize: 15,
        fontWeight: '800',
        color: Colors.primary,
    },
    personName: {
        fontSize: 17,
        fontWeight: '800',
        color: Colors.text.primary,
    },
    inputGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    inputItem: {
        minWidth: '45%',
    },
    inputLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
        marginLeft: 4,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.text.secondary,
        textTransform: 'uppercase',
    },
    input: {
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Layout.radius.lg,
        padding: 14,
        fontSize: 16,
        color: Colors.text.primary,
        fontWeight: '700',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: Layout.radius.xl,
        borderTopRightRadius: Layout.radius.xl,
        padding: Layout.spacing.lg,
        paddingBottom: 40,
        maxHeight: '80%',
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: Colors.text.primary,
    },
    modalClose: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: Layout.radius.full,
        backgroundColor: Colors.primary + '15',
    },
    modalCloseText: {
        color: Colors.primary,
        fontWeight: '800',
        fontSize: 14,
    },
    yearSection: {
        marginBottom: 24,
    },
    yearHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    yearLabel: {
        fontSize: 14,
        fontWeight: '900',
        color: Colors.text.tertiary,
        letterSpacing: 2,
    },
    yearDivider: {
        flex: 1,
        height: 1,
        backgroundColor: Colors.border,
    },
    monthGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    monthChip: {
        flex: 1,
        minWidth: '30%',
        backgroundColor: Colors.background,
        paddingVertical: 14,
        borderRadius: Layout.radius.lg,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    activeMonthChip: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primary + '10',
    },
    monthChipText: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.text.secondary,
        textTransform: 'uppercase',
    },
    activeMonthChipText: {
        color: Colors.primary,
    },
    activeDot: {
        position: 'absolute',
        top: 6,
        right: 6,
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: Colors.primary,
    },
    emptyContainer: {
        paddingVertical: 60,
        alignItems: 'center',
        gap: 16,
    },
    emptyText: {
        fontSize: 15,
        color: Colors.text.tertiary,
        textAlign: 'center',
        fontWeight: '600',
    },
    spacer: {
        height: 40,
    }
});
