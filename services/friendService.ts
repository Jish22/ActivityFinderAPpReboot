import { doc, updateDoc, arrayUnion, arrayRemove, getDocs, where, query, collection } from "firebase/firestore";
import { db } from "./firebaseConfig";

// Send a friend request
export const sendFriendRequest = async (recipientNetID: string, senderNetID: string): Promise<void> => {
    try {
      const normalizedRecipientNetID = recipientNetID.toLowerCase();
      const normalizedSenderNetID = senderNetID;
  
      const usersCollection = collection(db, "users");
      const recipientQuery = query(usersCollection, where("netID", "==", normalizedRecipientNetID));
      const recipientSnapshot = await getDocs(recipientQuery);
  
      if (recipientSnapshot.empty) {
        throw new Error("Recipient not found with the provided netID.");
      }
  
      const recipientDoc = recipientSnapshot.docs[0];
      const recipientRef = doc(db, "users", recipientDoc.id);
      const recipientData = recipientDoc.data();
  
      if (recipientData.friends?.includes(normalizedSenderNetID)) {
        throw new Error("You are already friends with this user.");
      }
  
      if (recipientData.pendingFriendRequests?.includes(normalizedSenderNetID)) {
        throw new Error("A friend request is already pending.");
      }
      if (__DEV__) {
        console.log("Friend request sent to:", normalizedRecipientNetID);
      }
      await updateDoc(recipientRef, {
        pendingFriendRequests: arrayUnion(normalizedSenderNetID),
      });
      
      if (__DEV__) {
        console.log("Friend request sent to:", normalizedRecipientNetID);
      }
    } catch (error) {
      console.error("Error sending friend request:", error);
      throw error;
    }
  };

export const acceptFriendRequest = async (recipientNetID: string, senderNetID: string) => {
  try {
    const recipientRef = doc(db, "users", recipientNetID);
    const senderRef = doc(db, "users", senderNetID);

    await updateDoc(recipientRef, {
      friends: arrayUnion(senderNetID),
      pendingFriendRequests: arrayRemove(senderNetID),
    });
    await updateDoc(senderRef, {
      friends: arrayUnion(recipientNetID),
    });
    if (__DEV__) {
      console.log(`${recipientNetID} accepted friend request from ${senderNetID}`);
    }
  } catch (error) {
    console.error("Error accepting friend request:", error);
    throw error;
  }
};

export const declineFriendRequest = async (recipientNetID: string, senderNetID: string) => {
  try {
    const recipientRef = doc(db, "users", recipientNetID);
    await updateDoc(recipientRef, {
      pendingFriendRequests: arrayRemove(senderNetID),
    });
    if (__DEV__) {
      console.log(`${recipientNetID} declined friend request from ${senderNetID}`);
    }
  } catch (error) {
    console.error("Error declining friend request:", error);
    throw error;
  }
};

export const searchUsersByName = async (searchQuery: string) => {
  try {
    const usersRef = collection(db, "users");
    const nameQuery = query(
      usersRef,
      where("fullName", ">=", searchQuery.toLowerCase()),
      where("fullName", "<=", searchQuery.toLowerCase() + "\uf8ff")
    );

    const snapshot = await getDocs(nameQuery);
    return snapshot.docs.map((doc) => ({
      netID: doc.data().netID,
      fullName: doc.data().fullName,
      pfp: doc.data().profileImage || "https://firebasestorage.googleapis.com/v0/b/your-project-id.appspot.com/o/default-avatar.png?alt=media"
    }));
  } catch (error) {
    console.error("Error searching users:", error);
    return [];
  }
};

export const searchUsersByNetID = async (searchQuery: string) => {
  try {
    const usersRef = collection(db, "users");
    const netIDQuery = query(
      usersRef,
      where("netID", ">=", searchQuery.toLowerCase()),
      where("netID", "<=", searchQuery.toLowerCase() + "\uf8ff")
    );

    const snapshot = await getDocs(netIDQuery);
    return snapshot.docs.map((doc) => ({
      netID: doc.data().netID,
      fullName: doc.data().fullName,
      pfp: doc.data().profileImage || "https://firebasestorage.googleapis.com/v0/b/your-project-id.appspot.com/o/default-avatar.png?alt=media"
    }));
  } catch (error) {
    console.error("Error searching users by NetID:", error);
    return [];
  }
};
