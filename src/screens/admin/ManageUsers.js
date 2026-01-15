// screens/admin/ManageUsers.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Dimensions
} from 'react-native';
import { adminAPI } from '../../services/apiService';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useAuth } from '../../hooks/redux';
import LinearGradient from 'react-native-linear-gradient';
import Footer from '../../components/Footer'; // Add this import
import Pagination from '../../components/Pagination';


const { width } = Dimensions.get('window');

const ManageUsers = ({ navigation }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({});

  const loadUsers = async (page = 1, search = '') => {
    try {
      setLoading(true);
      const params = {
        page,
        per_page: 10,
        search: search
      };

      const response = await adminAPI.getUsers(params);
      
      if (response.data.success) {
        setUsers(response.data.data.users);
        setPagination(response.data.data.pagination);
      } else {
        Alert.alert('Error', response.data.message || 'Failed to load users');
      }
    } catch (error) {
      console.log('Load users error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to load users';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadUsers(1, searchQuery);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleSearch = (text) => {
    setSearchQuery(text);
    const timeoutId = setTimeout(() => {
      loadUsers(1, text);
    }, 500);
    return () => clearTimeout(timeoutId);
  };

  const handleDeleteUser = (userId, userName) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${userName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteUser(userId)
        }
      ]
    );
  };

  const deleteUser = async (userId) => {
    try {
      const response = await adminAPI.deleteUser(userId);
      if (response.data.success) {
        Alert.alert('Success', 'User deleted successfully');
        loadUsers(pagination.current_page, searchQuery);
      } else {
        Alert.alert('Error', response.data.message || 'Failed to delete user');
      }
    } catch (error) {
      console.log('Delete user error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to delete user';
      Alert.alert('Error', errorMessage);
    }
  };

  // Function to get role name with multiple fallbacks
  // In ManageUsers.js - Replace the getRoleName function
const getRoleName = (user) => {
  if (user.role && user.role.name) {
    return user.role.name;
  }
  return 'No Role Assigned';
};

  // Pagination handlers
  const goToFirstPage = () => {
    if (pagination.current_page > 1) {
      loadUsers(1, searchQuery);
    }
  };

  const goToPreviousPage = () => {
    if (pagination.current_page > 1) {
      loadUsers(pagination.current_page - 1, searchQuery);
    }
  };

  const goToNextPage = () => {
    if (pagination.current_page < pagination.last_page) {
      loadUsers(pagination.current_page + 1, searchQuery);
    }
  };

  const goToLastPage = () => {
    if (pagination.current_page < pagination.last_page) {
      loadUsers(pagination.last_page, searchQuery);
    }
  };
const renderUserItem = ({ item, index }) => (
  <View style={styles.userCard}>
    <View style={styles.userHeader}>
      <Text style={styles.userSerial}>{(pagination.current_page - 1) * 10 + index + 1}</Text>
      <Text style={styles.userName}>{item.name}</Text>
    </View>
    
    <View style={styles.userDetails}>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>CNIC:</Text>
        <Text style={styles.detailValue}>{item.cnic}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Phone:</Text>
        <Text style={styles.detailValue}>{item.phone}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Email:</Text>
        <Text style={styles.detailValue}>{item.email}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Role:</Text>
        <Text style={[styles.detailValue, styles.roleText]}>
          {item.role ? item.role.name : 'No Role Assigned'}
        </Text>
      </View>
    </View>

    <View style={styles.actions}>
      <TouchableOpacity 
        style={styles.editBtn}
        onPress={() => navigation.navigate('EditUser', { userId: item.id })}
      >
        <Icon name="edit" size={16} color="#fff" />
        <Text style={styles.actionText}>Edit</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.deleteBtn}
        onPress={() => handleDeleteUser(item.id, item.name)}
      >
        <Icon name="trash" size={16} color="#fff" />
        <Text style={styles.actionText}>Delete</Text>
      </TouchableOpacity>
    </View>
  </View>
);

  if (loading && users.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2C3E50" />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#2C3E50', '#4ECDC4']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
      <View style={styles.headerContent}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={20} color="#ffffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Users Management</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('CreateUser')}
        >
          <Icon name="plus" size={16} color="#fff" />
          <Text style={styles.addButtonText}>Add User</Text>
        </TouchableOpacity>
      </View>
      </LinearGradient>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users by name, email, CNIC..."
          placeholderTextColor='#858181ff'
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>

      {/* Users List Header */}
      <View style={styles.listHeader}>
        <Text style={styles.listHeaderTitle}>
          Manage and monitor all system users with advanced filtering
        </Text>
      </View>

      {/* Users List */}
      <FlatList
        data={users}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="users" size={50} color="#ccc" />
            <Text style={styles.emptyText}>No users found</Text>
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
        contentContainerStyle={styles.listContent}
      />
                  <Footer />
      
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fb' },
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
  headerContent : {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
 header: {
    paddingHorizontal: 20,
    paddingTop: 45,
    paddingBottom: 20,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffffff',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 5,
    fontSize: 14,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 20,
    marginBottom: 10,
    paddingHorizontal: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  listHeader: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  listHeaderTitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  listContent: {
    padding: 20,
    paddingTop: 10,
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  userSerial: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginRight: 15,
    minWidth: 30,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    flex: 1,
  },
  userDetails: {
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#2C3E50',
    flex: 1,
    textAlign: 'right',
    marginLeft: 10,
  },
  roleText: {
    color: '#4ECDC4',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#667eea',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 10,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5576c',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 5,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },

  paginationText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    marginBottom: 10,
  },
  paginationControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationButton: {
    padding: 8,
    marginHorizontal: 5,
    borderRadius: 6,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  pageIndicator: {
    marginHorizontal: 15,
    color: '#2C3E50',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default ManageUsers;