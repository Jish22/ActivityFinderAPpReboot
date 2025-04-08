import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
} from "react-native";
import {
  getOrganizations,
  requestToJoinOrganization,
  cancelJoinRequest, 
  getUserOrgStatus,
} from "../services/organizationService";
import { auth } from "../services/firebaseConfig";
import AntDesign from '@expo/vector-icons/AntDesign';
import { ORG_AVATAR_IMAGES } from "../constants/constants";

const AddOrganizationScreen = ({ navigation }: any) => {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [userStatuses, setUserStatuses] = useState<{ [key: string]: string }>({});
  const netID: string = auth.currentUser?.uid ?? "";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const orgs = await getOrganizations();
  
        const sortedOrgs = orgs.sort((a, b) => {
          const nameA = a.name?.toLowerCase() || "";
          const nameB = b.name?.toLowerCase() || "";
          return nameA.localeCompare(nameB);
        });
  
        setOrganizations(sortedOrgs);
  
        const statusPromises = sortedOrgs.map(async (org) => {
          const status = await getUserOrgStatus(org.id, netID);
          return { orgId: org.id, status: status.status };
        });
  
        const statuses = await Promise.all(statusPromises);
        const statusMap: { [key: string]: string } = {};
        statuses.forEach(({ orgId, status }) => {
          statusMap[orgId] = status;
        });
  
        setUserStatuses(statusMap);
      } catch (error) {
        console.error("Error fetching organizations:", error);
      }
    };
  
    fetchData();
  }, []);

  const handleJoinRequest = async (orgId: string) => {
    try {
      await requestToJoinOrganization(orgId, netID);
      setUserStatuses({ ...userStatuses, [orgId]: "pending" });
      Alert.alert("Success", "Your join request has been sent.");
    } catch (error) {
      Alert.alert("Error", "Failed to send join request.");
    }
  };

  const handleCancelJoinRequest = async (orgId: string) => {
    try {
      await cancelJoinRequest(orgId, netID);
      setUserStatuses({ ...userStatuses, [orgId]: "join" });
      Alert.alert("Success", "Your join request has been canceled.");
    } catch (error) {
      Alert.alert("Error", "Failed to cancel request.");
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const getStatusButton = () => {
      switch (userStatuses[item.id]) {
        case "join":
          return (
            <TouchableOpacity
              style={styles.joinButton}
              onPress={() => handleJoinRequest(item.id)}
            >
              <Text style={styles.joinButtonText}>Join</Text>
            </TouchableOpacity>
          );
        case "pending":
          return (
            <TouchableOpacity
              style={styles.pendingButton}
              onPress={() => handleCancelJoinRequest(item.id)}
            >
              <Text style={styles.pendingButtonText}>Pending</Text>
            </TouchableOpacity>
          );
        case "leave":
          return (
            <View style={styles.joinedButton}>
              <Text style={styles.joinedButtonText}>Joined</Text>
            </View>
          );
        default:
          return null;
      }
    };

    return (
      <TouchableOpacity
        style={styles.orgCard}
        onPress={() => navigation.navigate("OrganizationProfileScreen", { org: item })}
      >
        <View style={styles.orgContent}>
        <Image
            source={
              ORG_AVATAR_IMAGES[item.profileImage || "default-org-avatar.png"]
            }
            style={styles.orgPfp}
          />
          <View style={styles.orgInfo}>
            <Text style={styles.orgName}>{item.name}</Text>
            <Text style={styles.orgDescription} numberOfLines={2}>
              {item.bio || "No description available"}
            </Text>
          </View>
        </View>
        {getStatusButton()}
      </TouchableOpacity>
    );
  };

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
          <Text style={styles.headerTitle}>Organizations</Text>
        </View>

        <FlatList
          data={organizations}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />

        <TouchableOpacity
          style={styles.createOrgButton}
          onPress={() => navigation.navigate("CreateOrganizationScreen")}
        >
          <Text style={styles.createOrgButtonText}>Create Organization</Text>
        </TouchableOpacity>
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
  listContainer: {
    padding: 16,
  },
  orgCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  orgContent: {
    flexDirection: "row",
    marginBottom: 12,
  },
  orgPfp: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  orgInfo: {
    flex: 1,
  },
  orgName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
    color: "#000000",
  },
  orgDescription: {
    fontSize: 14,
    color: "#666666",
    lineHeight: 20,
  },
  joinButton: {
    backgroundColor: "#256E51",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  joinButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  pendingButton: {
    backgroundColor: "#F0F9F6",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  pendingButtonText: {
    color: "#256E51",
    fontSize: 14,
    fontWeight: "600",
  },
  joinedButton: {
    backgroundColor: "#D1FAE5",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  joinedButtonText: {
    color: "#065F46",
    fontSize: 14,
    fontWeight: "600",
  },
  createOrgButton: {
    backgroundColor: "#256E51",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginVertical: 12,
  },
  createOrgButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default AddOrganizationScreen;