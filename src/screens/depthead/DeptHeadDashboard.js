import React, { useState, useEffect, useCallback } from 'react'; // Added useCallback
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/apiService';
import { useAuth } from '../../hooks/redux';
import Footer from '../../components/Footer';


const DeptHeadDashboard = ({ navigation }) => {
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0,
    assignedProjects: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { logout: authLogout } = useAuth();

  // ✅ FIXED: Moved checkTokenAndNavigate to useCallback to prevent recreation
  const checkTokenAndNavigate = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('api_token');
      console.log(
        '🔍 Dashboard: Token check:',
        token ? 'Token exists' : 'No token',
      );

      if (!token) {
        console.log('🚫 No token - redirecting to login');
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
        return false;
      }
      return true;
    } catch (error) {
      console.error('Token check error:', error);
      return false;
    }
  }, [navigation]); // ✅ Added navigation dependency

  // ✅ FIXED: Moved fetchStats to useCallback
  const fetchStats = useCallback(async () => {
  try {
    const hasToken = await checkTokenAndNavigate();
    if (!hasToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    console.log('📊 Fetching dashboard statistics...');

    const response = await api.deptHead.getStatistics();
    console.log('Raw API Response:', response.data); // ← ADD THIS FOR DEBUGGING

    if (response.data.success) {
      // Handle both possible structures
      const apiData = response.data.data || response.data; // ← KEY FIX

      setStats({
        pending: apiData.pending || 0,
        approved: apiData.approved || 0,
        rejected: apiData.rejected || 0,
        total: apiData.total || 0,
        assignedProjects: apiData.assignedProjects || apiData.assigned_projects || 0,
      });

      console.log('✅ Stats loaded:', apiData);
    } else {
      console.warn('API success false:', response.data.message);
      setStats({ pending: 0, approved: 0, rejected: 0, total: 0, assignedProjects: 0 });
    }
  } catch (error) {
    console.error('❌ Error fetching stats:', error.response || error);

    if (error.response?.status === 401) {
      Alert.alert('Session Expired', 'Please login again.', [
        {
          text: 'OK',
          onPress: async () => {
            await api.clearToken();
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          },
        },
      ]);
    } else {
      Alert.alert('Error', 'Failed to load statistics. Pull to refresh.');
    }
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
}, [checkTokenAndNavigate, navigation]);

  // ✅ FIXED: Simplified useEffect - removed conditional hooks
  useEffect(() => {
    // Check token on component mount
    const init = async () => {
      await checkTokenAndNavigate();
      await fetchStats();
    };

    init();
  }, [checkTokenAndNavigate, fetchStats]); // ✅ Added dependencies

  // ✅ FIXED: Added focus listener in separate useEffect
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('🔄 Dashboard focused - refreshing data');
      fetchStats();
    });

    return unsubscribe;
  }, [navigation, fetchStats]); // ✅ Added dependencies

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  // ✅ FIXED: Moved handleLogout to useCallback
  const handleLogout = useCallback(async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            // Show loading
            setLoading(true);

            // Use the logout from auth hook (handles everything)
            await authLogout();

            console.log('✅ Logout successful, navigating to login');

            // Navigate to login screen
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          } catch (error) {
            console.error('❌ Logout error:', error);

            // Even if logout fails, clear local data and navigate
            await api.clearToken();

            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  }, [authLogout, navigation]); // ✅ Added dependencies

  // ✅ FIXED: Moved emergencyLogout to useCallback
  const emergencyLogout = useCallback(async () => {
    Alert.alert(
      'Emergency Logout',
      'Force logout? (Use if normal logout fails)',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Force Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear everything locally
              await AsyncStorage.multiRemove(['api_token', 'user_data']);
              await api.clearToken();

              console.log('✅ Emergency logout completed');

              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error('Emergency logout error:', error);
              navigation.navigate('Login');
            }
          },
        },
      ],
    );
  }, [navigation]); // ✅ Added dependency

  // ✅ Component functions - moved outside of render to prevent recreation
  const DashboardCard = React.useCallback(
    ({ title, subtitle, icon, color, onPress }) => (
      <TouchableOpacity
        style={styles.cardContainer}
        onPress={onPress}
        activeOpacity={0.9}
        disabled={loading}
      >
        <LinearGradient
          colors={['#ffffff', '#f8fafc']}
          style={styles.card}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={[styles.cardIcon, { backgroundColor: color }]}>
            <Icon name={icon} size={24} color="#fff" />
          </View>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSubtitle}>{subtitle}</Text>
          <View style={styles.cardArrow}>
            <Icon name="arrow-right" size={16} color="#4ECDC4" />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    ),
    [loading],
  ); // ✅ Added loading dependency

  const StatCard = React.useCallback(
    ({ label, value, icon, color }) => (
      <View style={styles.statCard}>
        <View style={[styles.statIcon, { backgroundColor: color }]}>
          <Icon name={icon} size={20} color="#fff" />
        </View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    ),
    [],
  );

  // ✅ FIXED: Loading state - don't conditionally return early with hooks above
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4ECDC4" />
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </View>
    );
  }

  // ✅ Rest of the component...
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#2C3E50" barStyle="light-content" />

{/* Header */}
<LinearGradient
  colors={['#2C3E50', '#4ECDC4']}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 0 }}
  style={styles.header}
>
  <View style={styles.headerTopRow}>
    {/* Title in center */}
    <View style={styles.titleContainer}>
      <Text style={styles.headerTitle}>Depthead Dashboard</Text>
    </View>
    
    {/* Logout Button on right */}
    <TouchableOpacity
      onLongPress={emergencyLogout}
      style={styles.logoutButton}
      onPress={handleLogout}
    >
      <Icon name="sign-out" size={18} color="#fff" />
    </TouchableOpacity>
  </View>
  
  <Text style={styles.headerSubtitle}>
    Manage active projects and review requests
  </Text>
</LinearGradient>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4ECDC4']}
            tintColor="#4ECDC4"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Page Header */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Department Head Portal</Text>
          <Text style={styles.pageSubtitle}>
            Manage and oversee your departmental operations with precision and
            efficiency
          </Text>

          {/* Debug button (remove in production) */}
          <TouchableOpacity
            style={styles.debugButton}
            onPress={async () => {
              const token = await AsyncStorage.getItem('api_token');
              Alert.alert(
                'Debug Info',
                `Token: ${token ? 'Present' : 'Missing'}\n` +
                  `Stats loaded: ${!loading ? 'Yes' : 'No'}`,
                [{ text: 'OK' }],
              );
            }}
          >
            <Text style={styles.debugText}>Debug</Text>
          </TouchableOpacity>
        </View>

        {/* Statistics Section */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Dashboard Overview</Text>
          <View style={styles.statsGrid}>
            <StatCard
              label="Pending"
              value={stats.pending}
              icon="clock-o"
              color="#F59E0B"
            />
            <StatCard
              label="Approved"
              value={stats.approved}
              icon="check-circle"
              color="#10B981"
            />
            <StatCard
              label="Rejected"
              value={stats.rejected}
              icon="times-circle"
              color="#EF4444"
            />
            <StatCard
              label="Total"
              value={stats.total}
              icon="file-text"
              color="#06B6D4"
            />
          </View>
        </View>

        {/* Dashboard Cards */}
        <View style={styles.dashboardSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <DashboardCard
            title="Current Projects"
            subtitle="Manage pending and completed requests and view all tasks history"
            icon="folder-open"
            color="#06B6D4"
            onPress={() => navigation.navigate('CurrentProjectsScreen')}
          />

          <DashboardCard
            title="Analytics & Reports"
            subtitle="Access comprehensive analytics and generate reports"
            icon="line-chart"
            color="#2C3E50"
            onPress={() =>
              Alert.alert(
                'Coming Soon',
                'Analytics feature will be available soon',
              )
            }
          />

          <DashboardCard
            title="Team Management"
            subtitle="Manage team members and monitor performance"
            icon="users"
            color="#F59E0B"
            onPress={() =>
              Alert.alert(
                'Coming Soon',
                'Team management feature will be available soon',
              )
            }
          />
        </View>

        {/* Footer note */}
        <View style={styles.footerNote}>
          <Text style={styles.footerText}>
            Last updated:{' '}
            {new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
          <TouchableOpacity onPress={onRefresh}>
            <Text style={styles.refreshLink}>↻ Refresh Now</Text>
          </TouchableOpacity>
        </View>
              <Footer />

      </ScrollView>
    </SafeAreaView>
  );
};

// ✅ Styles remain the same...
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
  },
// Header Styles
  header: {
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
 headerTopRow: {
  marginTop: 38,
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 8,
},
titleContainer: {
  flex: 1, // This makes it take available space
  alignItems: 'center', // Center the text horizontally
},
  headerContent: {
    alignItems: 'center',
    marginTop: 8,
  },
  headerTitle: {
  fontSize: 28,
  fontWeight: '700',
  color: '#fff',
  marginBottom: 4,
  textAlign: 'center', // Ensure text is centered
},
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 20,
  },

  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  logoText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  logoutButton: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 6,
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.2)',
  position: 'absolute', // Position it absolutely
  right: 0, // Align to right
  top: 0, // Align to top
},
  logoutText: {
    color: '#fff',
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  pageHeader: {
    padding: 24,
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A252F',
    marginBottom: 8,
    textAlign: 'center',
  },
  pageSubtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 600,
    marginBottom: 16,
  },
  debugButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
    marginTop: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#64748B',
  },
  statsSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 16,
    marginLeft: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A252F',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dashboardSection: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  cardContainer: {
    marginBottom: 16,
  },
  card: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A252F',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 20,
  },
  cardArrow: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E6FFFA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4ECDC4',
  },
  footerNote: {
    padding: 20,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#F1F5F9',
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
  },
  refreshLink: {
    fontSize: 14,
    color: '#4ECDC4',
    fontWeight: '600',
  },
});

export default DeptHeadDashboard;
