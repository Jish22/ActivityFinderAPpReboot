import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Alert,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import {
  getAuth,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  onAuthStateChanged,
} from "firebase/auth";
import AntDesign from '@expo/vector-icons/AntDesign';

const SignupScreen = ({ navigation }: any) => {
  const auth = getAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        user.reload().then(() => {
          if (user.emailVerified) {
            setIsEmailVerified(true);
            navigation.replace("ProfileSetupScreen");
          } else {
            setIsEmailVerified(false);
          }
        });
      }
    });

    return () => unsubscribe();
  }, [auth, navigation]);

  const handleSignup = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert("Error", "All fields are required.");
      return;
    }

    if (email.substring(email.length - 13, email.length) != "@illinois.edu") {
      Alert.alert("Error", "Must be @illinois.edu email");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await sendEmailVerification(user);
      Alert.alert(
        "Verify Your Email",
        "A verification email has been sent to your email address. Please verify before logging in.",
        [{ text: "OK", onPress: () => navigation.replace("WelcomeScreen") }]
      );
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Signup error:", error);
        Alert.alert("Error", error.message);
      } else {
        console.error("Unexpected error:", error);
        Alert.alert("Error", "An unexpected error occurred.");
      }
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <AntDesign name="arrowleft" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Account</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.subtitle}>
            Please fill in the form to continue
          </Text>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrapper}>
                <AntDesign name="mail" size={20} color="#666666" style={styles.inputIcon} />
                <TextInput
                  placeholder="Enter your email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.input}
                  placeholderTextColor="#999999"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <AntDesign name="lock" size={20} color="#666666" style={styles.inputIcon} />
                <TextInput
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  style={styles.input}
                  placeholderTextColor="#999999"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <AntDesign
                    name={showPassword ? "eye" : "eyeo"}
                    size={20}
                    color="#666666"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.inputWrapper}>
                <AntDesign name="lock" size={20} color="#666666" style={styles.inputIcon} />
                <TextInput
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  style={styles.input}
                  placeholderTextColor="#999999"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeIcon}
                >
                  <AntDesign
                    name={showConfirmPassword ? "eye" : "eyeo"}
                    size={20}
                    color="#666666"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.signupButton}
              onPress={handleSignup}
            >
              <Text style={styles.signupButtonText}>Sign Up</Text>
            </TouchableOpacity>

            <View style={styles.loginPrompt}>
              <Text style={styles.loginPromptText}>
                Already have an account?{" "}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate("LoginScreen")}>
                <Text style={styles.loginLink}>Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "600",
    marginLeft: 8,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  subtitle: {
    fontSize: 16,
    color: "#666666",
    marginBottom: 32,
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
    color: "#333333",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333333",
  },
  eyeIcon: {
    padding: 8,
  },
  signupButton: {
    backgroundColor: "#256E51",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  signupButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  loginPrompt: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  loginPromptText: {
    fontSize: 14,
    color: "#666666",
  },
  loginLink: {
    fontSize: 14,
    color: "#256E51",
    fontWeight: "600",
  },
});

export default SignupScreen;