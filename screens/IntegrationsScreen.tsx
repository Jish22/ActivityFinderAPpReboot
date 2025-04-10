import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from "react-native";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { saveIntegration } from "../services/integrationService"; 
import AntDesign from "@expo/vector-icons/AntDesign";

const db = getFirestore();

const IntegrationsScreen = ({ navigation, route }: { navigation: any; route: any }) => {
  const { orgId } = route.params;

  const [searchText, setSearchText] = useState("");
  const [discordServers, setDiscordServers] = useState<any[]>([]);
  const [selectedServer, setSelectedServer] = useState<any>(null);
  const [discordChannelId, setDiscordChannelId] = useState("");
  const [groupMeBotId, setGroupMeBotId] = useState("");
  const [slackWebhookUrl, setSlackWebhookUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [existingIntegration, setExistingIntegration] = useState<any>(null);

  useEffect(() => {
    const fetchIntegrations = async () => {
      try {
        const integrationDoc = await getDoc(doc(db, "integrations", orgId));
        if (integrationDoc.exists()) {
          const data = integrationDoc.data();
          setExistingIntegration(data);

          if (data.discord) {
            setSelectedServer({
              guildId: data.discord.guildId,
              guildName: data.discord.guildName,
            });
            setDiscordChannelId(data.discord.channelId);
          }

          if (data.groupme) {
            setGroupMeBotId(data.groupme.botId);
          }

          if (data.slack) {
            setSlackWebhookUrl(data.slack.webhookUrl);
          }
        }
      } catch (error) {
        console.error("Error loading existing integrations:", error);
      }
    };

    fetchIntegrations();
  }, [orgId]);

  const searchDiscordServers = async () => {
    try {
      const q = query(
        collection(db, "discordServers"),
        where("guildName", ">=", searchText),
        where("guildName", "<=", searchText + "\uf8ff")
      );
      const querySnapshot = await getDocs(q);
      const servers: any[] = [];
      querySnapshot.forEach((doc) => {
        servers.push(doc.data());
      });
      setDiscordServers(servers);
    } catch (error) {
      console.error("Error searching Discord servers:", error);
      Alert.alert("Error", "Failed to search Discord servers.");
    }
  };

  useEffect(() => {
    if (searchText.trim().length > 0) {
      searchDiscordServers();
    } else {
      setDiscordServers([]);
    }
  }, [searchText]);

  const handleSaveGroupMeIntegration = async () => {
    if (!groupMeBotId) return;

    await saveIntegration(orgId, {
      groupme: {
        botId: groupMeBotId,
        addedAt: new Date().toISOString(),
      },
    });
  };

  const handleSaveDiscordIntegration = async () => {
    if (!selectedServer || !discordChannelId) {
      Alert.alert("Error", "Please select a Discord server and enter the channel ID.");
      return;
    }
    await saveIntegration(orgId, {
      discord: {
        guildId: selectedServer.guildId,
        guildName: selectedServer.guildName,
        channelId: discordChannelId,
        addedAt: new Date().toISOString(),
      },
    });
  };

  const handleSaveSlackIntegration = async () => {
    if (!slackWebhookUrl) return;

    await saveIntegration(orgId, {
      slack: {
        webhookUrl: slackWebhookUrl,
        addedAt: new Date().toISOString(),
      },
    });
  };

  const handleSaveIntegrations = async () => {
    setLoading(true);
    try {
      if (selectedServer && discordChannelId) {
        await handleSaveDiscordIntegration();
      }
      if (groupMeBotId) {
        await handleSaveGroupMeIntegration();
      }
      if (slackWebhookUrl) {
        await handleSaveSlackIntegration();
      }
      Alert.alert("Success", "Integration(s) saved!");
      navigation.goBack();
    } catch (error) {
      console.error("Error saving integrations:", error);
      Alert.alert("Error", "Failed to save integrations.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <AntDesign name="arrowleft" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Integrations</Text>
        <TouchableOpacity
          style={styles.helpIcon}
          onPress={() => navigation.navigate("HelpIntegrationsScreen")}
        >
          <AntDesign name="question" size={24} color="black" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.sectionTitle}>Discord Integration</Text>
        <TextInput
          style={styles.input}
          placeholder="Search Discord Server by Name"
          value={searchText}
          onChangeText={setSearchText}
          autoCapitalize="none"
        />
        {discordServers.map((server) => (
          <TouchableOpacity
            key={server.guildId}
            style={[
              styles.serverItem,
              selectedServer?.guildId === server.guildId && styles.selectedServerItem,
            ]}
            onPress={() => setSelectedServer(server)}
          >
            <Text style={styles.serverName}>{server.guildName}</Text>
          </TouchableOpacity>
        ))}
        {selectedServer && (
          <>
            <Text style={styles.selectedServerLabel}>
              Selected Server: {selectedServer.guildName}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Enter Discord Channel ID"
              value={discordChannelId}
              onChangeText={setDiscordChannelId}
              autoCapitalize="none"
            />
          </>
        )}

        <Text style={styles.sectionTitle}>GroupMe Integration</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter GroupMe Bot ID"
          value={groupMeBotId}
          onChangeText={setGroupMeBotId}
          autoCapitalize="none"
        />

        <Text style={styles.sectionTitle}>Slack Integration</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter Slack Webhook URL"
          value={slackWebhookUrl}
          onChangeText={setSlackWebhookUrl}
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSaveIntegrations}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? "Saving..." : "Save Integration"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  container: { padding: 16, flexGrow: 1, justifyContent: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
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
  },
  helpIcon: {
    padding: 8,
  },
  sectionTitle: { fontSize: 20, fontWeight: "600", marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  serverItem: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedServerItem: {
    backgroundColor: "#256E51",
  },
  serverName: {
    fontSize: 16,
    color: "#000000",
  },
  selectedServerLabel: {
    fontSize: 16,
    marginBottom: 16,
    color: "#256E51",
    textAlign: "center",
  },
  saveButton: {
    backgroundColor: "#256E51",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default IntegrationsScreen;