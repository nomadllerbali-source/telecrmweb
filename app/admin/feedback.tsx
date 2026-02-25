import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Linking } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Star, MessageSquare, Phone, User, Calendar, MapPin } from 'lucide-react-native';
import { Colors, Layout } from '@/constants/Colors';

interface FeedbackItem {
    id: string;
    rating: number;
    comment: string;
    created_at: string;
    leads: {
        client_name: string;
        contact_number: string;
        place: string;
    };
}

export default function FeedbackHubScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [feedback, setFeedback] = useState<FeedbackItem[]>([]);

    useEffect(() => {
        fetchFeedback();
    }, []);

    const fetchFeedback = async () => {
        try {
            const { data, error } = await supabase
                .from('feedback')
                .select(`
          id,
          rating,
          comment,
          created_at,
          leads:lead_id (
            client_name,
            contact_number,
            place
          )
        `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setFeedback(data as any || []);
        } catch (err) {
            console.error('Error fetching feedback:', err);
        } finally {
            setLoading(false);
        }
    };

    const renderStars = (rating: number) => {
        return (
            <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                        key={s}
                        size={14}
                        color={s <= rating ? Colors.status.warning : Colors.surfaceHighlight}
                        fill={s <= rating ? Colors.status.warning : 'none'}
                    />
                ))}
            </View>
        );
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
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
                <Text style={styles.headerTitle}>Guest Feedback</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
                <Text style={styles.listHeaderTitle}>Recent Reviews ({feedback.length})</Text>
                {feedback.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <MessageSquare size={64} color={Colors.surfaceHighlight} />
                        <Text style={styles.emptyText}>No reviews received yet.</Text>
                        <Text style={styles.emptySubtext}>Feedback from completed tours will appear here.</Text>
                    </View>
                ) : (
                    feedback.map((item) => (
                        <View key={item.id} style={styles.feedbackCard}>
                            <View style={styles.cardHeader}>
                                <View style={styles.clientInfo}>
                                    <View style={styles.avatar}>
                                        <Text style={styles.avatarText}>{item.leads?.client_name?.charAt(0) || 'G'}</Text>
                                    </View>
                                    <View>
                                        <Text style={styles.clientName}>{item.leads?.client_name || 'Anonymous Guest'}</Text>
                                        <View style={styles.destRow}>
                                            <MapPin size={12} color={Colors.text.tertiary} />
                                            <Text style={styles.destText}>{item.leads?.place || 'Tour Location'}</Text>
                                        </View>
                                    </View>
                                </View>
                                <View style={styles.dateBadge}>
                                    <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
                                </View>
                            </View>

                            <View style={styles.ratingSection}>
                                {renderStars(item.rating)}
                                <View style={styles.ratingBadge}>
                                    <Text style={styles.ratingValue}>{item.rating}.0</Text>
                                </View>
                            </View>

                            {item.comment && (
                                <View style={styles.commentContainer}>
                                    <Text style={styles.commentText}>"{item.comment}"</Text>
                                </View>
                            )}

                            <View style={styles.cardFooter}>
                                <TouchableOpacity
                                    style={styles.contactButton}
                                    onPress={() => item.leads?.contact_number && Linking.openURL(`tel:${item.leads.contact_number}`)}
                                    disabled={!item.leads?.contact_number}
                                >
                                    <Phone size={16} color={item.leads?.contact_number ? Colors.primary : Colors.text.tertiary} />
                                    <Text style={[styles.contactText, !item.leads?.contact_number && { color: Colors.text.tertiary }]}>
                                        Contact Guest
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                )}
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
        padding: Layout.spacing.lg,
    },
    listHeaderTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text.secondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 16,
        marginLeft: 4,
    },
    feedbackCard: {
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
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    clientInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.surfaceHighlight,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    avatarText: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.primary,
    },
    clientName: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text.primary,
    },
    destRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    destText: {
        fontSize: 12,
        color: Colors.text.tertiary,
    },
    dateBadge: {
        backgroundColor: Colors.background,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: Layout.radius.sm,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    dateText: {
        fontSize: 10,
        color: Colors.text.tertiary,
        fontWeight: '700',
    },
    ratingSection: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 8,
    },
    starRow: {
        flexDirection: 'row',
        gap: 4,
    },
    ratingBadge: {
        backgroundColor: Colors.status.warning + '15',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: Layout.radius.xs,
    },
    ratingValue: {
        fontSize: 12,
        fontWeight: '800',
        color: Colors.status.warning,
    },
    commentContainer: {
        backgroundColor: Colors.background,
        padding: 16,
        borderRadius: Layout.radius.lg,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    commentText: {
        fontSize: 14,
        color: Colors.text.secondary,
        fontStyle: 'italic',
        lineHeight: 22,
    },
    cardFooter: {
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        paddingTop: 16,
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    contactButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: Colors.background,
        borderRadius: Layout.radius.full,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    contactText: {
        fontSize: 13,
        color: Colors.text.primary,
        fontWeight: '600',
    },
    emptyContainer: {
        alignItems: 'center',
        padding: 60,
        gap: 16,
    },
    emptyText: {
        fontSize: 18,
        color: Colors.text.secondary,
        fontWeight: '700',
        textAlign: 'center',
    },
    emptySubtext: {
        fontSize: 14,
        color: Colors.text.tertiary,
        textAlign: 'center',
    },
    spacer: {
        height: 40,
    }
});
