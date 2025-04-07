import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, Alert, Text} from "react-native";
import { auth } from "../services/firebaseConfig"
import { onAuthStateChanged } from "firebase/auth";

const AuthLoadingScreen = ({ navigation }: any) => {
    useEffect(() => {
      console.log("AuthLoadingScreen mounted, auth is:", auth);
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        console.log("Auth state changed:", user);        if (user) {
          if (user.emailVerified) {
            navigation.replace("HomeScreen"); // Allow access
          } else {
            Alert.alert("Email not verified", "Please check your email for verification.");
            navigation.replace("WelcomeScreen"); // Redirect if not verified
          }
        } else {
          navigation.replace("WelcomeScreen"); // Redirect to login/signup
        }
      });
  
      return () => unsubscribe();
    }, []);
  
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text>Auth Screen Loaded</Text>
        <ActivityIndicator size="large" color="#256E51" />
      </View>
    );
};
  
export default AuthLoadingScreen;