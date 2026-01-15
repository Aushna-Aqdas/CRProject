import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  TextInput,
  Modal,
  Alert,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { Picker } from '@react-native-picker/picker';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/apiService';
import Footer from '../../components/Footer';


const { width: screenWidth } = Dimensions.get('window');

const CurrentProjectsScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'history'
  const [pendingRequests, setPendingRequests] = useState([]);
  const [historyRequests, setHistoryRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0,
  });
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Color scheme
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
    approved: { backgroundColor: '#D1FAE5', color: '#065F46' },
    rejected: { backgroundColor: '#FEE2E2', color: '#991B1B' },
  };

  const priorityColors = {
    high: { backgroundColor: '#FEE2E2', color: '#991B1B' },
    normal: { backgroundColor: '#FEF3C7', color: '#92400E' },
    low: { backgroundColor: '#DBEAFE', color: '#1E40AF' },
  };

  // Check token function
  const checkTokenAndNavigate = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('api_token');
      if (!token) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
        return false;
      }
      return true;
    } catch (error) {
      return false;
    }
  }, [navigation]);

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      const hasToken = await checkTokenAndNavigate();
      if (!hasToken) {
        setLoading(false);
        return;
      }

      setLoading(true);
      
      // Fetch pending requests
      const pendingResponse = await api.deptHead.getPendingRequests();
      setPendingRequests(pendingResponse.data.requests || []);
      
      // Fetch history
      const historyResponse = await api.deptHead.getRequestHistory();
      setHistoryRequests(historyResponse.data.requests || []);
      
      // Calculate statistics
      const approved = (historyResponse.data.requests || []).filter(r => r.dept_head_status === 'approved').length;
      const rejected = (historyResponse.data.requests || []).filter(r => r.dept_head_status === 'rejected').length;
      
      setStats({
        pending: (pendingResponse.data.requests || []).length,
        approved,
        rejected,
        total: approved + rejected + (pendingResponse.data.requests || []).length,
      });
      
      // Extract unique projects from both lists
      const allRequests = [...(pendingResponse.data.requests || []), ...(historyResponse.data.requests || [])];
      const uniqueProjects = [...new Set(allRequests.map(r => r.project?.id))];
      const projectList = uniqueProjects
        .map(id => allRequests.find(r => r.project?.id === id)?.project)
        .filter(p => p);
      setProjects(projectList);
      
      // Set initial filtered requests
      setFilteredRequests(pendingResponse.data.requests || []);
      
    } catch (error) {
      if (error.response?.status === 401) {
        await api.clearToken();
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      } else {
        Alert.alert('Error', 'Failed to load data');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [checkTokenAndNavigate, navigation]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    filterRequests();
  }, [activeTab, searchQuery, statusFilter, priorityFilter, projectFilter, pendingRequests, historyRequests]);

  const filterRequests = useCallback(() => {
    let requestsToFilter = activeTab === 'pending' ? pendingRequests : historyRequests;
    let filtered = [...requestsToFilter];
    
    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(request =>
        request.details?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.project?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.user?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply status filter (for history tab)
    if (activeTab === 'history' && statusFilter) {
      filtered = filtered.filter(request => request.dept_head_status === statusFilter);
    }
    
    // Apply priority filter (for pending tab)
    if (activeTab === 'pending' && priorityFilter) {
      filtered = filtered.filter(request => request.priority === priorityFilter);
    }
    
    // Apply project filter
    if (projectFilter) {
      filtered = filtered.filter(request => request.project?.id == projectFilter);
    }
    
    setFilteredRequests(filtered);
  }, [activeTab, searchQuery, statusFilter, priorityFilter, projectFilter, pendingRequests, historyRequests]);

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    setSearchQuery('');
    setStatusFilter('');
    setPriorityFilter('');
    setProjectFilter('');
  }, []);

  const resetFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('');
    setPriorityFilter('');
    setProjectFilter('');
  }, []);

  const handleApprove = useCallback(async (requestId) => {
    Alert.alert(
      'Approve Request',
      'Are you sure you want to approve this request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              await api.deptHead.approveRequest(requestId);
              Alert.alert('Success', 'Request approved successfully!');
              fetchData();
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to approve request');
            }
          },
        },
      ]
    );
  }, [fetchData]);

  const handleReject = useCallback((requestId) => {
    setSelectedRequestId(requestId);
    setRejectModalVisible(true);
  }, []);

  const confirmReject = useCallback(async () => {
    if (!rejectionReason.trim()) {
      Alert.alert('Error', 'Please provide a rejection reason');
      return;
    }

    try {
      await api.deptHead.rejectRequest(selectedRequestId, rejectionReason);
      Alert.alert('Success', 'Request rejected successfully!');
      setRejectModalVisible(false);
      setRejectionReason('');
      fetchData();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to reject request');
    }
  }, [selectedRequestId, rejectionReason, fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const renderRequestItem = useCallback(({ item, index }) => {
    const status = activeTab === 'pending' ? 'pending' : item.dept_head_status;
    const statusConfig = statusColors[status] || statusColors.pending;
    const priorityConfig = priorityColors[item.priority] || priorityColors.normal;

    return (
      <TouchableOpacity
        style={styles.requestCard}
        onPress={() => navigation.navigate('DeptHeadRequestDetailScreen', { requestId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          <View style={styles.requestHeader}>
            <View style={styles.requestHeaderLeft}>
              <View style={styles.requestNumber}>
                <Text style={styles.requestNumberText}>#{item.id}</Text>
              </View>
              <View style={styles.requestTitleSection}>
                <Text style={styles.projectName} numberOfLines={1}>
                  {item.project?.name || '—'}
                </Text>
                <Text style={styles.requestorName} numberOfLines={1}>
                  {item.user?.name || '—'}
                </Text>
              </View>
            </View>
            
            <View style={[
              styles.badge,
              activeTab === 'pending' 
                ? { backgroundColor: priorityConfig.backgroundColor }
                : { backgroundColor: statusConfig.backgroundColor }
            ]}>
              <Icon
                name={
                  activeTab === 'pending' 
                    ? item.priority === 'high' ? 'exclamation-circle' : 'circle-o'
                    : item.dept_head_status === 'approved' ? 'check-circle' : 'times-circle'
                }
                size={12}
                color={activeTab === 'pending' ? priorityConfig.color : statusConfig.color}
                style={styles.badgeIcon}
              />
              <Text style={[
                styles.badgeText,
                { color: activeTab === 'pending' ? priorityConfig.color : statusConfig.color }
              ]}>
                {activeTab === 'pending' 
                  ? item.priority?.toUpperCase() || 'NORMAL'
                  : item.dept_head_status?.toUpperCase()
                }
              </Text>
            </View>
          </View>
          
          <View style={styles.requestBody}>
            <Text style={styles.detailsText} numberOfLines={2}>
              {item.details || 'No description provided'}
            </Text>
          </View>
          
          <View style={styles.requestFooter}>
            <View style={styles.dateSection}>
              <Icon name="calendar" size={12} color="#64748B" />
              <Text style={styles.dateText}>
                {new Date(item.created_at).toLocaleDateString('en-US', {
                  day: 'numeric',
                  month: 'short',
                  year: '2-digit',
                })}
              </Text>
            </View>
            
            {activeTab === 'pending' ? (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    navigation.navigate('DeptHeadRequestDetailScreen', { requestId: item.id });
                  }}
                >
                  <Icon name="eye" size={14} color="#3B82F6" />
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.iconButton, styles.approveIconButton]}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleApprove(item.id);
                  }}
                >
                  <Icon name="check" size={14} color="#10B981" />
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.iconButton, styles.rejectIconButton]}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleReject(item.id);
                  }}
                >
                  <Icon name="times" size={14} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.viewButton}
                onPress={(e) => {
                  e.stopPropagation();
                  navigation.navigate('DeptHeadRequestDetailScreen', { requestId: item.id });
                }}
              >
                <Icon name="arrow-right" size={14} color="#3B82F6" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [activeTab, navigation, handleApprove, handleReject]);

  const StatCard = useCallback(({ label, value, icon, color, onPress }) => (
    <TouchableOpacity 
      style={styles.statCard} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.statIconContainer, { backgroundColor: `${color}15` }]}>
        <Icon name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  ), []);

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading Projects...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#1A252F" barStyle="light-content" />
      
      <LinearGradient
                     colors={['#2C3E50', '#4ECDC4']}
                     start={{ x: 0, y: 0 }}
                     end={{ x: 1, y: 0 }}
                     style={styles.header}
                   >
                   
              <View style={styles.headerContent}>
                  <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Icon name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
                <View style={styles.headerCenter}>
                             <Text style={styles.headerTitle}>Current Projects</Text>
                           </View>                 
            
              </View>
            </LinearGradient>
      

      <ScrollView
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={['#3B82F6']}
            tintColor="#3B82F6"
            title="Pull to refresh"
            titleColor="#64748B"
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Statistics */}
        <View style={styles.statsContainer}>
          <Text style={styles.statsTitle}>Overview</Text>
          <View style={styles.statsGrid}>
            <StatCard
              label="Total"
              value={stats.total}
              icon="file-text-o"
              color={statColors.total}
              onPress={() => handleTabChange('history')}
            />
            <StatCard
              label="Pending"
              value={stats.pending}
              icon="clock-o"
              color={statColors.pending}
              onPress={() => handleTabChange('pending')}
            />
            <StatCard
              label="Approved"
              value={stats.approved}
              icon="check-circle"
              color={statColors.completed}
              onPress={() => {
                handleTabChange('history');
                setStatusFilter('approved');
              }}
            />
            <StatCard
              label="Rejected"
              value={stats.rejected}
              icon="times-circle"
              color="#EF4444"
              onPress={() => {
                handleTabChange('history');
                setStatusFilter('rejected');
              }}
            />
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
            onPress={() => handleTabChange('pending')}
            activeOpacity={0.7}
          >
            <Icon 
              name="clock-o" 
              size={16} 
              color={activeTab === 'pending' ? '#3B82F6' : '#64748B'} 
            />
            <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
              Pending ({stats.pending})
            </Text>
            {activeTab === 'pending' && <View style={styles.activeTabIndicator} />}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'history' && styles.activeTab]}
            onPress={() => handleTabChange('history')}
            activeOpacity={0.7}
          >
            <Icon 
              name="history" 
              size={16} 
              color={activeTab === 'history' ? '#3B82F6' : '#64748B'} 
            />
            <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
              History ({stats.approved + stats.rejected})
            </Text>
            {activeTab === 'history' && <View style={styles.activeTabIndicator} />}
          </TouchableOpacity>
        </View>

        {/* Filter Bar */}
        <View style={styles.filterContainer}>
          <View style={styles.searchContainer}>
            <Icon name="search" size={18} color="#64748B" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={`Search ${activeTab === 'pending' ? 'pending' : 'historical'} requests...`}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#94A3B8"
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Icon name="times-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.filtersRow}>
            {activeTab === 'history' ? (
              <View style={styles.filterWrapper}>
                <Text style={styles.filterLabel}>Status</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={statusFilter}
                    onValueChange={setStatusFilter}
                    style={styles.picker}
                    dropdownIconColor="#64748B"
                  >
                    <Picker.Item label="All Status" value="" />
                    <Picker.Item label="Approved" value="approved" />
                    <Picker.Item label="Rejected" value="rejected" />
                  </Picker>
                </View>
              </View>
            ) : (
              <View style={styles.filterWrapper}>
                <Text style={styles.filterLabel}>Priority</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={priorityFilter}
                    onValueChange={setPriorityFilter}
                    style={styles.picker}
                    dropdownIconColor="#64748B"
                  >
                    <Picker.Item label="All Priorities" value="" />
                    <Picker.Item label="High" value="high" />
                    <Picker.Item label="Normal" value="normal" />
                    <Picker.Item label="Low" value="low" />
                  </Picker>
                </View>
              </View>
            )}
            
            <View style={styles.filterWrapper}>
              <Text style={styles.filterLabel}>Project</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={projectFilter}
                  onValueChange={setProjectFilter}
                  style={styles.picker}
                  dropdownIconColor="#64748B"
                >
                  <Picker.Item label="All Projects" value="" />
                  {projects.map(project => (
                    <Picker.Item 
                      key={project.id} 
                      label={project.name.length > 20 ? project.name.substring(0, 20) + '...' : project.name} 
                      value={project.id.toString()} 
                    />
                  ))}
                </Picker>
              </View>
            </View>
          </View>
          
          <View style={styles.filterActions}>
            <TouchableOpacity 
              style={styles.resetButton} 
              onPress={resetFilters}
              activeOpacity={0.7}
            >
              <Icon name="history" size={16} color="#fff" />
              <Text style={styles.resetButtonText}>Reset Filters</Text>
            </TouchableOpacity>
            
            <Text style={styles.resultCount}>
              {filteredRequests.length} {activeTab === 'pending' ? 'pending' : 'historical'} requests
            </Text>
          </View>
        </View>

        {/* Requests List */}
        {filteredRequests.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Icon 
                name={activeTab === 'pending' ? 'check-circle' : 'history'} 
                size={60} 
                color="#CBD5E1" 
              />
            </View>
            <Text style={styles.emptyTitle}>
              {activeTab === 'pending' ? 'All caught up!' : 'No history yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'pending' 
                ? 'No pending requests at the moment.' 
                : 'Start reviewing requests to build your history'}
            </Text>
            {activeTab === 'pending' && (
              <TouchableOpacity 
                style={styles.refreshButton}
                onPress={onRefresh}
              >
                <Text style={styles.refreshButtonText}>Refresh</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.requestsList}>
            <Text style={styles.listTitle}>
              {activeTab === 'pending' ? 'Requests Awaiting Action' : 'Completed Requests'}
            </Text>
            <FlatList
              data={filteredRequests}
              renderItem={renderRequestItem}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}
      </ScrollView>

      {/* Reject Modal */}
      <Modal
        visible={rejectModalVisible}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reject Request</Text>
              <TouchableOpacity
                onPress={() => {
                  setRejectModalVisible(false);
                  setRejectionReason('');
                }}
              >
                <Icon name="times" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalSubtitle}>
              Please provide a reason for rejection (required):
            </Text>
            
            <TextInput
              style={styles.reasonInput}
              placeholder="Enter detailed reason..."
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              placeholderTextColor="#94A3B8"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setRejectModalVisible(false);
                  setRejectionReason('');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  !rejectionReason.trim() && styles.confirmButtonDisabled
                ]}
                onPress={confirmReject}
                disabled={!rejectionReason.trim()}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmButtonText}>Reject Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    <Footer />
    </SafeAreaView>
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
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  // Header Styles
  header: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
   headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
 
  // Stats Styles
  statsContainer: {
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 20,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A252F',
    marginBottom: 16,
    marginLeft: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Tabs Styles
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    position: 'relative',
  },
  activeTab: {
    backgroundColor: '#F0F9FF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 4,
  },
  activeTabText: {
    color: '#1E40AF',
    fontWeight: '600',
  },
  activeTabIndicator: {
    position: 'absolute',
    bottom: 2,
    width: 20,
    height: 3,
    backgroundColor: '#3B82F6',
    borderRadius: 1.5,
  },
  // Filter Styles
  filterContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 15,
    color: '#1A252F',
    paddingVertical: 0,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  filterWrapper: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 6,
    fontWeight: '500',
    marginLeft: 4,
  },
  pickerWrapper: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    fontSize: 14,
    color: '#1A252F',
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C3E50',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  resultCount: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  // Request Card Styles
  requestsList: {
    marginHorizontal: 16,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A252F',
    marginBottom: 16,
    marginLeft: 4,
  },
  listContent: {
    paddingBottom: 8,
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  cardContent: {
    padding: 16,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  requestHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  requestNumber: {
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 12,
  },
  requestNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E40AF',
  },
  requestTitleSection: {
    flex: 1,
  },
  projectName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A252F',
    marginBottom: 2,
  },
  requestorName: {
    fontSize: 13,
    color: '#64748B',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  badgeIcon: {
    marginRight: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  requestBody: {
    marginBottom: 16,
  },
  detailsText: {
    fontSize: 14,
    color: '#1A252F',
    lineHeight: 20,
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  dateSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  approveIconButton: {
    backgroundColor: '#D1FAE5',
    borderColor: '#A7F3D0',
  },
  rejectIconButton: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  viewButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  // Empty State Styles
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A252F',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  refreshButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    padding: 24,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A252F',
  },
  modalSubtitle: {
    fontSize: 15,
    color: '#64748B',
    marginBottom: 20,
    lineHeight: 22,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#1A252F',
    minHeight: 120,
    marginBottom: 24,
    textAlignVertical: 'top',
    backgroundColor: '#F8FAFC',
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#fff',
  },
  cancelButtonText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 15,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#EF4444',
  },
  confirmButtonDisabled: {
    backgroundColor: '#FECACA',
    opacity: 0.7,
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});

export default CurrentProjectsScreen;