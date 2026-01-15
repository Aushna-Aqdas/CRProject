import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StatusBar,
  Alert,
  RefreshControl,
  Dimensions,
  Animated,
  PanResponder,
  Platform,
  KeyboardAvoidingView,
  PermissionsAndroid,
} from 'react-native';
import { useAuth } from '../../hooks/redux';
import { useNavigation } from '@react-navigation/native';
import { Dropdown } from 'react-native-element-dropdown';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/FontAwesome';
import * as Animatable from 'react-native-animatable';
import apiService from '../../services/apiService';
import Footer from '../../components/Footer';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import DocumentPicker from 'react-native-document-picker';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import RNFS from 'react-native-fs';

const { width } = Dimensions.get('window');
const audioRecorderPlayer = new AudioRecorderPlayer();

const UserDashboard = () => {
  const { user: authUser, logout } = useAuth();
  const navigation = useNavigation();

  // Drawer states
  const [drawerOpen, setDrawerOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(-width)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  // Dashboard data
  const [projects, setProjects] = useState([]);
  const [services, setServices] = useState([]);
  const [recentRequests, setRecentRequests] = useState([]);
  const [apiUser, setApiUser] = useState(null);

  // Form states
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [selectedSubQuery, setSelectedSubQuery] = useState('');
  const [subQueries, setSubQueries] = useState([]);
  const [priority, setPriority] = useState('normal');
  const [priorityReason, setPriorityReason] = useState('');
  const [requestDetails, setRequestDetails] = useState('');
  const [submittedBy, setSubmittedBy] = useState('');
  const [pendingCount, setPendingCount] = useState(0);

  // Attachments
  const [attachments, setAttachments] = useState([]);

  // Real Audio Recording states
  const [voiceNote, setVoiceNote] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordTime, setRecordTime] = useState('00:00');
  const [playTime, setPlayTime] = useState('00:00');
  const [audioPath, setAudioPath] = useState('');

  // Loading & UI
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingSubQueries, setLoadingSubQueries] = useState(false);
  const [notification, setNotification] = useState({ message: '', type: '' });
  const [submitLoading, setSubmitLoading] = useState(false);
  const showNotification = (message, type = 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: '', type: '' }), 4000);
  };
  

  // ====================== AUDIO PERMISSIONS ======================

  const requestAudioPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const grants = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        ]);

        if (grants['android.permission.RECORD_AUDIO'] === PermissionsAndroid.RESULTS.GRANTED) {
          return true;
        } else {
          Alert.alert('Permission Denied', 'Audio recording permission is required');
          return false;
        }
      } catch (err) {
        console.warn('Permission error:', err);
        return false;
      }
    }
    return true;
  };

  // ====================== AUDIO RECORDING FUNCTIONS ======================

 const onStartRecord = async () => {
    const hasPermission = await requestAudioPermission();
    if (!hasPermission) {
      showNotification('Audio permission not granted', 'error');
      return;
    }

    try {
      const path = Platform.select({
        ios: `${RNFS.DocumentDirectoryPath}/audio_${Date.now()}.m4a`,
        android: `${RNFS.CachesDirectoryPath}/audio_${Date.now()}.mp3`,
      });

      await audioRecorderPlayer.startRecorder(path);
      
      audioRecorderPlayer.addRecordBackListener((e) => {
        // Format time properly: convert milliseconds to MM:SS
        const minutes = Math.floor(e.currentPosition / 60000);
        const seconds = Math.floor((e.currentPosition % 60000) / 1000);
        const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        setRecordTime(formattedTime);
      });

      setIsRecording(true);
      setAudioPath(path);
      console.log('Recording started at:', path);
    } catch (error) {
      console.error('Error starting recording:', error);
      showNotification('Failed to start recording', 'error');
    }
  };

  const onStopRecord = async () => {
    try {
      const result = await audioRecorderPlayer.stopRecorder();
      audioRecorderPlayer.removeRecordBackListener();
      
      setIsRecording(false);
      
      const base64Audio = await RNFS.readFile(result, 'base64');
      
      const voiceNoteData = {
        uri: result,
        base64: `data:audio/${Platform.OS === 'ios' ? 'm4a' : 'mp3'};base64,${base64Audio}`,
        name: `voice_note_${Date.now()}.${Platform.OS === 'ios' ? 'm4a' : 'mp3'}`,
        type: `audio/${Platform.OS === 'ios' ? 'm4a' : 'mpeg'}`,
        duration: recordTime,
      };
      
      setVoiceNote(voiceNoteData);
      setRecordTime('00:00');
      console.log('Recording stopped:', result);
      showNotification('Voice note saved successfully', 'success');
    } catch (error) {
      console.error('Error stopping recording:', error);
      showNotification('Failed to save recording', 'error');
    }
  };

  const onStartPlay = async () => {
    if (!voiceNote?.uri) {
      showNotification('No voice note to play', 'error');
      return;
    }

    try {
      await audioRecorderPlayer.startPlayer(voiceNote.uri);
      
      audioRecorderPlayer.addPlayBackListener((e) => {
        // Format play time properly: convert milliseconds to MM:SS
        const minutes = Math.floor(e.currentPosition / 60000);
        const seconds = Math.floor((e.currentPosition % 60000) / 1000);
        const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        setPlayTime(formattedTime);
        
        if (e.currentPosition === e.duration) {
          onStopPlay();
        }
      });
      
      setIsPlaying(true);
    } catch (error) {
      console.error('Error playing audio:', error);
      showNotification('Failed to play audio', 'error');
    }
  };

  const onStopPlay = async () => {
    try {
      await audioRecorderPlayer.stopPlayer();
      audioRecorderPlayer.removePlayBackListener();
      setIsPlaying(false);
      setPlayTime('00:00');
    } catch (error) {
      console.error('Error stopping playback:', error);
    }
  };

  const removeVoiceNote = async () => {
    try {
      if (isPlaying) {
        await onStopPlay();
      }

      if (voiceNote?.uri) {
        const fileExists = await RNFS.exists(voiceNote.uri);
        if (fileExists) {
          await RNFS.unlink(voiceNote.uri);
        }
      }

      setVoiceNote(null);
      setAudioPath('');
      setPlayTime('00:00');
      showNotification('Voice note removed', 'success');
    } catch (error) {
      console.error('Error removing voice note:', error);
      setVoiceNote(null);
    }
  };

  // ====================== CLEANUP ON UNMOUNT ======================

  useEffect(() => {
    return () => {
      audioRecorderPlayer.stopRecorder();
      audioRecorderPlayer.stopPlayer();
      audioRecorderPlayer.removeRecordBackListener();
      audioRecorderPlayer.removePlayBackListener();
    };
  }, []);

  // ====================== FETCH DASHBOARD DATA ======================

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await apiService.user.getDashboard();

      if (response.data.success) {
        const data = response.data.data;

        if (data.user) {
          setApiUser(data.user);
          setSubmittedBy(data.user.name || '');
        }

        const uniqueProjects = Array.from(
          new Map((data.projects || []).map(p => [p.id, { id: p.id, name: p.name }])).values()
        );
        setProjects(uniqueProjects);

        setServices(data.queries || []);
        setRecentRequests(data.recent_requests || []);
        
        const pending = data.recent_requests?.filter(r => r.status.toLowerCase() === 'pending').length || 0;
        setPendingCount(pending);
      } else {
        showNotification(response.data.message || 'Failed to load dashboard', 'error');
      }
    } catch (error) {
      console.error('Dashboard fetch error:', error.response || error);
      showNotification('Failed to load dashboard. Please login again.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchSubQueries = async (serviceId) => {
    if (!serviceId) {
      setSubQueries([]);
      setSelectedSubQuery('');
      return;
    }

    setLoadingSubQueries(true);
    try {
      const response = await apiService.user.getSubQueries(serviceId);
      
      if (response.data.success) {
        const subQueriesData = response.data.data || [];
        setSubQueries(subQueriesData.map(sq => ({ id: sq.id, name: sq.name })));
      } else {
        setSubQueries([]);
      }
    } catch (error) {
      console.error('Error fetching sub-queries:', error);
      setSubQueries([]);
      showNotification('Failed to load sub-categories', 'error');
    } finally {
      setLoadingSubQueries(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (selectedService) {
      fetchSubQueries(selectedService);
    } else {
      setSubQueries([]);
      setSelectedSubQuery('');
    }
  }, [selectedService]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  // ====================== FORM SUBMISSION ======================

  const handleSubmit = async () => {
    if (!selectedProject) return showNotification('Please select a project', 'error');
    if (!selectedService) return showNotification('Please select a category', 'error');
    if (!requestDetails.trim()) return showNotification('Please enter request details', 'error');
    if (!submittedBy.trim()) return showNotification('Submitted by name is required', 'error');
    if (priority === 'high' && !priorityReason.trim())
      return showNotification('Please provide reason for high priority', 'error');

    setSubmitLoading(true);

    const formData = new FormData();
    formData.append('project_id', selectedProject);
    formData.append('query_id', selectedService);
    if (selectedSubQuery) formData.append('sub_query_id', selectedSubQuery);
    formData.append('priority', priority);
    formData.append('request_details', requestDetails.trim());
    formData.append('submitted_by_name', submittedBy.trim());
    if (priority === 'high') formData.append('priority_reason', priorityReason.trim());

    if (voiceNote?.base64) {
      formData.append('voice_note', voiceNote.base64);
    }

    attachments.forEach((file, i) => {
      formData.append(`attachments[${i}]`, {
        uri: file.uri,
        type: file.type || 'application/octet-stream',
        name: file.name || `file_${i}`,
      });
    });

    try {
      const response = await apiService.user.submitChangeRequest(formData);
      if (response.data.success) {
        showNotification(response.data.message || 'Request submitted successfully!', 'success');
        resetForm();
        fetchDashboardData();
      } else {
        showNotification(response.data.message || 'Submission failed', 'error');
      }
    } catch (error) {
      showNotification(
        error.response?.data?.message || error.message || 'Network error',
        'error'
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  const resetForm = async () => {
    setSelectedProject('');
    setSelectedService('');
    setSelectedSubQuery('');
    setPriority('normal');
    setPriorityReason('');
    setRequestDetails('');
    setAttachments([]);
    
    if (voiceNote?.uri) {
      try {
        const fileExists = await RNFS.exists(voiceNote.uri);
        if (fileExists) {
          await RNFS.unlink(voiceNote.uri);
        }
      } catch (error) {
        console.log('Error deleting voice note file:', error);
      }
    }
    setVoiceNote(null);
    setAudioPath('');
  };

  // ====================== MEDIA & DOCUMENTS ======================

  const pickMedia = async (useCamera = false) => {
    const options = {
      mediaType: 'mixed',
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
      quality: 0.8,
      selectionLimit: 5,
    };

    try {
      const response = useCamera ? await launchCamera(options) : await launchImageLibrary(options);
      if (response.didCancel || response.errorCode) return;

      const newFiles = response.assets.map(asset => ({
        uri: asset.uri,
        type: asset.type || 'image/jpeg',
        name: asset.fileName || `file_${Date.now()}.jpg`,
      }));
      setAttachments(prev => [...prev, ...newFiles]);
      showNotification(`${newFiles.length} file(s) added`, 'success');
    } catch (err) {
      Alert.alert('Error', 'Failed to pick media');
    }
  };

  const pickDocument = async () => {
    try {
      const results = await DocumentPicker.pick({
        type: [DocumentPicker.types.allFiles],
        allowMultiSelection: true,
      });

      const newFiles = results.map(file => ({
        uri: file.uri,
        type: file.type || 'application/octet-stream',
        name: file.name,
        size: file.size,
      }));

      setAttachments(prev => [...prev, ...newFiles]);
      showNotification(`${newFiles.length} document(s) added`, 'success');
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        console.log('User cancelled document picker');
      } else {
        console.error('Document Picker Error:', err);
        Alert.alert('Error', 'Could not pick document. Please try again.');
      }
    }
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // ====================== DRAWER ======================

  const openDrawer = () => {
    setDrawerOpen(true);
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const closeDrawer = () => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: -width, duration: 300, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setDrawerOpen(false));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => drawerOpen,
      onMoveShouldSetPanResponder: (_, g) => drawerOpen && Math.abs(g.dx) > 10,
      onPanResponderMove: (_, g) => g.dx < 0 && slideAnim.setValue(g.dx),
      onPanResponderRelease: (_, g) => (g.dx < -100 ? closeDrawer() : openDrawer()),
    })
  ).current;

  // ====================== RENDER ======================

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#2C3E50" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  const navigationView = () => (
    <View style={styles.drawerContainer}>
      <LinearGradient colors={['#2C3E50', '#4ECDC4']} style={styles.drawerHeader}>
        <View style={styles.drawerHeaderContent}>
          <View style={styles.userAvatar}>
            <Icon name="user" size={40} color="#fff" />
          </View>
          <Text style={styles.drawerUserName}>{apiUser?.name || authUser?.name || 'User'}</Text>
          <Text style={styles.drawerUserRole}>User</Text>
        </View>
      </LinearGradient>

      <View style={styles.drawerMenu}>
        <TouchableOpacity style={styles.drawerItem} onPress={closeDrawer}>
          <Icon name="home" size={20} color="#2C3E50" />
          <Text style={styles.drawerItemText}>Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.drawerItem} onPress={() => { closeDrawer(); navigation.navigate('UserHistory'); }}>
          <Icon name="history" size={20} color="#2C3E50" />
          <Text style={styles.drawerItemText}>View History</Text>
        </TouchableOpacity>

        <View style={styles.drawerDivider} />

        <TouchableOpacity
          style={[styles.drawerItem, styles.logoutDrawerItem]}
          onPress={() => {
            closeDrawer();
            Alert.alert('Logout', 'Are you sure?', [
              { text: 'Cancel' },
              { text: 'Logout', onPress: logout, style: 'destructive' },
            ]);
          }}
        >
          <Icon name="sign-out" size={20} color="#e74c3c" />
          <Text style={[styles.drawerItemText, styles.logoutText]}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#2C3E50" barStyle="light-content" />

      {drawerOpen && (
        <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closeDrawer} />
        </Animated.View>
      )}

      <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}>
        {navigationView()}
      </Animated.View>

      <Animated.View style={styles.mainContent} {...panResponder.panHandlers}>
        <View style={styles.navbar}>
          <TouchableOpacity style={styles.menuButton} onPress={openDrawer}>
            <Icon name="bars" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.navbarTitle}>User Dashboard</Text>
          <View style={{ width: 40 }} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <ScrollView
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            contentContainerStyle={styles.scrollContent}
          >
            {notification.message && (
              <Animatable.View
                animation="fadeInDown"
                style={[styles.notification, notification.type === 'error' ? styles.error : styles.success]}
              >
                <Text style={styles.notificationText}>{notification.message}</Text>
              </Animatable.View>
            )}

            <LinearGradient colors={['#2C3E50', '#4ECDC4']} style={styles.header}>
              <Text style={styles.welcomeText}>
                Welcome, {apiUser?.name || authUser?.name || 'User'}
              </Text>
              <Text style={styles.roleText}>Project Enhancement Portal</Text>
            </LinearGradient>

            <Animatable.View animation="fadeInUp" style={styles.requestForm}>
              <LinearGradient colors={['#fff', '#f8f9fa']} style={styles.cardGradient}>
                <Text style={styles.formTitle}>Submit New Request</Text>

                <View style={styles.formSection}>
                  <Text style={styles.label}>Select Project *</Text>
                  <View style={styles.inputWrapper}>
                    <Icon name="folder" size={20} color="#4ECDC4" style={styles.inputIcon} />
                    <Dropdown
                      style={styles.dropdown}
                      data={projects.map(p => ({ label: p.name, value: p.id }))}
                      search
                      labelField="label"
                      valueField="value"
                      placeholder={projects.length === 0 ? "No projects available" : "Select Project"}
                      searchPlaceholder="Search..."
                      value={selectedProject}
                      onChange={item => setSelectedProject(item.value)}
                    />
                  </View>
                </View>

                <View style={styles.formSection}>
                  <Text style={styles.label}>Request Category *</Text>
                  <View style={styles.inputWrapper}>
                    <Icon name="cogs" size={20} color="#4ECDC4" style={styles.inputIcon} />
                    <Dropdown
                      style={styles.dropdown}
                      data={services.map(s => ({ label: s.name, value: s.id }))}
                      search
                      labelField="label"
                      valueField="value"
                      placeholder={services.length === 0 ? "No categories available" : "Select Category"}
                      searchPlaceholder="Search..."
                      value={selectedService}
                      onChange={item => {
                        setSelectedService(item.value);
                        setSelectedSubQuery('');
                      }}
                    />
                  </View>
                </View>

                <View style={styles.formSection}>
                  <Text style={styles.label}>Sub Category (Optional)</Text>
                  <View style={styles.inputWrapper}>
                    <Icon name="list-alt" size={20} color="#4ECDC4" style={styles.inputIcon} />
                    <Dropdown
                      style={styles.dropdown}
                      data={subQueries.map(sq => ({ label: sq.name, value: sq.id }))}
                      labelField="label"
                      valueField="value"
                      placeholder={
                        loadingSubQueries ? "Loading..." :
                        !selectedService ? "Select category first" :
                        subQueries.length === 0 ? "No sub-categories" : "Select Sub Category"
                      }
                      value={selectedSubQuery}
                      onChange={item => setSelectedSubQuery(item.value)}
                      disabled={loadingSubQueries || !selectedService || subQueries.length === 0}
                    />
                    {loadingSubQueries && <ActivityIndicator size="small" color="#4ECDC4" style={styles.loadingIndicator} />}
                  </View>
                </View>

                <View style={styles.formSection}>
                  <Text style={styles.label}>Priority Level *</Text>
                  <View style={styles.priorityGroup}>
                    {[{ value: 'high', label: 'High', color: '#ff6b6b' },
                      { value: 'normal', label: 'Normal', color: '#4ECDC4' },
                      { value: 'low', label: 'Low', color: '#ffd166' }].map(item => (
                      <TouchableOpacity
                        key={item.value}
                        style={[styles.priorityOption, priority === item.value && { backgroundColor: item.color, borderColor: item.color }]}
                        onPress={() => {
                          setPriority(item.value);
                          if (item.value !== 'high') setPriorityReason('');
                        }}
                      >
                        <Text style={[styles.priorityText, priority === item.value && styles.priorityTextSelected]}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {priority === 'high' && (
                    <Animatable.View animation="fadeIn" style={styles.highPriorityReasonContainer}>
                      <Text style={styles.label}>Reason for High Priority *</Text>
                      <View style={styles.textareaWrapper}>
                        <Icon name="exclamation-triangle" size={20} color="#ff6b6b" style={styles.textareaIcon} />
                        <TextInput
                          style={styles.textarea}
                          multiline
                          placeholder="Explain urgency..."
                          placeholderTextColor="#999"
                          value={priorityReason}
                          onChangeText={setPriorityReason}
                        />
                      </View>
                    </Animatable.View>
                  )}
                </View>

                <View style={styles.formSection}>
                  <Text style={styles.label}>Request Details *</Text>
                  <View style={styles.textareaWrapper}>
                    <Icon name="edit" size={20} color="#4ECDC4" style={styles.textareaIcon} />
                    <TextInput
                      style={styles.textarea}
                      multiline
                      numberOfLines={6}
                      placeholder="Describe your request..."
                      placeholderTextColor="#999"
                      value={requestDetails}
                      onChangeText={setRequestDetails}
                    />
                  </View>
                </View>

                <View style={styles.formSection}>
                  <Text style={styles.label}>Submitted By *</Text>
                  <View style={styles.inputWrapper}>
                    <Icon name="user" size={20} color="#4ECDC4" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      value={submittedBy}
                      onChangeText={setSubmittedBy}
                      placeholder="Enter your full name"
                      placeholderTextColor="#999"
                    />
                  </View>
                </View>

                <View style={styles.formSection}>
                  <Text style={styles.label}>Attachments (Optional)</Text>
                  <Text style={styles.helperText}>Add images, documents, or screenshots</Text>
                  <View style={styles.attachmentButtons}>
                    <TouchableOpacity style={styles.attachBtn} onPress={() => pickMedia(false)}>
                      <Icon name="image" size={20} color="#4ECDC4" />
                      <Text style={styles.attachBtnText}>Gallery</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.attachBtn} onPress={() => pickMedia(true)}>
                      <Icon name="camera" size={20} color="#4ECDC4" />
                      <Text style={styles.attachBtnText}>Camera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.attachBtn} onPress={pickDocument}>
                      <Icon name="paperclip" size={20} color="#4ECDC4" />
                      <Text style={styles.attachBtnText}>Document</Text>
                    </TouchableOpacity>
                  </View>

                  {attachments.length > 0 && (
                    <View style={styles.attachmentList}>
                      <Text style={styles.attachmentsCount}>
                        {attachments.length} file(s) attached
                      </Text>
                      {attachments.map((file, index) => (
                        <View key={index} style={styles.attachmentItem}>
                          <Icon 
                            name={file.type?.includes('image') ? 'image' : 
                                  file.type?.includes('video') ? 'video' : 
                                  'file'} 
                            size={16} 
                            color="#4ECDC4" 
                          />
                          <Text style={styles.attachmentName} numberOfLines={1}>
                            {file.name}
                          </Text>
                          <TouchableOpacity onPress={() => removeAttachment(index)}>
                            <Icon name="times" size={18} color="#ff6b6b" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* ============= REAL VOICE NOTE SECTION ============= */}
                <View style={styles.formSection}>
                  <Text style={styles.label}>Voice Note (Optional)</Text>
                  <Text style={styles.helperText}>Record audio explanation for your request</Text>
                  
                  {voiceNote ? (
                    <View style={styles.voiceNoteContainer}>
                      <View style={styles.voiceNotePreview}>
                        <Icon name="microphone" size={20} color="#4ECDC4" />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.voiceNoteText}>Voice note saved</Text>
                          <Text style={styles.voiceNoteDuration}>{voiceNote.duration}</Text>
                        </View>
                        <TouchableOpacity 
                          onPress={isPlaying ? onStopPlay : onStartPlay} 
                          style={styles.playButton}
                        >
                          <Icon name={isPlaying ? "pause" : "play"} size={18} color="#34d399" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={removeVoiceNote}>
                          <Icon name="times" size={18} color="#ff6b6b" />
                        </TouchableOpacity>
                      </View>
                      {isPlaying && (
                        <View style={styles.playTimeContainer}>
                          <Text style={styles.playTimeText}>Playing: {playTime}</Text>
                        </View>
                      )}
                    </View>
                  ) : isRecording ? (
                    <View style={styles.recordingView}>
                      <View style={styles.recordingIndicator}>
                        <Icon name="circle" size={12} color="#ff6b6b" />
                      </View>
                      <Text style={styles.recordingText}>Recording... {recordTime}</Text>
                      <TouchableOpacity style={styles.stopBtn} onPress={onStopRecord}>
                        <Icon name="stop" size={20} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.recordBtn} onPress={onStartRecord}>
                      <Icon name="microphone" size={24} color="#fff" />
                      <Text style={styles.recordBtnText}>Tap to Record Voice Note</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {pendingCount > 0 && (
                  <View style={styles.pendingBanner}>
                    <Icon name="info-circle" size={20} color="#fff" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pendingText}>
                        You have {pendingCount} pending request{pendingCount !== 1 ? 's' : ''}.
                        {' '}Maximum allowed: 3
                      </Text>
                      {pendingCount >= 3 && (
                        <Text style={styles.pendingWarning}>
                          You cannot submit new requests until some are processed.
                        </Text>
                      )}
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.submitBtn, (submitLoading || pendingCount >= 3) && styles.submitBtnDisabled]}
                  onPress={handleSubmit}
                  disabled={submitLoading || pendingCount >= 3}
                >
                  <LinearGradient colors={['#2C3E50', '#4ECDC4']} style={styles.submitBtnGradient}>
                    {submitLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : pendingCount >= 3 ? (
                      <Text style={styles.submitBtnText}>Limit Reached (3/3)</Text>
                    ) : (
                      <Text style={styles.submitBtnText}>Submit Request</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>
            </Animatable.View>
          </ScrollView>
                              <Footer />

        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
};

// ====================== STYLES ======================

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: width * 0.8,
    zIndex: 1000,
    elevation: 1000,
  },
  mainContent: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    zIndex: 1,
  },
  scrollContent: {
    padding: 0,
    paddingTop: 1,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 25,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 9,
  },
  welcomeText: {
    fontSize: 23,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  roleText: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  requestForm: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    marginHorizontal: 20,
  },
  cardGradient: {
    padding: 20,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 20,
    textAlign: 'center',
  },
  formSection: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 10,
    fontWeight: '600',
    fontSize: 16,
    color: '#2C3E50'
  },
  helperText: {
    fontSize: 12,
    color: '#7b8788',
    marginBottom: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#e1e5e9',
    height: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  textareaWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e1e5e9',
    minHeight: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
    width: 20,
  },
  textareaIcon: {
    marginRight: 12,
    marginTop: 9,
    width: 20,
  },
  dropdown: {
    flex: 1,
  },
  textInput: {
    flex: 1,
    color: '#2C3E50',
    fontSize: 16,
  },
  loadingIndicator: {
    position: 'absolute',
    right: 15,
  },
  priorityGroup: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  priorityOption: {
    flex: 1,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
  },
  priorityText: {
    textAlign: 'center',
    fontWeight: '500',
    color: '#666',
    fontSize: 14,
  },
  priorityTextSelected: {
    color: 'white',
    fontWeight: '600'
  },
  highPriorityReasonContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#fff5f5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffcccc',
  },
  textarea: {
    flex: 1,
    color: '#2C3E50',
    fontSize: 16,
    lineHeight: 22,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  attachmentButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  attachBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f9f9',
    padding: 12,
    borderRadius: 10,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  attachBtnText: {
    marginLeft: 6,
    color: '#2C3E50',
    fontWeight: '500',
  },
  attachmentList: {
    marginTop: 8,
  },
  attachmentsCount: {
    fontSize: 12,
    color: '#7b8788',
    marginBottom: 5,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
  },
  attachmentName: {
    flex: 1,
    color: '#2C3E50',
    marginLeft: 10,
    marginRight: 10,
  },
  // ============= VOICE NOTE STYLES =============
  voiceNoteContainer: {
    marginTop: 8,
  },
  voiceNotePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
  voiceNoteText: {
    color: '#2e7d32',
    fontWeight: '600',
    fontSize: 14,
  },
  voiceNoteDuration: {
    color: '#2e7d32',
    fontSize: 12,
    marginTop: 2,
  },
  playButton: {
    marginRight: 15,
    padding: 5,
  },
  playTimeContainer: {
    backgroundColor: '#f1f8f4',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  playTimeText: {
    color: '#2e7d32',
    fontSize: 12,
    textAlign: 'center',
  },
  recordingView: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffcccc',
  },
  recordingIndicator: {
    marginRight: 10,
    width: 12,
    height: 12,
  },
  recordingText: {
    flex: 1,
    color: '#c62828',
    fontWeight: '600',
    fontSize: 14,
  },
  stopBtn: {
    backgroundColor: '#ff6b6b',
    borderRadius: 20,
    padding: 10,
    marginLeft: 10,
  },
  recordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4ECDC4',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#4ECDC4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  recordBtnText: {
    color: '#fff',
    marginLeft: 10,
    fontWeight: '600',
    fontSize: 15,
  },
  pendingBanner: {
    backgroundColor: '#ffd166',
    padding: 12,
    marginBottom: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pendingText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  pendingWarning: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 4,
  },
  submitBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 10,
    shadowColor: '#2C3E50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnGradient: {
    padding: 16,
    alignItems: 'center',
  },
  submitBtnText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600'
  },
  notification: {
    padding: 16,
    borderRadius: 10,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    marginHorizontal: 20,
  },
  notificationText: {
    color: 'white',
    fontWeight: '500',
    textAlign: 'center',
  },
  error: {
    backgroundColor: '#ff6b6b'
  },
  success: {
    backgroundColor: '#34d399'
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#2C3E50',
  },
});

export default UserDashboard;