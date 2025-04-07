import React, { useEffect, useState } from "react";
import { View, Text, Button, Alert, StyleSheet } from "react-native";
import { getEventDetails } from "../services/eventService";
import { auth } from "../services/firebaseConfig";
import { approveEvent, declineEvent } from "../services/organizationService";

const PreviewEventScreen = ({ route, navigation }: any) => {
  const { eventId, orgId } = route.params;
  const [event, setEvent] = useState<any>(null);
  const userNetID = auth.currentUser?.uid;

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const eventData = await getEventDetails(eventId);
        if (eventData) {
          setEvent(eventData);
        } else {
          Alert.alert("Error", "Event details could not be loaded.");
          navigation.goBack();
        }
      } catch (error) {
        Alert.alert("Error", "Failed to fetch event details.");
      }
    };

    fetchEvent();
  }, [eventId]);

  const handleApprove = async () => {
    try {
      await approveEvent(orgId, eventId);
      Alert.alert("Success", "Event approved!");
      navigation.goBack();
    } catch (error) {
      Alert.alert("Error", "Failed to approve event.");
    }
  };

  const handleDecline = async () => {
    try {
      await declineEvent(orgId, eventId);
      Alert.alert("Success", "Event declined.");
      navigation.goBack();
    } catch (error) {
      Alert.alert("Error", "Failed to decline event.");
    }
  };

  if (!event) return <Text>Loading...</Text>;

  return (
    <View style={styles.container}>
      <Text style={styles.eventTitle}>{event.name}</Text>
      <Text>Date: {event.date}</Text>
      <Text>Start Time: {new Date(event.startTime).toLocaleTimeString()}</Text>
      <Text>End Time: {new Date(event.endTime).toLocaleTimeString()}</Text>
      <Text>Location: {event.location}</Text>
      <Text>Description: {event.description}</Text>

      <Text style={{ marginTop: 10 }}>Categories:</Text>
      {event.categories.map((category: string) => (
        <Text key={category} style={styles.categoryTag}>{category}</Text>
      ))}

      <Button title="Approve Event" onPress={handleApprove} />
      <Button title="Decline Event" onPress={handleDecline} color="red" />
      <Button title="Back" onPress={() => navigation.goBack()} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  eventTitle: { fontSize: 24, fontWeight: "bold", marginBottom: 10 },
  categoryTag: { padding: 5, backgroundColor: "#e0f7fa", borderRadius: 5, marginTop: 5 },
});

export default PreviewEventScreen;