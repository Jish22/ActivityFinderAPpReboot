import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Alert,
  StyleSheet,
  ScrollView,
  Platform,
  TouchableOpacity,
  SafeAreaView,
  Button,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { createEvent, getUserProfile } from "../services/eventService";
import { Picker } from "@react-native-picker/picker";
import { auth } from "../services/firebaseConfig";
import { getOrganizations, getOrganizationDetails } from "../services/organizationService";
import { INTEREST_CATEGORIES } from "../constants/constants";
import AntDesign from '@expo/vector-icons/AntDesign';
import * as DocumentPicker from "expo-document-picker";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

const EventCreationScreen = ({ navigation }: any) => {
  // Keeping all existing state
  const [eventName, setEventName] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [location, setLocation] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [discovery, setDiscovery] = useState("Public");
  const [userOrganizations, setUserOrganizations] = useState<any[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [integrationPlatforms, setIntegrationPlatforms] = useState<string[]>([]);
  const [file, setFile] = useState<any>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);


  // Keeping all existing useEffect and functions
  useEffect(() => {
    const fetchUserData = async () => {
      const userId = auth.currentUser?.uid;
      if (!userId) return;
      const userProfile = await getUserProfile(userId);

      if (userProfile?.joinedOrganizations) {
        const orgs = await getOrganizations();
        const userOrgs = orgs.filter((org: any) =>
          userProfile.joinedOrganizations.includes(org.id)
        );
        setUserOrganizations(userOrgs);
      }
    };

    fetchUserData();
  }, []);

  const handleAddCategory = () => {
    if (selectedCategory && !categories.includes(selectedCategory)) {
      setCategories([...categories, selectedCategory]);
    }
  };

    // Toggle integration selection
  const toggleIntegration = (platform: string) => {
      setIntegrationPlatforms((prev) =>
        prev.includes(platform)
          ? prev.filter((item) => item !== platform)
          : [...prev, platform]
      );
    };

  const handleCreateEvent = async () => {
    if (!eventName || !description || !date || !startTime || !endTime || !location) {
      Alert.alert("Error", "Please fill in all required fields.");
      return;
    }
  
    const now = new Date(); // Current date & time
    const selectedDate = new Date(date);
  
    // Parse start and end time
    const startDateTime = new Date(startTime);
    const endDateTime = new Date(endTime);
  
    // Set selected date on the times to keep the correct day
    startDateTime.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    endDateTime.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
  
    if (startDateTime < now) {
      Alert.alert("Invalid Start Time", "The event cannot be scheduled in the past.");
      return;
    }
  
    if (endDateTime <= startDateTime) {
      Alert.alert("Invalid End Time", "The end time must be after the start time.");
      return;
    }
  
    setLoading(true);
  
    const userId = auth.currentUser?.uid;
    if (!userId) {
      Alert.alert("Error", "User not authenticated.");
      return;
    }
  
    let hostedByOrg = selectedOrg; 
    let formattedDiscovery = discovery.toLowerCase();
    let orgProfileImage = "";

    if (hostedByOrg) {
      try {
        const org = await getOrganizationDetails(hostedByOrg);
        orgProfileImage = org?.profileImage || "";
      } catch (error) {
        console.error("Failed to fetch org profile image:", error);
      }
    } else {
      try {
        const userProfile = await getUserProfile(userId);
        orgProfileImage = userProfile?.profileImage || "";
      } catch (error) {
        console.error("Failed to fetch user profile image:", error);
      }
    }
  
    const eventData = {
      name: eventName,
      description,
      date: date.toISOString().split("T")[0],
      startTime: startDateTime.toISOString(), 
      endTime: endDateTime.toISOString(),
      location,
      categories,
      createdBy: userId,
      attendees: hostedByOrg ? [] : [userId],
      attendeesCount: hostedByOrg ? 0 : 1,
      hostedByOrg,
      discovery: formattedDiscovery,
      integrationPlatforms: integrationPlatforms || [],
      fileUrl: fileUrl || null, 
      orgProfileImage, 
    };
  
    try {
      const eventId = await createEvent(eventData);
      Alert.alert("Success", `Event ${hostedByOrg ? "submitted for approval" : "created"}!`);
      navigation.goBack();
    } catch (error) {
      Alert.alert("Error", "Failed to create event.");
    } finally {
      setLoading(false);
    }
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*", // Accept any file type
      });
  
      if (result.canceled || !result.assets?.length) {
        console.log("File selection cancelled.");
        return;
      }
  
      const pickedFile = result.assets[0];
      setFile(pickedFile);
      await uploadFileToFirebase(pickedFile);
    } catch (error) {
      console.error("Error picking file:", error);
      Alert.alert("Error", "Failed to pick file.");
    }
  };

  const uploadFileToFirebase = async (file: any) => {
    if (!file.uri) return;
  
    const response = await fetch(file.uri);
    const blob = await response.blob();
    const storage = getStorage();
    const fileRef = ref(storage, `event_files/${Date.now()}_${file.name}`);
    
    const uploadTask = uploadBytesResumable(fileRef, blob);
  
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log(`Upload is ${progress.toFixed(2)}% done`);
      },
      (error) => {
        console.error("File upload failed:", error);
        Alert.alert("Error", "Failed to upload file.");
      },
      async () => {
        const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
        setFileUrl(downloadUrl);
        console.log("File available at:", downloadUrl);
      }
    );
  };

  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minutes = 0; minutes < 60; minutes += 15) { // 15-min interval
        const formattedTime = new Date(2023, 0, 1, hour, minutes)
          .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        times.push(formattedTime);
      }
    }
    return times;
  };

  const generateDateOptions = () => {
    const options = [];
    const today = new Date();
    
    for (let i = 0; i < 30; i++) { // Next 30 days
      const date = new Date();
      date.setDate(today.getDate() + i);
      
      options.push({
        label: date.toDateString(), // Example: "Tue Feb 27 2024"
        value: date.toISOString(), // Store in ISO format for accuracy
      });
    }
    
    return options;
  };

  const removeCategory = (category: string) => {
    setCategories(categories.filter(cat => cat !== category));
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
          <Text style={styles.headerTitle}>Create Event</Text>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.formSection}>
            <Text style={styles.label}>Event Name</Text>
            <TextInput 
              value={eventName} 
              onChangeText={setEventName} 
              style={styles.input}
              placeholder="Enter event name"
            />
          </View>

          <View style={styles.formSection}>
            <Text style={styles.label}>Attach a File (Optional)</Text>
            <TouchableOpacity style={styles.fileButton} onPress={handlePickFile}>
              <Text style={styles.fileButtonText}>
                {file ? `Selected: ${file.name}` : "Choose File"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.label}>Description</Text>
            <TextInput 
              value={description} 
              onChangeText={setDescription} 
              style={[styles.input, styles.textArea]} 
              multiline
              numberOfLines={4}
              placeholder="Describe your event"
            />
          </View>

          {/* ✅ Date Picker */}
          <View style={styles.formSection}>
            <Text style={styles.label}>Date</Text>
            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateTimeButton}>
              <Text style={styles.dateTimeText}>{date.toDateString()}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === "ios" ? "inline" : "default"}
                themeVariant="light" // Forces light theme
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) setDate(selectedDate);
                }}
              />
            )}
          </View>

          <View style={styles.formSection}>
            <Text style={styles.label}>Start Time</Text>
            <Button title={startTime.toLocaleTimeString()} onPress={() => setShowStartTimePicker(true)} />
            
            {showStartTimePicker && (
              <View>
                <DateTimePicker
                  value={startTime}
                  mode="time"
                  is24Hour={false}
                  display="spinner"
                  themeVariant="light"
                  onChange={(event, selectedTime) => {
                    if (selectedTime) setStartTime(selectedTime);
                    if (Platform.OS !== "ios") setShowStartTimePicker(false); // ✅ Auto-close on Android only
                  }}
                />
                
                {Platform.OS === "ios" && (
                  <Button title="Done" onPress={() => setShowStartTimePicker(false)} />
                )}
              </View>
            )}
          </View>

          <View style={styles.formSection}>
            <Text style={styles.label}>End Time</Text>
            <Button title={endTime.toLocaleTimeString()} onPress={() => setShowEndTimePicker(true)} />
            
            {showEndTimePicker && (
              <View>
                <DateTimePicker
                  value={endTime}
                  mode="time"
                  is24Hour={false}
                  display="spinner"
                  themeVariant="light"
                  onChange={(event, selectedTime) => {
                    if (selectedTime) setEndTime(selectedTime);
                    if (Platform.OS !== "ios") setShowEndTimePicker(false); // ✅ Auto-close on Android only
                  }}
                />
                
                {Platform.OS === "ios" && (
                  <Button title="Done" onPress={() => setShowEndTimePicker(false)} />
                )}
              </View>
            )}
          </View>

          <View style={styles.formSection}>
            <Text style={styles.label}>Location</Text>
            <TextInput 
              value={location} 
              onChangeText={setLocation} 
              style={styles.input}
              placeholder="Enter location"
            />
          </View>

          <View style={styles.formSection}>
            <Text style={styles.label}>Categories</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedCategory}
                onValueChange={(itemValue) => setSelectedCategory(itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="Select a category" value="" />
                {INTEREST_CATEGORIES.map((category) => (
                  <Picker.Item key={category} label={category} value={category} color="black" />
                ))}
              </Picker>
            </View>
            
            <TouchableOpacity 
              style={styles.addCategoryButton}
              onPress={handleAddCategory}
            >
              <AntDesign name="plus" size={20} color="#FFFFFF" style={styles.buttonIcon} />
              <Text style={styles.addCategoryButtonText}>Add Category</Text>
            </TouchableOpacity>

            {categories.length > 0 && (
              <View style={styles.categoriesContainer}>
                {categories.map((category) => (
                  <View key={category} style={styles.categoryTag}>
                    <Text style={styles.categoryText}>{category}</Text>
                    <TouchableOpacity onPress={() => removeCategory(category)}>
                      <AntDesign name="close" size={16} color="#256E51" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.formSection}>
            <Text style={styles.label}>Discovery</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedOrg ? JSON.stringify({ id: selectedOrg, type: discovery }) : "public"}
                onValueChange={(itemValue) => {
                  if (itemValue === "public") {
                    setDiscovery("public");
                    setSelectedOrg(null);
                  } else {
                    try {
                      const parsedValue = JSON.parse(itemValue); 
                      setDiscovery(parsedValue.type); 
                      setSelectedOrg(parsedValue.id); 
                    } catch (error) {
                      console.error("Error parsing organization selection:", error);
                    }
                  }
                }}
                style={styles.picker}
              >
                <Picker.Item label="Public (Everyone)" value="public" color="black" />

                {userOrganizations.map((org) => (
                  <Picker.Item
                    key={`${org.id}-public`}
                    label={`${org.name} (Public)`}
                    value={JSON.stringify({ id: org.id, type: "public" })}
                    color="black"
                  />
                ))}
                {userOrganizations.map((org) => (
                  <Picker.Item
                    key={`${org.id}-private`}
                    label={`${org.name} (Private)`}
                    value={JSON.stringify({ id: org.id, type: "private" })}
                    color="black"
                  />
                ))}
              </Picker>
            </View>
          </View>

          {selectedOrg && (
            <View style={styles.formSection}>
              <Text style={styles.label}>Send Event Notification to:</Text>
              <View style={styles.integrationOptionsContainer}>
                <TouchableOpacity
                  style={[
                    styles.integrationOption,
                    integrationPlatforms.includes("discord") && styles.integrationOptionSelected,
                  ]}
                  onPress={() => toggleIntegration("discord")}
                >
                  <Text style={[
                    styles.integrationOptionText,
                    integrationPlatforms.includes("discord") && styles.integrationOptionTextSelected,
                  ]}>Discord</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.integrationOption,
                    integrationPlatforms.includes("slack") && styles.integrationOptionSelected,
                  ]}
                  onPress={() => toggleIntegration("slack")}
                >
                  <Text style={[
                    styles.integrationOptionText,
                    integrationPlatforms.includes("slack") && styles.integrationOptionTextSelected,
                  ]}>Slack</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.integrationOption,
                    integrationPlatforms.includes("groupme") && styles.integrationOptionSelected,
                  ]}
                  onPress={() => toggleIntegration("groupme")}
                >
                  <Text style={[
                    styles.integrationOptionText,
                    integrationPlatforms.includes("groupme") && styles.integrationOptionTextSelected,
                  ]}>GroupMe</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <TouchableOpacity 
            style={[styles.createButton, loading && styles.createButtonDisabled]}
            onPress={handleCreateEvent}
            disabled={loading}
          >
            <Text style={styles.createButtonText}>
              {loading ? "Creating..." : "Create Event"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
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
  fileButton: {
    backgroundColor: "#F0F9F6",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#256E51",
  },
  fileButtonText: {
    color: "#256E51",
    fontSize: 16,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  formSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
    color: "#000000",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#000000",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  dateTimeButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 8,
    padding: 12,
  },
  dateTimeIcon: {
    marginRight: 8,
  },
  dateTimeText: {
    fontSize: 16,
    color: "#000000",
  },
  doneButton: {
    backgroundColor: "#256E51",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  doneButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 8,
    marginBottom: 12,
  },
  picker: {
    color: "#000000",
  },
  addCategoryButton: {
    backgroundColor: "#256E51",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  buttonIcon: {
    marginRight: 8,
  },
  addCategoryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  categoriesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F9F6",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 8,
  },
  categoryText: {
    color: "#256E51",
    fontSize: 14,
    fontWeight: "500",
  },
  createButton: {
    backgroundColor: "#256E51",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
    marginBottom: 32,
  },
  createButtonDisabled: {
    backgroundColor: "#A0AEC0",
  },
  createButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  integrationOptionsContainer: { flexDirection: "row", justifyContent: "space-around", marginTop: 8 },
  integrationOption: { borderWidth: 1, borderColor: "#256E51", borderRadius: 8, padding: 8 },
  integrationOptionSelected: { backgroundColor: "#256E51" },
  integrationOptionText: { fontSize: 16, color: "#256E51" },
  integrationOptionTextSelected: { color: "#FFFFFF" },

});

export default EventCreationScreen;