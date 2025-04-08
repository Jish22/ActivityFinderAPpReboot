import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Image,
  SafeAreaView,
} from "react-native";
import { auth } from "../services/firebaseConfig";
import { getUserProfile, getEventDetails } from "../services/eventService";
import {
  approveEvent,
  declineEvent,
  approveMember,
  declineMember,
  getOrganizationDetails,
  getOrganizationPendingRequests,
} from "../services/organizationService";
import { acceptFriendRequest, declineFriendRequest } from "../services/friendService";
import Entypo from '@expo/vector-icons/Entypo';
import AntDesign from '@expo/vector-icons/AntDesign';
import { AVATAR_IMAGES } from "../constants/constants";



// Define interfaces for better type safety
interface OrganizationData {
  id: string;
  name: string;
  admins: string[];
  pendingMembers: string[];
  pendingEvents: string[];
}

const FriendRequestsScreen = ({ navigation }: any) => {
  const [friendRequests, setFriendRequests] = useState<string[]>([]);
  const [friendNames, setFriendNames] = useState<{ [key: string]: string }>({});
  const [orgRequests, setOrgRequests] = useState<OrganizationData[]>([]);
  const [eventNames, setEventNames] = useState<{ [key: string]: string }>({});
  const [friendImages, setFriendImages] = useState<{ [key: string]: string }>({});
  const [memberImages, setMemberImages] = useState<{ [key: string]: string }>({});

  const userNetID = auth.currentUser?.uid || "";

  // Helper function to fetch user data (full name & profile image)
  const fetchUserData = async (netIDs: string[]) => {
    const userDataPromises = netIDs.map(async (netID) => {
      const user = await getUserProfile(netID);
      return {
        netID,
        fullName: user?.fullName || "Unknown User",
        profileImage: user?.profileImage || "default-avatar.png",
      };
    });

    const userDataResults = await Promise.all(userDataPromises);
    
    return {
      names: Object.fromEntries(userDataResults.map(({ netID, fullName }) => [netID, fullName])),
      images: Object.fromEntries(userDataResults.map(({ netID, profileImage }) => [netID, profileImage])),
    };
  };

  useEffect(() => {
    const fetchRequests = async () => {
      if (!userNetID) return;

      const userProfile = await getUserProfile(userNetID);
      if (!userProfile) return;

      setFriendRequests(userProfile.pendingFriendRequests || []);

      // Fetch friend names & images
      const { names: friendNamesData, images: friendImagesData } = 
        await fetchUserData(userProfile.pendingFriendRequests);
      setFriendNames(friendNamesData);
      setFriendImages(friendImagesData);

      // Fetch organization details
      const userOrganizations = userProfile?.joinedOrganizations || [];
      const orgDetails = await Promise.all(
        userOrganizations
          .filter((orgId:string) => orgId)
          .map((orgId:string) => getOrganizationDetails(orgId))
      );

      // Filter orgs where the user is an admin
      const adminOrgs = orgDetails.filter((org) => org?.admins.includes(userNetID));

      // Fetch pending requests for admin orgs
      const orgRequestsData = await Promise.all(
        adminOrgs.map((org) => getOrganizationPendingRequests(org.id))
      );

      const finalOrgRequests = adminOrgs.map((org, index) => ({
        ...org,
        pendingMembers: orgRequestsData[index]?.pendingMembers || [],
        pendingEvents: orgRequestsData[index]?.pendingEvents || [],
      }));

      setOrgRequests(finalOrgRequests);

      // Fetch event names
      const eventIds = finalOrgRequests.flatMap((org) => org.pendingEvents || []);
      const eventNameResults = await Promise.all(
        eventIds.map(async (eventId) => {
          const eventDetails = await getEventDetails(eventId);
          return { eventId, name: eventDetails?.name || "Unknown Event" };
        })
      );
      setEventNames(Object.fromEntries(eventNameResults.map(({ eventId, name }) => [eventId, name])));

      // Fetch member names & images
      const pendingMembers = [...new Set(finalOrgRequests.flatMap((org) => org.pendingMembers || []))];
      const { names: memberNamesData, images: memberImagesData } = await fetchUserData(pendingMembers);

      setFriendNames((prevNames) => ({ ...prevNames, ...memberNamesData }));
      setMemberImages(memberImagesData);
    };

    fetchRequests();
  }, []);

  const handleApproveFriend = async (netID: string) => {
    if (!userNetID) {
      Alert.alert("Error", "User is not authenticated.");
      return;
    }
    await acceptFriendRequest(userNetID, netID);
    setFriendRequests(friendRequests.filter((id) => id !== netID));
    Alert.alert("Success", `${friendNames[netID] || netID} is now your friend.`);
  };

  const handleDeclineFriend = async (netID: string) => {
    if (!userNetID) {
      Alert.alert("Error", "User is not authenticated.");
      return;
    }
    await declineFriendRequest(userNetID, netID);
    setFriendRequests(friendRequests.filter((id) => id !== netID));
  };

  const handleApproveMember = async (orgId: string, netID: string) => {
    await approveMember(orgId, netID);
    setOrgRequests(
      orgRequests.map((org) =>
        org.id === orgId
          ? { ...org, pendingMembers: org.pendingMembers.filter((id: string) => id !== netID) }
          : org
      )
    );
  };

  const handleDeclineMember = async (orgId: string, netID: string) => {
    await declineMember(orgId, netID);
    setOrgRequests(
      orgRequests.map((org) =>
        org.id === orgId
          ? { ...org, pendingMembers: org.pendingMembers.filter((id: string) => id !== netID) }
          : org
      )
    );
  };

  const handleApproveEvent = async (orgId: string, eventId: string) => {
    await approveEvent(orgId, eventId);
    setOrgRequests(
      orgRequests.map((org) =>
        org.id === orgId
          ? { ...org, pendingEvents: org.pendingEvents.filter((id: string) => id !== eventId) }
          : org
      )
    );

  };

  const handleDeclineEvent = async (orgId: string, eventId: string) => {
    await declineEvent(orgId, eventId);
    setOrgRequests(
      orgRequests.map((org) =>
        org.id === orgId
          ? { ...org, pendingEvents: org.pendingEvents.filter((id: string) => id !== eventId) }
          : org
      )
    );
  };

  const handleEventPress = async (eventId: string) => {
    try {
      const eventData = await getEventDetails(eventId);
      if (eventData && eventData.id) {
        navigation.navigate("EventViewScreen", { event: eventData, fromFriendRequests: true });
      } else {
        Alert.alert("Error", "Event details could not be loaded.");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to fetch event details.");
    }
  };

  type SectionItem =
    | { type: "friend"; netID: string }
    | { type: "event"; orgId: string; eventId: string }
    | { type: "member"; orgId: string; netID: string }
    | { type: "empty"; message: string };

  const sections: { title: string; data: SectionItem[] }[] = [];

  // Add Friend Requests Section
  sections.push({
    title: "Friend Requests",
    data: friendRequests.length
      ? friendRequests.map((netID) => ({ type: "friend", netID }))
      : [{ type: "empty", message: "No pending friend requests." }],
  });

  // Add Organization Requests (Only for Admins)
  orgRequests.forEach((org) => {
    const clubData: SectionItem[] = [];

    if (org.pendingEvents.length > 0) {
      clubData.push(
        ...org.pendingEvents.map((eventId: string) => ({
          type: "event" as const, // Ensure type is recognized as a literal string
          orgId: org.id,
          eventId,
        }))
      );
    }

    if (org.pendingMembers.length > 0) {
      clubData.push(
        ...org.pendingMembers.map((netID: string) => ({
          type: "member" as const,
          orgId: org.id,
          netID,
        }))
      );
    }

    if (clubData.length === 0) {
      clubData.push({ type: "empty", message: "No pending activity." });
    }

    sections.push({
      title: org.name,
      data: clubData,
    });
  });

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
          <Text style={styles.headerTitle}>Requests</Text>
        </View>

        <SectionList
          sections={sections}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={styles.listContent}
          renderSectionHeader={({ section: { title } }) => (
            <Text style={styles.sectionHeader}>{title}</Text>
          )}
          renderItem={({ item }) => {
            if (!item) return null; // Prevents `undefined` errors

            if (item.type === "friend") {
              return (
                <View style={styles.requestCard}>
                  <Image
                    source={AVATAR_IMAGES[friendImages[item.netID] || "default-avatar.png"]}
                    style={styles.profileImage}
                  />
          
                  <Text style={styles.requestText}>
                    {friendNames[item.netID] || "Loading..."}
                  </Text>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.acceptButton]}
                      onPress={() => handleApproveFriend(item.netID)}
                    >
                      <AntDesign name="check" size={24} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.declineButton]}
                      onPress={() => handleDeclineFriend(item.netID)}
                    >
                      <Entypo name="cross" size={24} color="white" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }
            if (item.type === "event") {
              return (
                <TouchableOpacity
                  style={styles.requestCard}
                  onPress={() => handleEventPress(item.eventId)}
                >
                  <Text style={styles.requestText}>
                    Pending Event: {eventNames[item.eventId] || "Loading..."}
                  </Text>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.acceptButton]}
                      onPress={() => handleApproveEvent(item.orgId, item.eventId)}
                    >
                      <AntDesign name="check" size={24} color="black" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.declineButton]}
                      onPress={() => handleDeclineEvent(item.orgId, item.eventId)}
                    >
                      <Entypo name="cross" size={24} color="black" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            }
            if (item.type === "member") {
              return (
                <View style={styles.requestCard}>
                  <Image
                    source={AVATAR_IMAGES[memberImages[item.netID] || "default-avatar.png"]}
                    style={styles.profileImage}
                  />
          
                <Text style={styles.requestText}>
                  Pending Member: {friendNames[item.netID] || "Loading..."}
                </Text>
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.acceptButton]}
                    onPress={() => handleApproveMember(item.orgId, item.netID)}
                  >
                    <AntDesign name="check" size={24} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.declineButton]}
                    onPress={() => handleDeclineMember(item.orgId, item.netID)}
                  >
                    <Entypo name="cross" size={24} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
              );
            }
            if (item.type === "empty") {
              return (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>{item.message}</Text>
                </View>
              );
            }
            return null; // Handles unknown types safely
          }}
        />
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
  listContent: {
    padding: 16,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 12,
    color: "#000000",
  },
  requestCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  requestText: {
    fontSize: 16,
    color: "#000000",
    flex: 1,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  acceptButton: {
    backgroundColor: "#256E51",
  },
  declineButton: {
    backgroundColor: "#DC2626",
  },
  emptyContainer: {
    padding: 16,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
});

export default FriendRequestsScreen;