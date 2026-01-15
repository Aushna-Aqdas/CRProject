// screens/ResolverRequestDetail.js - COMPLETE FIXED VERSION
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  DrawerLayoutAndroid
} from 'react-native';
import { useAuth } from '../../hooks/redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';

const ResolverRequestDetail = ({ route, navigation }) => {
  const { requestId } = route.params;
  const { user, userApi, logout } = useAuth();
  
  const [requestData, setRequestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState(null);
  const drawerRef = useRef(null);

  const [formData, setFormData] = useState({
    status: '',
    hours_worked: '',
    resolver_comment: ''
  });

  const openDrawer = () => {
    if (drawerRef.current) {
      drawerRef.current.openDrawer();
    }
  };

  const closeDrawer = () => {
    if (drawerRef.current) {
      drawerRef.current.closeDrawer();
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
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
          }
        }
      ]
    );
  };

  const navigationView = () => (
    <View style={styles.drawerContainer}>
      <LinearGradient
        colors={['#2C3E50', '#4ECDC4']}
        style={styles.drawerHeader}
      >
        <View style={styles.drawerHeaderContent}>
          <View style={styles.userAvatar}>
            <Icon name="account-tie" size={40} color="#fff" />
          </View>
          <Text style={styles.drawerUserName}>
            {user?.name || 'Resolver'}
          </Text>
          <Text style={styles.drawerUserRole}>Resolver</Text>
        </View>
      </LinearGradient>

      <View style={styles.drawerMenu}>
        <TouchableOpacity 
          style={styles.drawerItem}
          onPress={() => {
            closeDrawer();
            navigation.navigate('ResolverDashboard');
          }}
        >
          <Icon name="home" size={20} color="#2C3E50" />
          <Text style={styles.drawerItemText}>Dashboard</Text>
        </TouchableOpacity>

        <View style={styles.drawerDivider} />

        <TouchableOpacity 
          style={[styles.drawerItem, styles.logoutDrawerItem]}
          onPress={() => {
            closeDrawer();
            handleLogout();
          }}
        >
          <Icon name="logout" size={20} color="#e74c3c" />
          <Text style={[styles.drawerItemText, styles.logoutText]}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ✅ Fetch request details
  const fetchRequestDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('================================');
      console.log('🔍 FETCHING REQUEST DETAILS');
      console.log('================================');
      console.log('Request ID:', requestId);
      
      if (!userApi || !userApi.resolver) {
        throw new Error('API not initialized');
      }

      const response = await userApi.resolver.getRequestDetails(requestId);
      
      console.log('📥 Response:', JSON.stringify(response?.data, null, 2));
      
      if (!response?.data?.success) {
        throw new Error(response?.data?.message || 'Failed to load request');
      }

      const data = response.data;
      setRequestData(data);

      // Initialize form
      setFormData({
        status: data.request?.status || 'pending',
        hours_worked: data.request?.working_hours?.toString() || '0',
        resolver_comment: data.request?.resolver_comment || ''
      });
      
      console.log('✅ Request details loaded');
      
    } catch (error) {
      console.error('❌ Error:', error.message);
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      setError(errorMessage);
      
      Alert.alert(
        'Error Loading Request',
        errorMessage,
        [
          { text: 'Go Back', onPress: () => navigation.goBack(), style: 'cancel' },
          { text: 'Retry', onPress: () => fetchRequestDetails() }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED: Update status with proper validation
  const handleUpdateStatus = async () => {
    if (!formData.status) {
      return Alert.alert('Error', 'Please select a status');
    }

    try {
      setUpdating(true);
      
      // ✅ Parse hours_worked properly
      let hoursWorked = 0;
      
      if (formData.hours_worked && formData.hours_worked.trim() !== '') {
        const parsed = parseFloat(formData.hours_worked);
        if (!isNaN(parsed) && parsed >= 0) {
          hoursWorked = parsed;
        } else {
          Alert.alert('Validation Error', 'Working hours must be a valid positive number');
          setUpdating(false);
          return;
        }
      }
      
      // ✅ Format resolver_comment (null if empty)
      let resolverComment = null;
      if (formData.resolver_comment && formData.resolver_comment.trim() !== '') {
        resolverComment = formData.resolver_comment.trim();
      }
      
      // ✅ Create payload with correct types
      const payload = {
        status: formData.status,
        hours_worked: hoursWorked,  // number
        resolver_comment: resolverComment,  // string or null
      };

      console.log('================================');
      console.log('📤 SENDING UPDATE');
      console.log('================================');
      console.log('Payload:', JSON.stringify(payload, null, 2));
      console.log('Types:', {
        status: typeof payload.status,
        hours_worked: typeof payload.hours_worked,
        resolver_comment: payload.resolver_comment === null ? 'null' : typeof payload.resolver_comment
      });

      const response = await userApi.resolver.updateRequestStatus(requestId, payload);
      
      console.log('📥 Response:', JSON.stringify(response.data, null, 2));

      if (response.data.success) {
        setShowSuccess(true);
        
        const updated = response.data.updated_data;
        
        setFormData({
          status: updated.status,
          hours_worked: updated.working_hours?.toString() || '0',
          resolver_comment: updated.resolver_comment || '',
        });

        setRequestData(prev => ({
          ...prev,
          request: {
            ...prev.request,
            status: updated.status,
            working_hours: updated.working_hours,
            resolver_comment: updated.resolver_comment,
          }
        }));
        
        console.log('✅ Update successful');

        setTimeout(() => {
          setShowSuccess(false);
        }, 2500);
      } else {
        Alert.alert('Error', response.data.message || 'Update failed');
      }
    } catch (error) {
      console.log('================================');
      console.log('❌ UPDATE ERROR');
      console.log('================================');
      console.error('Error:', error.message);
      console.error('Response:', JSON.stringify(error.response?.data, null, 2));
      
      if (error.response?.status === 422) {
        const errors = error.response?.data?.errors;
        
        if (errors) {
          let errorMsg = 'Validation Failed:\n\n';
          Object.entries(errors).forEach(([field, messages]) => {
            errorMsg += `• ${field}: ${messages.join(', ')}\n`;
          });
          Alert.alert('Validation Error', errorMsg);
        } else {
          Alert.alert('Validation Error', error.response?.data?.message || 'Please check your input');
        }
      } else {
        Alert.alert('Update Failed', error.response?.data?.message || error.message || 'Failed to update status');
      }
    } finally {
      setUpdating(false);
    }
  };

  // ✅ Input handler for working hours
  const handleHoursChange = (text) => {
    if (text === '') {
      setFormData(prev => ({ ...prev, hours_worked: '' }));
      return;
    }
    
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    
    if (parts.length > 2) {
      return;
    }
    
    if (parts[1] && parts[1].length > 2) {
      return;
    }
    
    setFormData(prev => ({ ...prev, hours_worked: cleaned }));
  };

  useEffect(() => {
    console.log('🚀 Component mounted, requestId:', requestId);
    fetchRequestDetails();
  }, [requestId]);

  const InfoItem = ({ label, value, icon, isBadge = false, badgeType = '' }) => (
    <View style={styles.detailRow}>
      <Text style={styles.label}>
        <Icon name={icon} size={16} color="#2C3E50" /> {label}
      </Text>
      {isBadge ? (
        <Text style={[styles.value, { color: badgeType.includes('status') ? statusColor(value) : priorityColor(value) }]}>
          {value || 'N/A'}
        </Text>
      ) : (
        <Text style={styles.value}>{value || 'N/A'}</Text>
      )}
    </View>
  );

  // Loading State
  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#2C3E50" />
        <Text style={styles.loadingText}>Loading Request Details...</Text>
      </View>
    );
  }

  // Error State
  if (error) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor="#2C3E50" barStyle="light-content" />
        
        <View style={styles.navbar}>
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.navbarCenter}>
            <Text style={styles.navbarTitle}>Error</Text>
          </View>
          
          <View style={styles.navbarRight} />
        </View>

        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={60} color="#DC2626" />
          <Text style={styles.errorTitle}>Failed to Load Request</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchRequestDetails}
          >
            <LinearGradient colors={['#2C3E50', '#4ECDC4']} style={styles.buttonGradient}>
              <Icon name="refresh" size={20} color="#fff" />
              <Text style={styles.buttonText}>Retry</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // No Data State
  if (!requestData || !requestData.request) {
    return (
      <View style={styles.loader}>
        <Icon name="file-document-outline" size={60} color="#94a3b8" />
        <Text style={styles.loadingText}>No request data available</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <DrawerLayoutAndroid
      ref={drawerRef}
      drawerWidth={300}
      drawerPosition="left"
      renderNavigationView={navigationView}
    >
      <View style={styles.container}>
        <StatusBar backgroundColor="#2C3E50" barStyle="light-content" />
        
        {/* Top Navbar */}
        <View style={styles.navbar}>
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={openDrawer}
          >
            <Icon name="menu" size={24} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.navbarCenter}>
            <Text style={styles.navbarTitle}>Request #{requestData.request.id}</Text>
          </View>
          
          <View style={styles.navbarRight}>
            <TouchableOpacity style={styles.navbarIcon}>
              <Icon name="account" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <KeyboardAvoidingView 
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          {/* Success Modal */}
          <Modal
            visible={showSuccess}
            transparent
            animationType="fade"
          >
            <View style={styles.modalOverlay}>
              <View style={styles.successModal}>
                <Icon name="check-circle" size={40} color="#fff" />
                <Text style={styles.successTitle}>Success!</Text>
                <Text style={styles.successMessage}>Status updated successfully</Text>
                <TouchableOpacity 
                  style={styles.successClose}
                  onPress={() => setShowSuccess(false)}
                >
                  <Icon name="close" size={20} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Request Details Card */}
            <View style={styles.detailCard}>
              <Text style={styles.cardTitle}>Request Information</Text>
              
              <InfoItem 
                label="User" 
                value={requestData.request.user?.name} 
                icon="account" 
              />

              <InfoItem 
                label="Status" 
                value={requestData.request.status?.charAt(0).toUpperCase() + requestData.request.status?.slice(1)} 
                icon="information" 
                isBadge 
                badgeType="status"
              />

              <InfoItem 
                label="Priority" 
                value={requestData.request.priority?.charAt(0).toUpperCase() + requestData.request.priority?.slice(1)} 
                icon="alert-circle" 
                isBadge 
                badgeType="priority"
              />

              <InfoItem 
                label="Created" 
                value={requestData.request.created_at || 'N/A'} 
                icon="calendar" 
              />

              <InfoItem 
                label="Assigner Message" 
                value={requestData.assigner_comment || 'No message'} 
                icon="email" 
              />

              <View style={styles.detailsSection}>
                <Text style={styles.sectionLabel}>
                  <Icon name="text" size={16} color="#2C3E50" /> Request Details
                </Text>
                <Text style={styles.detailsText}>
                  {requestData.request.request_details || 'No details provided'}
                </Text>
              </View>
            </View>

            {/* Update Form Card */}
            <View style={styles.detailCard}>
              <Text style={styles.cardTitle}>Update Request Status</Text>

              {/* Status Selector */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionLabel}>
                  <Icon name="sync" size={16} color="#2C3E50" /> Update Status
                </Text>
                <View style={styles.statusButtons}>
                  {['pending', 'inprogress', 'completed'].map(status => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.statusButton,
                        formData.status === status && styles.statusButtonActive,
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, status }))}
                    >
                      <Text style={[
                        styles.statusButtonText,
                        formData.status === status && styles.statusButtonTextActive
                      ]}>
                        {status === 'inprogress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Working Hours - FIXED */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionLabel}>
                  <Icon name="clock" size={16} color="#2C3E50" /> Working Hours
                </Text>
                <TextInput
                  style={styles.textArea}
                  value={formData.hours_worked}
                  onChangeText={handleHoursChange}
                  placeholder="Enter working hours (e.g., 5.5)"
                  placeholderTextColor="#94a3b8"
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                />
                <Text style={styles.inputHint}>
                  Enter hours as a number (e.g., 5 or 5.5). Leave empty for 0.
                </Text>
              </View>

              {/* Resolver Comment */}
              <View style={styles.detailSection}>
                <Text style={styles.sectionLabel}>
                  <Icon name="comment" size={16} color="#2C3E50" /> Resolver Comment
                </Text>
                <TextInput
                  style={[styles.textArea, { height: 100 }]}
                  value={formData.resolver_comment}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, resolver_comment: text }))}
                  placeholder="Enter your comments (optional)..."
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  returnKeyType="done"
                  blurOnSubmit={true}
                />
              </View>
            </View>

            {/* Action Button */}
            <TouchableOpacity
              style={[styles.assignBtn, (updating || !formData.status) && styles.assignBtnDisabled]}
              disabled={updating || !formData.status}
              onPress={handleUpdateStatus}
            >
              <LinearGradient colors={['#2C3E50', '#4ECDC4']} style={styles.buttonGradient}>
                {updating ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Icon name="content-save" size={20} color="#fff" />
                    <Text style={styles.buttonText}>Update Status</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </DrawerLayoutAndroid>
  );
};

const statusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'pending': return '#F59E0B';
    case 'inprogress': return '#3B82F6';
    case 'completed': return '#10B981';
    default: return '#6B7280';
  }
};

const priorityColor = (priority) => {
  switch (priority?.toLowerCase()) {
    case 'high': return '#DC2626';
    case 'normal': return '#3B82F6';
    case 'low': return '#059669';
    default: return '#374151';
  }
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
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#2C3E50',
    textAlign: 'center',
  },
  
  // Error State
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#DC2626',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backButtonText: {
    fontSize: 16,
    color: '#2C3E50',
    fontWeight: '600',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuButton: {
    padding: 8,
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
    width: 40,
  },
  navbarIcon: {
    padding: 8,
  },

  // Detail Card
  detailCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    margin: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 20,
    textAlign: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  detailSection: {
    marginBottom: 20,
  },
  detailsSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  label: { 
    fontWeight: '600', 
    color: '#374151',
    fontSize: 14,
    flex: 1,
  },
  sectionLabel: {
    fontWeight: '600', 
    color: '#374151',
    fontSize: 14,
    marginBottom: 8,
  },
  value: { 
    fontSize: 16, 
    color: '#111827', 
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  detailsText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    marginTop: 8,
    backgroundColor: '#f8fafc',
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#4ECDC4',
  },

  // Status Buttons
  statusButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statusButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  statusButtonActive: {
    borderColor: '#4ECDC4',
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'capitalize',
  },
  statusButtonTextActive: {
    color: '#2C3E50',
  },

  // Input and TextArea
  textArea: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 15,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    fontSize: 16,
    color: '#000000',
  },
  inputHint: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
    fontStyle: 'italic',
  },

  // Buttons
  buttonGradient: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  assignBtn: {
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  assignBtnDisabled: {
    opacity: 0.6,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successModal: {
    backgroundColor: '#10B981',
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    margin: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 10,
    marginBottom: 5,
  },
  successMessage: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  successClose: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 15,
    padding: 5,
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
});

export default ResolverRequestDetail;