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
import { INTEREST_CATEGORIES } from "../constants/constants";
import { signOut } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"; // Import Firebase Storage
// import uuid from "react-native-uuid"; 
// import { arrowleft } from "@expo/vector-icons";
import AntDesign from '@expo/vector-icons/AntDesign';
import { v4 as uuidv4 } from 'uuid';


const ProfileSetupScreen = ({ navigation }: any) => {
  // Keeping all the existing state and functions
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  // const [gender, setGender] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [email, setEmail] = useState(auth.currentUser?.email || ""); // ✅ Fetch user email
  const [netID, setNetID] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [interests, setSelectedInterests] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  // Keeping all the existing useEffect and functions
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
        // setGender(userProfile.gender || "");
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


  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  
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
      const selectedImage = result.assets[0].uri;
      await uploadImageToFirebase(selectedImage);
    }
  };
  
  const uploadImageToFirebase = async (imageUri: string) => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;
  
    const storage = getStorage();
    const imageId = uuidv4(); // Generate a unique image name
    const storageRef = ref(storage, `profile_pictures/${userId}/${imageId}.jpg`);
  
    try {
      // 🔥 Ensure the image is converted to a BLOB correctly
      const response = await fetch(imageUri);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
  
      const blob = await response.blob(); // Convert to blob
  
      // 🔥 Upload the blob
      const snapshot = await uploadBytes(storageRef, blob);
      // console.log("Upload successful:", snapshot);
  
      // 🔥 Get download URL after upload
      const downloadURL = await getDownloadURL(storageRef);
      setProfileImage(downloadURL); // Update state with the URL
  
      // console.log("Image uploaded, download URL:", downloadURL);
      return downloadURL;
    } catch (error) {
      console.error("Error uploading image:", error);
      Alert.alert("Error", "Failed to upload image. Please try again.");
      return null;
    }
  };


  const handleSaveProfile = async () => {
    // Keeping existing save profile logic
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

    const defaultAvatarUrl = "https://firebasestorage.googleapis.com/v0/b/activityfinderapp-7ba1e.firebasestorage.app/o/default-avatar.png?alt=media&token=8c3ad483-e787-4900-9a4c-85d0b1868f3c"

    const profileData = {
      firstName,
      lastName,
      fullName,
      // gender,
      graduationYear,
      email,
      netID,
      profileImage: profileImage || defaultAvatarUrl,
      interests,
      pendingFriendRequests: [],
      friends: [],
      joinedOrganizations:[]
    };

    try {
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
          <TouchableOpacity onPress={handlePickImage}>
          <Image
              source={{
                uri: profileImage
                  ? profileImage
                  : "https://firebasestorage.googleapis.com/v0/b/your-project-id.appspot.com/o/default-avatar.png?alt=media",
              }}
            style={styles.profileImage}
            />
            <View style={styles.editBadge}>
              <Text style={styles.editBadgeText}>Edit</Text>
            </View>
          </TouchableOpacity>
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