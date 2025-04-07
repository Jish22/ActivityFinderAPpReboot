// src/services/integrationsService.ts

import { getFirestore, collection, getDoc, doc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebaseConfig";


export const saveIntegration = async (orgId: string, integrationData: object) => {
    try {
      const integrationRef = doc(db, "integrations", orgId);
      const integrationSnap = await getDoc(integrationRef);
  
      if (integrationSnap.exists()) {
        await updateDoc(integrationRef, integrationData);
      } else {
        await setDoc(integrationRef, integrationData);
      }
    } catch (error) {
      console.error("Error saving integration:", error);
      throw error;
    }
  };