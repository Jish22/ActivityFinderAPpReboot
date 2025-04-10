import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Alert,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { ORG_AVATAR_IMAGES } from "../constants/constants";
import { createOrganization } from "../services/organizationService";
import { auth } from "../services/firebaseConfig";
import AntDesign from '@expo/vector-icons/AntDesign';

const CreateOrganizationScreen = ({ navigation }: any) => {
  const [orgName, setOrgName] = useState("");
  const [bio, setBio] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState("default-org-avatar.png");

  const handleCreateOrganization = async () => {
    if (!orgName || !bio) {
      Alert.alert("Error", "Please fill in all required fields.");
      return;
    }

    const userId = auth.currentUser?.uid;
    if (!userId) {
      Alert.alert("Error", "User not authenticated.");
      return;
    }

    setLoading(true);

    try {
      const orgData = {
        name: orgName,
        bio,
        profileImage: selectedAvatar, 
        admins: [userId],
        members: [userId],
        superAdmin: userId,
        events: [],
        pendingMembers: [],
      };

      await createOrganization(orgData, userId);
      Alert.alert("Success", "Organization created successfully!");
      navigation.goBack();
    } catch (error) {
      Alert.alert("Error", "Failed to create organization.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <AntDesign name="arrowleft" size={24} color="black" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Organization</Text>
        </View>

        <View style={styles.avatarScrollContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {Object.keys(ORG_AVATAR_IMAGES).map((filename) => (
              <TouchableOpacity
                key={filename}
                onPress={() => setSelectedAvatar(filename)}
                style={[
                  styles.avatarOption,
                  selectedAvatar === filename && styles.avatarSelected,
                ]}
              >
                <Image source={ORG_AVATAR_IMAGES[filename]} style={styles.avatarImage} />
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={styles.imageText}>Choose an Organization Avatar</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Organization Name</Text>
          <TextInput
            value={orgName}
            onChangeText={setOrgName}
            style={styles.input}
            placeholder="Enter organization name"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Bio</Text>
          <TextInput
            value={bio}
            onChangeText={setBio}
            style={[styles.input, styles.textArea]}
            placeholder="Enter bio"
            multiline
            numberOfLines={4}
          />
        </View>

        <TouchableOpacity
          style={[styles.createButton, loading && styles.buttonDisabled]}
          onPress={handleCreateOrganization}
          disabled={loading}
        >
          <Text style={styles.createButtonText}>
            {loading ? "Creating..." : "Create Organization"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
    padding: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "600",
    marginLeft: 8,
  },
  imageContainer: {
    alignItems: "center",
    marginVertical: 24,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 8,
  },
  imageText: {
    color: "#256E51",
    fontSize: 14,
    fontWeight: "600",
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  createButton: {
    backgroundColor: "#256E51",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  createButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    backgroundColor: "#A0AEC0",
  },
  avatarScrollContainer: {
    alignItems: "center",
    marginVertical: 16,
  },
  avatarOption: {
    marginHorizontal: 8,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "transparent",
  },
  avatarSelected: {
    borderColor: "#256E51",
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
});

export default CreateOrganizationScreen;