import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  RefreshControl,
  Dimensions,
  StatusBar,
  DrawerLayoutAndroid,
  Modal,
} from 'react-native';
import { useAuth } from '../../hooks/redux';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/FontAwesome';
import apiService from '../../services/apiService';

const { width, height } = Dimensions.get('window');

const UserHistoryScreen = () => {
  const { user: authUser, logout } = useAuth();
  const navigation = useNavigation();
  const drawerRef = useRef(null);

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const openDrawer = () => drawerRef.current?.openDrawer();
  const closeDrawer = () => drawerRef.current?.closeDrawer();

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
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

  // Open detail modal
  const openRequestDetail = (req) => {
    console.log('Opening request detail:', req);
    setSelectedRequest(req);
    setModalVisible(true);
  };

  const fetchHistory = async (page = 1) => {
    if (page === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const res = await apiService.user.getHistory(15);

      console.log('API Response for history:', JSON.stringify(res.data, null, 2));

      if (res.data.success) {
        const responseData = res.data.data;
        
        let newRequests = [];
        let paginationInfo = {};
        
        if (responseData && responseData.data) {
          // Laravel paginated response
          newRequests = responseData.data || [];
          paginationInfo = {
            current_page: responseData.current_page || 1,
            last_page: responseData.last_page || 1,
          };
        } else if (Array.isArray(responseData)) {
          // Direct array response
          newRequests = responseData;
          paginationInfo = {
            current_page: 1,
            last_page: 1,
          };
        }

        // Log what fields we're getting
        if (newRequests.length > 0) {
          console.log('First request object keys:', Object.keys(newRequests[0]));
          console.log('First request data:', newRequests[0]);
        }

        if (page === 1) {
          setRequests(newRequests);
        } else {
          setRequests(prev => [...prev, ...newRequests]);
        }

        setHasMore(paginationInfo.current_page < paginationInfo.last_page);
        setCurrentPage(paginationInfo.current_page);
        setError(null);
      } else {
        setError(res.data.message || 'Failed to load history');
      }
    } catch (err) {
      console.error('History fetch error:', err);
      setError(err.response?.data?.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchHistory(1);
  }, []);

  const onRefresh = () => fetchHistory(1);

  const loadMore = () => {
    if (hasMore && !loadingMore) {
      fetchHistory(currentPage + 1);
    }
  };

  // Helper to get safe data
  const getSafeData = (data, key, defaultValue = 'N/A') => {
    if (!data) return defaultValue;
    
    // Check if key exists and has value
    if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
      return data[key];
    }
    
    return defaultValue;
  };

  // Get status badge color
  const getStatusColor = (status) => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower.includes('pending')) return '#FEF3C7';
    if (statusLower.includes('progress')) return '#DBEAFE';
    if (statusLower.includes('complete')) return '#D1FAE5';
    return '#FEF3C7';
  };

  // Get status text color
  const getStatusTextColor = (status) => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower.includes('pending')) return '#D97706';
    if (statusLower.includes('progress')) return '#1D4ED8';
    if (statusLower.includes('complete')) return '#065F46';
    return '#D97706';
  };

  // Get priority badge color
  const getPriorityColor = (priority) => {
    const priorityLower = priority?.toLowerCase() || '';
    if (priorityLower.includes('high')) return '#FEE2E2';
    if (priorityLower.includes('normal')) return '#DBEAFE';
    if (priorityLower.includes('low')) return '#FEF3C7';
    return '#DBEAFE';
  };

  // Get priority text color
  const getPriorityTextColor = (priority) => {
    const priorityLower = priority?.toLowerCase() || '';
    if (priorityLower.includes('high')) return '#DC2626';
    if (priorityLower.includes('normal')) return '#1D4ED8';
    if (priorityLower.includes('low')) return '#D97706';
    return '#1D4ED8';
  };

  const navigationView = (
    <View style={styles.drawerContainer}>
      <LinearGradient colors={['#2C3E50', '#4ECDC4']} style={styles.drawerHeader}>
        <View style={styles.drawerHeaderContent}>
          <View style={styles.userAvatar}>
            <Icon name="user" size={40} color="#fff" />
          </View>
          <Text style={styles.drawerUserName}>{authUser?.name || 'User'}</Text>
          <Text style={styles.drawerUserRole}>User</Text>
        </View>
      </LinearGradient>

      <View style={styles.drawerMenu}>
        <TouchableOpacity
          style={styles.drawerItem}
          onPress={() => {
            closeDrawer();
            navigation.navigate('UserDashboard');
          }}
        >
          <Icon name="home" size={20} color="#2C3E50" />
          <Text style={styles.drawerItemText}>Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.drawerItem} onPress={closeDrawer}>
          <Icon name="history" size={20} color="#2C3E50" />
          <Text style={styles.drawerItemText}>Request History</Text>
        </TouchableOpacity>

        <View style={styles.drawerDivider} />

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

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#2C3E50" />
        <Text style={styles.loadingText}>Loading History...</Text>
      </View>
    );
  }

  return (
    <DrawerLayoutAndroid
      ref={drawerRef}
      drawerWidth={300}
      drawerPosition="left"
      renderNavigationView={() => navigationView}
    >
      <View style={styles.container}>
        <StatusBar backgroundColor="#2C3E50" barStyle="light-content" />

        {/* Navbar */}
        <View style={styles.navbar}>
          <TouchableOpacity style={styles.menuButton} onPress={openDrawer}>
            <Icon name="bars" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.navbarTitle}>Request History</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
          contentContainerStyle={styles.scrollContent}
          onScrollEndDrag={({ nativeEvent }) => {
            if (nativeEvent.contentOffset.y + nativeEvent.layoutMeasurement.height >= nativeEvent.contentSize.height - 50) {
              loadMore();
            }
          }}
        >
          {error ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>Error Loading History</Text>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => fetchHistory(1)}>
                <LinearGradient colors={['#2C3E50', '#4ECDC4']} style={styles.buttonGradient}>
                  <Text style={styles.buttonText}>Retry</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : requests.length === 0 ? (
            <View style={styles.emptyCard}>
              <Icon name="history" size={50} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No Requests Found</Text>
              <Text style={styles.emptyText}>You haven't submitted any requests yet.</Text>
            </View>
          ) : (
            <View style={styles.requestsContainer}>
              <View style={styles.sectionHeader}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                  <Icon name="arrow-left" size={20} color="#2C3E50" />
                </TouchableOpacity>
                <Text style={styles.sectionTitle}>All Requests ({requests.length})</Text>
                <View style={styles.backButtonPlaceholder} />
              </View>

              {requests.map((req, index) => (
                <TouchableOpacity
                  key={req.id || index}
                  style={styles.requestCard}
                  onPress={() => openRequestDetail(req)}
                >
                  <View style={styles.requestHeader}>
                    <View style={styles.serviceInfo}>
                      <Text style={styles.serviceName}>
                        {getSafeData(req, 'category_name', 'No Category')}
                      </Text>
                      <Text style={styles.projectName}>
                        Project: {getSafeData(req, 'project_name')}
                      </Text>
                    </View>
                    <View style={styles.statusBadges}>
                      <View style={[
                        styles.priorityBadge,
                        { backgroundColor: getPriorityColor(req.priority) }
                      ]}>
                        <Text style={[
                          styles.badgeText,
                          { color: getPriorityTextColor(req.priority) }
                        ]}>
                          {getSafeData(req, 'priority', 'Normal')}
                        </Text>
                      </View>
                      <View style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(req.status) }
                      ]}>
                        <Text style={[
                          styles.badgeText,
                          { color: getStatusTextColor(req.status) }
                        ]}>
                          {getSafeData(req, 'status', 'Pending')}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* DATE FIELD - Now showing actual date */}
                  <View style={styles.dateRow}>
                    <Icon name="calendar" size={14} color="#9CA3AF" style={styles.dateIcon} />
                    <Text style={styles.requestDate}>
                      {getSafeData(req, 'created_at', 'Date not available')}
                    </Text>
                  </View>

                  {/* REQUEST DETAILS IN CARD - Now showing actual details */}
                  <View style={styles.detailsPreview}>
                    <Icon name="file-text" size={16} color="#4ECDC4" />
                    <Text style={styles.detailsPreviewText} numberOfLines={2}>
                      {getSafeData(req, 'request_details', 'No details provided')}
                    </Text>
                  </View>

                  <View style={styles.cardFooter}>
                    <Text style={styles.viewDetailsText}>Tap to view full details →</Text>
                  </View>
                </TouchableOpacity>
              ))}

              {loadingMore && (
                <View style={styles.loadingMore}>
                  <ActivityIndicator size="small" color="#4ECDC4" />
                  <Text style={styles.loadingMoreText}>Loading more...</Text>
                </View>
              )}

              {!hasMore && requests.length > 0 && (
                <Text style={styles.endText}>~ End of history ~</Text>
              )}
            </View>
          )}
        </ScrollView>

        {/* REQUEST DETAIL MODAL - UPDATED WITH ACTUAL DATA */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              {/* Header with Close Icon */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  Request #{selectedRequest?.id || 'N/A'}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Icon name="close" size={28} color="#fff" />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalContent}>
                {/* REQUEST INFORMATION */}
                <View style={styles.modalCard}>
                  <Text style={styles.modalSectionTitle}>REQUEST INFORMATION</Text>
                  
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalLabel}>Request ID:</Text>
                    <Text style={styles.modalValue}>{selectedRequest?.id || 'N/A'}</Text>
                  </View>
                  
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalLabel}>Project:</Text>
                    <Text style={styles.modalValue}>
                      {getSafeData(selectedRequest, 'project_name')}
                    </Text>
                  </View>
                  
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalLabel}>Service/Category:</Text>
                    <Text style={styles.modalValue}>
                      {getSafeData(selectedRequest, 'category_name', 'No Category')}
                    </Text>
                  </View>
                  
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalLabel}>Priority:</Text>
                    <View style={[
                      styles.modalBadge,
                      { backgroundColor: getPriorityColor(selectedRequest?.priority) }
                    ]}>
                      <Text style={styles.modalBadgeText}>
                        {getSafeData(selectedRequest, 'priority', 'Normal')}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* STATUS & TIMELINE - Compact Version */}
<View style={styles.modalCard}>
  <Text style={styles.modalSectionTitle}>STATUS & TIMELINE</Text>
  
  <View style={styles.compactTimelineContainer}>
    {/* Status */}
    <View style={styles.compactRow}>
      <View style={styles.compactLabelContainer}>
        <Icon name="flag" size={18} color="#4ECDC4" style={styles.compactIcon} />
        <Text style={styles.compactLabel}>Status:</Text>
      </View>
      <View style={[
        styles.compactBadge,
        { backgroundColor: getStatusColor(selectedRequest?.status) }
      ]}>
        <Text style={[
          styles.compactBadgeText,
          { color: getStatusTextColor(selectedRequest?.status) }
        ]}>
          {getSafeData(selectedRequest, 'status', 'Pending')}
        </Text>
      </View>
    </View>
    
    {/* Submitted Date */}
    <View style={styles.compactRow}>
      <View style={styles.compactLabelContainer}>
        <Icon name="calendar" size={18} color="#4ECDC4" style={styles.compactIcon} />
        <Text style={styles.compactLabel}>Submitted:</Text>
      </View>
      <Text style={styles.compactValue}>
        {getSafeData(selectedRequest, 'created_at', 'Date not available')}
      </Text>
    </View>
    
    {/* Last Updated (if available) */}
    {selectedRequest?.updated_at && (
      <View style={styles.compactRow}>
        <View style={styles.compactLabelContainer}>
          <Icon name="history" size={18} color="#FFA500" style={styles.compactIcon} />
          <Text style={styles.compactLabel}>Updated:</Text>
        </View>
        <Text style={styles.compactValue}>
          {getSafeData(selectedRequest, 'updated_at', 'Not available')}
        </Text>
      </View>
    )}
  </View>
</View>

                {/* REQUEST DETAILS SECTION - Now showing ACTUAL DETAILS */}
                <View style={styles.modalCard}>
                  <View style={styles.modalSectionHeader}>
                    <Icon name="file-text" size={20} color="#2C3E50" />
                    <Text style={styles.modalSectionTitle}>
                      REQUEST DETAILS
                    </Text>
                  </View>
                  <View style={styles.detailsContainer}>
                    <View style={styles.detailsContent}>
                      <Text style={styles.modalDetailsText}>
                        {getSafeData(selectedRequest, 'request_details', 'No details provided')}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Request Summary Card */}
                <View style={[styles.modalCard, { backgroundColor: '#E8F4FD', borderLeftWidth: 4, borderLeftColor: '#4ECDC4' }]}>
                  <Text style={[styles.modalSectionTitle, { color: '#2C3E50' }]}>REQUEST SUMMARY</Text>
                  <View style={styles.summaryContent}>
                    <View style={styles.summaryRow}>
                      <Icon name="hashtag" size={16} color="#4ECDC4" />
                      <Text style={styles.summaryLabel}>ID: </Text>
                      <Text style={styles.summaryValue}>{selectedRequest?.id || 'N/A'}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Icon name="briefcase" size={16} color="#4ECDC4" />
                      <Text style={styles.summaryLabel}>Project: </Text>
                      <Text style={styles.summaryValue}>{getSafeData(selectedRequest, 'project_name')}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Icon name="cogs" size={16} color="#4ECDC4" />
                      <Text style={styles.summaryLabel}>Category: </Text>
                      <Text style={styles.summaryValue}>{getSafeData(selectedRequest, 'category_name', 'No Category')}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Icon name="flag" size={16} color="#4ECDC4" />
                      <Text style={styles.summaryLabel}>Priority: </Text>
                      <Text style={styles.summaryValue}>{getSafeData(selectedRequest, 'priority', 'Normal')}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Icon name="check-circle" size={16} color="#4ECDC4" />
                      <Text style={styles.summaryLabel}>Status: </Text>
                      <Text style={styles.summaryValue}>{getSafeData(selectedRequest, 'status', 'Pending')}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Icon name="calendar" size={16} color="#4ECDC4" />
                      <Text style={styles.summaryLabel}>Date: </Text>
                      <Text style={styles.summaryValue}>{getSafeData(selectedRequest, 'created_at', 'Unknown date')}</Text>
                    </View>
                  </View>
                </View>
              </ScrollView>

              {/* Close Button at Bottom */}
              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </DrawerLayoutAndroid>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  loader: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#2C3E50',
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
  },
  menuButton: {
    padding: 8,
  },
  navbarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },

  // Requests Container
  requestsContainer: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonPlaceholder: {
    width: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'center',
    flex: 1,
  },

  // Request Card
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#4ECDC4',
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  projectName: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  statusBadges: {
    alignItems: 'flex-end',
    gap: 6,
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 70,
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 70,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateIcon: {
    marginRight: 8,
  },
  requestDate: {
    fontSize: 14,
    color: '#2C3E50',
    fontWeight: '500',
  },
  detailsPreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  detailsPreviewText: {
    marginLeft: 10,
    color: '#4B5563',
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
    alignItems: 'flex-end',
  },
  viewDetailsText: {
    fontSize: 14,
    color: '#4ECDC4',
    fontWeight: '600',
  },

  loadingMore: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingMoreText: {
    marginLeft: 10,
    color: '#4ECDC4',
    fontSize: 14,
  },
  endText: {
    textAlign: 'center',
    padding: 20,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  // Compact Timeline Styles
compactTimelineContainer: {
  marginTop: 8,
},
compactRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingVertical: 10,
  borderBottomWidth: 1,
  borderBottomColor: '#F3F4F6',
},
compactLabelContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  flex: 1,
},
compactIcon: {
  marginRight: 10,
},
compactLabel: {
  fontSize: 15,
  color: '#666',
  fontWeight: '500',
},
compactBadge: {
  paddingHorizontal: 14,
  paddingVertical: 6,
  borderRadius: 20,
  minWidth: 80,
  alignItems: 'center',
},
compactBadgeText: {
  fontSize: 13,
  fontWeight: '600',
},
compactValue: {
  fontSize: 15,
  color: '#2C3E50',
  fontWeight: '600',
  textAlign: 'right',
  flex: 1,
  marginLeft: 10,
},

  // Error Card
  errorCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    margin: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#DC2626',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },

  // Empty State
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 40,
    margin: 20,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginTop: 15,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Buttons
  buttonGradient: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 120,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  retryButton: {
    borderRadius: 12,
    overflow: 'hidden',
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
  drawerDivider: {
    height: 1,
    backgroundColor: '#ecf0f1',
    marginVertical: 15,
  },
  logoutDrawerItem: {
    marginTop: 'auto',
    marginBottom: 20,
  },
  logoutText: {
    color: '#e74c3c',
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.92,
    maxHeight: height * 0.85,
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2C3E50',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalContent: {
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  modalSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginLeft: 8,
    flex: 1,
  },
  modalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalLabel: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
    flex: 1,
  },
  modalValue: {
    fontSize: 15,
    color: '#2C3E50',
    fontWeight: '600',
    textAlign: 'right',
    flex: 2,
  },
  modalBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 30,
    alignSelf: 'flex-start',
  },
  modalBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  detailsContainer: {
    marginTop: 8,
  },
  detailsContent: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalDetailsText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    textAlign: 'left',
  },
  
  // Summary Section
  summaryContent: {
    marginTop: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 6,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#4A5568',
    fontWeight: '500',
    marginLeft: 8,
    width: 70,
  },
  summaryValue: {
    fontSize: 14,
    color: '#2C3E50',
    fontWeight: '600',
    flex: 1,
  },
  
  modalFooter: {
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  closeButton: {
    backgroundColor: '#6c757d',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});

export default UserHistoryScreen;