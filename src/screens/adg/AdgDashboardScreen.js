import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Alert,
} from "react-native";
import { LineChart, BarChart, PieChart } from "react-native-chart-kit";
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import LinearGradient from 'react-native-linear-gradient';
import * as Animatable from 'react-native-animatable';
import api from "../../services/apiService";
import { useAuth } from '../../hooks/redux'; // ADD THIS IMPORT


const { width, height } = Dimensions.get("window");
const screenWidth = width - 40;

const AdgDashboardScreen = () => {
    const { logout } = useAuth(); // ADD THIS LINE
  const navigation = useNavigation();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notification, setNotification] = useState({ message: '', type: '' });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await api.adg.getDashboard();
      if (response.data.success) {
        setDashboardData(response.data.data);
        showNotification('Dashboard updated successfully', 'success');
      } else {
        console.error("Failed to load dashboard data");
        showNotification('Failed to load dashboard data', 'error');
      }
    } catch (error) {
      console.error("Error fetching ADG Dashboard:", error);
      showNotification('Error loading dashboard', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: '', type: '' }), 4000);
  };

 const handleLogout = async () => {
  Alert.alert(
    'Logout',
    'Are you sure you want to logout?',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            console.log('AdgDashboard: Starting logout...');
            
            // Just dispatch logout - NO NAVIGATION
            await logout();
            
            console.log('AdgDashboard: Logout dispatched successfully');
            
            // The navigation will happen automatically via Redux state change
            // DO NOT ADD navigation.navigate() here!
            
          } catch (error) {
            console.error('AdgDashboard: Logout error:', error);
            // Even if there's an error, don't navigate manually
          }
        }
      }
    ]
  );
};
  // Calculate success rate
  const calculateSuccessRate = () => {
    if (!dashboardData) return 0;
    const successRate = (dashboardData.completedRequests / Math.max(dashboardData.totalRequests, 1)) * 100;
    return Math.round(successRate * 10) / 10; // Round to 1 decimal place
  };

  // Helper function for developer completion rate
  const calculateCompletionRate = (completed, total) => {
    const actualTotal = total || completed;
    return Math.round((completed / Math.max(actualTotal, 1)) * 100);
  };

  // Helper function for developer colors
  const getDeveloperColor = (index) => {
    const colors = [
      '#4ECDC4', '#2C3E50', '#45aaf2', '#3867d6', 
      '#a55eea', '#fd9644', '#26de81', '#eb3b5a',
      '#f7b731', '#fc5c65', '#fd9644', '#2bcbba'
    ];
    return colors[index % colors.length];
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#2C3E50" />
        <Text style={styles.loadingText}>Loading Dashboard...</Text>
      </View>
    );
  }

  if (!dashboardData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No Data Found</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchDashboardData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#2C3E50" barStyle="light-content" />
      
      {/* Top Navbar */}
      <View style={styles.navbar}>
        <View style={styles.navbarCenter}>
          <Text style={styles.navbarTitle}>ADG Dashboard</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Icon name="sign-out" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Notification */}
        {notification.message && (
          <Animatable.View 
            animation="fadeInDown"
            style={[
              styles.notification, 
              notification.type === 'error' ? styles.error : styles.success
            ]}
          >
            <Text style={styles.notificationText}>{notification.message}</Text>
          </Animatable.View>
        )}

        {/* Header Section */}
        <LinearGradient
          colors={['#2C3E50', '#4ECDC4']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerText}>
              <Text style={styles.welcomeText}>
                ADG Analytics Dashboard
              </Text>
              <Text style={styles.roleText}>Performance Overview</Text>
            </View>
            <View style={styles.statsOverview}>
              <Text style={styles.totalRequests}>
                {dashboardData.totalRequests} Total Requests
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Summary Cards */}
        <Animatable.View animation="fadeInUp" duration={800} style={styles.cardsContainer}>
          <View style={styles.cardRow}>
            <Animatable.View 
              animation="fadeInLeft" 
              duration={600} 
              delay={200}
              style={[styles.card, styles.cardPrimary]}
            >
              <LinearGradient
                colors={['#4b7bec', '#3867d6']}
                style={styles.cardGradient}
              >
                <Icon name="list-alt" size={24} color="#fff" />
                <Text style={styles.cardTitle}>Total Requests</Text>
                <Text style={styles.cardValue}>{dashboardData.totalRequests}</Text>
              </LinearGradient>
            </Animatable.View>

            <Animatable.View 
              animation="fadeInRight" 
              duration={600} 
              delay={200}
              style={[styles.card, styles.cardWarning]}
            >
              <LinearGradient
                colors={['#fd9644', '#fa8231']}
                style={styles.cardGradient}
              >
                <Icon name="clock-o" size={24} color="#fff" />
                <Text style={styles.cardTitle}>Pending</Text>
                <Text style={styles.cardValue}>{dashboardData.pendingRequests}</Text>
              </LinearGradient>
            </Animatable.View>
          </View>

          <View style={styles.cardRow}>
            <Animatable.View 
              animation="fadeInLeft" 
              duration={600} 
              delay={400}
              style={[styles.card, styles.cardInfo]}
            >
              <LinearGradient
                colors={['#f7b731', '#f39c12']}
                style={styles.cardGradient}
              >
                <Icon name="refresh" size={24} color="#fff" />
                <Text style={styles.cardTitle}>In Progress</Text>
                <Text style={styles.cardValue}>{dashboardData.inProgressRequests}</Text>
              </LinearGradient>
            </Animatable.View>

            <Animatable.View 
              animation="fadeInRight" 
              duration={600} 
              delay={400}
              style={[styles.card, styles.cardSuccess]}
            >
              <LinearGradient
                colors={['#26de81', '#20bf6b']}
                style={styles.cardGradient}
              >
                <Icon name="check-circle" size={24} color="#fff" />
                <Text style={styles.cardTitle}>Completed</Text>
                <Text style={styles.cardValue}>{dashboardData.completedRequests}</Text>
              </LinearGradient>
            </Animatable.View>
          </View>
        </Animatable.View>

        

        {/* Average Resolution Time */}
        <Animatable.View animation="fadeInUp" duration={800} delay={300} style={styles.avgBox}>
          <LinearGradient colors={['#ffffff', '#f8f9fa']} style={styles.avgGradient}>
            <View style={styles.avgContent}>
              <Icon name="line-chart" size={20} color="#3867d6" />
              <Text style={styles.avgText}>
                Average Resolution Time:{" "}
                <Text style={styles.avgHighlight}>
                  {dashboardData.avgResolutionTime} days
                </Text>
              </Text>
            </View>
          </LinearGradient>
        </Animatable.View>

        {/* Monthly Requests Line Chart */}
        <Animatable.View animation="fadeInUp" duration={800} delay={400} style={styles.chartContainer}>
          <LinearGradient colors={['#ffffff', '#f8f9fa']} style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Icon name="calendar" size={18} color="#2C3E50" />
              <Text style={styles.sectionTitle}>Monthly Requests Trend</Text>
            </View>
            <LineChart
              data={{
                labels: dashboardData.monthlyLabels.map(label => 
                  label.includes(' ') ? label.split(' ')[0] : label
                ),
                datasets: [{ data: dashboardData.monthlyCounts }],
              }}
              width={screenWidth - 32}
              height={220}
              yAxisLabel=""
              xAxisLabel=""
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              withVerticalLines={false}
              withHorizontalLines={true}
              segments={5}
            />
          </LinearGradient>
        </Animatable.View>

               {/* Developer Performance - FULLY VISIBLE & SCROLLABLE */}
        <Animatable.View animation="fadeInUp" duration={800} delay={500} style={styles.chartContainer}>
          <LinearGradient colors={['#ffffff', '#f8f9fa']} style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Icon name="users" size={18} color="#2C3E50" />
              <Text style={styles.sectionTitle}>Developer Performance</Text>
            </View>
            
            {/* Clear indicator that it's scrollable */}
            <View style={styles.scrollHint}>
              <Icon name="arrows-h" size={16} color="#64748B" />
              <Text style={styles.scrollHintText}>Scroll horizontally to view all developers</Text>
            </View>

            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={true}
              contentContainerStyle={styles.horizontalChartContainer}
              persistentScrollbar={true}
            >
              <BarChart
                data={{
                  labels: dashboardData.developerNames,
                  datasets: [{ data: dashboardData.developerCompleted }],
                }}
                width={dashboardData.developerNames.length * 80} // Give plenty of space
                height={240}
                yAxisLabel=""
                yAxisSuffix=""
                chartConfig={developerChartConfig}
                verticalLabelRotation={30}
                fromZero={true}
                showValuesOnTopOfBars={true}
                withHorizontalLabels={true}
                style={styles.developerChart}
              />
            </ScrollView>

            {/* Developer List Below */}
            <View style={styles.developersList}>
              {dashboardData.developerNames.map((name, index) => (
                <View key={index} style={styles.developerItem}>
                  <View style={styles.developerInfo}>
                    <View style={[styles.developerAvatar, { backgroundColor: getDeveloperColor(index) }]}>
                      <Text style={styles.developerInitials}>
                        {name.split(' ').map(n => n[0].toUpperCase()).join('')}
                      </Text>
                    </View>
                    <Text style={styles.developerName}>{name}</Text>
                  </View>
                  <Text style={styles.completionText}>
                    {dashboardData.developerCompleted[index]} completed
                  </Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </Animatable.View>

        {/* Project Performance */}
        <Animatable.View animation="fadeInUp" duration={800} delay={600} style={styles.projectsContainer}>
          <LinearGradient colors={['#ffffff', '#f8f9fa']} style={styles.projectsCard}>
            <View style={styles.chartHeader}>
              <Icon name="briefcase" size={18} color="#2C3E50" />
              <Text style={styles.sectionTitle}>Project Performance</Text>
            </View>
            {dashboardData.projectNames.map((project, index) => (
              <Animatable.View 
                key={index} 
                animation="fadeInRight" 
                duration={600}
                delay={index * 100}
                style={styles.projectCard}
              >
                <View style={styles.projectHeader}>
                  <Text style={styles.projectTitle}>{project}</Text>
                  <View style={styles.progressBadge}>
                    <Text style={styles.progressText}>
                      {dashboardData.projectCompleted[index]} / {dashboardData.projectTotal[index]}
                    </Text>
                  </View>
                </View>
                <Text style={styles.projectStats}>
                  Completion Rate: {Math.round((dashboardData.projectCompleted[index] / dashboardData.projectTotal[index]) * 100)}%
                </Text>
                <Text style={styles.projectDeveloperList}>
                  <Text style={styles.developerLabel}>Team: </Text>
                  {dashboardData.projectDevelopers[index].join(", ") || "No developers assigned"}
                </Text>
              </Animatable.View>
            ))}
          </LinearGradient>
        </Animatable.View>

        {/* Priority Distribution */}
        <Animatable.View animation="fadeInUp" duration={800} delay={700} style={styles.chartContainer}>
          <LinearGradient colors={['#ffffff', '#f8f9fa']} style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Icon name="exclamation-triangle" size={18} color="#2C3E50" />
              <Text style={styles.sectionTitle}>Priority Distribution</Text>
            </View>
            <PieChart
              data={dashboardData.priorityLabels.map((label, i) => ({
                name: label,
                population: dashboardData.priorityCounts[i],
                color: ["#eb3b5a", "#3867d6", "#45aaf2"][i % 3],
                legendFontColor: "#333",
                legendFontSize: 12,
              }))}
              width={screenWidth - 32}
              height={220}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="20"
              style={styles.chart}
            />
          </LinearGradient>
        </Animatable.View>
        {/* Performance Metrics Section */}
        <Animatable.View animation="fadeInUp" duration={800} delay={200} style={styles.metricsContainer}>
          <LinearGradient colors={['#ffffff', '#f8f9fa']} style={styles.metricsCard}>
            <View style={styles.chartHeader}>
              <Icon name="tachometer" size={18} color="#2C3E50" />
              <Text style={styles.sectionTitle}>Performance Metrics</Text>
            </View>
            
            <View style={styles.metricsGrid}>
              {/* Success Rate */}
              <View style={styles.metricItem}>
                <LinearGradient
                  colors={['#34d399', '#10b981']}
                  style={styles.metricBadge}
                >
                  <Text style={styles.metricValue}>
                    {calculateSuccessRate()}%
                  </Text>
                  <Text style={styles.metricLabel}>Success Rate</Text>
                </LinearGradient>
              </View>

              {/* Average Resolution Time */}
              <View style={styles.metricItem}>
                <LinearGradient
                  colors={['#f59e0b', '#d97706']}
                  style={styles.metricBadge}
                >
                  <Text style={styles.metricValue}>
                    {dashboardData.avgResolutionTime}
                  </Text>
                  <Text style={styles.metricLabel}>Avg. Days</Text>
                </LinearGradient>
              </View>

              {/* Active Tasks */}
              <View style={styles.metricItem}>
                <LinearGradient
                  colors={['#4ECDC4', '#2C3E50']}
                  style={styles.metricBadge}
                >
                  <Text style={styles.metricValue}>
                    {dashboardData.inProgressRequests}
                  </Text>
                  <Text style={styles.metricLabel}>Active Tasks</Text>
                </LinearGradient>
              </View>

              {/* Total Volume */}
              <View style={styles.metricItem}>
                <LinearGradient
                  colors={['#6b7280', '#4b5563']}
                  style={styles.metricBadge}
                >
                  <Text style={styles.metricValue}>
                    {dashboardData.totalRequests}
                  </Text>
                  <Text style={styles.metricLabel}>Total Volume</Text>
                </LinearGradient>
              </View>
            </View>
          </LinearGradient>
        </Animatable.View>
      </ScrollView>
    </View>
  );
};

// Enhanced Chart configuration
const chartConfig = {
  backgroundGradientFrom: "#ffffff",
  backgroundGradientTo: "#ffffff",
  color: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
  strokeWidth: 3,
  barPercentage: 0.6,
  decimalPlaces: 0,
  propsForDots: {
    r: "5",
    strokeWidth: "2",
    stroke: "#4ECDC4",
  },
  fillShadowGradient: '#4ECDC4',
  fillShadowGradientOpacity: 0.3,
  propsForBackgroundLines: {
    strokeWidth: 1,
    stroke: "#e1e5e9",
    strokeDasharray: "0",
  },
  propsForLabels: {
    fontSize: 10,
    fontWeight: '500',
  },
};

// Developer Performance specific chart configuration
const developerChartConfig = {
  backgroundGradientFrom: "#ffffff",
  backgroundGradientTo: "#ffffff",
  color: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
  strokeWidth: 2,
  barPercentage: 0.7,
  decimalPlaces: 0,
  barRadius: 6,
  propsForDots: {
    r: "4",
    strokeWidth: "2",
    stroke: "#4ECDC4",
  },
  fillShadowGradient: '#4ECDC4',
  fillShadowGradientOpacity: 0.3,
  propsForBackgroundLines: {
    strokeWidth: 1,
    stroke: "#e1e5e9",
    strokeDasharray: "0",
  },
  propsForLabels: {
    fontSize: 11,
    fontWeight: '600',
  },
  propsForVerticalLabels: {
    fontSize: 10,
    fontWeight: '500',
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
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
  navbarCenter: {
    flex: 1,
    alignItems: 'center',
  },
  navbarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  logoutButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  // Header Styles
  header: {
    paddingHorizontal: 20,
    paddingTop: 25,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 9,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
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
  statsOverview: {
    alignItems: 'flex-end',
  },
  totalRequests: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  // Flexible Developer Chart Styles
  horizontalChartContainer: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  developerChart: {
    borderRadius: 10,
    marginVertical: 5,
  },
  // Notification
  notification: {
    padding: 16,
    borderRadius: 10,
    margin: 16,
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
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
  // Cards Container
  cardsContainer: {
    padding: 16,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  card: {
    flex: 1,
    marginHorizontal: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 20,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
  },
  cardTitle: {
    color: '#fff',
    fontSize: 14,
    marginTop: 8,
    marginBottom: 5,
    fontWeight: '500',
  },
  cardValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  cardPrimary: {
    shadowColor: '#4b7bec',
  },
  cardWarning: {
    shadowColor: '#fd9644',
  },
  cardInfo: {
    shadowColor: '#f7b731',
  },
  cardSuccess: {
    shadowColor: '#26de81',
  },
  // Performance Metrics
  metricsContainer: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  metricsCard: {
    padding: 20,
    borderRadius: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricItem: {
    width: '48%',
    marginBottom: 12,
  },
  metricBadge: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 90,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  metricValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metricLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  // Average Resolution Time
  avgBox: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  avgGradient: {
    padding: 20,
    borderRadius: 16,
  },
  avgContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avgText: {
    fontSize: 16,
    color: '#2f3542',
    marginLeft: 10,
    fontWeight: '500',
  },
  avgHighlight: {
    color: '#3867d6',
    fontWeight: '700',
  },
  // Chart Containers
  chartContainer: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  chartCard: {
    padding: 20,
    borderRadius: 16,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C3E50',
    marginLeft: 10,
  },
  chart: {
    borderRadius: 10,
  },
  // Developer Performance Specific Styles
  developersList: {
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e1e5e9',
    paddingTop: 15,
  },
  developerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  developerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  developerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  developerInitials: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  developerDetails: {
    flex: 1,
  },
  developerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 2,
  },
  developerStats: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  completionBadge: {
    backgroundColor: '#e0f2f1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 55,
    alignItems: 'center',
  },
  completionText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  // Projects Container
  projectsContainer: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  projectsCard: {
    padding: 20,
    borderRadius: 16,
  },
  projectCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4ECDC4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  projectTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3867d6',
    flex: 1,
    marginRight: 10,
  },
  progressBadge: {
    backgroundColor: '#e0f2f1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  progressText: {
    color: '#2C3E50',
    fontSize: 12,
    fontWeight: '600',
  },
  projectStats: {
    color: '#636e72',
    marginVertical: 4,
    fontSize: 14,
    fontWeight: '500',
  },
  projectDeveloperList: {
    color: '#2d3436',
    fontSize: 13,
    lineHeight: 18,
  },
  developerLabel: {
    fontWeight: '600',
    color: '#2C3E50',
  },
  // Loader and Error States
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 20,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AdgDashboardScreen;