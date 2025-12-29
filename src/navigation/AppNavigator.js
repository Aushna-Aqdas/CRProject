import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../hooks/redux';
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/auth/LoginScreen';
// Import all your screens...
import UserDashboard from '../screens/user/UserDashboard';
import ResolverDashboard from '../screens/ResolverDashboard';
import ResolverRequestDetail from '../screens/ResolverRequestDetail';
import AssignerDashboardScreen from '../screens/AssignerDashboardScreen';
import RequestDetailScreen from '../screens/RequestDetailScreen';
import UserHistoryScreen from '../screens/user/UserHistoryScreen';
import DrawerNavigator from './DrawerNavigator';
import AdgDashboardScreen from '../screens/adg/AdgDashboardScreen';
import DeptHeadDashboard from '../screens/depthead/DeptHeadDashboard';
import CurrentProjectsScreen from '../screens/depthead/CurrentProjectsScreen';
import DeptHeadRequestDetails from '../screens/depthead/DeptHeadRequestDetailScreen';

import apiService from '../services/apiService'; // 🚨 ADD THIS IMPORT

const Stack = createStackNavigator();
const AppNavigator = () => {
  const { user, token, loading, loadUser } = useAuth();
  const hasLoadedUser = useRef(false);

  useEffect(() => {
    if (!hasLoadedUser.current) {
      console.log('🔄 AppNavigator: Loading user ONCE');
      loadUser();
      hasLoadedUser.current = true;
    }
  }, []);

  // 🚨 PERMANENT FIX: Ensure apiService has token AFTER Redux loads it
  useEffect(() => {
    const ensureApiServiceToken = async () => {
      if (token && !loading && apiService && apiService.setAuthToken) {
        try {
          console.log('✅ AppNavigator: Ensuring token in apiService...');
          // Double-check token is actually in apiService
          const currentHeader = apiService.defaults?.headers?.common?.['Authorization'];
          
          if (!currentHeader) {
            console.log('🔄 Token missing in apiService, setting now...');
            await apiService.setAuthToken(token);
          } else {
            console.log('✅ Token already in apiService headers');
          }
        } catch (error) {
          console.error('❌ AppNavigator: Failed to ensure token:', error);
        }
      }
    };

    // Wait for everything to settle
    const timer = setTimeout(() => {
      ensureApiServiceToken();
    }, 300);

    return () => clearTimeout(timer);
  }, [token, loading]);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {token && user ? (
          // AUTHENTICATED - Show role-based screens
          <>
            {parseInt(user.role) === 1 && (
              <>
                <Stack.Screen name="MainApp" component={DrawerNavigator} />
                <Stack.Screen name="UserHistory" component={UserHistoryScreen} />
                <Stack.Screen name="RequestDetail" component={RequestDetailScreen} />
              </>
            )}
            {parseInt(user.role) === 2 && (
              <>
                <Stack.Screen name="UserDashboard" component={UserDashboard} />
                <Stack.Screen name="RequestDetail" component={RequestDetailScreen} />
                <Stack.Screen name="UserHistory" component={UserHistoryScreen} />
              </>
            )}
            {parseInt(user.role) === 3 && (
              <>
                <Stack.Screen name="ResolverDashboard" component={ResolverDashboard} />
                <Stack.Screen name="ResolverRequestDetail" component={ResolverRequestDetail} />
              </>
            )}
            {parseInt(user.role) === 4 && (
              <>
                <Stack.Screen name="AssignerDashboard" component={AssignerDashboardScreen} />
                <Stack.Screen name="RequestDetail" component={RequestDetailScreen} />
              </>
            )}
            {parseInt(user.role) === 5 && (
              <Stack.Screen name="AdgDashboard" component={AdgDashboardScreen} />
            )}
            {parseInt(user.role) === 6 && (
              <>
                <Stack.Screen name="DeptHeadDashboard" component={DeptHeadDashboard} />
                <Stack.Screen 
  name="CurrentProjectsScreen" 
  component={CurrentProjectsScreen} 
  options={{ headerShown: false }}
/>
                <Stack.Screen name="DeptHeadRequestDetailScreen" component={DeptHeadRequestDetails} />
              </>
            )}
          </>
        ) : (
          // NOT AUTHENTICATED - Only Login
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;