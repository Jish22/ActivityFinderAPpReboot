import React from "react";
import {
  View,
  Text,
  Image, 
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";

type NavigationType = {
  navigate: (screen: string) => void;
};

const WelcomeScreen = ({ navigation }: { navigation: NavigationType }) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
      <View style={styles.logoContainer}>
          <Image 
            source={require("../assets/activityfinderpfp.png")} 
            style={styles.logo} 
            resizeMode="contain" 
          />
        </View>
        <View style={styles.contentContainer}>
          <View style={styles.textContainer}>
            <Text style={styles.title}>Let's Get Started</Text>
            <Text style={styles.subtitle}>One App For All of Campus</Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => navigation.navigate("LoginScreen")}
            >
              <Text style={styles.loginButtonText}>Login</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.signupButton}
              onPress={() => navigation.navigate("SignupScreen")}
            >
              <Text style={styles.signupButtonText}>Signup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#256E51",
  },
  container: {
    flex: 1,
    backgroundColor: "#256E51",
  },
  contentContainer: {
    flex: 1,
    padding: 24,
    justifyContent: "flex-end",
  },
  textContainer: {
    marginBottom: 32,
  },
  title: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: "rgba(255, 255, 255, 0.9)",
  },
  buttonContainer: {
    gap: 16,
    marginBottom: 16,
  },
  loginButton: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  loginButtonText: {
    color: "#256E51",
    fontSize: 16,
    fontWeight: "600",
  },
  logoContainer: {
    marginBottom: 32, 
    alignItems: "center",
  },
  logo: {
    width: 520, 
    height: 520,
  },
  signupButton: {
    backgroundColor: "transparent",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  signupButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default WelcomeScreen;