// screens/admin/ProjectManagement.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  Dimensions,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/FontAwesome';
import { adminAPI } from '../../services/apiService';
import { useAuth } from '../../hooks/redux';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Add this
import Footer from '../../components/Footer'; // Add this import
import Pagination from '../../components/Pagination';


const { width } = Dimensions.get('window');

const statColors = {
  total: '#2C3E50',
  web: '#3B82F6',
  mobile: '#10B981',
  pending: '#F59E0B',
  inprogress: '#3B82F6',
  completed: '#10B981',
};

const ProjectManagement = ({ navigation }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    from: 0,
    to: 0,
    total: 0,
    per_page: 10,
  });
  const [stats, setStats] = useState({
    total_projects: 0,
    web_projects: 0,
    app_projects: 0,
  });

  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentProject, setCurrentProject] = useState(null);
  const [formData, setFormData] = useState({ name: '', type: 'web' });

  const { user, token } = useAuth();

  // ✅ PRODUCTION-READY AUTH INITIALIZATION
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('🔄 ProjectManagement: Initializing auth...');
        
        // Method 1: Use token from useAuth (preferred)
        if (token) {
          // Set token in API service
          await adminAPI.setAuthToken(token);
          console.log('✅ ProjectManagement: Token set from useAuth');
        } else {
          // Method 2: Fallback to AsyncStorage
          const storedToken = await AsyncStorage.getItem('api_token');
          if (storedToken) {
            await adminAPI.setAuthToken(storedToken);
            console.log('✅ ProjectManagement: Token set from AsyncStorage');
          } else {
            console.log('⚠️ ProjectManagement: No token available');
            Alert.alert('Session Expired', 'Please login again.', [
              { text: 'OK', onPress: () => navigation.replace('Login') },
            ]);
            return;
          }
        }
        
        // Load projects after auth is initialized
        loadProjects();
      } catch (error) {
        console.error('❌ ProjectManagement: Auth initialization failed:', error);
        Alert.alert('Error', 'Authentication failed. Please login again.', [
          { text: 'OK', onPress: () => navigation.replace('Login') },
        ]);
      }
    };

    initializeAuth();
  }, [token, navigation]);

  const loadProjects = async (page = 1, search = '') => {
    try {
      setLoading(true);
      const params = {
        page,
        per_page: 10,
        search: search.trim(),
      };

      console.log('📡 Loading projects with params:', params);
      const response = await adminAPI.getProjects(params);

      if (response.data.success) {
        const data = response.data.data;
        setProjects(data.projects || []);
        setPagination(data.pagination || {});
        setStats(data.stats || { total_projects: 0, web_projects: 0, app_projects: 0 });
        console.log(`✅ Loaded ${data.projects?.length || 0} projects`);
      } else {
        Alert.alert('Error', response.data.message || 'Failed to load projects');
      }
    } catch (error) {
      console.error('❌ loadProjects error:', error);
      const status = error.response?.status;
      
      if (status === 401) {
        Alert.alert('Session Expired', 'Please login again.', [
          { text: 'OK', onPress: () => navigation.replace('Login') },
        ]);
      } else if (status === 403) {
        Alert.alert('Access Denied', 'You do not have permission to view projects.');
      } else if (status === 404) {
        Alert.alert('Not Found', 'Projects endpoint not found.');
      } else if (error.message === 'Network Error') {
        Alert.alert('Network Error', 'Please check your internet connection.');
      } else {
        Alert.alert('Error', 'Failed to load projects. Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadProjects(1, searchText);
  }, [searchText]);

  useEffect(() => {
    loadProjects();
  }, []);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadProjects(1, searchText);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchText]);

  const handleSearch = (text) => setSearchText(text);

  // Pagination
  const goToFirstPage = () => pagination.current_page > 1 && loadProjects(1, searchText);
  const goToPreviousPage = () => pagination.current_page > 1 && loadProjects(pagination.current_page - 1, searchText);
  const goToNextPage = () => pagination.current_page < pagination.last_page && loadProjects(pagination.current_page + 1, searchText);
  const goToLastPage = () => pagination.current_page < pagination.last_page && loadProjects(pagination.last_page, searchText);

  const handleAddProject = () => {
    setEditMode(false);
    setCurrentProject(null);
    setFormData({ name: '', type: 'web' });
    setModalVisible(true);
  };

  const handleEditProject = (project) => {
    setEditMode(true);
    setCurrentProject(project);
    setFormData({ name: project.name || '', type: project.type || 'web' });
    setModalVisible(true);
  };

  const handleDeleteProject = (projectId) => {
    Alert.alert('Delete Project', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await adminAPI.deleteProject(projectId);
            if (res.data.success) {
              Alert.alert('Success', res.data.message);
              loadProjects(pagination.current_page || 1, searchText);
            } else {
              Alert.alert('Error', res.data.message);
            }
          } catch (err) {
            Alert.alert('Error', 'Failed to delete.');
          }
        },
      },
    ]);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Project name is required');
      return;
    }

    try {
      let response;
      if (editMode && currentProject) {
        response = await adminAPI.updateProject(currentProject.id, formData);
      } else {
        response = await adminAPI.createProject(formData);
      }

      if (response.data.success) {
        Alert.alert('Success', response.data.message || 'Project saved!');
        setModalVisible(false);
        loadProjects(pagination.current_page || 1, searchText);
      } else {
        Alert.alert('Error', response.data.message || 'Failed to save');
      }
    } catch (error) {
      Alert.alert('Error', 'Operation failed. Please try again.');
    }
  };

  const getTypeBadgeColor = (type) => (type === 'web' ? statColors.web : statColors.mobile);

  const renderProjectItem = ({ item }) => (
    <View style={styles.projectCard}>
      <View style={styles.projectHeader}>
        <View style={styles.projectInfo}>
          <Text style={styles.projectName}>{item.name || 'Unnamed'}</Text>
          <View style={[styles.typeBadge, { backgroundColor: getTypeBadgeColor(item.type) }]}>
            <Text style={styles.typeText}>{(item.type || 'web').toUpperCase()}</Text>
          </View>
        </View>
        <View style={styles.projectActions}>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleEditProject(item)}>
            <Icon name="edit" size={16} color={statColors.inprogress} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleDeleteProject(item.id)}>
            <Icon name="trash" size={16} color={statColors.pending} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.projectFooter}>
        <Text style={styles.projectId}>ID: {item.id}</Text>
        <Text style={styles.projectDate}>
          {item.created_at ? new Date(item.created_at).toLocaleDateString() : '—'}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={statColors.total} barStyle="light-content" />

      {/* Full-screen loading on first load */}
      {loading && projects.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={statColors.total} />
          <Text style={styles.loadingText}>Loading projects...</Text>
        </View>
      ) : (
        <>
          {/* Header */}
<LinearGradient
  colors={['#2C3E50', '#4ECDC4']}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 0 }}
  style={styles.header}
>
  <View style={styles.headerContent}>
    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
      <Icon name="arrow-left" size={20} color="#fff" />
    </TouchableOpacity>

    <View style={styles.headerCenter}>
      <Text style={styles.headerTitle}>Project Management</Text>
    </View>

    <TouchableOpacity style={styles.addButton} onPress={handleAddProject}>
      <Icon name="plus" size={20} color="#fff" />
    </TouchableOpacity>
  </View>
</LinearGradient>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statRow}>
              <View style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: statColors.total + '20' }]}>
                  <Icon name="folder-open" size={24} color={statColors.total} />
                </View>
                <Text style={styles.statNumber}>{stats.total_projects || 0}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: statColors.web + '20' }]}>
                  <Icon name="globe" size={24} color={statColors.web} />
                </View>
                <Text style={styles.statNumber}>{stats.web_projects || 0}</Text>
                <Text style={styles.statLabel}>Web</Text>
              </View>
              <View style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: statColors.mobile + '20' }]}>
                  <Icon name="mobile-phone" size={24} color={statColors.mobile} />
                </View>
                <Text style={styles.statNumber}>{stats.app_projects || 0}</Text>
                <Text style={styles.statLabel}>Mobile</Text>
              </View>
              
            </View>
          </View>
          

          {/* Search */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBox}>
              <Icon name="search" size={20} color={statColors.total} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search projects..."
                value={searchText}
                onChangeText={handleSearch}
                placeholderTextColor="#999"
              />
              {searchText.length > 0 && (
                <TouchableOpacity onPress={() => setSearchText('')}>
                  <Icon name="times-circle" size={20} color="#999" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Projects List */}
          <FlatList
            data={projects}
            renderItem={renderProjectItem}
            keyExtractor={(item) => item.id.toString()}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Icon name="folder-open" size={60} color="#ddd" />
                <Text style={styles.emptyTitle}>
                  {searchText ? 'No matching projects' : 'No projects yet'}
                </Text>
                <Text style={styles.emptyMessage}>
                  {searchText ? 'Try different keywords' : 'Create your first project'}
                </Text>
                
                <TouchableOpacity
                  style={[styles.emptyButton, { backgroundColor: statColors.total }]}
                  onPress={handleAddProject}
                >
                  <Icon name="plus" size={16} color="#fff" />
                  <Text style={styles.emptyButtonText}>Add Project</Text>
                </TouchableOpacity>
              </View>
            }
             ListFooterComponent={
    <Pagination
      pagination={pagination}
      onFirst={goToFirstPage}
      onPrev={goToPreviousPage}
      onNext={goToNextPage}
      onLast={goToLastPage}
    />
        }
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
          />

          {/* Modal */}
          <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{editMode ? 'Edit Project' : 'New Project'}</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Icon name="times" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Project Name</Text>
                    <TextInput
                      style={styles.formInput}
                      value={formData.name}
                      onChangeText={(t) => setFormData({ ...formData, name: t })}
                      placeholder="Enter project name"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Type</Text>
                    <View style={styles.typeSelector}>
                      <TouchableOpacity
                        style={[styles.typeOption, formData.type === 'web' && styles.typeOptionSelected]}
                        onPress={() => setFormData({ ...formData, type: 'web' })}
                      >
                        <Icon name="globe" size={20} color={formData.type === 'web' ? '#fff' : statColors.web} />
                        <Text style={[styles.typeOptionText, formData.type === 'web' && styles.typeOptionTextSelected]}>
                          Web
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.typeOption, formData.type === 'app' && styles.typeOptionSelected]}
                        onPress={() => setFormData({ ...formData, type: 'app' })}
                      >
                        <Icon name="mobile-phone" size={20} color={formData.type === 'app' ? '#fff' : statColors.mobile} />
                        <Text style={[styles.typeOptionText, formData.type === 'app' && styles.typeOptionTextSelected]}>
                          Mobile
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <View style={styles.modalFooter}>
                  <TouchableOpacity style={styles.modalCancelButton} onPress={() => setModalVisible(false)}>
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalSubmitButton, { backgroundColor: statColors.total }]}
                    onPress={handleSubmit}
                  >
                    <Text style={styles.modalSubmitText}>{editMode ? 'Update' : 'Create'}</Text>
                  </TouchableOpacity>

                </View>
              </View>
            </View>
          </Modal>
          
        <Footer />
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fb' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fb',
  },
  loadingText: { marginTop: 10, color: statColors.total, fontSize: 16 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
  },
 headerContent : {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: { padding: 8 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  addButton: { padding: 8 },
  statsContainer: { padding: 20 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statCard: {
    width: (width - 60) / 3,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 5,
  },
  statLabel: { fontSize: 12, color: '#6c757d' },
  searchContainer: { paddingHorizontal: 20, marginBottom: 20 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16, color: '#212529' },
  projectCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  projectInfo: { flex: 1, marginRight: 10 },
  projectName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  typeText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  projectActions: { flexDirection: 'row' },
  actionButton: { marginLeft: 10, padding: 8 },
  projectFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingTop: 15,
  },
  projectId: { fontSize: 14, color: '#6c757d' },
  projectDate: { fontSize: 14, color: '#6c757d' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: {
    fontSize: 20,
    color: '#6c757d',
    marginTop: 15,
    marginBottom: 5,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#adb5bd',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  paginationContainer: {
    padding: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  paginationText: {
    textAlign: 'center',
    color: '#6c757d',
    fontSize: 14,
    marginBottom: 10,
  },
  paginationControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationButton: {
    padding: 10,
    marginHorizontal: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  pageIndicator: {
    marginHorizontal: 20,
    fontSize: 15,
    fontWeight: '600',
    color: '#212529',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#212529' },
  modalBody: { marginBottom: 20 },
  formGroup: { marginBottom: 20 },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
  },
  typeSelector: { flexDirection: 'row', justifyContent: 'space-between' },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    marginHorizontal: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  typeOptionSelected: { backgroundColor: statColors.total, borderColor: statColors.total },
  typeOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: statColors.total,
    marginLeft: 8,
  },
  typeOptionTextSelected: { color: '#fff' },
  modalFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 15,
    marginRight: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    alignItems: 'center',
  },
  modalCancelText: { fontSize: 16, fontWeight: '600', color: '#6c757d' },
  modalSubmitButton: {
    flex: 1,
    paddingVertical: 15,
    marginLeft: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalSubmitText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});

export default ProjectManagement;