  import { useDispatch, useSelector } from 'react-redux';
  import { useCallback } from 'react';
  import { loginUser, logoutUser, loadUserFromStorage, clearError, setAuthState } from '../store/slices/authSlice';
  import apiService from '../services/apiService';

  export const useAuth = () => {
    const dispatch = useDispatch();
    const auth = useSelector((state) => state.auth);

    // ✅ FIXED: All 4 parameters
    const login = useCallback((login, password, captcha, captchaKey) => {
      console.log('🔐 useAuth: Dispatching login with CAPTCHA');
      return dispatch(loginUser({ login, password, captcha, captchaKey }));
    }, [dispatch]);

    const logout = useCallback(() => {
      return dispatch(logoutUser());
    }, [dispatch]);

    const loadUser = useCallback(() => {
      console.log('🔐 useAuth: Loading user from storage');
      return dispatch(loadUserFromStorage());
    }, [dispatch]);

    const clearAuthError = useCallback(() => {
      dispatch(clearError());
    }, [dispatch]);

    // ✅ NEW: Manual auth state setter (for debugging)
    const manualSetAuth = useCallback((token, user) => {
      dispatch(setAuthState({ token, user }));
    }, [dispatch]);

    return {
      user: auth.user,
      token: auth.token,
      loading: auth.loading,
      error: auth.error,
      login,
      logout,
      loadUser,
      clearError: clearAuthError,
      manualSetAuth, // For debugging
      userApi: apiService, // ✅ ADDED: Provide API service to components
    };
  };