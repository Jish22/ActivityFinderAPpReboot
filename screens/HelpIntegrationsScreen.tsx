// src/screens/HelpIntegrationsScreen.tsx

import React from "react";
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, Linking } from "react-native";
import AntDesign from "@expo/vector-icons/AntDesign";

const HelpIntegrationsScreen = ({ navigation }: { navigation: any }) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <AntDesign name="arrowleft" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Integration Help</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.sectionTitle}>Discord Integration</Text>
        <Text style={styles.text}>
          1. Copy the link below to invite the Discord bot to your server. {"\n"}
          2. Grant permissions to manage channels and send messages.{"\n"}
          3. Copy the Channel ID and paste it into the integration page.
        </Text>
        <TouchableOpacity
          onPress={() =>
            Linking.openURL(
              "https://discord.com/oauth2/authorize?client_id=1352347520365498480&permissions=149504&integration_type=0&scope=bot"
            )
          }
          style={styles.linkButton}
        >
          <Text style={styles.linkText}>Invite Discord Bot</Text>
        </TouchableOpacity>
        

        <Text style={styles.sectionTitle}>GroupMe Integration</Text>
        <Text style={styles.text}>
          1. Create a GroupMe bot via{" "}
          <Text style={styles.link}>https://dev.groupme.com/bots</Text>.{"\n"}
          2. Copy the Bot ID and paste it into the integration page.
          {"\n\n"}⚠️ **Note:** GroupMe does not support sending images.
        </Text>

        <Text style={styles.sectionTitle}>Slack Integration</Text>
        <Text style={styles.text}>
          1. Create an Incoming Webhook in Slack. Instructions here:{" "}
          <Text style={styles.link}>https://api.slack.com/messaging/webhooks</Text>.{"\n"}
          {"\n"}
          2. Copy the Webhook URL and paste it into the integration page.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  container: { padding: 16 },
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
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 24,
    marginBottom: 8,
    color: "#256E51",
  },
  text: {
    fontSize: 16,
    color: "#333333",
    marginBottom: 16,
  },
  link: {
    color: "#256E51",
    textDecorationLine: "underline",
  },
  linkButton: {
    backgroundColor: "#256E51",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  linkText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default HelpIntegrationsScreen;