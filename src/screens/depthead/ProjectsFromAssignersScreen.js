import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import LinearGradient from 'react-native-linear-gradient';
import api from '../../services/apiService';
import Pagination from '../../components/Pagination';

const ProjectsFromAssignersScreen = ({ navigation }) => {
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [paginatedProjects, setPaginatedProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage] = useState(15);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    from: 0,
    to: 0,
    total: 0,
  });

  // Update pagination info
  const updatePagination = useCallback((data, page) => {
    const total = data.length;
    const lastPage = Math.ceil(total / perPage);
    const from = total === 0 ? 0 : (page - 1) * perPage + 1;
    const to = Math.min(page * perPage, total);

    setPagination({
      current_page: page,
      last_page: lastPage,
      from,
      to,
      total,
    });

    // Get paginated data
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    setPaginatedProjects(data.slice(startIndex, endIndex));
  }, [perPage]);

  const fetchProjects = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await api.deptHead.getProjectsWithActivity({
        page: 1,
        per_page: 1000, // Fetch all data for client-side pagination
      });

      if (response.data.success) {
        const newProjects = response.data.projects || [];
        setProjects(newProjects);
        setFilteredProjects(newProjects);
        setCurrentPage(1); // Reset to first page
      } else {
        Alert.alert('Error', response.data.message || 'Failed to load projects');
      }
    } catch (error) {
      console.error('Error fetching projects:', error.response || error);
      Alert.alert(
        'Network Error',
        error.response?.data?.message || 'Please check your connection and try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, []);

  // Real-time search filter
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredProjects(projects);
    } else {
      const lowerQuery = searchQuery.toLowerCase();
      const filtered = projects.filter(item =>
        item.project_name?.toLowerCase().includes(lowerQuery) ||
        item.assigner_name?.toLowerCase().includes(lowerQuery) ||
        item.latest_remarks?.toLowerCase().includes(lowerQuery)
      );
      setFilteredProjects(filtered);
    }
    setCurrentPage(1); // Reset to first page when search changes
  }, [searchQuery, projects]);

  // Update pagination when filtered data or current page changes
  useEffect(() => {
    updatePagination(filteredProjects, currentPage);
  }, [filteredProjects, currentPage, updatePagination]);

  const resetFilters = () => {
    setSearchQuery('');
    setCurrentPage(1);
  };

  const onRefresh = () => fetchProjects(true);

  // Pagination handlers
  const handleFirstPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const handlePrevPage = useCallback(() => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage(prev => Math.min(pagination.last_page, prev + 1));
  }, [pagination.last_page]);

  const handleLastPage = useCallback(() => {
    setCurrentPage(pagination.last_page);
  }, [pagination.last_page]);

  const handleViewConversation = (projectId) => {
    navigation.navigate('ProjectConversation', { projectId });
  };

  const handleRespond = async (projectId, convoId) => {
    try {
      const res = await api.deptHead.getLatestUnrespondedMessage(projectId);
      if (res.data.success && !res.data.has_response) {
        navigation.navigate('RespondToAssigner', {
          projectId,
          conversationId: convoId,
          message: res.data.message,
        });
      } else {
        Alert.alert('Already Responded', 'You have already responded to this message.');
      }
    } catch (err) {
      Alert.alert('Error', 'Could not load message.');
    }
  };

  const renderItem = ({ item, index }) => {
    // Calculate the actual index based on current page
    const actualIndex = (currentPage - 1) * perPage + index + 1;
    
    return (
      <TouchableOpacity
        style={styles.projectCard}
        onPress={() => handleViewConversation(item.project_id)}
      >
        <LinearGradient
          colors={['#ffffff', '#f8fafc']}
          style={styles.cardGradient}
        >
          <View style={styles.cardHeader}>
            <View style={styles.indexBadge}>
              <Text style={styles.indexText}>{actualIndex}</Text>
            </View>
            <View style={styles.projectInfo}>
              <Text style={styles.projectName} numberOfLines={1}>
                {item.project_name}
              </Text>
              <Text style={styles.assignerText}>
                {item.assigner_name || 'Unknown Assigner'}
              </Text>
            </View>
          </View>

          <View style={styles.messagePreview}>
            <Text style={styles.messageText} numberOfLines={2}>
              {item.latest_remarks || 'No remarks'}
            </Text>
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.statusContainer}>
              {item.response_status ? (
                item.response_status === 'accepted' ? (
                  <View style={[styles.statusBadge, { backgroundColor: '#D1FAE5' }]}>
                    <Icon name="check" size={12} color="#065F46" />
                    <Text style={[styles.statusText, { color: '#065F46' }]}>Accepted</Text>
                  </View>
                ) : (
                  <View style={[styles.statusBadge, { backgroundColor: '#FEE2E2' }]}>
                    <Icon name="times" size={12} color="#991B1B" />
                    <Text style={[styles.statusText, { color: '#991B1B' }]}>Rejected</Text>
                  </View>
                )
              ) : (
                <View style={[styles.statusBadge, { backgroundColor: '#FEF3C7' }]}>
                  <Icon name="clock-o" size={12} color="#92400E" />
                  <Text style={[styles.statusText, { color: '#92400E' }]}>Awaiting</Text>
                </View>
              )}
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => handleViewConversation(item.project_id)}
              >
                <Icon name="eye" size={16} color="#2C3E50" />
                <Text style={styles.actionText}>View</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  styles.respondBtn,
                  item.has_response && styles.disabledBtn
                ]}
                disabled={item.has_response}
                onPress={() => handleRespond(item.project_id, item.latest_convo_id)}
              >
                <Icon name="reply" size={16} color="#fff" />
                <Text style={styles.respondText}>Respond</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.footerMeta}>
            <Text style={styles.msgCount}>{item.message_count} messages</Text>
            <Text style={styles.dateText}>
              {new Date(item.latest_date).toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'short',
              })}
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Gradient Header */}
      <LinearGradient
        colors={['#2C3E50', '#4ECDC4']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Projects from Assigners</Text>
        <Text style={styles.headerSubtitle}>
          Messages requiring your attention
        </Text>
      </LinearGradient>

      {/* Search & Reset Filter Bar - Directly Below Header */}
      <View style={styles.searchFilterBar}>
        <View style={styles.searchContainer}>
          <Icon name="search" size={18} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search projects, assigners, or messages..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="times-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
          <Icon name="refresh" size={16} color="#fff" />
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>
      </View>

      {/* Results Info */}
      {!loading && (
        <View style={styles.resultsInfo}>
          <Text style={styles.resultsText}>
            Showing {pagination.from}-{pagination.to} of {pagination.total} projects
          </Text>
        </View>
      )}

      {/* List */}
      {loading && projects.length === 0 ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#4ECDC4" />
          <Text style={styles.loadingText}>Loading projects...</Text>
        </View>
      ) : (
        <View style={styles.listContainer}>
          <FlatList
            data={paginatedProjects}
            keyExtractor={item => item.project_id.toString()}
            renderItem={renderItem}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <Icon name="comment-slash" size={60} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>No Activity Yet</Text>
                <Text style={styles.emptyText}>
                  {searchQuery 
                    ? 'No projects match your search criteria.'
                    : "Assigners haven't sent any messages requiring response."}
                </Text>
                {searchQuery && (
                  <TouchableOpacity 
                    style={styles.clearSearchBtn}
                    onPress={() => setSearchQuery('')}
                  >
                    <Text style={styles.clearSearchText}>Clear Search</Text>
                  </TouchableOpacity>
                )}
              </View>
            }
            contentContainerStyle={styles.listContent}
            scrollEnabled={true}
          />
          
          {/* Pagination Component */}
          {filteredProjects.length > perPage && (
            <Pagination
              pagination={pagination}
              onFirst={handleFirstPage}
              onPrev={handlePrevPage}
              onNext={handleNextPage}
              onLast={handleLastPage}
            />
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 34,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: { fontSize: 26, fontWeight: '700', color: '#fff' },
  headerSubtitle: { fontSize: 15, color: '#E0F2FE', marginTop: 6 },
  searchFilterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12, 
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    height: 48,
  },
  searchIcon: { marginRight: 10 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1A252F',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  resetText: { color: '#fff', fontWeight: '600', fontSize: 14, marginLeft: 6 },
  resultsInfo: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  resultsText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingTop: 16,
    paddingBottom: 16,
    flexGrow: 1,
  },
  projectCard: { marginHorizontal: 16, marginVertical: 8 },
  cardGradient: {
    borderRadius: 16,
    padding: 18,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  indexBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#4ECDC4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  indexText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  projectInfo: { flex: 1 },
  projectName: { fontSize: 17, fontWeight: '600', color: '#1A252F' },
  assignerText: { fontSize: 13, color: '#64748B', marginTop: 2 },
  messagePreview: { marginVertical: 10 },
  messageText: { fontSize: 14, color: '#475569', lineHeight: 20 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusContainer: { flex: 1 },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  statusText: { fontSize: 12, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#E0E7FF',
  },
  respondBtn: { backgroundColor: '#4ECDC4' },
  disabledBtn: { backgroundColor: '#94A3B8', opacity: 0.6 },
  actionText: { fontSize: 13, color: '#2C3E50', fontWeight: '600' },
  respondText: { fontSize: 13, color: '#fff', fontWeight: '600' },
  footerMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  msgCount: { fontSize: 13, color: '#06B6D4', fontWeight: '600' },
  dateText: { fontSize: 13, color: '#64748B' },
  loading: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
  },
  empty: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 40,
    paddingTop: 60,
  },
  emptyTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: '#475569', 
    marginTop: 16 
  },
  emptyText: { 
    fontSize: 14, 
    color: '#64748B', 
    textAlign: 'center', 
    marginTop: 8,
    lineHeight: 20,
  },
  clearSearchBtn: {
    marginTop: 16,
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  clearSearchText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ProjectsFromAssignersScreen;