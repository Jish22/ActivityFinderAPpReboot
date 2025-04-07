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
import * as ImagePicker from "expo-image-picker";
import { createOrganization } from "../services/organizationService";
import { auth } from "../services/firebaseConfig";
import AntDesign from '@expo/vector-icons/AntDesign';

const CreateOrganizationScreen = ({ navigation }: any) => {
  const [orgName, setOrgName] = useState("");
  const [bio, setBio] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePickImage = async () => {
    const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "We need access to your photos to upload a profile picture."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets.length > 0) {
      setProfileImage(result.assets[0].uri);
    }
  };

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
        profileImage,
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

        <TouchableOpacity onPress={handlePickImage} style={styles.imageContainer}>
          <Image
            source={
              profileImage
                ? { uri: profileImage }
                : require("../assets/adaptive-icon.png")
            }
            style={styles.profileImage}
          />
          <Text style={styles.imageText}>Upload Profile Image</Text>
        </TouchableOpacity>

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
});

export default CreateOrganizationScreen;