import React from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { useEffect } from "react";

import { createNativeStackNavigator } from "@react-navigation/native-stack";
import WelcomeScreen from "../screens/WelcomeScreen";
import SignupScreen from "../screens/SignupScreen";
import LoginScreen from "../screens/LoginScreen";
import HomeScreen from "../screens/HomeScreen";
import AuthLoadingScreen from "../screens/AuthLoadingScreen";
import CreateOrganizationScreen from "../screens/CreateOrganizationScreen";
import ProfileSetupScreen from "../screens/ProfileSetupScreen";
import AddFriendScreen from "../screens/AddFriendScreen";
import AddOrganizationScreen from "../screens/AddOrganizationScreen";
import EditEventScreen from "../screens/EditEventScreen";
import EventCreationScreen from "../screens/EventCreationScreen";
import FriendRequestsScreen from "../screens/FriendRequestsScreen";
import EventViewScreen from "../screens/EventViewScreen";
import HelpIntegrationsScreen from "../screens/HelpIntegrationsScreen";
import IntegrationsScreen from "../screens/IntegrationsScreen";
import OrganizationProfileScreen from "../screens/OrganizationProfileScreen";
import PreviewEventScreen from "../screens/PreviewEventScreen";

const Stack = createNativeStackNavigator();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const AppNavigator = () => {
  useEffect(() => {
    const registerForPushNotifications = async () => {
      if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== "granted") {
          console.log("❌ Failed to get push token for push notification!");
        } else {
          console.log("✅ Notification permissions granted");
        }
      } else {
        console.log("❌ Must use physical device for push notifications");
      }
    };

    registerForPushNotifications();
  }, []);
  return (
    <Stack.Navigator initialRouteName="AuthLoading" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AuthLoading" component={AuthLoadingScreen} />
      <Stack.Screen name="WelcomeScreen" component={WelcomeScreen} />
      <Stack.Screen name="LoginScreen" component={LoginScreen} />
      <Stack.Screen name="SignupScreen" component={SignupScreen} />
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
      <Stack.Screen name="CreateOrganizationScreen" component={CreateOrganizationScreen} />
      <Stack.Screen name="ProfileSetupScreen" component={ProfileSetupScreen} />
      <Stack.Screen name="AddFriendScreen" component={AddFriendScreen} />
      <Stack.Screen name="AddOrganizationScreen" component={AddOrganizationScreen} />
      <Stack.Screen name="EditEventScreen" component={EditEventScreen} />
      <Stack.Screen name="EventCreationScreen" component={EventCreationScreen} />
      <Stack.Screen name="FriendRequestsScreen" component={FriendRequestsScreen} />
      <Stack.Screen name="EventViewScreen" component={EventViewScreen} />
      <Stack.Screen name="HelpIntegrationsScreen" component={HelpIntegrationsScreen} />
      <Stack.Screen name="IntegrationsScreen" component={IntegrationsScreen} />
      <Stack.Screen name="OrganizationProfileScreen" component={OrganizationProfileScreen} />
      <Stack.Screen name="PreviewEventScreen" component={PreviewEventScreen} />

    </Stack.Navigator>
  );
};

export default AppNavigator;