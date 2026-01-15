// src/screens/depthead/ProjectConversationScreen.js

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import LinearGradient from 'react-native-linear-gradient';
import { Platform } from 'react-native';
import { Buffer } from 'buffer';
import RNBlobUtil from 'react-native-blob-util';
import api from '../../services/apiService';
import { WebView } from 'react-native-webview'; // For PDF preview
import RNFS from 'react-native-fs'; // For file download (install: npm install react-native-fs)

const { width } = Dimensions.get('window');

const ProjectConversationScreen = ({ route, navigation }) => {
  const { projectId } = route.params;
  const [project, setProject] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
const [progress, setProgress] = useState(0);


  useEffect(() => {
    fetchConversation();
  }, []);

  const fetchConversation = async () => {
    try {
      const response = await api.deptHead.getProjectConversations(projectId);
      if (response.data.success) {
        setProject(response.data.project);
        setConversations(response.data.conversations || []);
      } else {
        Alert.alert('Error', response.data.message || 'Failed to load conversation');
      }
    } catch (error) {
      Alert.alert('Error', 'Could not load conversation. Please try again.');
    } finally {
      setLoading(false);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 500);
    }
  };

  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return 'file-image-o';
    if (ext === 'pdf') return 'file-pdf-o';
    if (['doc', 'docx'].includes(ext)) return 'file-word-o';
    if (['zip', 'rar'].includes(ext)) return 'file-archive-o';
    return 'file-o';
  };

  const getFileColor = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return '#27ae60';
    if (ext === 'pdf') return '#e74c3c';
    if (['doc', 'docx'].includes(ext)) return '#2c5ca9';
    if (['zip', 'rar'].includes(ext)) return '#f39c12';
    return '#7f8c8d';
  };

const downloadFile = async (url, filename) => {
  try {
    const token = await api.getCurrentToken();
    if (!token) {
      Alert.alert('Session expired', 'Please log in again.');
      return;
    }

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
      .fetch('GET', url, {
        Authorization: `Bearer ${token}`,
      })
      .then(() => {
        Alert.alert(
          'Download complete',
          'File has been saved to Downloads.'
        );
      })
      .catch(() => {
        Alert.alert('Download failed', 'Unable to download file.');
      });
  } catch (e) {
    Alert.alert('Error', 'Something went wrong.');
  }
};





 const renderMessage = ({ item, index }) => {
  const isAssigner = item.assigner_id && (item.assigner_remarks || item.assigner_attachments);
  const isDeptHead = item.submitter_id;

  return (
    <View style={styles.messageContainer}>
      {/* Timestamp */}
      <Text style={styles.timestamp}>
        {item.assigner_date
          ? new Date(item.assigner_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : ''}
        {item.assigner_time ? ` • ${item.assigner_time}` : ''}
      </Text>

      <View style={styles.messageRow}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
  <View
    style={[
      styles.avatar,
      { backgroundColor: isDeptHead ? '#4ECDC4' : '#3498db' },
    ]}
  >
    <Text style={styles.avatarText}>
      {isDeptHead
        ? 'DH' // Dept Head initials
        : item.assigner_name
        ? item.assigner_name.charAt(0).toUpperCase()
        : 'A'}
    </Text>
  </View>
</View>


        {/* Message Bubble */}
        <View
          style={[
            styles.messageBubble,
            isDeptHead && item.submitter_status === 'rejected' && styles.rejectedBubble,
          ]}
        >
          <View style={styles.messageHeader}>
            <View style={styles.senderInfo}>
              <Text style={styles.senderName}>
                {isDeptHead ? 'You' : item.assigner_name || 'Assigner'}
              </Text>
              <Text style={styles.senderRole}>
                {isDeptHead ? 'Dept Head' : 'Assigner'}
              </Text>
              {isDeptHead && item.submitter_status && (
  <View
    style={[
      styles.statusBadge,
      item.submitter_status === 'accepted'
        ? styles.acceptedBadge
        : styles.rejectedBadge,
    ]}
  >
   <Icon
  name={isDeptHead ? 'briefcase' : 'wrench'}
  size={20}
  color="#fff"
/>
    <Text style={styles.statusText}>
      {item.submitter_status.charAt(0).toUpperCase() + item.submitter_status.slice(1)}
    </Text>
  </View>
)}
            </View>
          </View>

          {/* Request Tag */}
          {item.request_details && (
            <View style={styles.requestTag}>
              <Icon name="tag" size={12} color="#fff" />
              <Text style={styles.requestTagText}>
                {item.request_details.length > 50
                  ? item.request_details.substring(0, 50) + '...'
                  : item.request_details}
              </Text>
            </View>
          )}

          {/* Message Text */}
          {(isAssigner ? item.assigner_remarks : item.submitter_remarks) && (
            <Text style={styles.messageText}>
              {isAssigner ? item.assigner_remarks : item.submitter_remarks}
            </Text>
          )}

          {/* Fixed Attachments */}
          {(isAssigner ? item.assigner_attachments : item.submitter_attachments) && (
            <View style={styles.attachmentsContainer}>
              <Text style={styles.attachmentLabel}>
                <Icon name="paperclip" size={14} />{' '}
                {isDeptHead ? 'Your Attachment' : 'Attachment'}
              </Text>
              <TouchableOpacity
                style={styles.attachmentCard}
                onPress={() => {
                  const attachmentUrl = isAssigner 
                    ? item.assigner_attachments 
                    : item.submitter_attachments;
                  const filename = attachmentUrl.split('/').pop();
                  downloadFile(attachmentUrl, filename);
                }}
              >
                <View
                  style={[
                    styles.attachmentIcon,
                    { 
                      backgroundColor: getFileColor(
                        isAssigner ? item.assigner_attachments : item.submitter_attachments
                      ) + '20' 
                    },
                  ]}
                >
                  <Icon
                    name={getFileIcon(
                      isAssigner ? item.assigner_attachments : item.submitter_attachments
                    )}
                    size={20}
                    color={getFileColor(
                      isAssigner ? item.assigner_attachments : item.submitter_attachments
                    )}
                  />
                </View>
                <View style={styles.attachmentInfo}>
                  <Text style={styles.attachmentName} numberOfLines={1}>
                    {(isAssigner ? item.assigner_attachments : item.submitter_attachments).split('/').pop()}
                  </Text>
                </View>
                <Icon name="download" size={18} color="#4ECDC4" />
                {downloading && (
  <View style={{ marginTop: 8 }}>
    <ActivityIndicator size="small" />
    <Text style={{ fontSize: 12, marginTop: 4 }}>
      Downloading… {progress}%
    </Text>
  </View>
)}

              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4ECDC4" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#2C3E50', '#4ECDC4']} style={styles.header}>
        <Text style={styles.headerTitle}>{project?.name || 'Project Conversation'}</Text>
        <Text style={styles.headerSubtitle}>
          {conversations.length} message{conversations.length !== 1 ? 's' : ''}
        </Text>
      </LinearGradient>

      {/* Conversation List */}
      {conversations.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="comment-slash" size={60} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptyText}>
            No conversation threads have been started for this project.
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={conversations}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderMessage}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backButton: { marginBottom: 12 },
  headerTitle: { fontSize: 26, fontWeight: '700', color: '#fff' },
  headerSubtitle: { fontSize: 15, color: '#E0F2FE', marginTop: 6 },
  listContent: { padding: 16 },
  messageContainer: { marginBottom: 20 },
  timestamp: {
    textAlign: 'center',
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
    backgroundColor: '#fff',
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  messageRow: { flexDirection: 'row', alignItems: 'flex-start' },
  avatarContainer: { width: 50, alignItems: 'center' },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
  color: '#fff',
  fontSize: 16,
  fontWeight: '700',
},
  messageBubble: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginLeft: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  rejectedBubble: { borderLeftColor: '#ef4444', borderLeftWidth: 4 },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  senderInfo: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  senderName: { fontSize: 16, fontWeight: '700', color: '#1A252F' },
  senderRole: {
    fontSize: 12,
    color: '#64748B',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 15,
  },
  acceptedBadge: { backgroundColor: '#10b981' },
  rejectedBadge: { backgroundColor: '#ef4444' },
  statusText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  requestTag: {
    backgroundColor: '#4ECDC4',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  requestTagText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  messageText: { fontSize: 14, color: '#475569', lineHeight: 20 },
  attachmentsContainer: { marginTop: 16 },
  attachmentLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 8,
  },
  attachmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  attachmentIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentInfo: { flex: 1 },
  attachmentName: { fontSize: 14, fontWeight: '600', color: '#1A252F' },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#475569', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#64748B', textAlign: 'center', marginTop: 8 },
});

export default ProjectConversationScreen;