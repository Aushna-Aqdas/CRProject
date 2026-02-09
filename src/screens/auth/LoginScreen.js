import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Alert,
  Animated,
  Image,
  ActivityIndicator,
  ImageBackground,
} from 'react-native';
import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/FontAwesome';
import { Colors } from '../../styles/theme';
import { useAuth } from '../../hooks/redux';
import apiService from '../../services/apiService';
import Footer from '../../components/Footer';

// EmailSuggestions component
const EmailSuggestions = ({ emails, onEmailSelect, visible }) => {
  if (!visible || emails.length === 0) return null;

  return (
    <View style={styles.suggestionsContainer}>
      {emails.map((email, index) => (
        <TouchableOpacity
          key={index}
          style={styles.suggestionItem}
          onPress={() => onEmailSelect(email)}
        >
          <Icon
            name="envelope"
            size={16}
            color="#666"
            style={styles.suggestionIcon}
          />
          <Text style={styles.suggestionText}>{email}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const LoginScreen = ({ navigation }) => {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [captchaText, setCaptchaText] = useState('');
  const [captchaImage, setCaptchaImage] = useState(null);
  const [captchaKey, setCaptchaKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCaptcha, setIsLoadingCaptcha] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [savedEmails, setSavedEmails] = useState([]);
  const [showEmailSuggestions, setShowEmailSuggestions] = useState(false);

  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const captchaInputRef = useRef(null);

  const { login: authLogin, error: authError } = useAuth();

  // Load saved emails + passwords
  const loadSavedEmails = useCallback(async () => {
    try {
      const creds = await Keychain.getInternetCredentials('savedCredentials');
      if (creds) {
        const credsObj = JSON.parse(creds.password); // email -> password map
        setSavedEmails(Object.keys(credsObj));

        // Autofill last used email
        const lastEmail = Object.keys(credsObj)[Object.keys(credsObj).length - 1];
        setLogin(lastEmail);
        setPassword(credsObj[lastEmail] || '');
      }
    } catch (err) {
      console.log('Error loading saved emails', err);
    }
  }, []);

  // Save email + password (all credentials)
  const saveEmailAndPassword = useCallback(
    async (email, pwd) => {
      try {
        const creds = await Keychain.getInternetCredentials('savedCredentials');
        let credsObj = {};
        if (creds) credsObj = JSON.parse(creds.password);

        credsObj[email] = pwd; // Add/update current email

        await Keychain.setInternetCredentials(
          'savedCredentials',
          'savedCredentials',
          JSON.stringify(credsObj)
        );

        setSavedEmails(Object.keys(credsObj));
      } catch (err) {
        console.log('Error saving credentials', err);
      }
    },
    []
  );

  // Generate CAPTCHA
  const generateCaptcha = useCallback(async () => {
    try {
      setIsLoadingCaptcha(true);
      const response = await apiService.auth.getCaptcha();
      if (response.data && response.data.image && response.data.captcha_key) {
        setCaptchaKey(response.data.captcha_key);
        setCaptchaImage(response.data.image);
        setCaptchaText('');
      } else {
        const fallback = Math.random().toString(36).substring(2, 8).toUpperCase();
        setCaptchaKey(fallback);
        setCaptchaImage(null);
      }
    } catch (error) {
      const fallback = Math.random().toString(36).substring(2, 8).toUpperCase();
      setCaptchaKey(fallback);
      setCaptchaImage(null);
      if (error.message !== 'Network Error') {
        Alert.alert('Error', 'Failed to load CAPTCHA. Please try again.');
      }
    } finally {
      setIsLoadingCaptcha(false);
    }
  }, []);

  // Shake animation
  const shake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnimation, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]).start();
  }, [shakeAnimation]);

  // Handle email selection from suggestions
  const handleEmailSelect = useCallback(async (email) => {
    setLogin(email);
    setShowEmailSuggestions(false);

    try {
      const creds = await Keychain.getInternetCredentials('savedCredentials');
      if (creds) {
        const credsObj = JSON.parse(creds.password);
        setPassword(credsObj[email] || '');
      } else {
        setPassword('');
      }
    } catch (err) {
      setPassword('');
    }

    setTimeout(() => passwordInputRef.current?.focus(), 100);
  }, []);

  // Handle typing email: check if exact email exists and autofill password
  const handleEmailChange = useCallback((text) => {
    setLogin(text);
    setShowEmailSuggestions(true);

    (async () => {
      try {
        const creds = await Keychain.getInternetCredentials('savedCredentials');
        if (creds) {
          const credsObj = JSON.parse(creds.password);
          setPassword(credsObj[text] || '');
        } else {
          setPassword('');
        }
      } catch (err) {
        setPassword('');
      }
    })();
  }, []);

  // Handle login
  const handleLogin = useCallback(async () => {
    if (!login || !password) {
      shake();
      Alert.alert('Error', 'Please enter login and password');
      return;
    }
    if (!captchaText) {
      shake();
      Alert.alert('Error', 'Please enter CAPTCHA');
      return;
    }

    setIsLoading(true);
    try {
      const resultAction = await authLogin(login, password, captchaText, captchaKey);
      if (resultAction.type.endsWith('/fulfilled')) {
        if (rememberMe) await saveEmailAndPassword(login, password);

        setPassword('');
        setCaptchaText('');
        generateCaptcha();
      } else {
        shake();
        generateCaptcha();
      }
    } catch (err) {
      shake();
      generateCaptcha();
      Alert.alert('Login Failed', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [login, password, captchaText, captchaKey, rememberMe, authLogin, shake, saveEmailAndPassword, generateCaptcha]);

  useEffect(() => {
    loadSavedEmails();
    generateCaptcha();
  }, [loadSavedEmails, generateCaptcha]);

  useEffect(() => {
    if (authError?.message) Alert.alert('Login Failed', authError.message);
  }, [authError]);

  const filteredEmails = savedEmails.filter((email) =>
    email.toLowerCase().includes(login.toLowerCase())
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      <ImageBackground
        source={require('../../assets/images/LoginArfa.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(44, 62, 80, 0.7)', '#3b9b94ff']}
          style={styles.overlay}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* LOGO + WELCOME SECTION */}
            <View style={styles.logoSection}>
              <View style={styles.logoContainer}>
                <Image
                  source={require('../../assets/images/PITBLOGO.png')}
                  style={styles.pitbLogo}
                  resizeMode="contain"
                />
                <Image
                  source={require('../../assets/images/crp.png')}
                  style={styles.crpLogo}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.welcomeTitle}>Change Request Portal</Text>
              <Text style={styles.welcomeSubtitle}>Government of the Punjab</Text>
            </View>

            {/* CARD */}
            <Animated.View
              style={[styles.cardContainer, { transform: [{ translateX: shakeAnimation }] }]}
            >
              <View style={styles.card}>
                <View style={styles.header}>
                  <Text style={styles.title}>Sign In to CRP</Text>
                  <Text style={styles.subtitle}>Access Your Change Request Portal</Text>
                </View>

                {/* EMAIL INPUT */}
                <View style={styles.inputContainer}>
                  <View style={styles.inputWrapper}>
                    <Icon name="user" size={20} color={Colors.secondary} style={styles.inputIcon} />
                    <TextInput
                      ref={emailInputRef}
                      style={styles.input}
                      placeholder="Email or CNIC"
                      placeholderTextColor="#666"
                      value={login}
                      onChangeText={handleEmailChange}
                      onFocus={() => setShowEmailSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowEmailSuggestions(false), 200)}
                      autoCapitalize="none"
                      autoComplete="email"
                      textContentType="emailAddress"
                      keyboardType="email-address"
                      returnKeyType="next"
                      onSubmitEditing={() => passwordInputRef.current?.focus()}
                    />
                  </View>
                  <EmailSuggestions
                    emails={filteredEmails}
                    onEmailSelect={handleEmailSelect}
                    visible={showEmailSuggestions && filteredEmails.length > 0}
                  />
                </View>

                {/* PASSWORD INPUT */}
                <View style={styles.inputWrapper}>
                  <Icon name="lock" size={20} color={Colors.secondary} style={styles.inputIcon} />
                  <TextInput
                    ref={passwordInputRef}
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#666"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoComplete="password"
                    textContentType="password"
                    returnKeyType="next"
                    onSubmitEditing={() => captchaInputRef.current?.focus()}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Icon name={showPassword ? 'eye-slash' : 'eye'} size={20} color="#666" />
                  </TouchableOpacity>
                </View>

                {/* REMEMBER ME */}
                <View style={styles.rememberMeContainer}>
                  <TouchableOpacity
                    style={[styles.checkbox, rememberMe && styles.checkboxChecked]}
                    onPress={() => setRememberMe(!rememberMe)}
                  >
                    {rememberMe && <Icon name="check" size={12} color="#fff" />}
                  </TouchableOpacity>
                  <Text style={styles.rememberMeText}>Remember me</Text>
                </View>

                {/* CAPTCHA */}
                <View style={styles.captchaContainer}>
                  <View style={styles.captchaHeader}>
                    <Text style={styles.captchaTitle}>SECURITY VERIFICATION</Text>
                  </View>
                  <View style={styles.captchaDisplay}>
                    {isLoadingCaptcha ? (
                      <ActivityIndicator size="large" color={Colors.primary} />
                    ) : captchaImage && captchaImage.startsWith('data:image') ? (
                      <Image source={{ uri: captchaImage }} style={styles.captchaImage} resizeMode="contain" />
                    ) : (
                      <Text style={styles.fallbackCaptcha}>{captchaKey || 'CAPTCHA NOT LOADED'}</Text>
                    )}
                  </View>
                  <Text style={styles.captchaInstruction}>Type the code you see above:</Text>
                  <View style={styles.captchaInputWrapper}>
                    <TextInput
                      ref={captchaInputRef}
                      style={styles.captchaInput}
                      placeholder="Enter CAPTCHA"
                      placeholderTextColor="#666"
                      value={captchaText}
                      onChangeText={setCaptchaText}
                      autoCapitalize="characters"
                      autoComplete="off"
                      textContentType="none"
                      importantForAutofill="no"
                      returnKeyType="done"
                      onSubmitEditing={handleLogin}
                    />
                    <TouchableOpacity onPress={generateCaptcha} style={styles.refreshButton} disabled={isLoadingCaptcha}>
                      <Icon name={isLoadingCaptcha ? 'spinner' : 'refresh'} size={16} color={isLoadingCaptcha ? '#999' : Colors.primary} />
                      <Text style={[styles.refreshText, isLoadingCaptcha && styles.refreshTextDisabled]}>
                        New Code
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* LOGIN BUTTON */}
                <TouchableOpacity
                  style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
                  onPress={handleLogin}
                  disabled={isLoading}
                >
                  <LinearGradient colors={[Colors.primary, Colors.secondary]} style={styles.loginButtonGradient}>
                    {isLoading ? (
                      <ActivityIndicator color={Colors.accent} size="small" />
                    ) : (
                      <Text style={styles.loginButtonText}>Sign In</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity style={styles.forgotPasswordContainer}>
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </ScrollView>

          <Footer />
        </LinearGradient>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
};


// ✅ FIXED: Styles remain the same
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
  },
  overlay: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  pitbLogo: {
    width: 120,
    height: 120,
    marginRight: 20,
  },
  crpLogo: {
    width: 120,
    height: 120,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  cardContainer: {
    marginBottom: 30,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  inputContainer: {
    marginBottom: 0,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#333',
  },
  suggestionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginTop: -15,
    marginBottom: 5,
    maxHeight: 150,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  suggestionIcon: {
    marginRight: 10,
  },
  suggestionText: {
    fontSize: 14,
    color: '#666',
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.primary,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
  },
  rememberMeText: {
    fontSize: 14,
    color: '#666',
  },
  captchaDisplay: {
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  captchaImage: {
    width: '100%',
    height: '100%',
  },
  fallbackCaptcha: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 8,
    color: '#333',
  },
  captchaContainer: {
    marginBottom: 25,
  },
  captchaHeader: {
    marginBottom: 15,
  },
  captchaTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.primary,
    letterSpacing: 1,
  },
  captchaInstruction: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  captchaInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  captchaInput: {
    flex: 1,
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    paddingHorizontal: 15,
    fontSize: 16,
    marginRight: 10,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e9ecef',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
  },
  refreshText: {
    fontSize: 14,
    color: Colors.primary,
    marginLeft: 5,
  },
  refreshTextDisabled: {
    color: '#999',
  },
  loginButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  loginButtonGradient: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  forgotPasswordContainer: {
    alignItems: 'center',
  },
  forgotPasswordText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
});

export default LoginScreen;