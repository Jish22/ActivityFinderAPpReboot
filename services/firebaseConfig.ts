import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyCCNfbY304whMuoiMZvPfh-6vkjE15tWSU",
    authDomain: "activityfinderapp-7ba1e.firebaseapp.com",
    projectId: "activityfinderapp-7ba1e",
    storageBucket: "activityfinderapp-7ba1e.firebasestorage.app",
    messagingSenderId: "966037452150",
    appId: "1:966037452150:web:2bfa8c07daf9db66097657",
    measurementId: "G-NL9VD2VSZ9"
  };
// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export const saveUserProfile = async (userId: string, profileData: any) => {
  try {
    // Ensure netID is lowercase before saving
    const normalizedProfileData = {
      ...profileData,
      netID: profileData.netID?.toLowerCase(), // Normalize netID if it exists
      email: profileData.email?.toLowerCase(),
    };

    await setDoc(doc(db, "users", userId), normalizedProfileData, { merge: true });
    console.log("Profile saved successfully with normalized netID");
  } catch (error) {
    console.error("Error saving profile:", error);
    throw error;
  }
};


export const getUserProfile = async (userId: string) => {
  try {
    const docSnap = await getDoc(doc(db, "users", userId));
    return docSnap.exists() ? docSnap.data() : null;
  } catch (error) {
    console.error("Error fetching profile:", error);
    throw error;
  }
};



export const getUserDetailsByUID = async (uid: string) => {
  try {
    const userRef = doc(db, "users", uid);
    const userSnapshot = await getDoc(userRef);

    if (userSnapshot.exists()) {
      return userSnapshot.data();
    } else {
      console.warn(`User not found for UID: ${uid}`);
      return null;
    }
  } catch (error) {
    console.error("Error fetching user details:", error);
    return null;
  }
};