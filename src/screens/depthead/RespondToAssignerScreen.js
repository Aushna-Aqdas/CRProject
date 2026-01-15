// src/screens/depthead/RespondToAssignerScreen.js - COMPLETE FIX

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import LinearGradient from 'react-native-linear-gradient';
import DocumentPicker from 'react-native-document-picker';
import Toast from 'react-native-toast-message';
import api from '../../services/apiService';

const RespondToAssignerScreen = ({ route, navigation }) => {
  const { projectId, conversationId, message } = route.params;

  const [status, setStatus] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [uploading, setUploading] = useState(false);

  const pickDocument = async () => {
    try {
      const res = await DocumentPicker.pick({ 
        type: [DocumentPicker.types.allFiles],
        copyTo: 'cachesDirectory'
      });
      
      if (res[0].size > 10 * 1024 * 1024) {
        Alert.alert('File too large', 'Maximum file size is 10MB');
        return;
      }
      
      console.log('📎 Selected file:', res[0]);
      setAttachment(res[0]);
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        console.error('File picker error:', err);
        Alert.alert('Error', 'Could not pick file');
      }
    }
  };

  const removeAttachment = () => setAttachment(null);

const submitResponse = async () => {
  let finalStatus = status ? status.trim().toLowerCase() : null;

  if (!finalStatus || !['accepted', 'rejected'].includes(finalStatus)) {
    Alert.alert('Required', 'Please select Accept or Reject');
    return;
  }

  setUploading(true);

  try {
    // ✅ PASS PLAIN OBJECT, NOT FORMDATA
    const payload = {
      status: finalStatus,
      remarks: remarks.trim(),
      attachment: attachment  // Pass the file object as-is
    };

    console.log('=== SENDING PAYLOAD ===');
    console.log('Status:', payload.status);
    console.log('Remarks:', payload.remarks);
    console.log('Has attachment:', !!payload.attachment);

    const response = await api.deptHead.respondToConversation(conversationId, payload);
    
    console.log('API Success:', response.data);

    if (response.data.success) {
      Toast.show({ type: 'success', text1: 'Success!', text2: 'Response submitted' });
      setTimeout(() => navigation.goBack(), 1500);
    } else {
      Alert.alert('Server Error', response.data.message || 'Failed');
    }
  } catch (error) {
    console.error('Submit failed:', error);

    let msg = 'Unknown error';

    if (error.response?.status === 422) {
      const errors = error.response.data.errors || {};
      console.log('Laravel validation errors:', errors); // ← this shows exact issue
      if (Object.keys(errors).length > 0) {
        msg = Object.entries(errors)
          .map(([key, arr]) => `${key}: ${arr.join(', ')}`)
          .join('\n');
      } else {
        msg = error.response.data.message || 'Validation failed';
      }
      Alert.alert('Validation Error', msg);
    } else if (!error.response) {
      Alert.alert('Network Issue', 'Server not reachable – check ngrok URL');
    } else {
      Alert.alert('Error', error.response?.data?.message || error.message);
    }
  } finally {
    setUploading(false);
  }
};

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <LinearGradient colors={['#2C3E50', '#4ECDC4']} style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
            <Icon name="times" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Respond to Assigner</Text>
        </LinearGradient>

        <ScrollView contentContainerStyle={{ padding: 20 }}>
          {/* Message Card */}
          <View style={styles.messageCard}>
            <View style={styles.messageHeader}>
              <Text style={styles.senderName}>{message.assigner_name || 'Assigner'}</Text>
              <Text style={styles.messageDate}>
                {message.assigner_date
                  ? new Date(message.assigner_date).toLocaleDateString('en-US', { 
                      day: 'numeric', 
                      month: 'short', 
                      year: 'numeric' 
                    })
                  : new Date().toLocaleDateString('en-US', { 
                      day: 'numeric', 
                      month: 'short', 
                      year: 'numeric' 
                    })
                }
              </Text>
            </View>
            <Text style={styles.latestMessageLabel}>Latest Message</Text>
            {message.request_details && (
              <Text style={styles.requestText}>Request: {message.request_details}</Text>
            )}
            <Text style={styles.messageText}>
              {message.assigner_remarks || 'Need clarification on scope'}
            </Text>
          </View>

          {/* Status Selection */}
          <Text style={styles.sectionTitle}>Your Response Status *</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity
              style={[styles.radioOption, status === 'accepted' && styles.radioSelected]}
              onPress={() => setStatus('accepted')}
            >
              <View style={[styles.radioCircle, status === 'accepted' && styles.radioFilled]}>
                {status === 'accepted' && <View style={styles.radioDot} />}
              </View>
              <View>
                <Text style={styles.radioLabel}>Accept</Text>
                <Text style={styles.radioSub}>Approve the assigner's request/message</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.radioOption, status === 'rejected' && styles.radioSelected]}
              onPress={() => setStatus('rejected')}
            >
              <View style={[styles.radioCircle, status === 'rejected' && styles.radioFilled]}>
                {status === 'rejected' && <View style={styles.radioDot} />}
              </View>
              <View>
                <Text style={styles.radioLabel}>Reject</Text>
                <Text style={styles.radioSub}>Reject the assigner's request/message</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Remarks Input */}
          <Text style={styles.sectionTitle}>Your Remarks</Text>
          <TextInput
            style={styles.remarksInput}
            placeholder="Enter your response remarks, feedback, or instructions..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={6}
            value={remarks}
            onChangeText={setRemarks}
            textAlignVertical="top"
          />
          <Text style={styles.optionalText}>Optional: Provide detailed feedback or instructions.</Text>

          {/* File Upload */}
          <Text style={styles.sectionTitle}>Attachments</Text>
          <TouchableOpacity style={styles.uploadBox} onPress={pickDocument}>
            <Icon name="cloud-upload" size={40} color="#4ECDC4" />
            <Text style={styles.uploadText}>Click to upload file</Text>
            <Text style={styles.uploadSub}>Supporting documents, images, or files (Max 10MB)</Text>
          </TouchableOpacity>

          {attachment && (
            <View style={styles.selectedFile}>
              <Icon name="paperclip" size={18} color="#4ECDC4" />
              <Text style={styles.selectedFileName} numberOfLines={1}>{attachment.name}</Text>
              <TouchableOpacity onPress={removeAttachment}>
                <Icon name="times" size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={() => navigation.goBack()}
              disabled={uploading}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.submitButton, uploading && styles.submitDisabled]}
              onPress={submitResponse}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Icon name="paper-plane" size={18} color="#fff" />
                  <Text style={styles.submitText}>Submit Response</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
      
      <Toast />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  closeButton: { marginRight: 16 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff', flex: 1 },
  messageCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#4ECDC4',
  },
  messageHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  senderName: { fontSize: 16, fontWeight: '700', color: '#1A252F' },
  messageDate: { fontSize: 13, color: '#64748B' },
  latestMessageLabel: { fontSize: 14, color: '#475569', marginBottom: 8 },
  requestText: { fontSize: 14, color: '#2C3E50', fontWeight: '600', marginBottom: 8 },
  messageText: { fontSize: 15, color: '#475569', lineHeight: 22 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1A252F', marginBottom: 12, marginTop: 8 },
  radioGroup: { marginBottom: 24 },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  radioSelected: { borderColor: '#4ECDC4', backgroundColor: '#f0fdfa' },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#94A3B8',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioFilled: { borderColor: '#4ECDC4' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4ECDC4' },
  radioLabel: { fontSize: 15, fontWeight: '600', color: '#1A252F' },
  radioSub: { fontSize: 13, color: '#64748B' },
  remarksInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },
  optionalText: { fontSize: 13, color: '#64748B', marginBottom: 24 },
  uploadBox: {
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    marginBottom: 16,
  },
  uploadText: { fontSize: 16, color: '#1A252F', marginTop: 12, fontWeight: '600' },
  uploadSub: { fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 8 },
  selectedFile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdfa',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#4ECDC4',
    gap: 10,
  },
  selectedFileName: { flex: 1, fontSize: 14, color: '#1A252F' },
  buttonRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 30, marginBottom: 20 },
  cancelButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  cancelText: { fontSize: 15, color: '#64748B', fontWeight: '600' },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    gap: 8,
  },
  submitDisabled: { opacity: 0.7 },
  submitText: { fontSize: 15, color: '#fff', fontWeight: '600' },
});

export default RespondToAssignerScreen;