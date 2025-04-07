import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Alert,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { sendFriendRequest, searchUsersByName, searchUsersByNetID } from "../services/friendService";
import { auth } from "../services/firebaseConfig";
import AntDesign from '@expo/vector-icons/AntDesign';
const AddFriendScreen = ({ navigation }: any) => {
  const [nameQuery, setNameQuery] = useState(""); 
  const [netIDQuery, setNetIDQuery] = useState(""); 
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<{ fullName: string; netID: string } | null>(null);

  useEffect(() => {
    if (nameQuery.length > 2) {
      fetchNameSearchResults();
    } else {
      setSearchResults([]);
    }
  }, [nameQuery]);

  useEffect(() => {
    if (netIDQuery.length > 2) {
      fetchNetIDSearchResults();
    } else {
      setSearchResults([]);
    }
  }, [netIDQuery]);

  const fetchNameSearchResults = async () => {
    const results = await searchUsersByName(nameQuery);
    // console.log("Search Results:", results); // 🔍 Debugging

    setSearchResults(results);
  };

  const fetchNetIDSearchResults = async () => {
    const results = await searchUsersByNetID(netIDQuery);
    setSearchResults(results);
  };

  const handleUserSelect = (user: any) => {
    setSelectedUser(user);
    setNameQuery(user.fullName); // Autofill name
    setNetIDQuery(user.netID); // Autofill NetID
    setSearchResults([]); // Hide results after selection
  };

  const handleAddFriend = async () => {
    if (!selectedUser) {
      Alert.alert("Error", "Select a user first.");
      return;
    }

    try {
      const senderNetID = auth.currentUser?.uid;
      if (!senderNetID) throw new Error("Not logged in.");

      await sendFriendRequest(selectedUser.netID, senderNetID);
      Alert.alert("Success", `Friend request sent to ${selectedUser.fullName}.`);
      setNameQuery("");
      setNetIDQuery("");
      setSelectedUser(null);
    } catch (error) {
      Alert.alert("Error", "Failed to send friend request.");
    }
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
          <Text style={styles.headerTitle}>Add Friend</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.searchSection}>
            <View style={styles.inputContainer}>
            <AntDesign name="search1" size={24} color="black" />
              <TextInput
                style={styles.input}
                placeholder="Search by full name..."
                value={nameQuery}
                onChangeText={setNameQuery}
                autoCapitalize="none"
                placeholderTextColor="#999999"
              />
            </View>

            <View style={styles.inputContainer}>
            <AntDesign name="search1" size={24} color="black" />
              <TextInput
                style={styles.input}
                placeholder="Search by NetID..."
                value={netIDQuery}
                onChangeText={setNetIDQuery}
                autoCapitalize="none"
                placeholderTextColor="#999999"
              />
            </View>
          </View>

          {searchResults.length > 0 && (
            <View style={styles.resultsContainer}>
              <Text style={styles.resultsTitle}>Search Results</Text>
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item.netID}
                renderItem={({ item }) => (
                  
                  <TouchableOpacity 
                    style={styles.userItem} 
                    onPress={() => handleUserSelect(item)}
                  >
                    <Image 
                      source={{ 
                        uri: item.pfp
                        ? item.pfp
                        : "https://firebasestorage.googleapis.com/v0/b/your-project-id.appspot.com/o/default-avatar.png?alt=media",
                      }}
                        style={styles.userImage} 
                    />
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{item.fullName}</Text>
                      <Text style={styles.userNetID}>{item.netID}</Text>
                    </View>
                  </TouchableOpacity>
                )}
                style={styles.resultsList}
              />
            </View>
          )}

          {selectedUser && (
            <View style={styles.selectedUserContainer}>
              <Text style={styles.selectedUserTitle}>Selected User</Text>
              <View style={styles.selectedUserCard}>
                <Text style={styles.selectedUserName}>{selectedUser.fullName}</Text>
                <Text style={styles.selectedUserNetID}>NetID: {selectedUser.netID}</Text>
                <TouchableOpacity 
                  style={styles.sendRequestButton}
                  onPress={handleAddFriend}
                >
                  <AntDesign name="addusergroup" size={24} color="black" />
                  <Text style={styles.sendRequestButtonText}>Send Friend Request</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
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
  content: {
    flex: 1,
    padding: 16,
  },
  searchSection: {
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333333",
  },
  resultsContainer: {
    marginBottom: 24,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    color: "#000000",
  },
  resultsList: {
    maxHeight: 300,
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  userImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000000",
    marginBottom: 4,
  },
  userNetID: {
    fontSize: 14,
    color: "#666666",
  },
  selectedUserContainer: {
    marginTop: 8,
  },
  selectedUserTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    color: "#000000",
  },
  selectedUserCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
  },
  selectedUserName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 4,
  },
  selectedUserNetID: {
    fontSize: 16,
    color: "#666666",
    marginBottom: 16,
  },
  sendRequestButton: {
    backgroundColor: "#256E51",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 8,
  },
  buttonIcon: {
    marginRight: 8,
  },
  sendRequestButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default AddFriendScreen;