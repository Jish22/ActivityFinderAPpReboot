import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  RefreshControl,
  SafeAreaView,
  Image,
  StatusBar,
  Platform,
  Dimensions,
} from "react-native";
import { getFilteredEvents, getUserProfile } from "../services/eventService";
import { auth } from "../services/firebaseConfig";
import * as Notifications from 'expo-notifications';
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const PAGE_SIZE = 10;

const HomeScreen = ({ navigation }: any) => {
  // Keeping all existing state
  const [events, setEvents] = useState<any>({
    yourEvents: [],
    discover: [],
    organizations: [],
    friends: [],
    popular: [],
  });
  const [userInterests, setUserInterests] = useState<string[]>([]);
  const [joinedOrganizations, setJoinedOrganizations] = useState<string[]>([]);
  const [friends, setFriends] = useState<string[]>([]);
  const [isUserDataLoaded, setIsUserDataLoaded] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastVisibleMap, setLastVisibleMap] = useState<any>({});
  const [hasMoreMap, setHasMoreMap] = useState<any>({
    discover: true,
    organizations: true,
    friends: true,
  });

  // Keeping all existing functions
  const fetchUserData = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        console.error("User not logged in");
        return;
      }

      const userProfile = await getUserProfile(userId);

      if (userProfile) {
        setUserInterests(userProfile.interests || []);
        setJoinedOrganizations(userProfile.joinedOrganizations || []);
        setFriends(userProfile.friends || []);
      }

      setIsUserDataLoaded(true);
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };
  
  // Helper to dedupe by event ID
  const dedupeEvents = (existing: any[], incoming: any[]) => {
    const eventMap = new Map(existing.map(e => [e.id, e]));
    for (const event of incoming) {
      if (!eventMap.has(event.id)) eventMap.set(event.id, event);
    }
    return Array.from(eventMap.values());
  };

  const fetchEvents = async (isLoadMore = false) => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;
  
      const result = await getFilteredEvents(
        userId,
        userInterests,
        joinedOrganizations,
        friends,
        isLoadMore ? lastVisibleMap : {},
        PAGE_SIZE
      );
  
      // Check if we're out of data
      const newHasMoreMap = {
        discover: result.discover.length === PAGE_SIZE,
        organizations: result.organizations.length === PAGE_SIZE,
        friends: result.friends.length === PAGE_SIZE,
      };
  
      setEvents((prev) => {
        const updated = {
          yourEvents: isLoadMore ? dedupeEvents(prev.yourEvents, result.yourEvents) : result.yourEvents,
          discover: isLoadMore ? dedupeEvents(prev.discover, result.discover) : result.discover,
          organizations: isLoadMore ? dedupeEvents(prev.organizations, result.organizations) : result.organizations,
          friends: isLoadMore ? dedupeEvents(prev.friends, result.friends) : result.friends,
          popular: result.popular || [],
        };
      
        if (!isLoadMore && updated.yourEvents?.length > 0) {
          scheduleNotificationsForYourEvents(updated.yourEvents);
        }
      
        return updated;
      });
      
      setLastVisibleMap(result.lastVisible || {});
      setHasMoreMap(newHasMoreMap);
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  const scheduleNotificationsForYourEvents = async (events: any[]) => {
    await Notifications.cancelAllScheduledNotificationsAsync();

    for (const event of events) {
      const eventStartTime = new Date(event.startTime);
  
      // Skip past events
      if (eventStartTime <= new Date()) continue;
  
      // Notification 1: 1 hour before
      const oneHourBefore = new Date(eventStartTime.getTime() - 60 * 60 * 1000);
  
      if (oneHourBefore > new Date()) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "⏰ Upcoming Event",
            body: `"${event.name}" starts in 1 hour!`,
            sound: true,
          },
          trigger: oneHourBefore,
        });
      }
  
      // Notification 2: at start time
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🎉 It's Time!",
          body: `"${event.name}" is starting now.`,
          sound: true,
        },
        trigger: eventStartTime,
      });
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchUserData();
    await fetchEvents();
    setRefreshing(false);
  }, []);

  const loadMoreEvents = async () => {
    if (!isUserDataLoaded) return;
  
    // Only load if any of the tabs still have more data
    if (hasMoreMap.discover || hasMoreMap.organizations || hasMoreMap.friends) {
      await fetchEvents(true);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    if (!isUserDataLoaded) return;
    fetchEvents();
  }, [userInterests, joinedOrganizations, friends, isUserDataLoaded]);

  const toggleModal = () => {
    setModalVisible(!isModalVisible);
  };

  const isToday = (dateStr: string) => {
    const inputDate = new Date(dateStr);
    const inputInCentral = new Date(inputDate.getTime() + 6 * 60 * 60 * 1000);
    const now = new Date();
    const nowInCentral = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  
    return (
      inputInCentral.getFullYear() === nowInCentral.getFullYear() &&
      inputInCentral.getMonth() === nowInCentral.getMonth() &&
      inputInCentral.getDate() === nowInCentral.getDate()
    );
  };

  const renderEventList = (eventList: any[], emptyMessage: string) => (
    eventList.length > 0 ? (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
        onScrollEndDrag={loadMoreEvents}
      >
        {eventList.map((event) => (
          <TouchableOpacity
            key={event.id}
            style={styles.eventCard}
            onPress={() => navigation.navigate("EventViewScreen", { event })}
            activeOpacity={0.7}
          >
            <View style={styles.eventCardContentRow}>
              <Image
                source={{
                  uri: event.orgProfileImage || "https://firebasestorage.googleapis.com/v0/b/activityfinderapp-7ba1e.appspot.com/o/default-org.png?alt=media",
                }}
                style={styles.profileImage}
              />
              <View style={styles.eventTextBlock}>
                <Text style={styles.eventTitle} numberOfLines={1} ellipsizeMode="tail">
                  {event.name}
                </Text>
                <Text style={styles.eventDetails} numberOfLines={1} ellipsizeMode="tail">
                  {isToday(event.date)
                    ? `${new Date(event.startTime).toLocaleTimeString("en-US", {
                        timeZone: "America/Chicago",
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })} - ${new Date(event.endTime).toLocaleTimeString("en-US", {
                        timeZone: "America/Chicago",
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })}`
                    : event.date}
                </Text>
                <Text style={styles.eventLocation} numberOfLines={1} ellipsizeMode="tail">
                  <Ionicons name="location-outline" size={12} color="#666666" /> {event.location}
                </Text>
              </View>
            </View>

            {event.categories?.length > 0 && (
              <View style={styles.categoryTags}>
                {event.categories.slice(0, 2).map((category: string) => (
                  <View key={category} style={styles.categoryTag}>
                    <Text style={styles.categoryText}>{category}</Text>
                  </View>
                ))}
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    ) : (
      <View style={styles.emptyStateContainer}>
        <Ionicons name="calendar-outline" size={32} color="#CCCCCC" />
        <Text style={styles.noEventsText}>{emptyMessage}</Text>
      </View>
    )
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.container}>
        <LinearGradient
          colors={['#256E51', '#1A5A40']}
          style={styles.header}
        >
          <Text style={styles.headerTitle}>Blinkd</Text>
          <TouchableOpacity
            style={styles.friendRequestButton}
            onPress={() => navigation.navigate("FriendRequestsScreen")}
          >
            <Ionicons name="heart" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </LinearGradient>

        <ScrollView
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={['#256E51']} 
              tintColor="#256E51"
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeText}>Upcoming Events</Text>
            <Text style={styles.welcomeSubtext}>Find and join activities around campus</Text>
          </View>
          
          <View style={styles.content}>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Top Events This Week</Text>
                <TouchableOpacity>
                  <Text style={styles.seeAllText}>See all</Text>
                </TouchableOpacity>
              </View>
              {renderEventList(events.popular, "No trending events this week.")}
            </View>
            
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Your Events</Text>
                <TouchableOpacity>
                  <Text style={styles.seeAllText}>See all</Text>
                </TouchableOpacity>
              </View>
              {renderEventList(events.yourEvents, "No upcoming RSVP'd or created events.")}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Discover</Text>
                <TouchableOpacity>
                  <Text style={styles.seeAllText}>See all</Text>
                </TouchableOpacity>
              </View>
              {renderEventList(events.discover, "No available events match your interests")}
            </View>

            {joinedOrganizations.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Organizations</Text>
                  <TouchableOpacity>
                    <Text style={styles.seeAllText}>See all</Text>
                  </TouchableOpacity>
                </View>
                {renderEventList(events.organizations, "No organizations you've joined have events available")}
              </View>
            )}

            {friends.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Friends</Text>
                  <TouchableOpacity>
                    <Text style={styles.seeAllText}>See all</Text>
                  </TouchableOpacity>
                </View>
                {renderEventList(events.friends, "No activities from your friends")}
              </View>
            )}
          </View>
        </ScrollView>

        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigation.navigate("AddOrganizationScreen")}
          >
            <Ionicons name="business" size={24} color="#666666" />
            <Text style={styles.navButtonText}>Orgs</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.addButtonContainer} onPress={toggleModal}>
            <View style={styles.addButton}>
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigation.navigate("ProfileSetupScreen")}
          >
            <Ionicons name="person" size={24} color="#666666" />
            <Text style={styles.navButtonText}>Profile</Text>
          </TouchableOpacity>
        </View>

        <Modal
          animationType="slide"
          transparent={true}
          visible={isModalVisible}
          onRequestClose={toggleModal}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>What would you like to add?</Text>
                <TouchableOpacity onPress={toggleModal} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color="#666666" />
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  toggleModal();
                  navigation.navigate("AddFriendScreen");
                }}
              >
                <Ionicons name="person-add" size={20} color="#FFFFFF" style={styles.modalButtonIcon} />
                <Text style={styles.modalButtonText}>Add Friend</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  toggleModal();
                  navigation.navigate("EventCreationScreen");
                }}
              >
                <Ionicons name="calendar" size={20} color="#FFFFFF" style={styles.modalButtonIcon} />
                <Text style={styles.modalButtonText}>Add Event</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={toggleModal}
              >
                <Text style={[styles.modalButtonText, styles.cancelButtonText]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
    backgroundColor: "#F8F9FA",
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  friendRequestButton: {
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  welcomeSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333333",
  },
  welcomeSubtext: {
    fontSize: 16,
    color: "#666666",
    marginTop: 4,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333333",
  },
  seeAllText: {
    fontSize: 14,
    color: "#256E51",
    fontWeight: "600",
  },
  horizontalList: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  eventCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginRight: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    width: width * 0.75,
    height: 140,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  eventCardContentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  eventTextBlock: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "center",
  },
  profileImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginTop: 2,
    borderWidth: 2,
    borderColor: "#F0F9F6",
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
    color: "#333333",
  },
  eventDetails: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 4,
    fontWeight: "500",
  },
  eventLocation: {
    fontSize: 14,
    color: "#666666",
    flexDirection: "row",
    alignItems: "center",
  },
  categoryTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  categoryTag: {
    backgroundColor: "#F0F9F6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  categoryText: {
    color: "#256E51",
    fontSize: 12,
    fontWeight: "600",
  },
  emptyStateContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    height: 120,
  },
  noEventsText: {
    fontSize: 14,
    color: "#999999",
    textAlign: "center",
    marginTop: 8,
  },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingBottom: Platform.OS === "ios" ? 2 : 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 5,
  },
  navButton: {
    alignItems: "center",
    padding: 8,
    flex: 1,
  },
  navButtonText: {
    fontSize: 12,
    color: "#666666",
    marginTop: 4,
    fontWeight: "500",
  },
  addButtonContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  addButton: {
    backgroundColor: "#256E51",
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#256E51",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333333",
  },
  closeButton: {
    padding: 4,
  },
  modalButton: {
    backgroundColor: "#256E51",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  modalButtonIcon: {
    marginRight: 12,
  },
  modalButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  cancelButton: {
    backgroundColor: "#FEE2E2",
    marginTop: 8,
  },
  cancelButtonText: {
    color: "#DC2626",
  },
});

export default HomeScreen;