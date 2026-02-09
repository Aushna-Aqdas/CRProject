import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import { Alert } from 'react-native';


const BASE_URL = 'http://10.50.207.143:8000/api';

// Create axios instance
const apiService = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 120000,
});

// Global token variable - SIMPLIFIED
let authToken = null;
let tokenInitialized = false;

// ===============================================
// FIXED TOKEN MANAGEMENT - SIMPLIFIED
// ===============================================

// ✅ FIXED: Simple token setter without overcomplication
export const setAuthTokenGlobal = async (token) => {
  console.log('🔄 setAuthTokenGlobal called:', token ? 'Token set' : 'Token cleared');
  
  authToken = token;
  
  if (token) {
    // Remove any existing Bearer prefix
    const cleanToken = token.startsWith('Bearer ') ? token.substring(7) : token;
    
    // Set in axios headers
    apiService.defaults.headers.common['Authorization'] = `Bearer ${cleanToken}`;
    
    // Save to storage
    try {
      await AsyncStorage.setItem('api_token', cleanToken);
      console.log(`✅ Token saved to storage`);
    } catch (error) {
      console.error('❌ Error saving token:', error);
    }
  } else {
    // Clear token
    delete apiService.defaults.headers.common['Authorization'];
    
    // Remove from storage
    try {
      await AsyncStorage.multiRemove(['api_token', 'user_data']);
      console.log('✅ All tokens removed from storage');
    } catch (error) {
      console.error('❌ Error removing tokens:', error);
    }
    authToken = null;
  }
  
  tokenInitialized = true;
  return true;
};

// ✅ FIXED: Simple token getter
const getToken = async () => {
  // If we already have token in memory, use it
  if (authToken) {
    return authToken;
  }
  
  // If not initialized, get from storage
  if (!tokenInitialized) {
    try {
      console.log('🔍 Initializing token from storage...');
      const storedToken = await AsyncStorage.getItem('api_token');
      
      if (storedToken) {
        authToken = storedToken;
        apiService.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        console.log('✅ Token initialized from storage');
      } else {
        console.log('⚠️ No token found in storage');
      }
      
      tokenInitialized = true;
    } catch (error) {
      console.error('❌ Error initializing token:', error);
      tokenInitialized = true;
    }
  }
  
  return authToken;
};

// ✅ FIXED: Simple token check for API calls
const ensureTokenForRequest = async (config) => {
  // Skip token for auth endpoints
  const isAuthEndpoint = config.url.includes('/login') || 
                        config.url.includes('/captcha') || 
                        config.url.includes('/test/') ||
                        config.url.includes('/logout'); // ✅ ADDED: logout endpoint
  
  if (isAuthEndpoint) {
    console.log('✅ Auth endpoint, skipping token');
    delete config.headers.Authorization;
    return config;
  }
  
  // For other endpoints, ensure we have a token
  try {
    const token = await getToken();
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log(`✅ Token attached: ${token.substring(0, 15)}...`);
    } else {
      console.log('⚠️ No token available');
      // Don't add Authorization header if no token
    }
  } catch (error) {
    console.error('❌ Error getting token for request:', error);
  }
  
  return config;
};

// ===============================================
// REQUEST INTERCEPTOR - SIMPLIFIED
// ===============================================

apiService.interceptors.request.use(
  async (config) => {
    console.log(`🚀 [${config.method?.toUpperCase()}] ${config.url}`);
    
    // Add token to request if needed
    const updatedConfig = await ensureTokenForRequest(config);
    
    return updatedConfig;
  },
  (error) => {
    console.error('❌ Request interceptor failed:', error);
    return Promise.reject(error);
  }
);

// ===============================================
// RESPONSE INTERCEPTOR - FIXED FOR LOGOUT
// ===============================================

// In apiService.js - Update the response interceptor:
apiService.interceptors.response.use(
  (response) => {
    console.log(`✅ [${response.status}] ${response.config.url}`);
    return response;
  },
  async (error) => {
    const status = error.response?.status;
    const url = error.config?.url;

    // ✅ FIX: Don't log 401 errors for logout (they're expected)
    if (url?.includes('/logout') && status === 401) {
      console.log('🔓 Logout completed (token invalidated)');
      // Re-throw with a cleaner message
      return Promise.reject({ 
        message: 'Logout completed', 
        isLogout: true 
      });
    }

    console.error('❌ API Error:', status, url, error.response?.data || error.message);

    // If 401 and not on login/logout, clear token and force re-login
    if (status === 401) {
      console.log('🔒 Token expired/invalid for non-logout endpoint');
      // Clear tokens and force re-login for other endpoints
      await setAuthTokenGlobal(null);
    }

    return Promise.reject(error);
  }
);

// ===============================================
// API ENDPOINTS - WITH FIXED LOGOUT
// ===============================================

export const authAPI = {
  // Get CAPTCHA
  getCaptcha: () => apiService.post('/captcha'),
  
  // Login with CAPTCHA
  login: (login, password, captcha, captchaKey) => 
    apiService.post('/login', { login, password, captcha, captcha_key: captchaKey }),
  
  // ✅ FIXED: Logout with proper error handling
  logout: async () => {
    try {
      // Try to call logout API
      const response = await apiService.post('/logout');
      console.log('✅ Logout API succeeded');
      return response;
    } catch (error) {
      // If logout API fails, still return success for local cleanup
      console.log('⚠️ Logout API failed, but continuing with local cleanup');
      return { data: { success: true, message: 'Local cleanup completed' } };
    }
  },
  
  // Get current user
  getUser: () => apiService.get('/auth/user'),
};

// ... rest of your API endpoints remain the same ...
export const userAPI = {
  // ✅ Dashboard - sab kuch ek call mein: user, projects, queries, recent requests
  getDashboard: () => apiService.get('/user/dashboard'),

  // ✅ All main categories (services/queries dropdown)
  getServices: () => apiService.get('/user/services'),

  // ✅ Sub-categories when user selects a main category
  getSubQueries: (queryId) => apiService.get(`/user/sub-queries/${queryId}`),

  // ✅ Recent 5 requests (agar alag se chahiye, warna dashboard mein already hai)
  getRecentRequests: () => apiService.get('/user/requests/recent'),

  // ✅ Full history with pagination
  getHistory: (perPage = 15) => 
    apiService.get('/user/history', { params: { per_page: perPage } }),

  // ✅ Submit new enhancement/change request
  submitChangeRequest: (formData) => 
    apiService.post('/user/change-request', formData, {
      headers: {
        'Content-Type': 'multipart/form-data', // Important for files + voice
      },
    }),
};

// apiService.js - FIXED VERSION

export const assignerAPI = {
  /**
   * Get assigner dashboard (requests + stats)
   * GET /assigner/dashboard
   */
  getDashboard: () => apiService.get('/assigner/dashboard'),

  /**
   * Get full request details (with conversations, developers, dept head info)
   * GET /assigner/requests/{id}
   */
  getRequestDetails: (requestId) => 
    apiService.get(`/assigner/requests/${requestId}`),

  /**
   * Send remarks/action to dept head (with optional attachment)
   * POST /assigner/requests/{id}/action
   * FIXED: Properly handle FormData for React Native
   */
  sendActionToDeptHead: (requestId, payload) => {
    const formData = new FormData();
    
    // Add remarks
    formData.append('assigner_remarks', payload.assigner_remarks);
    
    // Add attachment if exists (React Native file format)
    if (payload.assigner_attachment) {
      formData.append('assigner_attachment', {
        uri: payload.assigner_attachment.uri,
        type: payload.assigner_attachment.type,
        name: payload.assigner_attachment.name,
      });
    }

    return apiService.post(`/assigner/requests/${requestId}/action`, formData, {
      headers: { 
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /**
   * Assign developer to request
   * POST /assigner/requests/{id}/assign
   * Data: { developer_id: number, assigner_comments?: string }
   */
  assignToDeveloper: (requestId, data) => 
    apiService.post(`/assigner/requests/${requestId}/assign`, data),

  /**
   * Upload attachment for completed request
   * POST /assigner/requests/{id}/update-completed
   * FIXED: Only attachment (no pricing as per your backend)
   */
  updateCompletedRequest: (requestId, attachmentFile) => {
    const formData = new FormData();
    formData.append('attachment', {
      uri: attachmentFile.uri,
      type: attachmentFile.type,
      name: attachmentFile.name,
    });

    return apiService.post(`/assigner/requests/${requestId}/update-completed`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
// src/api/resolverAPI.js
export const resolverAPI = {
  /**
   * Get resolver dashboard with assigned requests and stats
   * GET /resolver/dashboard
   */
  getDashboard: () => apiService.get('/resolver/dashboard'),
  
  /**
   * Get specific request details (only if assigned to current resolver)
   * GET /resolver/requests/{id}
   */
  getRequestDetails: (id) => apiService.get(`/resolver/requests/${id}`),
  
  /**
   * Update request status (with hours worked and comments)
   * PATCH /resolver/requests/{id}/status
   * 
   * FIXED ISSUES:
   * 1. Changed POST to PATCH (matches route)
   * 2. Using correct parameter name: hours_worked (not working_hours)
   */
  updateRequestStatus: (id, data) => {
    // ✅ FIXED: Ensure correct parameter names match controller
    const payload = {
      status: data.status,
      hours_worked: data.hours_worked,  // ✅ Changed from working_hours
      resolver_comment: data.resolver_comment,
    };
    
    console.log('🔄 Updating resolver status:', id, payload);
    
    // ✅ FIXED: Using PATCH instead of POST
    return apiService.patch(`/resolver/requests/${id}/status`, payload);
  },
};
export const adminAPI = {
  setAuthToken: setAuthTokenGlobal,
  getCurrentToken: () => authToken,
  clearAuthToken: async () => {
    await setAuthTokenGlobal(null);
  },
  getDashboard: () => apiService.get('/admin/dashboard'),
  getUsers: (params = {}) => apiService.get('/admin/users', { params }),
  getUser: (id) => apiService.get(`/admin/users/${id}`),
  createUser: (data) => apiService.post('/admin/users', data),
  updateUser: (id, data) => apiService.put(`/admin/users/${id}`, data),
  deleteUser: (id) => apiService.delete(`/admin/users/${id}`),
  getProjects: (params = {}) => apiService.get('/admin/projects', { params }),
  getProject: (id) => apiService.get(`/admin/projects/${id}`),
  createProject: (data) => apiService.post('/admin/projects', data),
  updateProject: (id, data) => apiService.put(`/admin/projects/${id}`, data),
  deleteProject: (id) => apiService.delete(`/admin/projects/${id}`),
  getProjectStats: () => apiService.get('/admin/projects-stats'),
  searchProjects: (query) => apiService.get('/admin/projects-search', { params: { q: query } }),
  getProjectsByType: (type) => apiService.get(`/admin/projects-by-type/${type}`),
  bulkDeleteProjects: (projectIds) => apiService.post('/admin/projects/bulk-delete', { project_ids: projectIds }),
  getRoles: () => apiService.get('/admin/roles'),
  getAssignableUsers: () => apiService.get('/admin/assignable-users'),
  getProjectsForAssignment: () => apiService.get('/admin/projects-for-assignment'),
  assignProjectsToUser: (data) => apiService.post('/admin/assign-projects', data),
  getProjectsForUserAssignment: () => apiService.get('/admin/projects-for-user-assignment'),
  getUsersForAssignment: (search = '') => 
    apiService.get('/admin/users-for-assignment', { params: { search } }),
  assignUsersToProject: (data) => 
    apiService.post('/admin/assign-users-to-project', data),
  getAssignedUsersForProject: (projectId) => 
    apiService.get(`/admin/projects/${projectId}/assigned-users`),
  removeUserFromProject: (projectId, userId) => 
    apiService.delete(`/admin/projects/${projectId}/users/${userId}`),
};

export const adgAPI = {
  getDashboard: () => apiService.get('/adg/dashboard'),
};

// src/services/api/deptHeadAPI.js

// Assuming apiService is your axios instance or similar HTTP client
// e.g., import apiService from './apiService';

export const deptHeadAPI = {
  // Dashboard / Statistics
  getStatistics: () => apiService.get('/dept-head/statistics'),

  // Pending & History Requests
  getPendingRequests: (params = {}) => 
    apiService.get('/dept-head/pending-requests', { params }),

  getRequestHistory: (params = {}) => 
    apiService.get('/dept-head/history', { params }),

  // Single Request Details
  getRequestDetails: (id) => 
    apiService.get(`/dept-head/requests/${id}`),

  // Approve / Reject Request
  approveRequest: (id) => 
    apiService.post(`/dept-head/requests/${id}/approve`),

  rejectRequest: (id, rejectionReason) => 
    apiService.post(`/dept-head/requests/${id}/reject`, {
      rejection_reason: rejectionReason,
    }),

  // Project Conversations & Responses
  // List projects with recent assigner activity
  getProjectsWithActivity: (params = {}) => 
    apiService.get('/dept-head/projects-with-activity', { params }),

  // Get all conversations for a specific project
  getProjectConversations: (projectId) => 
    apiService.get(`/dept-head/projects/${projectId}/conversations`),

  // Get the latest unresponded message for a project
  getLatestUnrespondedMessage: (projectId) => 
    apiService.get(`/dept-head/projects/${projectId}/latest-unresponded`),

  // Respond to a specific conversation (accept/reject)
 respondToConversation: (conversationId, payload) => {
  const formData = new FormData();

  // Required fields
  formData.append('status', payload.status);        // 'accepted' or 'rejected'
  formData.append('remarks', payload.remarks || '');

  // File field
  if (payload.attachment) {
    formData.append('attachments', {
      uri: payload.attachment.uri,
      type: payload.attachment.type || 'image/jpeg',
      name: payload.attachment.name || `response_${Date.now()}.jpg`,
    });

  }

  // ✅ KEY FIX: Explicitly set headers for this specific request
  return apiService.post(
    `/dept-head/respond/${conversationId}`, 
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      // ✅ This tells axios to NOT transform the FormData
      transformRequest: (data) => data,
    }
  );
},
downloadAuthenticatedFile: async (url, filename) => {
  try {
    const token = await getToken(); // ← this is the internal getToken in apiService.js – it works here
    if (!token) {
      throw new Error('No authentication token found. Please login again.');
    }
    console.log('Downloading file with token:', token.substring(0, 15) + '...');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Server rejected download: ${response.status} - ${errorText}`);
    }

    const blob = await response.blob();
    const reader = new FileReader();
    reader.readAsDataURL(blob);

    return new Promise((resolve, reject) => {
      reader.onloadend = async () => {
        const base64data = reader.result.split(',')[1];
        const filePath = `${RNFS.DocumentDirectoryPath}/${filename}`;

        try {
          await RNFS.writeFile(filePath, base64data, 'base64');
          Alert.alert('Success', `File downloaded to:\n${filePath}`);
          console.log('File saved successfully:', filePath);
          resolve(filePath);
        } catch (writeErr) {
          reject(writeErr);
        }
      };
      reader.onerror = reject;
    });
  } catch (err) {
    console.error('Authenticated file download failed:', err);
    Alert.alert('Download Failed', err.message || 'Check login status or file URL');
    throw err;
  }
},
  // Optional: If you want to keep a dashboard endpoint (not present in controller)
  // You can remove this if not needed
  getDashboard: () => apiService.get('/dept-head/dashboard'),
};

export const testAPI = {
  testLogin: (role) => apiService.get(`/test/auth/login/${role}`),
  testUsersList: () => apiService.get('/test/auth/users'),
  testUserDashboard: () => apiService.get('/test/user/dashboard'),
  testUserServices: () => apiService.get('/test/user/services'),
  testUserProjects: (type) => apiService.get(`/test/user/projects/${type}`),
  testAdminDashboard: () => apiService.get('/test/admin/dashboard'),
  testAdminUsers: () => apiService.get('/test/admin/users'),
  testAssignerRequests: () => apiService.get('/test/assigner/requests'),
  testAssignerDevelopers: () => apiService.get('/test/assigner/developers'),
  testResolverDashboard: () => apiService.get('/test/resolver/dashboard'),
  testAdgDashboard: () => apiService.get('/test/adg/dashboard'),
};

// ===============================================
// MAIN EXPORT - SIMPLIFIED
// ===============================================

export default {
  // Token management
  setAuthToken: setAuthTokenGlobal,
  getCurrentToken: () => authToken,
  
  // Initialize token from storage
  initializeToken: async () => {
    try {
      console.log('🚀 Initializing token...');
      
      const token = await AsyncStorage.getItem('api_token');
      if (token) {
        await setAuthTokenGlobal(token);
        console.log('✅ Token initialized');
        return true;
      }
      console.log('⚠️ No stored token');
      return false;
    } catch (error) {
      console.error('❌ Error initializing token:', error);
      return false;
    }
  },
  
  // Clear all tokens
  clearToken: async () => {
    console.log('🧹 Clearing tokens...');
    await setAuthTokenGlobal(null);
  },
  
  // Debug functions
  debugHeaders: () => {
    console.log('🔍 Current Authorization header:', apiService.defaults.headers.common['Authorization']);
    console.log('🔍 Token in memory:', authToken ? 'Yes' : 'No');
  },
  
  testToken: async () => {
    try {
      console.log('🧪 Testing token...');
      const response = await apiService.get('/user/dashboard');
      console.log('✅ Token test successful');
      return { success: true, status: response.status };
    } catch (error) {
      console.error('❌ Token test failed:', error.response?.status);
      return { success: false, error: error.response?.data || error.message };
    }
  },
  
  // API groups
  auth: authAPI,
  user: userAPI,
  assigner: assignerAPI,
  resolver: resolverAPI,
  admin: adminAPI,
  adg: adgAPI,
  test: testAPI,
  deptHead: deptHeadAPI,
  
};