// screens/ResolverDashboard.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  FlatList,
  StatusBar,
  Dimensions,
  DrawerLayoutAndroid
} from 'react-native';
import { useAuth } from '../../hooks/redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import apiService from '../../services/apiService';  // or wherever your api file is

const { width } = Dimensions.get('window');

const ResolverDashboard = ({ navigation }) => {
  const { user, userApi, logout } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'inprogress', 'completed'
  const drawerRef = useRef(null);

  const handleLogout = useCallback(async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
            navigation.navigate('Login');
          } catch (error) {
            Alert.alert('Error', 'Failed to logout');
          }
        },
      },
    ]);
  }, [logout, navigation]);

  const openDrawer = useCallback(() => {
    drawerRef.current?.openDrawer();
  }, []);

  const closeDrawer = useCallback(() => {
    drawerRef.current?.closeDrawer();
  }, []);

  const getFilteredRequests = useCallback(() => {
    if (!dashboardData?.requests) return [];

    if (filter === 'all') return dashboardData.requests;

    return dashboardData.requests.filter(
      (req) => req.status.toLowerCase() === filter.toLowerCase()
    );
  }, [dashboardData, filter]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
const response = await apiService.resolver.getDashboard();
      if (response.data.success) {
        setDashboardData(response.data);
      } else {
        Alert.alert('Error', response.data.message || 'Failed to load dashboard');
      }
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const navigationView = useCallback(
    () => (
      <View style={styles.drawerContainer}>
        <LinearGradient colors={['#2C3E50', '#4ECDC4']} style={styles.drawerHeader}>
          <View style={styles.drawerHeaderContent}>
            <View style={styles.userAvatar}>
              <Icon name="account-tie" size={40} color="#fff" />
            </View>
            <Text style={styles.drawerUserName}>{user?.name || 'Resolver'}</Text>
            <Text style={styles.drawerUserRole}>Resolver</Text>
          </View>
        </LinearGradient>

        <View style={styles.drawerMenu}>
          <Text style={styles.filterTitle}>Filter Requests</Text>

          {['all', 'pending', 'inprogress', 'completed'].map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterItem, filter === f && styles.filterItemActive]}
              onPress={() => {
                setFilter(f);
                closeDrawer();
              }}
            >
              <Icon
                name={f === 'all' ? 'format-list-bulleted' : f === 'pending' ? 'clock' : f === 'inprogress' ? 'sync' : 'check-circle'}
                size={20}
                color={filter === f ? '#fff' : '#2C3E50'}
              />
              <Text style={[styles.filterItemText, filter === f && styles.filterItemTextActive]}>
                {f === 'all' ? 'All Requests' : f === 'inprogress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
              {filter === f && <Icon name="check" size={16} color="#fff" style={styles.filterCheck} />}
            </TouchableOpacity>
          ))}

          <View style={styles.drawerDivider} />

          <TouchableOpacity style={styles.drawerItem} onPress={() => { closeDrawer(); }}>
            <Icon name="home" size={20} color="#2C3E50" />
            <Text style={styles.drawerItemText}>Dashboard</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.drawerItem, styles.logoutDrawerItem]} onPress={() => { closeDrawer(); handleLogout(); }}>
            <Icon name="logout" size={20} color="#e74c3c" />
            <Text style={[styles.drawerItemText, styles.logoutText]}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    ),
    [user, filter, closeDrawer, handleLogout]
  );

  const StatCard = ({ title, value, icon, color }) => (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color }]}>
        <Icon name={icon} size={24} color="#fff" />
      </View>
      <Text style={styles.statNumber}>{value}</Text>
      <Text style={styles.statLabel}>{title}</Text>
    </View>
  );

  const RequestItem = ({ request }) => (
    <TouchableOpacity
      style={styles.requestItem}
      onPress={() => navigation.navigate('ResolverRequestDetail', { requestId: request.id })}
    >
      <View style={styles.requestHeader}>
        <Text style={styles.requestId}>#{request.id}</Text>
        <View style={[styles.statusBadge, styles[`status${request.status.charAt(0).toUpperCase() + request.status.slice(1)}`]]}>
          <Text style={styles.statusText}>{request.status}</Text>
        </View>
      </View>

      <Text style={styles.userName}>
        <Icon name="account" size={16} color="#666" /> {request.user_name || 'N/A'}
      </Text>

      <Text style={styles.serviceText}>{request.service_title || 'N/A'}</Text>

      <View style={styles.requestFooter}>
        <View style={[styles.priorityBadge, styles[`priority${request.priority.charAt(0).toUpperCase() + request.priority.slice(1)}`]]}>
          <Text style={styles.priorityText}>{request.priority}</Text>
        </View>
        <Text style={styles.dateText}>{request.created_at}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2C3E50" />
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </View>
    );
  }

  const filteredRequests = getFilteredRequests();

  return (
    <DrawerLayoutAndroid
      ref={drawerRef}
      drawerWidth={300}
      drawerPosition="left"
      renderNavigationView={navigationView}
    >
      <View style={styles.container}>
        <StatusBar backgroundColor="#2C3E50" barStyle="light-content" />

        {/* Navbar */}
        <View style={styles.navbar}>
          <TouchableOpacity style={styles.menuButton} onPress={openDrawer}>
            <Icon name="menu" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.navbarTitle}>Resolver Dashboard</Text>
          <View style={styles.navbarRight} />
        </View>

        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.scrollContent}
        >
          <LinearGradient colors={['#2C3E50', '#4ECDC4']} style={styles.header}>
            <Text style={styles.welcomeText}>Welcome, {user?.name || 'Resolver'}</Text>
            <Text style={styles.roleText}>Manage your assigned requests</Text>
          </LinearGradient>

          {dashboardData && (
            <>
              <View style={styles.statsContainer}>
                <View style={styles.statsRow}>
                  <StatCard title="Total" value={dashboardData.stats.total} icon="inbox" color="#2C3E50" />
                  <StatCard title="Pending" value={dashboardData.stats.pending} icon="clock" color="#F59E0B" />
                </View>
                <View style={styles.statsRow}>
                  <StatCard title="In Progress" value={dashboardData.stats.inprogress} icon="sync" color="#3B82F6" />
                  <StatCard title="Completed" value={dashboardData.stats.completed} icon="check-circle" color="#10B981" />
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {filter === 'all' ? 'Assigned Requests' : `${filter.charAt(0).toUpperCase() + filter.slice(1)} Requests`}
                </Text>

                {filteredRequests.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Icon name="inbox" size={60} color="#CBD5E1" />
                    <Text style={styles.emptyStateText}>No {filter === 'all' ? '' : filter} requests found</Text>
                  </View>
                ) : (
                  <FlatList
                    data={filteredRequests}
                    renderItem={({ item }) => <RequestItem request={item} />}
                    keyExtractor={(item) => item.id.toString()}
                    scrollEnabled={false}
                  />
                )}
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </DrawerLayoutAndroid>
  );
};

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
    marginTop: 10,
    color: '#2C3E50',
    fontSize: 16,
  },
  scrollContent: {
    paddingTop: 0,
  },
  // Navbar Styles
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2C3E50',
    paddingHorizontal: 16,
    paddingTop: 35,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#34495e',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuButton: {
    padding: 8,
    borderRadius: 4,
  },
  navbarCenter: {
    flex: 1,
    alignItems: 'center',
  },
  navbarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  navbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navbarIcon: {
    padding: 8,
    borderRadius: 4,
  },
  // Drawer Styles
  drawerContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  drawerHeader: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 30,
  },
  drawerHeaderContent: {
    alignItems: 'center',
  },
  userAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  drawerUserName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  drawerUserRole: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
  },
  drawerMenu: {
    flex: 1,
    padding: 20,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 15,
    textAlign: 'center',
  },
  filterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  filterItemActive: {
    backgroundColor: '#2C3E50',
    borderColor: '#2C3E50',
  },
  filterItemText: {
    fontSize: 14,
    color: '#2C3E50',
    marginLeft: 12,
    fontWeight: '500',
    flex: 1,
  },
  filterItemTextActive: {
    color: '#fff',
  },
  filterCheck: {
    marginLeft: 'auto',
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 5,
    backgroundColor: '#f8f9fa',
  },
  drawerItemText: {
    fontSize: 16,
    color: '#2C3E50',
    marginLeft: 15,
    fontWeight: '500',
  },
  drawerDivider: {
    height: 1,
    backgroundColor: '#ecf0f1',
    marginVertical: 15,
  },
  logoutDrawerItem: {
    marginTop: 'auto',
    marginBottom: 20,
    backgroundColor: '#fff5f5',
  },
  logoutText: {
    color: '#e74c3c',
  },
  // Header Section
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginTop: 0,
    marginBottom: 10,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerText: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  roleText: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  filterBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 10,
  },
  filterBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  // Stats Container
  statsContainer: {
    padding: 20,
    marginTop: -20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statCard: {
    width: (width - 50) / 2,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  statIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  // Section Styles
  section: {
    padding: 20,
    paddingTop: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
    flex: 1,
  },
  requestCount: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  // Request Item Styles
  requestItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#4ECDC4',
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  requestId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1,
  },
  statusInprogress: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: 'rgba(59, 130, 246, 0.2)',
    borderWidth: 1,
  },
  statusCompleted: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  userName: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 5,
  },
  serviceText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 10,
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityHigh: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  priorityNormal: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  priorityLow: {
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  dateText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 10,
    marginBottom: 5,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});

export default ResolverDashboard;