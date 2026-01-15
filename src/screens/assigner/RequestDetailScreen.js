// RequestDetailScreen.js - Modern Dropdown + Individual Attachment Download Progress
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Alert,
  Dimensions,
  Modal,
  StatusBar,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../../hooks/redux';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/FontAwesome5';
import IconFA from 'react-native-vector-icons/FontAwesome';
import DocumentPicker from 'react-native-document-picker';
import Toast from 'react-native-toast-message';
import api from '../../services/apiService';
import RNBlobUtil from 'react-native-blob-util';

const { width } = Dimensions.get('window');

// ────────────────────────────────────────────────
// Modern Custom Dropdown (same style as AssignProjectsToUsers)
// ────────────────────────────────────────────────
const CustomDropdown = ({
  label,
  options,
  selectedValue,
  onSelect,
  placeholder = "— Select Developer —",
  searchable = true,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [searchText, setSearchText] = useState('');

  const filteredOptions = searchable
    ? options.filter(opt =>
        opt.label.toLowerCase().includes(searchText.toLowerCase()) ||
        (opt.subLabel && opt.subLabel.toLowerCase().includes(searchText.toLowerCase()))
      )
    : options;

  const selectedOption = options.find(opt => opt.value === selectedValue);
  const displayText = selectedOption ? selectedOption.label : placeholder;

  return (
    <View style={customDropdownStyles.dropdownContainer}>
      <Text style={customDropdownStyles.dropdownLabel}>{label}</Text>

      <TouchableOpacity
        style={customDropdownStyles.dropdownTrigger}
        onPress={() => setShowModal(true)}
      >
        <Text
          style={[
            customDropdownStyles.dropdownTriggerText,
            !selectedValue && customDropdownStyles.dropdownTriggerPlaceholder,
          ]}
          numberOfLines={1}
        >
          {displayText}
        </Text>
        <IconFA
          name={showModal ? "chevron-up" : "chevron-down"}
          size={14}
          color="#64748b"
        />
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={customDropdownStyles.modalOverlay}>
          <View style={customDropdownStyles.modalContent}>
            <View style={customDropdownStyles.modalHeader}>
              <Text style={customDropdownStyles.modalTitle}>{label}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <IconFA name="times" size={20} color="#0f172a" />
              </TouchableOpacity>
            </View>

            {searchable && (
              <View style={customDropdownStyles.searchContainer}>
                <IconFA name="search" size={16} color="#9ca3af" style={customDropdownStyles.searchIcon} />
                <TextInput
                  style={customDropdownStyles.searchInput}
                  placeholder="Search by name or email..."
                  placeholderTextColor="#9ca3af"
                  value={searchText}
                  onChangeText={setSearchText}
                  autoCapitalize="none"
                />
              </View>
            )}

            <ScrollView style={customDropdownStyles.optionsList}>
              {filteredOptions.length === 0 ? (
                <View style={customDropdownStyles.emptyState}>
                  <IconFA name="search" size={28} color="#cbd5e1" />
                  <Text style={customDropdownStyles.emptyStateText}>No matching developers found</Text>
                </View>
              ) : (
                filteredOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      customDropdownStyles.optionItem,
                      selectedValue === option.value && customDropdownStyles.optionItemSelected,
                    ]}
                    onPress={() => {
                      onSelect(option.value);
                      setShowModal(false);
                      setSearchText('');
                    }}
                  >
                    <View style={customDropdownStyles.optionContent}>
                      <View style={[
                        customDropdownStyles.radioCircle,
                        selectedValue === option.value && customDropdownStyles.radioCircleSelected
                      ]}>
                        {selectedValue === option.value && (
                          <View style={customDropdownStyles.radioInner} />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={customDropdownStyles.optionLabel}>{option.label}</Text>
                        {option.subLabel && (
                          <Text style={customDropdownStyles.optionSubLabel}>{option.subLabel}</Text>
                        )}
                      </View>
                      {selectedValue === option.value && (
                        <IconFA name="check" size={16} color="#06b6d4" />
                      )}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              style={customDropdownStyles.modalCloseFooter}
              onPress={() => setShowModal(false)}
            >
              <Text style={customDropdownStyles.closeFooterText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const customDropdownStyles = StyleSheet.create({
  dropdownContainer: {
    marginBottom: 20,
  },
  dropdownLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 52,
  },
  dropdownTriggerText: {
    fontSize: 16,
    color: '#0f172a',
    flex: 1,
    marginRight: 8,
  },
  dropdownTriggerPlaceholder: {
    color: '#94a3b8',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { height: -4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 24 },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#0f172a',
  },
  optionsList: {
    maxHeight: 420,
  },
  optionItem: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  optionItemSelected: {
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    borderColor: '#06b6d4',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#06b6d4',
  },
  optionLabel: {
    fontSize: 16,
    color: '#0f172a',
    fontWeight: '500',
  },
  optionSubLabel: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 15,
    color: '#94a3b8',
  },
  modalCloseFooter: {
    padding: 20,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  closeFooterText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#06b6d4',
  },
});

// ────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────
const RequestDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { logout } = useAuth();
  const { requestId } = route.params;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [request, setRequest] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [deptHead, setDeptHead] = useState(null);
  const [error, setError] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [selectedDeveloper, setSelectedDeveloper] = useState('');
  const [developerInstructions, setDeveloperInstructions] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [submittingRemarks, setSubmittingRemarks] = useState(false);
  const [submittingAssignment, setSubmittingAssignment] = useState(false);
  const [showConvoModal, setShowConvoModal] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState({});

  // ────────────────────────────────────────────────
  // Your existing functions (unchanged)
  // ────────────────────────────────────────────────

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (err) {
      console.log('Date format error:', err);
      return dateString;
    }
  };

  const fetchRequestDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await api.assigner.getRequestDetails(requestId);

      if (res.data?.success) {
        setRequest(res.data.request);
        setConversations(res.data.conversations || []);
        setDevelopers(res.data.developers || []);
        setDeptHead(res.data.dept_head || null);
        
        if (res.data.assigned_developer_id) {
          setSelectedDeveloper(res.data.assigned_developer_id.toString());
        }
        
        if (res.data.assigner_comments) {
          setDeveloperInstructions(res.data.assigner_comments);
        }
      } else {
        setError(res.data?.message || 'Failed to load request details');
      }
    } catch (err) {
      console.error('Request detail fetch error:', err);
      setError(err.response?.data?.message || err.message || 'Network error');
      Toast.show({
        type: 'error',
        text1: 'Failed to load request',
        text2: err.message || 'Please try again',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [requestId]);

  useEffect(() => {
    fetchRequestDetails();
  }, [fetchRequestDetails]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRequestDetails();
  }, [fetchRequestDetails]);

  const handleSendRemarks = async () => {
    if (!remarks.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Remarks Required',
        text2: 'Please provide remarks before saving',
      });
      return;
    }

    try {
      setSubmittingRemarks(true);
      
      const payload = {
        assigner_remarks: remarks.trim(),
      };

      if (selectedFile) {
        payload.assigner_attachment = {
          uri: selectedFile.uri,
          type: selectedFile.type || 'application/octet-stream',
          name: selectedFile.name || `file_${Date.now()}.pdf`,
        };
      }

      console.log('Sending payload:', {
        remarks: remarks.trim(),
        hasFile: !!selectedFile,
        fileName: selectedFile?.name,
      });

      const res = await api.assigner.sendActionToDeptHead(requestId, payload);

      if (res.data.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Your remarks have been saved successfully!',
        });
        
        setRemarks('');
        setSelectedFile(null);
        fetchRequestDetails();
      } else {
        Toast.show({
          type: 'error',
          text1: 'Failed',
          text2: res.data?.message || 'Could not save remarks',
        });
      }
    } catch (err) {
      console.error('Send remarks error:', err);
      console.error('Error response:', err.response?.data);
      
      if (err.response?.data?.errors) {
        const errorMessages = Object.values(err.response.data.errors).flat();
        Toast.show({
          type: 'error',
          text1: 'Validation Error',
          text2: errorMessages[0] || 'Please check your input',
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Failed to save remarks',
          text2: err.response?.data?.message || err.message || 'Please try again',
        });
      }
    } finally {
      setSubmittingRemarks(false);
    }
  };

  const handleAssignDeveloper = async () => {
    if (!selectedDeveloper) {
      Toast.show({
        type: 'error',
        text1: 'Developer Required',
        text2: 'Please select a developer',
      });
      return;
    }

    try {
      setSubmittingAssignment(true);
      
      const payload = {
        developer_id: parseInt(selectedDeveloper),
        assigner_comments: developerInstructions,
      };

      const res = await api.assigner.assignToDeveloper(requestId, payload);

      if (res.data.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Developer assigned and comment saved successfully!',
        });
        
        fetchRequestDetails();
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Failed to assign developer',
        text2: err.response?.data?.message || err.message || 'Please try again',
      });
    } finally {
      setSubmittingAssignment(false);
    }
  };

  const pickFile = async () => {
    try {
      const res = await DocumentPicker.pickSingle({
        type: [
          DocumentPicker.types.pdf,
          DocumentPicker.types.doc,
          DocumentPicker.types.docx,
          DocumentPicker.types.images,
          DocumentPicker.types.zip,
        ],
      });
      setSelectedFile(res);
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        Toast.show({
          type: 'error',
          text1: 'File Selection Error',
          text2: 'Could not pick the file',
        });
      }
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          },
        },
      ]
    );
  };

  const getPriorityColor = (priority) => {
    switch(priority?.toLowerCase()) {
      case 'high': return '#ef4444';
      case 'normal': return '#06b6d4';
      case 'medium': return '#f59e0b';
      case 'low': return '#94a3b8';
      default: return '#06b6d4';
    }
  };

  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'pending': return '#f59e0b';
      case 'inprogress': return '#06b6d4';
      case 'completed': return '#10b981';
      default: return '#f59e0b';
    }
  };

  const downloadFile = async (url, filename) => {
    try {
      const token = await api.getCurrentToken();
      if (!token) {
        Alert.alert('Session expired', 'Please log in again.');
        return;
      }

      setDownloadStatus(prev => ({
        ...prev,
        [url]: { downloading: true, progress: 0 }
      }));

      const { DownloadDir } = RNBlobUtil.fs.dirs;

      RNBlobUtil.config({
        addAndroidDownloads: {
          useDownloadManager: true,
          notification: true,
          path: `${DownloadDir}/${filename}`,
          title: filename,
          description: 'Downloading attachment',
          mediaScannable: true,
        },
      })
        .fetch('GET', url, { Authorization: `Bearer ${token}` })
        .progress((received, total) => {
          const percentage = Math.floor((received / total) * 100);
          setDownloadStatus(prev => ({
            ...prev,
            [url]: { downloading: true, progress: percentage }
          }));
        })
        .then(() => {
          setDownloadStatus(prev => ({
            ...prev,
            [url]: { downloading: false, progress: 100 }
          }));
          setTimeout(() => {
            setDownloadStatus(prev => {
              const newStatus = { ...prev };
              delete newStatus[url];
              return newStatus;
            });
          }, 2000);
          Alert.alert('Download Complete', `File saved to Downloads: ${filename}`);
        })
        .catch((err) => {
          console.error('Download error:', err);
          setDownloadStatus(prev => {
            const newStatus = { ...prev };
            delete newStatus[url];
            return newStatus;
          });
          Alert.alert('Download Failed', 'Unable to download file.');
        });
    } catch (e) {
      console.error(e);
      setDownloadStatus(prev => {
        const newStatus = { ...prev };
        delete newStatus[url];
        return newStatus;
      });
      Alert.alert('Error', 'Something went wrong.');
    }
  };

  // Prepare developer options for modern dropdown
  const developerOptions = developers.map(dev => ({
    label: dev.name || 'Unknown Developer',
    value: dev.id.toString(),
    subLabel: dev.email || '',
  }));

  // ────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#06b6d4" />
        <Text style={styles.loadingText}>Loading request details...</Text>
      </View>
    );
  }

  if (error || !request) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#2C3E50', '#4ECDC4']} style={styles.errorHeader}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={20} color="#fff" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.errorHeaderTitle}>Request #{requestId}</Text>
        </LinearGradient>
        <View style={styles.errorContent}>
          <Icon name="exclamation-circle" size={60} color="#94a3b8" />
          <Text style={styles.errorTitle}>Failed to Load Request</Text>
          <Text style={styles.errorMessage}>{error || 'Request not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchRequestDetails}>
            <LinearGradient colors={['#06b6d4', '#48ecb2']} style={styles.retryButtonGradient}>
              <Icon name="redo" size={16} color="#fff" />
              <Text style={styles.retryButtonText}>Retry</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#2C3E50" barStyle="light-content" />

      <LinearGradient
        colors={['#2C3E50', '#4ECDC4']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.topActions}
      >
        <View style={styles.pageTitleContainer}>
          <Text style={styles.pageTitle}>Request #{request.id}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) }]}>
            <Text style={styles.statusBadgeText}>
              {request.status_label || request.status || 'Pending'}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#06b6d4', '#48ecb2']}
            tintColor="#06b6d4"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          <View style={styles.leftColumn}>
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <Icon name="info-circle" size={20} color="#06b6d4" />
                <Text style={styles.sectionTitle}>Request Overview</Text>
              </View>

              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Project</Text>
                  <Text style={styles.infoValue}>{request.project?.name || 'N/A'}</Text>
                </View>

                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Submitted By</Text>
                  <Text style={styles.infoValue}>{request.user?.name || 'Unknown'}</Text>
                </View>

                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Priority</Text>
                  <View style={[styles.priorityBadge, { borderColor: getPriorityColor(request.priority) }]}>
                    <Icon 
                      name={
                        request.priority?.toLowerCase() === 'high' ? 'exclamation-triangle' :
                        request.priority?.toLowerCase() === 'normal' ? 'minus-circle' :
                        'arrow-down-circle'
                      } 
                      size={14} 
                      color={getPriorityColor(request.priority)} 
                    />
                    <Text style={[styles.priorityText, { color: getPriorityColor(request.priority) }]}>
                      {request.priority_label || request.priority || 'Normal'}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Created On</Text>
                  <Text style={styles.infoValue}>{formatDate(request.created_at)}</Text>
                </View>

                {request.dept_head_required === 1 ? (
                  <>
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Department Head</Text>
                      <View style={styles.deptHeadInfo}>
                        {deptHead ? (
                          <>
                            <Text style={[styles.infoValue, { fontWeight: '700' }]}>{deptHead.name}</Text>
                            <Text style={styles.deptHeadEmail}>{deptHead.email}</Text>
                          </>
                        ) : (
                          <Text style={styles.noDeptHead}>No Dept Head Assigned</Text>
                        )}
                      </View>
                    </View>

                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Dept Head Approval</Text>
                      <View style={styles.approvalInfo}>
                        {request.dept_head_status === 'approved' ? (
                          <>
                            <View style={[styles.approvalBadge, styles.approvedBadge]}>
                              <Text style={styles.approvalBadgeText}>Approved</Text>
                            </View>
                            <Text style={styles.approvalDate}>
                              {formatDate(request.dept_head_approved_at)}
                            </Text>
                          </>
                        ) : request.dept_head_status === 'rejected' ? (
                          <View style={[styles.approvalBadge, styles.rejectedBadge]}>
                            <Text style={styles.approvalBadgeText}>Rejected</Text>
                          </View>
                        ) : (
                          <View style={[styles.approvalBadge, styles.pendingBadge]}>
                            <Text style={styles.approvalBadgeText}>Pending</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </>
                ) : (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Dept Head Approval</Text>
                    <Text style={styles.notRequiredText}>Not Required</Text>
                  </View>
                )}
              </View>

              <View style={styles.detailsContainer}>
                <Text style={styles.detailsLabel}>Request Details</Text>
                <View style={styles.detailsBox}>
                  <Text style={styles.detailsText}>{request.request_details || 'No details provided'}</Text>
                </View>
              </View>
            </View>

            {request.dept_head_required === 1 && (
              <View style={[styles.card, styles.conversationCard]}>
                <View style={styles.sectionHeader}>
                  <Icon name="comments" size={20} color="#8b5cf6" />
                  <Text style={[styles.sectionTitle, styles.conversationTitle]}>
                    Department Head Conversation
                  </Text>
                </View>

                <TouchableOpacity 
                  style={styles.viewConvoButtonInline}
                  onPress={() => setShowConvoModal(true)}
                >
                  <Icon name="expand" size={16} color="#8b5cf6" />
                  <Text style={styles.viewConvoTextInline}>View Full Conversation</Text>
                </TouchableOpacity>

                {conversations.length > 0 ? (
                  <ScrollView style={styles.conversationTimeline} nestedScrollEnabled>
                    {conversations.map((convo, index) => (
                      <View key={index} style={styles.messageCard}>
                        {convo.assigner_remarks && (
                          <View style={[styles.messageBubble, styles.assignerMessage]}>
                            <View style={styles.messageHeader}>
                              <View style={styles.senderInfo}>
                                <View style={[styles.avatar, styles.assignerAvatar]}>
                                  <Icon name="user-cog" size={16} color="#fff" />
                                </View>
                                <View>
                                  <Text style={styles.senderName}>
                                    {convo.assigner_name || 'Assigner'}
                                  </Text>
                                  <View style={styles.assignerBadge}>
                                    <Text style={styles.roleBadgeText}>Assigner</Text>
                                  </View>
                                </View>
                              </View>
                              <Text style={styles.messageTime}>
                                {formatDate(convo.assigner_date || convo.created_at)}
                              </Text>
                            </View>

                            <Text style={styles.messageText}>{convo.assigner_remarks}</Text>

                            {convo.assigner_attachments && (
                              <TouchableOpacity
                                style={styles.attachmentItem}
                                onPress={() => {
                                  const url = convo.assigner_attachments;
                                  const name = url.split('/').pop() || 'attachment';
                                  downloadFile(url, name);
                                }}
                              >
                                <Icon name="file-download" size={18} color="#06b6d4" />
                                <Text style={styles.attachmentName} numberOfLines={1}>
                                  {convo.assigner_attachments.split('/').pop() || 'Attachment'}
                                </Text>
                                {downloadStatus[convo.assigner_attachments]?.downloading && (
                                  <View style={styles.downloadProgress}>
                                    <ActivityIndicator size="small" color="#06b6d4" />
                                    <Text style={styles.progressText}>
                                      {downloadStatus[convo.assigner_attachments]?.progress}%
                                    </Text>
                                  </View>
                                )}
                              </TouchableOpacity>
                            )}
                          </View>
                        )}

                        {convo.submitter_remarks && (
                          <View style={[styles.messageBubble, styles.deptHeadMessage]}>
                            <View style={styles.messageHeader}>
                              <View style={styles.senderInfo}>
                                <View style={[styles.avatar, styles.deptHeadAvatar]}>
                                  <Icon name="user-tie" size={16} color="#fff" />
                                </View>
                                <View>
                                  <Text style={styles.senderName}>
                                    {convo.submitter_name || 'Department Head'}
                                  </Text>
                                  <View style={styles.deptHeadBadgeContainer}>
                                    <View style={styles.deptHeadRoleBadge}>
                                      <Text style={styles.roleBadgeText}>Dept Head</Text>
                                    </View>
                                    {convo.submitter_status && (
                                      <View style={[
                                        styles.statusBadgeSmall,
                                        convo.submitter_status === 'approved' ? styles.approvedStatus : 
                                        convo.submitter_status === 'rejected' ? styles.rejectedStatus :
                                        styles.pendingStatus
                                      ]}>
                                        <Text style={styles.statusBadgeSmallText}>
                                          {convo.submitter_status.charAt(0).toUpperCase() + convo.submitter_status.slice(1)}
                                        </Text>
                                      </View>
                                    )}
                                  </View>
                                </View>
                              </View>
                              <Text style={styles.messageTime}>
                                {formatDate(convo.submitter_date || convo.updated_at)}
                              </Text>
                            </View>

                            <Text style={styles.messageText}>{convo.submitter_remarks}</Text>

                            {convo.submitter_attachments && (
                              <TouchableOpacity
                                style={styles.attachmentItem}
                                onPress={() => {
                                  const url = convo.submitter_attachments;
                                  const name = url.split('/').pop() || 'attachment';
                                  downloadFile(url, name);
                                }}
                              >
                                <Icon name="file-download" size={18} color="#8b5cf6" />
                                <Text style={styles.attachmentName} numberOfLines={1}>
                                  {convo.submitter_attachments.split('/').pop() || 'Attachment'}
                                </Text>
                                {downloadStatus[convo.submitter_attachments]?.downloading && (
                                  <View style={styles.downloadProgress}>
                                    <ActivityIndicator size="small" color="#8b5cf6" />
                                    <Text style={styles.progressText}>
                                      {downloadStatus[convo.submitter_attachments]?.progress}%
                                    </Text>
                                  </View>
                                )}
                              </TouchableOpacity>
                            )}
                          </View>
                        )}
                      </View>
                    ))}
                  </ScrollView>
                ) : (
                  <View style={styles.emptyConversation}>
                    <Icon name="comment-slash" size={50} color="#cbd5e1" />
                    <Text style={styles.emptyConvoTitle}>No conversation yet</Text>
                    <Text style={styles.emptyConvoText}>
                      Start a conversation with the Department Head by adding remarks below.
                    </Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <Icon name="edit" size={20} color="#06b6d4" />
                <Text style={styles.sectionTitle}>Assigner Remarks & Action</Text>
              </View>

              <TextInput
                style={styles.remarksInput}
                placeholder="Provide feedback or instructions..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={5}
                value={remarks}
                onChangeText={setRemarks}
              />

              {request.dept_head_required === 1 && (
                <View style={styles.remarksNote}>
                  <Icon name="info-circle" size={14} color="#06b6d4" />
                  <Text style={styles.remarksNoteText}>
                    These remarks will be visible to the Department Head.
                  </Text>
                </View>
              )}

              <TouchableOpacity style={styles.filePicker} onPress={pickFile}>
                <Icon name="paperclip" size={16} color="#06b6d4" />
                <Text style={styles.filePickerText}>
                  {selectedFile ? selectedFile.name : 'Attach Document (Optional)'}
                </Text>
                {selectedFile && (
                  <TouchableOpacity onPress={() => setSelectedFile(null)}>
                    <IconFA name="times" size={14} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  submittingRemarks && styles.submitButtonDisabled
                ]}
                onPress={handleSendRemarks}
                disabled={submittingRemarks}
              >
                {submittingRemarks ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Icon name="save" size={16} color="#fff" />
                    <Text style={styles.submitButtonText}>Save Remarks</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.rightColumn}>
            {request.status !== 'completed' ? (
              <View style={styles.card}>
                <View style={styles.sectionHeader}>
                  <Icon name="user-plus" size={20} color="#06b6d4" />
                  <Text style={styles.sectionTitle}>Assign to Developer</Text>
                </View>

                {/* ← Modern dropdown here — only this part changed */}
                <CustomDropdown
                  label="Developer *"
                  options={developerOptions}
                  selectedValue={selectedDeveloper}
                  onSelect={setSelectedDeveloper}
                />

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Instructions</Text>
                  <TextInput
                    style={styles.instructionsInput}
                    placeholder="Specific instructions..."
                    placeholderTextColor="#94a3b8"
                    multiline
                    numberOfLines={4}
                    value={developerInstructions}
                    onChangeText={setDeveloperInstructions}
                  />
                </View>

                <TouchableOpacity
                  style={[
                    styles.assignButton,
                    submittingAssignment && styles.assignButtonDisabled
                  ]}
                  onPress={handleAssignDeveloper}
                  disabled={submittingAssignment || !selectedDeveloper}
                >
                  {submittingAssignment ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Icon name="paper-plane" size={16} color="#fff" />
                      <Text style={styles.assignButtonText}>Assign Request</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={[styles.card, styles.completedCard]}>
                <View style={styles.sectionHeader}>
                  <Icon name="check-circle" size={20} color="#10b981" />
                  <Text style={styles.sectionTitle}>Completed</Text>
                </View>

                {request.attachment ? (
                  <TouchableOpacity 
                    style={styles.downloadButton}
                    onPress={() => {
                      const attachmentUrl = request.attachment;
                      const filename = attachmentUrl.split('/').pop();
                      downloadFile(attachmentUrl, filename);
                    }}
                  >
                    <Icon name="download" size={20} color="#fff" />
                    <Text style={styles.downloadButtonText}>Download Attachment</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.noAttachment}>
                    <Icon name="file" size={40} color="#cbd5e1" />
                    <Text style={styles.noAttachmentText}>No attachment uploaded</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={showConvoModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowConvoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient colors={['#06b6d4', '#48ecb2']} style={styles.modalHeader}>
              <Icon name="comments" size={24} color="#fff" />
              <Text style={styles.modalTitle}>Conversation with Department Head</Text>
              <TouchableOpacity onPress={() => setShowConvoModal(false)}>
                <IconFA name="times" size={24} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView style={styles.modalBody}>
              {conversations.length === 0 ? (
                <View style={styles.emptyModal}>
                  <Icon name="comments" size={60} color="#cbd5e1" />
                  <Text style={styles.emptyModalText}>No conversation yet</Text>
                </View>
              ) : (
                conversations.map((convo, index) => (
                  <View key={index} style={styles.modalMessageCard}>
                    {convo.assigner_remarks && (
                      <View style={styles.modalAssignerMessage}>
                        <Text style={styles.modalSenderName}>{convo.assigner_name || 'Assigner'}</Text>
                        <Text style={styles.modalMessageText}>{convo.assigner_remarks}</Text>
                        
                        {convo.assigner_attachments && (
                          <TouchableOpacity
                            style={styles.modalAttachment}
                            onPress={() => downloadFile(convo.assigner_attachments, convo.assigner_attachments.split('/').pop() || 'attachment')}
                          >
                            <Icon name="file-download" size={16} color="#06b6d4" />
                            <Text style={styles.modalAttachmentText} numberOfLines={1}>
                              {convo.assigner_attachments.split('/').pop() || 'Attachment'}
                            </Text>
                            {downloadStatus[convo.assigner_attachments]?.downloading && (
                              <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}>
                                <ActivityIndicator size="small" color="#06b6d4" />
                                <Text style={{ fontSize: 12, color: '#64748b', marginLeft: 4 }}>
                                  {downloadStatus[convo.assigner_attachments]?.progress}%
                                </Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        )}

                        <Text style={styles.modalMessageTime}>
                          {formatDate(convo.assigner_date || convo.created_at)}
                        </Text>
                      </View>
                    )}

                    {convo.submitter_remarks && (
                      <View style={styles.modalDeptHeadMessage}>
                        <Text style={styles.modalSenderName}>{convo.submitter_name || 'Dept Head'}</Text>
                        <Text style={styles.modalMessageText}>{convo.submitter_remarks}</Text>
                        
                        {convo.submitter_attachments && (
                          <TouchableOpacity
                            style={styles.modalAttachment}
                            onPress={() => {
                              const url = convo.submitter_attachments;
                              const name = url.split('/').pop() || 'attachment';
                              downloadFile(url, name);
                            }}
                          >
                            <Icon name="file-download" size={16} color="#8b5cf6" />
                            <Text style={styles.modalAttachmentText} numberOfLines={1}>
                              {convo.submitter_attachments.split('/').pop() || 'Attachment'}
                            </Text>
                            {downloadStatus[convo.submitter_attachments]?.downloading && (
                              <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}>
                                <ActivityIndicator size="small" color="#8b5cf6" />
                                <Text style={{ fontSize: 12, color: '#64748b', marginLeft: 4 }}>
                                  {downloadStatus[convo.submitter_attachments]?.progress}%
                                </Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        )}

                        <Text style={styles.modalMessageTime}>
                          {formatDate(convo.submitter_date || convo.updated_at)}
                        </Text>
                      </View>
                    )}
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Toast />
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0fdfa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0fdfa',
  },
  loadingText: {
    marginTop: 10,
    color: '#0f172a',
    fontSize: 16,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 15,
    gap: 15,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  errorHeaderTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  errorContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  retryButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  topActions: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 20,
  },
  pageTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    flexWrap: 'wrap',
  },
  backButtonOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
  },
  backButtonOutlineText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  statusBadge: {
    marginLeft:100,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusBadgeText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  scrollContent: {
    padding: 16,
  },
  grid: {
    flexDirection: width > 768 ? 'row' : 'column',
    gap: 24,
  },
  leftColumn: {
    flex: 1,
    gap: 24,
  },
  rightColumn: {
    width: width > 768 ? 420 : '100%',
    gap: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  conversationTitle: {
    color: '#8b5cf6',
  },
  // ADDED: New inline button style
  viewConvoButtonInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#8b5cf6',
    marginBottom: 16,
  },
  viewConvoTextInline: {
    color: '#8b5cf6',
    fontWeight: '700',
    fontSize: 15,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  infoItem: {
    flex: 1,
    minWidth: width > 768 ? '45%' : '100%',
    backgroundColor: '#f0fdfa',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#06b6d4',
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderWidth: 2,
    alignSelf: 'flex-start',
  },
  priorityText: {
    fontSize: 14,
    fontWeight: '600',
  },
  deptHeadInfo: {
    marginTop: 4,
  },
  deptHeadEmail: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  noDeptHead: {
    fontSize: 14,
    color: '#a1a1aa',
    fontStyle: 'italic',
  },
  approvalInfo: {
    marginTop: 4,
  },
  approvalBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  approvedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  rejectedBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  pendingBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  approvalBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  approvalDate: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 6,
  },
  notRequiredText: {
    fontSize: 14,
    color: '#a1a1aa',
    fontStyle: 'italic',
  },
  detailsContainer: {
    marginTop: 16,
  },
  detailsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  detailsBox: {
    backgroundColor: '#f0fdfa',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#99f6e4',
  },
  detailsText: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 24,
  },
  conversationCard: {
    backgroundColor: '#fff',
  },
  conversationTimeline: {
    maxHeight: 400,
  },
  messageCard: {
    marginBottom: 20,
  },
  messageBubble: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  assignerMessage: {
    backgroundColor: 'rgba(6, 182, 212, 0.05)',
    borderLeftWidth: 4,
    borderLeftColor: '#06b6d4',
  },
  deptHeadMessage: {
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
    borderLeftWidth: 4,
    borderLeftColor: '#8b5cf6',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  assignerAvatar: {
    backgroundColor: '#06b6d4',
  },
  deptHeadAvatar: {
    backgroundColor: '#8b5cf6',
  },
  senderName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  assignerBadge: {
    backgroundColor: '#06b6d4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  deptHeadBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deptHeadRoleBadge: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  statusBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  approvedStatus: {
    backgroundColor: '#10b981',
  },
  rejectedStatus: {
    backgroundColor: '#ef4444',
  },
  pendingStatus: {
    backgroundColor: '#f59e0b',
  },
  statusBadgeSmallText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  messageTime: {
    fontSize: 12,
    color: '#64748b',
  },
  messageText: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 22,
  },
  attachmentLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 8,
  },
  attachmentText: {
    fontSize: 14,
    color: '#06b6d4',
    fontWeight: '600',
  },
  emptyConversation: {
    alignItems: 'center',
    padding: 40,
  },
  emptyConvoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyConvoText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
  },
  remarksInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    fontSize: 16,
    color: '#0f172a',
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  remarksNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderRadius: 8,
  },
  remarksNoteText: {
    fontSize: 14,
    color: '#0d9488',
    flex: 1,
  },
  filePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
  },
  filePickerText: {
    flex: 1,
    fontSize: 16,
    color: '#0f172a',
  },
  submitButton: {
    backgroundColor: '#06b6d4',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  pickerContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: '#0f172a',
  },
  instructionsInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    fontSize: 16,
    color: '#0f172a',
    textAlignVertical: 'top',
  },
  assignButton: {
    backgroundColor: '#06b6d4',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 10,
  },
  assignButtonDisabled: {
    opacity: 0.6,
  },
  assignButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  completedCard: {
    backgroundColor: '#f0fdfa',
    borderWidth: 2,
    borderColor: '#99f6e4',
  },
  downloadButton: {
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 16,
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  noAttachment: {
    alignItems: 'center',
    padding: 40,
  },
  noAttachmentText: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    marginTop: 50,
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 10,
  },
  modalBody: {
    padding: 24,
  },
  emptyModal: {
    alignItems: 'center',
    padding: 60,
  },
  emptyModalText: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 16,
  },
  modalMessageCard: {
    marginBottom: 20,
  },
  modalAssignerMessage: {
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#06b6d4',
    marginBottom: 12,
  },
  modalDeptHeadMessage: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#8b5cf6',
  },
  modalSenderName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  modalMessageText: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 22,
    marginBottom: 8,
  },
  modalMessageTime: {
    fontSize: 12,
    color: '#64748b',
  },
    attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    gap: 10,
  },
  attachmentName: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '500',
  },
  downloadProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressText: {
    fontSize: 12,
    color: '#64748b',
  },
  // Modal-specific attachment style
  modalAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalAttachmentText: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '500',
  },
});

export default RequestDetailScreen;