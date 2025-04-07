import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  Alert,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  ScrollView,
} from "react-native";
import {
  getOrganizationDetails,
  promoteToAdmin,
  demoteAdmin,
  transferSuperAdmin,
  getUserFullName,
  updateOrganizationBio,
  leaveOrganization,
  updateOrganizationProfileImage,
} from "../services/organizationService";
import { getUserDetailsByUID } from "../services/firebaseConfig";
import { getEventDetails, deleteEvent, getPastEvents } from "../services/eventService";
import { auth } from "../services/firebaseConfig";
import AntDesign from '@expo/vector-icons/AntDesign';
import * as ImagePicker from "expo-image-picker";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from 'uuid';


const OrganizationProfileScreen = ({ route, navigation }: any) => {
  const { org } = route.params;
  const [organization, setOrganization] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userNetID, setUserNetID] = useState(auth.currentUser?.uid);
  const [adminNames, setAdminNames] = useState<{ [key: string]: string }>({});
  const [memberNames, setMemberNames] = useState<{ [key: string]: string }>({});
  const [eventDetails, setEventDetails] = useState<any[]>([]);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioText, setBioText] = useState("");
  const [adminImages, setAdminImages] = useState<{ [key: string]: string }>({});
  const [memberImages, setMemberImages] = useState<{ [key: string]: string }>({});
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"upcoming" | "past">("upcoming");
  const [pastEvents, setPastEvents] = useState<any[]>([]);
  

  useEffect(() => {
    const fetchOrganization = async () => {
      const orgDetails = await getOrganizationDetails(org.id);
      if (orgDetails) {
        setOrganization(orgDetails);
        setBioText(orgDetails.bio || "");
        setIsAdmin(orgDetails.admins.includes(userNetID ?? ""));
        setIsSuperAdmin(orgDetails.superAdmin === userNetID);
        setProfileImage(orgDetails.profileImage || null); 

  
        const adminPromises = orgDetails.admins.map(async (netID: string) => {
          const user = await getUserDetailsByUID(netID);
          const fullName = user?.fullName
          // const fullName = await getUserFullName(netID);
          const profileImage = user?.profileImage; 

          return { netID, fullName, profileImage };
        });
  
        const memberPromises = orgDetails.members.map(async (netID: string) => {
          const user = await getUserDetailsByUID(netID);

          const fullName = user?.fullName
          const profileImage = user?.profileImage; 

          return { netID, fullName, profileImage };
        });
  
        const adminResults = await Promise.all(adminPromises);
        const memberResults = await Promise.all(memberPromises);
  
        setAdminNames(Object.fromEntries(adminResults.map(({ netID, fullName }) => [netID, fullName])));
        setMemberNames(Object.fromEntries(memberResults.map(({ netID, fullName }) => [netID, fullName])));
  

        setAdminImages(Object.fromEntries(adminResults.map(({ netID, profileImage }) => [netID, profileImage])));
        setMemberImages(Object.fromEntries(memberResults.map(({ netID, profileImage }) => [netID, profileImage])));

        const eventPromises = orgDetails.events.map(async (eventId: string) => {
          const event = await getEventDetails(eventId);
          return event;
        });
  
        const events = await Promise.all(eventPromises);
        const now = new Date();
  
        const upcomingEvents = events
          .filter(
            (event) => event?.endTime && new Date(event.endTime).getTime() >= now.getTime()
          )
          .sort(
            (a, b) =>
              new Date(a.startTime ?? Number.MAX_SAFE_INTEGER).getTime() -
              new Date(b.startTime ?? Number.MAX_SAFE_INTEGER).getTime()
          );
  
        const pastEvents = events
          .filter(
            (event) => event?.endTime && new Date(event.endTime).getTime() < now.getTime()
          )
          .sort(
            (a, b) =>
              new Date(b.startTime ?? Number.MAX_SAFE_INTEGER).getTime() -
              new Date(a.startTime ?? Number.MAX_SAFE_INTEGER).getTime()
          );
  
        setEventDetails(upcomingEvents);
        setPastEvents(pastEvents);
      }
    };
  
    fetchOrganization();
  }, []);

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
      await uploadOrganizationImageToFirebase(selectedImage);
    }
  };
  
  const uploadOrganizationImageToFirebase = async (imageUri: string) => {
    if (!organization) return;
  
    const storage = getStorage();
    const imageId = uuidv4()
    const storageRef = ref(storage, `organization_pictures/${organization.id}/${imageId}.jpg`);
  
    try {
      const response = await fetch(imageUri);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
  
      const blob = await response.blob();
      const snapshot = await uploadBytes(storageRef, blob);
      // console.log("Upload successful:", snapshot);
  
      const downloadURL = await getDownloadURL(storageRef);
      setProfileImage(downloadURL); // ✅ Update state
  
      await updateOrganizationProfileImage(organization.id, downloadURL);
  
      Alert.alert("Success", "Organization profile picture updated!");
      return downloadURL;
    } catch (error) {
      console.error("Error uploading image:", error);
      Alert.alert("Error", "Failed to upload image. Please try again.");
      return null;
    }
  };

  const handlePromoteToAdmin = async (netID: string) => {
    try {
      await promoteToAdmin(organization.id, netID);
      setOrganization({ ...organization, admins: [...organization.admins, netID] });
      Alert.alert("Success", `${netID} has been promoted to admin.`);
    } catch (error) {
      Alert.alert("Error", (error as Error).message);
    }
  };

  const handleDemoteAdmin = async (netID: string) => {
    try {
      await demoteAdmin(organization.id, netID);
      setOrganization({
        ...organization,
        admins: organization.admins.filter((admin: string) => admin !== netID),
      });
      Alert.alert("Success", `${netID} has been demoted to member.`);
    } catch (error) {
      Alert.alert("Error", (error as Error).message);
    }
  };

  const handleTransferSuperAdmin = async (newSuperAdminID: string) => {
    try {
      if (userNetID) {
        await transferSuperAdmin(organization.id, newSuperAdminID, userNetID);
        setOrganization({ ...organization, superAdmin: newSuperAdminID });
      }
      Alert.alert("Success", `Super Admin role transferred to ${newSuperAdminID}.`);
    } catch (error) {
      Alert.alert("Error", (error as Error).message);
    }
  };

  const handleSaveBio = async () => {
    try {
      await updateOrganizationBio(organization.id, bioText);
      setIsEditingBio(false);
      setOrganization({ ...organization, bio: bioText });
      Alert.alert("Success", "Bio updated!");
    } catch (error) {
      Alert.alert("Error", "Failed to update bio.");
    }
  };

  if (!organization) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <AntDesign name="arrowleft" size={24} color="black" />
          </TouchableOpacity>
          {isAdmin && (
            <TouchableOpacity
              onPress={() => setIsEditingBio(true)}
              style={styles.editButton}
            >
              <AntDesign name="edit" size={24} color="black" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.profileSection}>
          <View style={styles.imageContainer}>
          <TouchableOpacity onPress={handlePickImage} disabled={!isAdmin}>
            <Image
            source={{
              uri: profileImage
                ? profileImage
                : "https://firebasestorage.googleapis.com/v0/b/activityfinderapp-7ba1e.firebasestorage.app/o/default-avatar.png?alt=media&token=8c3ad483-e787-4900-9a4c-85d0b1868f3c",
}}              style={styles.profileImage}
            />
            {isAdmin && (
              <View style={styles.editBadge}>
                <Text style={styles.editBadgeText}>Edit</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>            
        <Text style={styles.name}>{organization.name}</Text>
            
            {isEditingBio ? (
              <View style={styles.bioEditSection}>
                <TextInput
                  value={bioText}
                  onChangeText={setBioText}
                  style={styles.bioInput}
                  multiline
                  placeholder="Enter organization bio..."
                />
                <TouchableOpacity
                  style={styles.saveBioButton}
                  onPress={handleSaveBio}
                >
                  <Text style={styles.saveBioButtonText}>Save Bio</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.bio}>{organization.bio || "No bio yet"}</Text>
            )}
          </View>

          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                viewMode === "upcoming" && styles.tabButtonActive,
              ]}
              onPress={() => setViewMode("upcoming")}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  viewMode === "upcoming" && styles.tabButtonTextActive,
                ]}
              >
                Upcoming Events
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabButton,
                viewMode === "past" && styles.tabButtonActive,
              ]}
              onPress={() => setViewMode("past")}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  viewMode === "past" && styles.tabButtonTextActive,
                ]}
              >
                Past Events
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {viewMode === "upcoming" ? "Upcoming Events" : "Past Events"}
            </Text>
            {viewMode === "upcoming" && eventDetails.length > 0 ? (
              eventDetails.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.eventCard}
                  onPress={() => navigation.navigate("EventViewScreen", { event: item })}
                >
                  <Text style={styles.eventTitle}>{item.name}</Text>
                  <View style={styles.eventInfo}>
                    <AntDesign name="calendar" size={24} color="black" />
                    <Text style={styles.eventDetails}>
                      {new Date(item.date).toDateString()}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : viewMode === "past" && pastEvents.length > 0 ? (
              pastEvents.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.eventCard}
                  onPress={() => navigation.navigate("EventViewScreen", { event: item })}
                >
                  <Text style={styles.eventTitle}>{item.name}</Text>
                  <View style={styles.eventInfo}>
                    <AntDesign name="calendar" size={24} color="black" />
                    <Text style={styles.eventDetails}>
                      {new Date(item.date).toDateString()}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.noEventsText}>
                {viewMode === "upcoming"
                  ? "No upcoming events"
                  : "No past events"}
              </Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Admins</Text>
            {organization.admins.map((adminId: string) => (
              <View key={adminId} style={styles.memberCard}>
                      <Image
                    source={{
                      uri: adminImages[adminId] || "https://firebasestorage.googleapis.com/v0/b/your-project-id.appspot.com/o/default-avatar.png?alt=media",
                    }}
                    style={styles.profileImageSmall}
                  />
                <Text style={styles.memberName}>{adminNames[adminId] || "Loading..."}</Text>
                <View style={styles.memberActions}>
                  {isSuperAdmin && adminId !== userNetID && (
                    <>
                      <TouchableOpacity
                        style={styles.promoteButton}
                        onPress={() => handleTransferSuperAdmin(adminId)}
                      >
                        <Text style={styles.promoteButtonText}>Make Super Admin</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.demoteButton}
                        onPress={() => handleDemoteAdmin(adminId)}
                      >
                        <Text style={styles.demoteButtonText}>Demote</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            ))}
          </View>

          <View style={[styles.section, styles.lastSection]}>
            <Text style={styles.sectionTitle}>Members</Text>
            {organization.members
              .filter((member: string) => !organization.admins.includes(member))
              .map((memberId: string) => (
                <View key={memberId} style={styles.memberCard}>
                  <Image
                    source={{
                      uri: memberImages[memberId] || "https://firebasestorage.googleapis.com/v0/b/your-project-id.appspot.com/o/default-avatar.png?alt=media",
                    }}
                    style={styles.profileImageSmall}
                  />
                  <Text style={styles.memberName}>{memberNames[memberId] || "Loading..."}</Text>
                  {isAdmin && (
                    <TouchableOpacity
                      style={styles.promoteButton}
                      onPress={() => handlePromoteToAdmin(memberId)}
                    >
                      <Text style={styles.promoteButtonText}>Make Admin</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
          </View>

          {isAdmin && (
            <TouchableOpacity
              style={styles.integrationsButton}
              onPress={() => navigation.navigate("IntegrationsScreen", { orgId: organization.id })}
            >
              <Text style={styles.integrationsButtonText}>Add Integrations</Text>
            </TouchableOpacity>
          )}


          {(organization.members.includes(userNetID) || organization.admins.includes(userNetID)) && !isSuperAdmin && (
            <TouchableOpacity
              style={styles.leaveButton}
              onPress={async () => {
                Alert.alert("Confirm", "Are you sure you want to leave this organization?", [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Leave",
                    onPress: async () => {
                      if (!userNetID) {
                        Alert.alert("Error", "User is not authenticated.");
                        return;
                      }
                      try {
                        await leaveOrganization(organization.id, userNetID);
                        Alert.alert("Success", "You have left the organization.");
                        navigation.goBack();
                      } catch (error) {
                        Alert.alert("Error", (error as Error).message);
                      }
                    },
                    style: "destructive",
                  },
                ]);
              }}
            >
              <Text style={styles.leaveButtonText}>Leave Organization</Text>
            </TouchableOpacity>
          )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
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
  editButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  profileSection: {
    alignItems: "center",
    padding: 24,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 8,
    color: "#000000",
  },
  bio: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
    paddingHorizontal: 24,
  },
  bioEditSection: {
    width: "100%",
    paddingHorizontal: 24,
  },
  bioInput: {
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    textAlignVertical: "top",
    marginBottom: 12,
  },
  saveBioButton: {
    backgroundColor: "#256E51",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  saveBioButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  imageContainer: {
    alignItems: "center",
    marginBottom: 16,
    position: "relative",
  },
  editBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
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
  section: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
  },
  lastSection: {
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    color: "#000000",
  },
  eventCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#000000",
  },
  eventInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  eventDetails: {
    fontSize: 14,
    color: "#666666",
    marginLeft: 8,
  },
  profileImageSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  noEventsText: {
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
  },
  memberCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  memberName: {
    fontSize: 16,
    color: "#000000",
  },
  memberActions: {
    flexDirection: "row",
    gap: 8,
  },
  promoteButton: {
    backgroundColor: "#F0F9F6",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  promoteButtonText: {
    color: "#256E51",
    fontSize: 14,
    fontWeight: "500",
  },
  demoteButton: {
    backgroundColor: "#FEE2E2",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  demoteButtonText: {
    color: "#DC2626",
    fontSize: 14,
    fontWeight: "500",
  },
  leaveButton: {
    backgroundColor: "#FEE2E2",
    margin: 24,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  leaveButtonText: {
    color: "#DC2626",
    fontSize: 16,
    fontWeight: "600",
  },
  integrationsButton: {
    backgroundColor: "#256E51",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    margin: 24,
  },
  integrationsButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 12,
    paddingHorizontal: 24,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  tabButtonActive: {
    backgroundColor: "#256E51",
  },
  tabButtonText: {
    fontSize: 16,
    color: "#666",
  },
  tabButtonTextActive: {
    color: "#FFF",
    fontWeight: "600",
  },
});

export default OrganizationProfileScreen;