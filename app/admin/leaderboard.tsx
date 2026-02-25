import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase, setUserContext } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { User } from '@/types';
import { ArrowLeft, Trophy, Target, TrendingUp, Award, ChevronRight, Medal, Star } from 'lucide-react-native';
import { Colors, Layout } from '@/constants/Colors';

interface LeaderboardStats {
    id: string;
    name: string;
    leads: number;
    conversions: number;
    revenue: number;
    targets?: {
        leads: number;
        conversions: number;
        revenue: number;
    };
}

export default function LeaderboardScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<LeaderboardStats[]>([]);

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const currentMonth = months[new Date().getMonth()];
    const currentYear = new Date().getFullYear();

    useEffect(() => {
        fetchLeaderboard();
    }, []);

    const fetchLeaderboard = async () => {
        try {
            if (user) {
                await setUserContext(user.id, user.role);
            }

            const { data: salesPersons, error: usersError } = await supabase
                .from('users')
                .select('*')
                .eq('status', 'active')
                .eq('role', 'sales');

            if (usersError) throw usersError;

            const firstDayOfMonth = new Date(currentYear, new Date().getMonth(), 1).toISOString();

            const statsPromises = (salesPersons || []).map(async (person) => {
                const { count: leadsCount } = await supabase
                    .from('leads')
                    .select('*', { count: 'exact', head: true })
                    .eq('assigned_to', person.id)
                    .gte('created_at', firstDayOfMonth);

                const { data: confirmations } = await supabase
                    .from('confirmations')
                    .select('total_amount')
                    .eq('confirmed_by', person.id)
                    .gte('created_at', firstDayOfMonth);

                const revenue = (confirmations || []).reduce((sum, c) => sum + (c.total_amount || 0), 0);
                const conversions = confirmations?.length || 0;

                const { data: targetData } = await supabase
                    .from('targets')
                    .select('*')
                    .eq('user_id', person.id)
                    .eq('month', currentMonth)
                    .eq('year', currentYear)
                    .maybeSingle();

                return {
                    id: person.id,
                    name: person.full_name,
                    leads: leadsCount || 0,
                    conversions,
                    revenue,
                    targets: targetData ? {
                        leads: targetData.target_leads,
                        conversions: targetData.target_conversions,
                        revenue: targetData.target_revenue,
                    } : undefined
                };
            });

            const results = await Promise.all(statsPromises);
            results.sort((a, b) => b.conversions - a.conversions || b.revenue - a.revenue);
            setStats(results);
        } catch (err) {
            console.error('Error fetching leaderboard:', err);
        } finally {
            setLoading(false);
        }
    };

    const renderRankIcon = (index: number) => {
        switch (index) {
            case 0: return <Trophy size={28} color="#FFD700" />;
            case 1: return <Medal size={26} color="#C0C0C0" />;
            case 2: return <Medal size={24} color="#CD7F32" />;
            default: return <View style={styles.rankBadge}><Text style={styles.rankText}>{index + 1}</Text></View>;
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
                    <View style={styles.iconButton}>
                        <ArrowLeft size={24} color={Colors.text.primary} />
                    </View>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{currentMonth} Leaders</Text>
                <TouchableOpacity onPress={() => router.push('/admin/manage-targets')} style={styles.iconButton}>
                    <Target size={24} color={Colors.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
                {stats.length >= 3 && (
                    <View style={styles.podiumContainer}>
                        {/* 2nd Place */}
                        <View style={[styles.podiumItem, styles.podiumSecond]}>
                            <View style={styles.podiumAvatarContainer}>
                                <View style={[styles.podiumAvatar, { borderColor: '#C0C0C0' }]}>
                                    <Text style={styles.podiumAvatarText}>{stats[1].name.charAt(0)}</Text>
                                </View>
                                <View style={[styles.podiumBadge, { backgroundColor: '#C0C0C0' }]}>
                                    <Text style={styles.podiumBadgeText}>2</Text>
                                </View>
                            </View>
                            <Text style={styles.podiumName} numberOfLines={1}>{stats[1].name.split(' ')[0]}</Text>
                            <View style={styles.podiumStatRow}>
                                <Star size={10} color={Colors.text.tertiary} />
                                <Text style={styles.podiumWins}>{stats[1].conversions} Wins</Text>
                            </View>
                        </View>

                        {/* 1st Place */}
                        <View style={[styles.podiumItem, styles.podiumFirst]}>
                            <View style={styles.podiumAvatarContainer}>
                                <Trophy size={32} color="#FFD700" style={styles.trophyIcon} />
                                <View style={[styles.podiumAvatar, styles.podiumAvatarLarge, { borderColor: '#FFD700' }]}>
                                    <Text style={[styles.podiumAvatarText, { fontSize: 24 }]}>{stats[0].name.charAt(0)}</Text>
                                </View>
                                <View style={[styles.podiumBadge, { backgroundColor: '#FFD700', width: 28, height: 28, borderRadius: 14 }]}>
                                    <Text style={[styles.podiumBadgeText, { fontSize: 14 }]}>1</Text>
                                </View>
                            </View>
                            <Text style={[styles.podiumName, { fontSize: 16 }]} numberOfLines={1}>{stats[0].name.split(' ')[0]}</Text>
                            <View style={styles.podiumStatRow}>
                                <Star size={12} color={Colors.primary} />
                                <Text style={[styles.podiumWins, { color: Colors.primary, fontSize: 13 }]}>{stats[0].conversions} Wins</Text>
                            </View>
                        </View>

                        {/* 3rd Place */}
                        <View style={[styles.podiumItem, styles.podiumThird]}>
                            <View style={styles.podiumAvatarContainer}>
                                <View style={[styles.podiumAvatar, { borderColor: '#CD7F32' }]}>
                                    <Text style={styles.podiumAvatarText}>{stats[2].name.charAt(0)}</Text>
                                </View>
                                <View style={[styles.podiumBadge, { backgroundColor: '#CD7F32' }]}>
                                    <Text style={styles.podiumBadgeText}>3</Text>
                                </View>
                            </View>
                            <Text style={styles.podiumName} numberOfLines={1}>{stats[2].name.split(' ')[0]}</Text>
                            <View style={styles.podiumStatRow}>
                                <Star size={10} color={Colors.text.tertiary} />
                                <Text style={styles.podiumWins}>{stats[2].conversions} Wins</Text>
                            </View>
                        </View>
                    </View>
                )}

                <View style={styles.listContainer}>
                    <View style={styles.listHeader}>
                        <Award size={18} color={Colors.primary} />
                        <Text style={styles.listHeaderTitle}>Global Rankings</Text>
                    </View>
                    {stats.map((item, index) => (
                        <TouchableOpacity
                            key={item.id}
                            style={styles.leaderboardRow}
                            onPress={() => router.push({ pathname: '/admin/sales-person-details', params: { id: item.id } })}
                        >
                            <View style={styles.rankSection}>
                                {index < 3 ? renderRankIcon(index) : (
                                    <View style={styles.rankCircle}>
                                        <Text style={styles.rankNumber}>{index + 1}</Text>
                                    </View>
                                )}
                            </View>
                            <View style={{ width: 12 }} />
                            <View style={styles.avatarSmall}>
                                <Text style={styles.avatarSmallText}>{item.name.charAt(0)}</Text>
                            </View>
                            <View style={styles.infoSection}>
                                <View style={styles.nameRow}>
                                    <Text style={styles.nameText}>{item.name}</Text>
                                </View>
                                <View style={styles.metricsRow}>
                                    <View style={styles.metric}>
                                        <View style={[styles.metricDot, { backgroundColor: Colors.status.success }]} />
                                        <Text style={styles.metricText}>{item.conversions} Wins</Text>
                                    </View>
                                    <View style={styles.metric}>
                                        <Award size={12} color={Colors.primary} />
                                        <Text style={styles.metricText}>₹{(item.revenue / 1000).toFixed(1)}k</Text>
                                    </View>
                                </View>

                                {item.targets && (
                                    <View style={styles.progressSection}>
                                        <View style={styles.progressLabelRow}>
                                            <Text style={styles.progressText}>
                                                Target: {item.targets.conversions}
                                            </Text>
                                            <Text style={styles.progressPercentage}>
                                                {Math.round((item.conversions / (item.targets.conversions || 1)) * 100)}%
                                            </Text>
                                        </View>
                                        <View style={styles.progressBarBg}>
                                            <View
                                                style={[
                                                    styles.progressBarFill,
                                                    {
                                                        width: `${Math.min(100, (item.conversions / (item.targets.conversions || 1)) * 100)}%`,
                                                        backgroundColor: (item.conversions / (item.targets.conversions || 1)) >= 1 ? Colors.status.success : Colors.primary
                                                    }
                                                ]}
                                            />
                                        </View>
                                    </View>
                                )}
                            </View>
                            <ChevronRight size={18} color={Colors.text.tertiary} />
                        </TouchableOpacity>
                    ))}
                    {stats.length === 0 && (
                        <View style={styles.emptyContainer}>
                            <Trophy size={64} color={Colors.surfaceHighlight} />
                            <Text style={styles.emptyText}>No rankings available for this month.</Text>
                        </View>
                    )}
                </View>
                <View style={styles.spacer} />
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
        paddingBottom: 40,
    },
    podiumContainer: {
        flexDirection: 'row',
        padding: Layout.spacing.lg,
        paddingTop: 40,
        justifyContent: 'center',
        alignItems: 'flex-end',
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        height: 260,
        ...Layout.shadows.lg,
    },
    podiumItem: {
        flex: 1,
        alignItems: 'center',
        padding: 10,
    },
    podiumFirst: {
        zIndex: 10,
        paddingBottom: 30,
    },
    podiumSecond: {
        paddingBottom: 5,
    },
    podiumThird: {
        paddingBottom: 0,
    },
    podiumAvatarContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    podiumAvatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: Colors.background,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    podiumAvatarLarge: {
        width: 84,
        height: 84,
        borderRadius: 42,
        borderWidth: 3,
    },
    podiumAvatarText: {
        color: Colors.text.primary,
        fontSize: 20,
        fontWeight: '800',
    },
    podiumBadge: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Colors.surface,
    },
    podiumBadgeText: {
        color: '#000',
        fontSize: 12,
        fontWeight: '900',
    },
    trophyIcon: {
        position: 'absolute',
        top: -35,
        alignSelf: 'center',
    },
    podiumName: {
        fontSize: 14,
        fontWeight: '800',
        color: Colors.text.primary,
        marginBottom: 4,
    },
    podiumWins: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.text.secondary,
    },
    podiumStatRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    rankBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Colors.surfaceHighlight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    rankCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: Colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    rankNumber: {
        fontSize: 14,
        fontWeight: '800',
        color: Colors.text.tertiary,
    },
    rankText: {
        fontSize: 14,
        fontWeight: '800',
        color: Colors.text.secondary,
    },
    listContainer: {
        padding: Layout.spacing.lg,
    },
    listHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 20,
        marginLeft: 4,
    },
    listHeaderTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: Colors.text.secondary,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
    },
    leaderboardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        padding: Layout.spacing.md,
        borderRadius: Layout.radius.xl,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Layout.shadows.md,
    },
    rankSection: {
        width: 40,
        alignItems: 'center',
    },
    avatarSmall: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    avatarSmallText: {
        fontSize: 16,
        fontWeight: '800',
        color: Colors.primary,
    },
    infoSection: {
        flex: 1,
        marginLeft: 12,
    },
    nameRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    nameText: {
        fontSize: 16,
        fontWeight: '800',
        color: Colors.text.primary,
    },
    metricsRow: {
        flexDirection: 'row',
        marginTop: 4,
        gap: 12,
    },
    metric: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metricDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    metricText: {
        fontSize: 12,
        color: Colors.text.secondary,
        fontWeight: '700',
    },
    progressSection: {
        marginTop: 12,
        gap: 6,
    },
    progressBarBg: {
        height: 6,
        backgroundColor: Colors.background,
        borderRadius: 3,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    progressLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    progressText: {
        fontSize: 10,
        color: Colors.text.tertiary,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    progressPercentage: {
        fontSize: 11,
        color: Colors.primary,
        fontWeight: '900',
    },
    emptyContainer: {
        paddingVertical: 80,
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
