import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Dimensions,
  StatusBar,
  DrawerLayoutAndroid,
  RefreshControl,
  Alert,
} from 'react-native';
import { useAuth } from '../../hooks/redux';
import { useNavigation } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/FontAwesome';
import Toast from 'react-native-toast-message';
import api from '../../services/apiService';

const { width } = Dimensions.get('window');

const AssignerDashboardScreen = () => {
  const { logout, user } = useAuth();
  const navigation = useNavigation();
  const drawerRef = useRef(null);

  // All hooks declared at the top - NEVER conditional
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    in_progress: 0,
    completed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState(null);

  // Fetch requests function
  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await api.assigner.getDashboard();
      
      if (res.data.success) {
        setRequests(res.data.requests || []);
        setStats(res.data.stats || {
          total: 0,
          pending: 0,
          in_progress: 0,
          completed: 0,
        });
      } else {
        setError(res.data.message || 'No requests found');
        setRequests([]);
        setStats({
          total: 0,
          pending: 0,
          in_progress: 0,
          completed: 0,
        });
      }
    } catch (err) {
      console.error('Assigner fetch error:', err);
      const msg = err.response?.data?.message || err.message || 'Network Error';
      setError(msg);
      setRequests([]);
      setStats({
        total: 0,
        pending: 0,
        in_progress: 0,
        completed: 0,
      });
      Toast.show({
        type: 'error',
        text1: 'Failed to load requests',
        text2: msg,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Effects
  useEffect(() => {
    fetchRequests();
  }, []);

  // Handler functions
  const onRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  const openDrawer = () => drawerRef.current?.openDrawer();
  const closeDrawer = () => drawerRef.current?.closeDrawer();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        },
      },
    ]);
  };

  // Filter requests based on search and filter
  const filteredRequests = requests.filter(item => {
    const statusMatch =
      filter === 'all' || item.status?.toLowerCase() === filter;
    const searchMatch =
      (item.user?.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (item.project?.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (item.request_details?.toLowerCase() || '').includes(search.toLowerCase());
    return statusMatch && searchMatch;
  });

  // Render functions
  const renderRequest = ({ item, index }) => (
    <Animatable.View
      animation="fadeInUp"
      duration={600}
      delay={index * 100}
      style={styles.requestCard}
    >
      <LinearGradient colors={['#ffffff', '#f8f9fa', '#ffffff']} style={styles.cardGradient}>
        <View style={styles.requestHeader}>
          <Text style={styles.projectName}>{item.project?.name || 'Unknown Project'}</Text>
          <Text style={styles.userName}>{item.user?.name || 'Unknown User'}</Text>
        </View>
        <Text style={styles.issue} numberOfLines={2}>{item.request_details || 'No details'}</Text>

        <View style={styles.badgesRow}>
          <Text style={[styles.statusBadge, statusColors[item.status?.toLowerCase()]]}>
            {item.status_label || item.status || 'unknown'}
          </Text>
          
          {item.via_dept_head === true && (
            <Text style={styles.deptHeadBadge}>Via Dept Head</Text>
          )}
          
          <Text style={[styles.priorityBadge, priorityColors[item.priority?.toLowerCase()]]}>
            {item.priority_label || item.priority || 'Normal'}
          </Text>
        </View>

        <View style={styles.requestFooter}>
          <Text style={styles.createdDate}>
            {item.created_at || 'N/A'}
          </Text>
          <TouchableOpacity
            style={styles.viewBtn}
            onPress={() => navigation.navigate('RequestDetail', { requestId: item.id })}
          >
            <LinearGradient colors={['#2C3E50', '#4ECDC4']} style={styles.viewBtnGradient}>
              <Text style={styles.viewBtnText}>View Details</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </Animatable.View>
  );

  const renderEmptyState = () => (
    <Animatable.View animation="fadeIn" style={styles.emptyState}>
      <Icon name="inbox" size={60} color="#ccc" />
      <Text style={styles.emptyStateTitle}>No Requests Found</Text>
      <Text style={styles.emptyStateText}>
        {filter === 'all' 
          ? 'No requests available for your assigned projects' 
          : `No ${filter} requests`}
      </Text>
      <TouchableOpacity style={styles.refreshButton} onPress={fetchRequests}>
        <LinearGradient colors={['#2C3E50', '#4ECDC4']} style={styles.refreshButtonGradient}>
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animatable.View>
  );

  const renderHeader = () => (
    <>
      <LinearGradient colors={['#2C3E50', '#4ECDC4']} style={styles.header}>
        <Text style={styles.welcomeText}>Welcome, {user?.name || 'Assigner'}</Text>
        <Text style={styles.roleText}>Manage and track all your project requests</Text>
      </LinearGradient>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchRequests}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.statsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: statColors.total }]}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total Requests</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: statColors.pending }]}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: statColors.inprogress }]}>{stats.in_progress}</Text>
            <Text style={styles.statLabel}>In Progress</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: statColors.completed }]}>{stats.completed}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </ScrollView>
      </View>

      <View style={styles.searchFilterContainer}>
        <View style={styles.searchWrapper}>
          <Icon name="search" size={16} color="#4ECDC4" style={styles.searchIcon} />
          <TextInput
            placeholder="Search by user, project, or issue..."
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['all', 'pending', 'inprogress', 'completed'].map(f => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f === 'all' ? 'All' : f === 'inprogress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </>
  );

  const navigationView = (
    <View style={styles.drawerContainer}>
      <LinearGradient colors={['#2C3E50', '#4ECDC4']} style={styles.drawerHeader}>
        <View style={styles.drawerHeaderContent}>
          <View style={styles.userAvatar}>
            <Icon name="user" size={40} color="#fff" />
          </View>
          <Text style={styles.drawerUserName}>{user?.name || 'Assigner'}</Text>
          <Text style={styles.drawerUserRole}>Assigner</Text>
        </View>
      </LinearGradient>

      <View style={styles.drawerMenu}>
        <TouchableOpacity style={styles.drawerItem} onPress={closeDrawer}>
          <Icon name="home" size={20} color="#2C3E50" />
          <Text style={styles.drawerItemText}>Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.drawerItem} onPress={closeDrawer}>
          <Icon name="list-alt" size={20} color="#2C3E50" />
          <Text style={styles.drawerItemText}>All Requests</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.drawerItem, styles.logoutDrawerItem]}
          onPress={() => {
            closeDrawer();
            handleLogout();
          }}
        >
          <Icon name="sign-out" size={20} color="#e74c3c" />
          <Text style={[styles.drawerItemText, styles.logoutText]}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Loading state
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2C3E50" />
        <Text style={styles.loadingText}>Loading your requests...</Text>
      </View>
    );
  }

  // Main render
  return (
    <DrawerLayoutAndroid
      ref={drawerRef}
      drawerWidth={300}
      drawerPosition="left"
      renderNavigationView={() => navigationView}
    >
      <View style={styles.container}>
        <StatusBar backgroundColor="#2C3E50" barStyle="light-content" />

        <View style={styles.navbar}>
          <TouchableOpacity style={styles.menuButton} onPress={openDrawer}>
            <Icon name="bars" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.navbarTitle}>Assigner Dashboard</Text>
          <View style={styles.navbarRight}>
            <TouchableOpacity style={styles.navbarIcon}>
              <Icon name="user" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={filteredRequests}
          keyExtractor={item => item.id.toString()}
          renderItem={renderRequest}
          ListEmptyComponent={renderEmptyState}
          ListHeaderComponent={renderHeader}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </DrawerLayoutAndroid>
  );
};

const statColors = {
  total: '#2C3E50',
  pending: '#F59E0B',
  inprogress: '#3B82F6',
  completed: '#10B981',
};

const statusColors = {
  pending: { backgroundColor: '#FEF3C7', color: '#92400E' },
  inprogress: { backgroundColor: '#DBEAFE', color: '#1E40AF' },
  completed: { backgroundColor: '#D1FAE5', color: '#065F46' },
};

const priorityColors = {
  high: { backgroundColor: '#FEE2E2', color: '#991B1B' },
  normal: { backgroundColor: '#E0F2FE', color: '#075985' },
  medium: { backgroundColor: '#FEF3C7', color: '#92400E' },
  low: { backgroundColor: '#F3F4F6', color: '#6B7280' },
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
  },
  navbarTitle: {
    paddingLeft: 40,
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
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginTop: 0,
    marginBottom: 9,
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
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 5,
  },
  drawerItemText: {
    fontSize: 16,
    color: '#2C3E50',
    marginLeft: 15,
    fontWeight: '500',
  },
  logoutDrawerItem: {
    marginTop: 'auto',
    marginBottom: 20,
  },
  logoutText: {
    color: '#e74c3c',
  },
  statsContainer: {
    padding: 20,
    marginTop: -13,
  },
  statCard: {
    width: (width - 50) / 2,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    marginBottom: 7,
    marginHorizontal: 5,
  },
  statValue: { 
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
  searchFilterContainer: {
    padding: 20,
    paddingTop: 1,
    marginTop: -10,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    height: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#333',
    fontSize: 16,
  },
  filterBtn: { 
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: 'white',
    minWidth: 110,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 2,
    marginRight: 8,
  },
  filterBtnActive: { 
    backgroundColor: '#4ECDC4', 
    borderColor: '#4ECDC4',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  filterTextActive: {
    color: 'white',
  },
  listContent: {
    paddingBottom: 20,
    flexGrow: 1,
  },
  requestCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  cardGradient: {
    padding: 20,
  },
  requestHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  projectName: { 
    fontSize: 18, 
    fontWeight: '700',
    color: '#2C3E50',
    flex: 1,
  },
  userName: { 
    fontSize: 14, 
    color: '#6B7280',
    fontWeight: '500',
  },
  issue: { 
    marginBottom: 12,
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  badgesRow: { 
    flexDirection: 'row', 
    gap: 8, 
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  statusBadge: { 
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    fontWeight: '600',
    fontSize: 12,
    overflow: 'hidden',
  },
  priorityBadge: { 
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    fontWeight: '600',
    fontSize: 12,
    overflow: 'hidden',
  },
  deptHeadBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    fontWeight: '600',
    fontSize: 12,
    backgroundColor: '#F3F0FF',
    color: '#7C3AED',
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  createdDate: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  viewBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#2C3E50',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  viewBtnGradient: {
    padding: 12,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  viewBtnText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 8,
    marginTop: 15,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  refreshButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#2C3E50',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  refreshButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  errorContainer: { 
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: { 
    color: '#DC2626', 
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  retryText: { 
    color: 'white', 
    fontWeight: '600',
  },
});

export default AssignerDashboardScreen;