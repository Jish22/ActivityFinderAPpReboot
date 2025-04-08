import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Alert,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  RefreshControl,
} from "react-native";
import { rsvpToEvent, unRsvpFromEvent, isUserRSVPd, getEventAttendees } from "../services/eventService";
import { getOrganizationDetails, getUserFullName } from "../services/organizationService";
import { auth } from "../services/firebaseConfig";
import { format, toZonedTime } from "date-fns-tz";
import AntDesign from '@expo/vector-icons/AntDesign';
import Entypo from '@expo/vector-icons/Entypo';
import { Linking } from "react-native";


const EventViewScreen = ({ route, navigation }: any) => {
  const { event, fromFriendRequests } = route.params || {};
  const userId = auth.currentUser?.uid;
  
  const [isRSVPd, setIsRSVPd] = useState(false);
  const [hostingOrg, setHostingOrg] = useState<{ id: string; name: string } | null>(null);
  const [isEventCreator, setIsEventCreator] = useState(false);
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [hostName, setHostName] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAllEventData = async () => {
    setRefreshing(true);
  
    if (userId) {
      const status = await isUserRSVPd(event.id, userId);
      setIsRSVPd(status);
    }
  
    if (event.hostedByOrg) {
      const orgDetails = await getOrganizationDetails(event.hostedByOrg);
      if (orgDetails) {
        setHostingOrg({ id: orgDetails.id, name: orgDetails.name });
        setIsOrgAdmin(orgDetails.admins.includes(userId ?? ""));
      }
    } else if (event.createdBy) {
      const name = await getUserFullName(event.createdBy);
      setHostName(name);
    }
  
    const isCreator = event.createdBy === userId && !event.hostedByOrg;
    setIsEventCreator(isCreator);
  
    if (isCreator || isOrgAdmin) {
      const attendeesList = await getEventAttendees(event.id);
      setAttendees(attendeesList);
    }
  
    setRefreshing(false);
  };

  useEffect(() => {
    fetchAllEventData();
  }, []);


  const convertToCTTime = (utcTime: string) => {
    const timeZone = "America/Chicago";
    const zonedTime = toZonedTime(utcTime, timeZone);
    return format(zonedTime, "h:mm a", { timeZone });
  };

  const handleRSVP = async () => {
    if (!userId) {
      Alert.alert("Error", "You must be signed in to RSVP.");
      return;
    }

    try {
      await rsvpToEvent(event.id, userId);
      setIsRSVPd(true);
      Alert.alert("Success", "You have RSVP'd to this event!");
    } catch (error) {
      Alert.alert("Error", "Failed to RSVP");
    }
  };

  const handleUnRSVP = async () => {
    if (!userId) {
      Alert.alert("Error", "You must be signed in to leave this event.");
      return;
    }

    if (isEventCreator) {
      Alert.alert("Error", "You cannot leave an event that you created.");
      return;
    }

    try {
      await unRsvpFromEvent(event.id, userId);
      setIsRSVPd(false);
      Alert.alert("Success", "You have left the event.");
    } catch (error) {
      Alert.alert("Error", "Failed to leave event.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          ><AntDesign name="back" size={24} color="black" />
          </TouchableOpacity>
          {(isEventCreator || isOrgAdmin) && ( 
            <TouchableOpacity 
              onPress={() => navigation.navigate("EditEventScreen", { event })}
              style={styles.editButton}
            >
              <AntDesign name="edit" size={24} color="black" />
            </TouchableOpacity>
          )}
        </View>
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={fetchAllEventData}
            colors={["#256E51"]}
            tintColor="#256E51"
          />
        }
        

        <View style={styles.content}>
          <Text style={styles.eventTitle}>{event.name}</Text>


          {hostingOrg ? (
            <TouchableOpacity 
              onPress={() => navigation.navigate("OrganizationProfileScreen", { org: { id: hostingOrg.id } })}
              style={styles.hostingOrgButton}
            >
              <Text style={styles.hostingText}>
                Hosted by: <Text style={styles.orgLink}>{hostingOrg.name}</Text> <AntDesign name="search1" size={15} color="black" style={{ marginLeft: 5 }} />

              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.hostingText}>
              Hosted by: {hostName || "Independent Event"}
            </Text>          
          )}

          {event.fileUrl && (
            <TouchableOpacity
              onPress={() => Linking.openURL(event.fileUrl)}
              style={styles.fileLink}
            >
              <Text style={styles.fileLinkText}>📄 View Flier</Text>
            </TouchableOpacity>
          )}

          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
            <AntDesign name="calendar" size={24} color="black" />
                          <Text style={styles.infoText}>{event.date}</Text>
            </View>
            
            <View style={styles.infoRow}>
            <AntDesign name="clockcircleo" size={24} color="black" />
              <Text style={styles.infoText}>
                {convertToCTTime(event.startTime)} - {convertToCTTime(event.endTime)}
              </Text>
            </View>

            <View style={styles.infoRow}>
            <Entypo name="location" size={24} color="black" />
              <Text style={styles.infoText}>{event.location}</Text>
            </View>
          </View>

          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.description}>{event.description}</Text>
          </View>

          <View style={styles.categoriesSection}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <View style={styles.categoriesContainer}>
              {event.categories.map((category: string) => (
                <View key={category} style={styles.categoryTag}>
                  <Text style={styles.categoryText}>{category}</Text>
                </View>
              ))}
            </View>
          </View>

          {(isEventCreator || isOrgAdmin) && attendees.length > 0 && (
            <View style={styles.attendeesSection}>
              <Text style={styles.sectionTitle}>Attendees</Text>
              {attendees.map((attendee) => (
                <View key={attendee.id} style={styles.attendeeRow}>
                  <Text style={styles.attendeeName}>{attendee.name}</Text>
                </View>
              ))}
            </View>
          )}

        </View>
      </ScrollView>

      {!fromFriendRequests && (
        <View style={styles.footer}>
          {isRSVPd ? (
            <TouchableOpacity 
              style={[styles.rsvpButton, styles.leaveButton]} 
              onPress={handleUnRSVP}
            >
              <Text style={[styles.rsvpButtonText, styles.leaveButtonText]}>
                Leave Event
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.rsvpButton} 
              onPress={handleRSVP}
            >
              <Text style={styles.rsvpButtonText}>RSVP</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
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
  content: {
    padding: 16,
  },
  eventTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 8,
  },
  hostingOrgButton: {
    marginBottom: 24,
  },
  hostingText: {
    fontSize: 16,
    color: "#666666",
  },
  orgLink: {
    color: "#256E51",
    fontWeight: "600",
  },
  infoSection: {
    backgroundColor: "#F8F9FA",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  infoText: {
    marginLeft: 12,
    fontSize: 16,
    color: "#333333",
  },
  descriptionSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    color: "#000000",
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: "#666666",
  },
  categoriesSection: {
    marginBottom: 100,
  },
  categoriesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryTag: {
    backgroundColor: "#F0F9F6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryText: {
    color: "#256E51",
    fontSize: 14,
    fontWeight: "500",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
  },
  rsvpButton: {
    backgroundColor: "#256E51",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  rsvpButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  leaveButton: {
    backgroundColor: "#FEE2E2",
  },
  leaveButtonText: {
    color: "#DC2626",
  },
  attendeesSection: {
    marginBottom: 100,
  },
  attendeeRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  attendeeName: {
    fontSize: 16,
    color: "#333333",
  },
  fileLink: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#F0F9F6",
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#256E51",
  },
  fileLinkText: {
    color: "#256E51",
    fontSize: 16,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});

export default EventViewScreen;