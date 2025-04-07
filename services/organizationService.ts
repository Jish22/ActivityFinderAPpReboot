import { collection, getDocs, setDoc, doc, updateDoc, arrayUnion, deleteDoc,arrayRemove, getDoc } from "firebase/firestore";
import { db } from "./firebaseConfig";

export const getOrganizations = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "organizations"));
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching organizations:", error);
    throw error;
  }
};

export const requestToJoinOrganization = async (orgId: string, netID: string) => {
  try {
    const orgRef = doc(db, "organizations", orgId);
    await updateDoc(orgRef, {
      pendingMembers: arrayUnion(netID),
    });
    console.log(`${netID} requested to join ${orgId}`);
  } catch (error) {
    console.error("Error requesting to join organization:", error);
    throw error;
  }
};

export const leaveOrganization = async (orgId: string, netID: string) => {
  try {
    const orgRef = doc(db, "organizations", orgId);
    const userRef = doc(db, "users", netID);

    await updateDoc(orgRef, {
      members: arrayRemove(netID),
      admins: arrayRemove(netID),
    });

    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      throw new Error("User does not exist");
    }

    await updateDoc(userRef, {
      joinedOrganizations: arrayRemove(orgId),
    });
    
    console.log(`${netID} left ${orgId}`);
  } catch (error) {
    console.error("Error leaving organization:", error);
    throw error;
  }
};

export const getUserOrgStatus = async (orgId: string, netID: string) => {
  try {
    const orgRef = doc(db, "organizations", orgId);
    const orgDoc = await getDoc(orgRef);

    if (!orgDoc.exists()) return { status: "join" };

    const orgData = orgDoc.data();

    const members = orgData.members || [];
    const pendingMembers = orgData.pendingMembers || [];

    if (members.includes(netID)) return { status: "leave" };
    if (pendingMembers.includes(netID)) return { status: "pending" };

    return { status: "join" };
  } catch (error) {
    console.error("Error checking org status:", error);
    return { status: "join" };
  }
};

type OrganizationDetails = {
  id: string;
  name: string;
  bio: string;
  pfp: string;
  admins: string[];
  superAdmin: string;
  members: string[];
  events: string[];
  pendingMembers: string[];
  profileImage: string;
};

export const getOrganizationDetails = async (orgId: string): Promise<OrganizationDetails | null> => {
  try {
    const orgRef = doc(db, "organizations", orgId);
    const orgSnap = await getDoc(orgRef);

    if (orgSnap.exists()) {
      const data = orgSnap.data();

      const organization: OrganizationDetails = {
        id: orgId,
        name: data.name || "",
        bio: data.bio || "",
        pfp: data.profilImage || "",
        admins: data.admins || [],
        superAdmin: data.superAdmin || "",
        members: data.members || [],
        events: data.events || [],
        pendingMembers: data.pendingMembers || [],
        profileImage: data.profileImage || "",
      };

      return organization;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error fetching organization details:", error);
    throw error;
  }
};

export const fetchMemberDetails = async (netIDs: string[]) => {
  try {
    const membersData = await Promise.all(
      netIDs.map(async (netID) => {
        const userRef = doc(db, "users", netID);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          return {
            netID,
            firstName: userData.firstName || "",
            lastName: userData.lastName || "",
          };
        }
        return null;
      })
    );

    return membersData.filter(Boolean);
  } catch (error) {
    console.error("Error fetching member details:", error);
    throw error;
  }
};


export const getOrganizationPendingRequests = async (orgId: string) => {
  try {
    const orgRef = doc(db, "organizations", orgId);
    const orgSnap = await getDoc(orgRef);

    if (orgSnap.exists()) {
      const data = orgSnap.data();
      return {
        id: orgId,
        name: data.name,
        pendingMembers: data.pendingMembers || [],
        pendingEvents: data.pendingEvents || [],
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error fetching organization requests:", error);
    throw error;
  }
};

export const approveEvent = async (orgId: string, eventId: string) => {
  try {
    const orgRef = doc(db, "organizations", orgId);
    const eventRef = doc(db, "events", eventId);

    const orgSnap = await getDoc(orgRef);
    const eventSnap = await getDoc(eventRef);

    if (!orgSnap.exists() || !eventSnap.exists()) {
      console.error("Organization or Event not found");
      return;
    }

    const orgData = orgSnap.data();
    const updatedPendingEvents = orgData.pendingEvents.filter((id: string) => id !== eventId);

    await updateDoc(eventRef, {
      pendingApproval: false, 
    });

    await updateDoc(orgRef, {
      pendingEvents: updatedPendingEvents,
      events: arrayUnion(eventId),
    });

    console.log(`Event ${eventId} approved for ${orgId} and marked as approved`);
  } catch (error) {
    console.error("Error approving event:", error);
    throw error;
  }
};

export const declineEvent = async (orgId: string, eventId: string) => {
  try {
    const orgRef = doc(db, "organizations", orgId);
    const eventRef = doc(db, "events", eventId);

    await updateDoc(orgRef, {
      pendingEvents: arrayRemove(eventId),
    });

    await deleteDoc(eventRef);

    console.log(`Event ${eventId} declined and deleted for ${orgId}`);
  } catch (error) {
    console.error("Error declining and deleting event:", error);
    throw error;
  }
};

export const approveMember = async (orgId: string, netID: string) => {
  try {
    const orgRef = doc(db, "organizations", orgId);
    const userRef = doc(db, "users", netID);

    await updateDoc(orgRef, {
      pendingMembers: arrayRemove(netID),
      members: arrayUnion(netID),
    });

    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      throw new Error("User does not exist");
    }

    await updateDoc(userRef, {
      joinedOrganizations: arrayUnion(orgId),
    });


    console.log(`Member ${netID} approved for ${orgId}`);
  } catch (error) {
    console.error("Error approving member:", error);
    throw error;
  }
};

export const declineMember = async (orgId: string, netID: string) => {
  try {
    const orgRef = doc(db, "organizations", orgId);
    await updateDoc(orgRef, {
      pendingMembers: arrayRemove(netID),
    });

    console.log(`Member ${netID} declined for ${orgId}`);
  } catch (error) {
    console.error("Error declining member:", error);
    throw error;
  }
};

export const promoteToAdmin = async (orgId: string, netID: string) => {
  try {
    const orgRef = doc(db, "organizations", orgId);
    await updateDoc(orgRef, {
      admins: arrayUnion(netID),
    });
    console.log(`Member ${netID} promoted to admin in ${orgId}`);
  } catch (error) {
    console.error("Error promoting to admin:", error);
    throw error;
  }
};

export const demoteAdmin = async (orgId: string, netID: string) => {
  try {
    const orgRef = doc(db, "organizations", orgId);
    await updateDoc(orgRef, {
      admins: arrayRemove(netID),
    });
    console.log(`Admin ${netID} demoted to member in ${orgId}`);
  } catch (error) {
    console.error("Error demoting admin:", error);
    throw error;
  }
};

export const transferSuperAdmin = async (orgId: string, newSuperAdminID: string, oldSuperAdminID: string) => {
  try {
    const orgRef = doc(db, "organizations", orgId);
    const orgSnap = await getDoc(orgRef);
    if (!orgSnap.exists()) return;

    const orgData = orgSnap.data();
    if (!orgData.admins.includes(newSuperAdminID)) {
      throw new Error("New Super Admin must be an existing admin.");
    }

    await updateDoc(orgRef, {
      superAdmin: newSuperAdminID,
      admins: arrayUnion(oldSuperAdminID), 
    });

    console.log(`Super Admin role transferred to ${newSuperAdminID} in ${orgId}`);
  } catch (error) {
    console.error("Error transferring Super Admin role:", error);
    throw error;
  }
};

export const getUserFullName = async (netID: string) => {
  try {
    const userRef = doc(db, "users", netID);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const userData = userSnap.data();
      return `${userData.firstName} ${userData.lastName}`;
    }
    return "Unknown User";
  } catch (error) {
    console.error("Error fetching user full name:", error);
    return "Unknown User";
  }
};

export const getUserNetID = async (netID: string) => {
  try {
    const userRef = doc(db, "users", netID);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const userData = userSnap.data();
      return userData.netID;
    }
    return "Unknown User";
  } catch (error) {
    console.error("Error fetching user netid:", error);
    return "Unknown User";
  }
};

export const updateOrganizationBio = async (orgId: string, newBio: string) => {
  try {
    const orgRef = doc(db, "organizations", orgId);
    await updateDoc(orgRef, { bio: newBio });
  } catch (error) {
    console.error("Error updating organization bio:", error);
    throw new Error("Failed to update bio.");
  }
};

export const cancelJoinRequest = async (orgId: string, netID: string) => {
  try {
    const orgRef = doc(db, "organizations", orgId);
    const orgSnap = await getDoc(orgRef);

    if (!orgSnap.exists()) {
      throw new Error("Organization not found.");
    }

    await updateDoc(orgRef, {
      pendingMembers: arrayRemove(netID), 
    });

    console.log(`Join request canceled for organization: ${orgId}, User: ${netID}`);
  } catch (error) {
    console.error("Error canceling join request:", error);
    throw error;
  }
};


export const updateOrganizationProfileImage = async (orgId: string, imageUrl: string) => {
  const orgRef = doc(db, "organizations", orgId);
  try {
    await updateDoc(orgRef, { profileImage: imageUrl });
    console.log("Organization profile image updated successfully!");
  } catch (error) {
    console.error("Error updating organization profile image:", error);
    throw error;
  }
};


export const createOrganization = async (orgData: any, userId: string) => {
  const orgRef = doc(db, "organizations", orgData.name.replace(/\s+/g, "").toLowerCase());
  await setDoc(orgRef, orgData);

  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, {
    joinedOrganizations: arrayUnion(orgRef.id),
  });
};
