import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Alert,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import { saveUserProfile, getUserProfile } from "../services/firebaseConfig";
import { auth } from "../services/firebaseConfig";
import { INTEREST_CATEGORIES, AVATAR_IMAGES } from "../constants/constants";
import { signOut } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"; // Import Firebase Storage
import AntDesign from '@expo/vector-icons/AntDesign';
import { v4 as uuidv4 } from 'uuid';


const ProfileSetupScreen = ({ navigation }: any) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [email, setEmail] = useState(auth.currentUser?.email || ""); 
  const [netID, setNetID] = useState("");
  const [profileImage, setProfileImage] = useState<string>("default-avatar.png");
  const [interests, setSelectedInterests] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        console.error("User not logged in");
        return;
      }

      const userProfile = await getUserProfile(userId);
      if (userProfile) {
        setFirstName(userProfile.firstName || "");
        setLastName(userProfile.lastName || "");
        setGraduationYear(userProfile.graduationYear || "");
        setEmail(userProfile.email || "");
        setNetID(userProfile.netID || "");
        setProfileImage(userProfile.profileImage || null);
        setSelectedInterests(userProfile.interests || []);
      }

      if (auth.currentUser?.email) {
        setNetID(auth.currentUser.email.split("@")[0]);
      }
    };

    fetchProfile();
  }, []);

  // Keeping all the existing validation and handler functions
  const validateNetID = () => {
    if (!email.endsWith("@illinois.edu")) {
      setErrorMessage("Email must end with @illinois.edu.");
      return false;
    }
    if (!email.startsWith(netID)) {
      setErrorMessage("NetID must match the beginning of the email.");
      return false;
    }
    setErrorMessage("");
    return true;
  };

  const handleSaveProfile = async () => {
    if (!firstName || !lastName || !graduationYear) {
      Alert.alert("Error", "Please fill all required fields");
      return;
    }
  
    if (!validateNetID()) {
      Alert.alert("Error", errorMessage);
      return;
    }
  
    const userId = auth.currentUser?.uid;
    if (!userId) {
      Alert.alert("Error", "User not logged in");
      return;
    }
  
    const fullName = `${firstName} ${lastName}`.toLowerCase();
  
    try {
      const existingProfile = await getUserProfile(userId);
  
      const profileData = {
        firstName,
        lastName,
        fullName,
        graduationYear,
        email,
        netID,
        profileImage,
        interests,
        // ✅ Preserve existing arrays if user already exists
        pendingFriendRequests: existingProfile?.pendingFriendRequests ?? [],
        friends: existingProfile?.friends ?? [],
        joinedOrganizations: existingProfile?.joinedOrganizations ?? [],
      };
  
      await saveUserProfile(userId, profileData);
  
      Alert.alert("Success", "Profile saved successfully!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error: unknown) {
      console.error("Error saving profile:", error);
      if (error instanceof Error) {
        Alert.alert("Failed to save profile", error.message);
      }
    }
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((item) => item !== interest)
        : [...prev, interest]
    );
  };


  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigation.replace("WelcomeScreen"); // Redirect to Welcome screen after signing out
    } catch (error) {
      Alert.alert("Error", "Failed to sign out.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
          <AntDesign name="arrowleft" size={24} color="black" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
        </View>

        <View style={styles.imageContainer}>
          <TouchableOpacity onPress={() => navigation.navigate("AvatarPickerScreen", {
            selectedAvatar: profileImage,
            onSelect: (avatar: string) => setProfileImage(avatar),
          })}>
            <Image
              source={
                AVATAR_IMAGES[profileImage]
              }
              style={styles.profileImage}
            />
            <View style={styles.editBadge}>
              <Text style={styles.editBadgeText}>Edit</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 12 }}>
          <Text style={{ fontWeight: "600", fontSize: 16, marginBottom: 8 }}>Choose an Avatar</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {Object.keys(AVATAR_IMAGES).map((filename) => (
            <TouchableOpacity key={filename} onPress={() => setProfileImage(filename)}>
              <Image
                source={AVATAR_IMAGES[filename]}
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  margin: 8,
                  borderWidth: profileImage === filename ? 2 : 0,
                  borderColor: "#256E51"
                }}
              />
            </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>First Name*</Text>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              style={styles.input}
              placeholder="Enter your first name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Last Name*</Text>
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              style={styles.input}
              placeholder="Enter your last name"
            />
          </View>

          {/* <View style={styles.inputGroup}>
            <Text style={styles.label}>Gender*</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={gender}
                onValueChange={(itemValue) => setGender(itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="Select Gender" value="" />
                <Picker.Item label="Male" value="Male" />
                <Picker.Item label="Female" value="Female" />
                <Picker.Item label="Non-Binary" value="Non-Binary" />
              </Picker>
            </View>
          </View> */}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Graduation Year*</Text>
            <TextInput
              value={graduationYear}
              onChangeText={setGraduationYear}
              keyboardType="numeric"
              style={styles.input}
              placeholder="YYYY"
            />
          </View>

          {/* ✅ Email (Read-Only) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email*</Text>
            <TextInput value={email} style={styles.input} editable={false} placeholder="Email" />
          </View>

          {/* ✅ NetID (Read-Only) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>NetID*</Text>
            <TextInput value={netID} style={styles.input} editable={false} placeholder="NetID" />
          </View>

          <View style={styles.interestsSection}>
            <Text style={styles.label}>Select Interests</Text>
            <View style={styles.interestsGrid}>
              {INTEREST_CATEGORIES.map((interest) => (
                <TouchableOpacity
                  key={interest}
                  onPress={() => toggleInterest(interest)}
                  style={[
                    styles.interestButton,
                    interests.includes(interest) && styles.interestButtonSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.interestButtonText,
                      interests.includes(interest) && styles.interestButtonTextSelected,
                    ]}
                  >
                    {interest}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={styles.updateButton}
            onPress={handleSaveProfile}
          >
            <Text style={styles.updateButtonText}>Update Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
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
    fontSize: 20,
    fontWeight: "600",
    marginLeft: 16,
  },
  imageContainer: {
    alignItems: "center",
    marginTop: 24,
    marginBottom: 32,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  editBadge: {
    position: "absolute",
    right: -8,
    bottom: -8,
    backgroundColor: "#256E51",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  editBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "500",
  },
  form: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
    color: "#333333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 8,
    overflow: "hidden",
  },
  picker: {
    height: 50,
  },
  error: {
    color: "#FF3B30",
    fontSize: 12,
    marginTop: 4,
  },
  interestsSection: {
    marginBottom: 32,
  },
  interestsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  interestButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    backgroundColor: "#FFFFFF",
  },
  interestButtonSelected: {
    backgroundColor: "#256E51",
    borderColor: "#256E51",
  },
  interestButtonText: {
    color: "#333333",
    fontSize: 14,
  },
  interestButtonTextSelected: {
    color: "#FFFFFF",
  },
  updateButton: {
    backgroundColor: "#256E51",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  updateButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  signOutButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#000000",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  signOutButtonText: { color: "#000000", fontSize: 16, fontWeight: "600" },
});

export default ProfileSetupScreen;