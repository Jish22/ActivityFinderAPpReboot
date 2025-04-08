import React, { useState } from "react";
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
import { editEvent, deleteEvent } from "../services/eventService";
import { fromZonedTime } from "date-fns-tz";
import AntDesign from '@expo/vector-icons/AntDesign';

interface EventData {
  id: string;
  name: string;
  description?: string;
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
  categories: string[];
}

const EditEventScreen = ({ route, navigation }: any) => {
  const { event } = route.params;
  const [updatedEvent, setUpdatedEvent] = useState<EventData>(event);
  const [loading, setLoading] = useState(false);

  // State for Date & Time Pickers
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  const handleSaveChanges = async () => {
    const selectedDate = new Date(updatedEvent.date);
  
    const createDateTime = (baseDate: string, timeStr: string) => {
      const date = new Date(baseDate);
      const time = new Date(timeStr);
  
      return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        time.getHours(),
        time.getMinutes()
      );
    };
  
    const start = createDateTime(updatedEvent.date, updatedEvent.startTime);
    const end = createDateTime(updatedEvent.date, updatedEvent.endTime);
    const now = new Date();
  
    // 👇 Check if start or end time is in the past
    if (start < now || end < now) {
      Alert.alert("Invalid Time", "You cannot schedule an event in the past.");
      return;
    }
  
    // 👇 Optional: Check if end is before start
    if (end <= start) {
      Alert.alert("Invalid Time", "End time must be after start time.");
      return;
    }
  
    const convertLocalToUtcISOString = (date: string, time: string, timeZone = "America/Chicago") => {
      const dateObj = new Date(date);
      const timeObj = new Date(time);
      const localDateTimeStr = `${date}T${timeObj.toTimeString().split(" ")[0]}`;
      const utcDate = fromZonedTime(localDateTimeStr, timeZone);
      return utcDate.toISOString();
    };
  
    setLoading(true);
    try {
      await editEvent(event.id, {
        ...updatedEvent,
        date: updatedEvent.date,
        startTime: convertLocalToUtcISOString(updatedEvent.date, updatedEvent.startTime),
        endTime: convertLocalToUtcISOString(updatedEvent.date, updatedEvent.endTime),
        categories: event.categories,
      });
  
      Alert.alert("Success", "Event updated.");
      navigation.goBack();
    } catch (error) {
      Alert.alert("Error", "Failed to update event.");
    } finally {
      setLoading(false);
    }
  };
  const handleDeleteEvent = async () => {
    Alert.alert("Confirm", "Are you sure you want to delete this event?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        onPress: async () => {
          try {
            await deleteEvent(event.id, null);
            Alert.alert("Deleted", "Event has been deleted.");
            navigation.goBack();
          } catch (error) {
            Alert.alert("Error", "Failed to delete event.");
          }
        },
        style: "destructive",
      },
    ]);
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
          <Text style={styles.headerTitle}>Edit Event</Text>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.formSection}>
            <Text style={styles.label}>Event Name</Text>
            <TextInput 
              value={updatedEvent.name} 
              onChangeText={(text) => setUpdatedEvent({ ...updatedEvent, name: text })} 
              style={styles.input}
              placeholder="Enter event name"
            />
          </View>

          <View style={styles.formSection}>
            <Text style={styles.label}>Description</Text>
            <TextInput 
              value={updatedEvent.description || ""} 
              onChangeText={(text) => setUpdatedEvent({ ...updatedEvent, description: text })} 
              style={[styles.input, styles.textArea]} 
              multiline
              numberOfLines={4}
              placeholder="Describe your event"
            />
          </View>

          <View style={styles.formSection}>
            <Text style={styles.label}>Date</Text>
            <TouchableOpacity 
              onPress={() => setShowDatePicker(true)} 
              style={styles.dateTimeButton}
            >
              <Text style={styles.dateTimeText}>
                {new Intl.DateTimeFormat('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  timeZone: 'America/Chicago' // Ensuring Central Time
                }).format(new Date(updatedEvent.date).setDate(new Date(updatedEvent.date).getDate() + 1))}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={new Date(updatedEvent.date + "T12:00:00")} 
                mode="date"
                display={Platform.OS === "ios" ? "inline" : "default"}
                themeVariant="light"
                onChange={(e, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    const newDate = new Date(selectedDate);
                    const formattedDate = newDate.toISOString().split("T")[0];
                
                    setUpdatedEvent((prev) => {
                      const startTime = new Date(prev.startTime);
                      const endTime = new Date(prev.endTime);
                
                      startTime.setFullYear(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
                      endTime.setFullYear(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
                
                      return {
                        ...prev,
                        date: formattedDate,
                        startTime: startTime.toISOString(),
                        endTime: endTime.toISOString(),
                      };
                    });
                  }
                }}
              />
            )}
          </View>

          <View style={styles.formSection}>
            <Text style={styles.label}>Start Time</Text>
            <TouchableOpacity 
              onPress={() => setShowStartTimePicker(true)}
              style={styles.dateTimeButton}
            >
              <Text style={styles.dateTimeText}>
                {new Date(updatedEvent.startTime).toLocaleTimeString()}
              </Text>
            </TouchableOpacity>
            {showStartTimePicker && (
              <View>
                <DateTimePicker
                  value={new Date(updatedEvent.startTime)}
                  mode="time"
                  is24Hour={false}
                  display="spinner"
                  themeVariant="light"
                  onChange={(e, selectedTime) => {
                    if (selectedTime) {
                      const localTime = new Date(
                        selectedTime.getFullYear(),
                        selectedTime.getMonth(),
                        selectedTime.getDate(),
                        selectedTime.getHours(),
                        selectedTime.getMinutes()
                      ); // Keeps local time without shifting
                  
                      setUpdatedEvent((prev) => ({
                        ...prev,
                        startTime: localTime.toISOString(),
                      }));
                    }
                  }}
                />
                {Platform.OS === "ios" && (
                  <TouchableOpacity 
                    style={styles.doneButton}
                    onPress={() => setShowStartTimePicker(false)}
                  >
                    <Text style={styles.doneButtonText}>Done</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          <View style={styles.formSection}>
            <Text style={styles.label}>End Time</Text>
            <TouchableOpacity 
              onPress={() => setShowEndTimePicker(true)}
              style={styles.dateTimeButton}
            >
              <Text style={styles.dateTimeText}>
                {new Date(updatedEvent.endTime).toLocaleTimeString()}
              </Text>
            </TouchableOpacity>
            {showEndTimePicker && (
              <View>
                <DateTimePicker
                  value={new Date(updatedEvent.endTime)}
                  mode="time"
                  is24Hour={false}
                  display="spinner"
                  themeVariant="light"
                  onChange={(e, selectedTime) => {
                    if (selectedTime) {
                      const localTime = new Date(
                        selectedTime.getFullYear(),
                        selectedTime.getMonth(),
                        selectedTime.getDate(),
                        selectedTime.getHours(),
                        selectedTime.getMinutes()
                      ); // Keeps local time without shifting
                  
                      setUpdatedEvent((prev) => ({
                        ...prev,
                        endTime: localTime.toISOString(),
                      }));
                    }
                  }}
                />
                {Platform.OS === "ios" && (
                  <TouchableOpacity 
                    style={styles.doneButton}
                    onPress={() => setShowEndTimePicker(false)}
                  >
                    <Text style={styles.doneButtonText}>Done</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          <View style={styles.formSection}>
            <Text style={styles.label}>Location</Text>
            <TextInput 
              value={updatedEvent.location || ""} 
              onChangeText={(text) => setUpdatedEvent({ ...updatedEvent, location: text })} 
              style={styles.input}
              placeholder="Enter location"
            />
          </View>

          <TouchableOpacity 
            style={[styles.saveButton, loading && styles.buttonDisabled]}
            onPress={handleSaveChanges}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Saving..." : "Save Changes"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={handleDeleteEvent}
          >
            <Text style={styles.deleteButtonText}>Delete Event</Text>
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
  },
  categoryText: {
    color: "#256E51",
    fontSize: 14,
    fontWeight: "500",
  },
  saveButton: {
    backgroundColor: "#256E51",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  },
  deleteButton: {
    backgroundColor: "#FEE2E2",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
    marginBottom: 32,
  },
  buttonDisabled: {
    backgroundColor: "#A0AEC0",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  deleteButtonText: {
    color: "#DC2626",
    fontSize: 18,
    fontWeight: "600",
  },
});

export default EditEventScreen;