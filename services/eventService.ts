import { collection, addDoc, getDocs, doc, getDoc, query, where, updateDoc, deleteDoc, arrayRemove, arrayUnion, orderBy, limit, startAfter  } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db, auth } from "./firebaseConfig";

// Create a new event
// Create an event (pending approval if for an organization)
export const createEvent = async (eventData: any) => {
  try {
    const requiresApproval = eventData.hostedByOrg ? true : false;

    const formattedEventData = {
      ...eventData,
      pendingApproval: requiresApproval,
      discovery: eventData.discovery.toLowerCase(), 
    };

    const eventRef = await addDoc(collection(db, "events"), formattedEventData);

    if (eventData.hostedByOrg) {
      const orgRef = doc(db, "organizations", eventData.hostedByOrg);
      await updateDoc(orgRef, {
        pendingEvents: arrayUnion(eventRef.id),
      });
      if (__DEV__) {
        console.log(`Event submitted for approval under org: ${eventData.hostedByOrg}`);
      }
    } else {

      const userId = auth.currentUser?.uid;
      if (userId) {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
          yourEvents: arrayUnion(eventRef.id),
        });
        if (__DEV__) {
          console.log(`Event added to user's events: ${eventRef.id}`);
        }
      }
    }

    return eventRef.id;
  } catch (error) {
    console.error("Error creating event:", error);
    throw error;
  }
};

export const getEvents = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "events"));
    const events = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return events;
  } catch (error) {
    console.error("Error fetching events:", error);
    throw error;
  }
};



export const getUserProfile = async (userId: string) => {
    try {
      const docRef = doc(db, "users", userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data();
      } else {
        if (__DEV__) {
          console.log("No such document!");
        }
        return null;
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      throw error;
    }
  };


  export const rsvpToEvent = async (eventId: string, userId: string) => {
    try {
      const auth = getAuth();
      if (!auth.currentUser) {
        throw new Error("User is not authenticated.");
      }
  
      const eventRef = doc(db, "events", eventId);
      const userRef = doc(db, "users", userId);

      await updateDoc(eventRef, {
        attendees: arrayUnion(userId),
      });

      await updateDoc(userRef, {
        yourEvents: arrayUnion(eventId),
      });
      if (__DEV__) {
        console.log(`User ${userId} successfully RSVP'd to event ${eventId}`);
      }
      return true;
    } catch (error) {
      console.error("Error RSVPing to event:", error);
      throw error;
    }
  };

  // Paginated getFilteredEvents with optimized Firestore indexes
export const getFilteredEvents = async (
  userId: string,
  userInterests: string[],
  joinedOrganizations: string[],
  friends: string[],
  lastVisibleMap: Record<string, any> = {},
  pageSize: number = 10
) => {
  try {
    const eventsRef = collection(db, "events");
    const now = new Date().toISOString();

    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    const userEventsIds = userSnap.exists() ? userSnap.data().yourEvents || [] : [];
    const yourEventsSet = new Set(userEventsIds);

    let userEvents = [];
    if (userEventsIds.length > 0) {
      const eventPromises = userEventsIds
        .filter((eventId: string) => eventId)
        .map((eventId: string) => getDoc(doc(db, "events", eventId)));

      const eventDocs = await Promise.all(eventPromises);
      userEvents = eventDocs
        .filter((doc) => doc.exists())
        .map((doc) => ({ id: doc.id, ...doc.data() }));
    }

    const queries = [];

    if (userInterests.length > 0) {
      let discoverQuery = query(
        eventsRef,
        where("categories", "array-contains-any", userInterests),
        where("discovery", "==", "public"),
        where("pendingApproval", "==", false),
        where("endTime", ">=", now),
        orderBy("endTime"),
        limit(pageSize)
      );
      if (lastVisibleMap.discover) {
        discoverQuery = query(discoverQuery, startAfter(lastVisibleMap.discover));
      }
      queries.push(getDocs(discoverQuery));
    } else {
      queries.push(Promise.resolve({ docs: [] }));
    }

    if (joinedOrganizations.length > 0) {
      let orgQuery = query(
        eventsRef,
        where("hostedByOrg", "in", joinedOrganizations),
        where("pendingApproval", "==", false),
        where("endTime", ">=", now),
        orderBy("endTime"),
        limit(pageSize)
      );
      if (lastVisibleMap.organizations) {
        orgQuery = query(orgQuery, startAfter(lastVisibleMap.organizations));
      }
      queries.push(getDocs(orgQuery));
    } else {
      queries.push(Promise.resolve({ docs: [] }));
    }

    const friendConditions = [
      ["createdBy", friends],
      ["attendees", friends]
    ];

    for (const [field, values] of friendConditions) {
      if (values.length > 0) {
        let friendQuery = query(
          eventsRef,
          where(field, "array-contains-any", values),
          where("discovery", "==", "public"),
          where("pendingApproval", "==", false),
          where("endTime", ">=", now),
          orderBy("endTime"),
          limit(pageSize)
        );
        if (lastVisibleMap[field]) {
          friendQuery = query(friendQuery, startAfter(lastVisibleMap[field]));
        }
        queries.push(getDocs(friendQuery));
      } else {
        queries.push(Promise.resolve({ docs: [] }));
      }
    }

    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

    const popularQuery = query(
      eventsRef,
      where("discovery", "==", "public"),
      where("pendingApproval", "==", false),
      where("endTime", ">=", now),
      where("endTime", "<=", oneWeekFromNow.toISOString()),
      orderBy("attendeesCount", "desc"),
      limit(10)
    );
    const popularSnap = await getDocs(popularQuery);
    const popularEvents = popularSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    if (__DEV__) {
      console.log(popularEvents)
    }

    const [discoverSnap, organizationSnap, friendsCreatedSnap, friendsAttendingSnap] = await Promise.all(queries);

    const discoverEvents = discoverSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const organizationEvents = organizationSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const friendsCreatedEvents = friendsCreatedSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const friendsAttendingEvents = friendsAttendingSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    let friendEvents = [...friendsCreatedEvents, ...friendsAttendingEvents];
    const organizationEventIds = new Set(organizationEvents.map((event) => event.id));
    const organizationHostIds = new Set(organizationEvents.map((event) => event.hostedByOrg));

    const filteredDiscoverEvents = discoverEvents.filter(
      (event) =>
        !organizationEventIds.has(event.id) &&
        !organizationHostIds.has(event.hostedByOrg) &&
        !yourEventsSet.has(event.id)
    );

    friendEvents = friendEvents.filter(
      (event) =>
        !organizationEventIds.has(event.id) &&
        !organizationHostIds.has(event.hostedByOrg) &&
        !yourEventsSet.has(event.id)
    );

    const filterAndSortEvents = (events: any[]) => {
      return events
        .filter((event) => event.endTime && new Date(event.endTime) >= new Date(now))
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    };

    return {
      yourEvents: filterAndSortEvents(userEvents),
      discover: filterAndSortEvents(filteredDiscoverEvents),
      organizations: filterAndSortEvents(organizationEvents),
      friends: filterAndSortEvents(friendEvents),
      popular: popularEvents,

      lastVisible: {
        discover: discoverSnap.docs[discoverSnap.docs.length - 1],
        organizations: organizationSnap.docs[organizationSnap.docs.length - 1],
        createdBy: friendsCreatedSnap.docs[friendsCreatedSnap.docs.length - 1],
        attendees: friendsAttendingSnap.docs[friendsAttendingSnap.docs.length - 1],
      },
    };
  } catch (error) {
    console.error("Error fetching events:", error);
    throw error;
  }
};

  

  export interface EventData {
    id: string;
    name: string;
    description?: string;
    date?: string; 
    startTime?: string; 
    endTime?: string; 
    location?: string;
    categories?: string[];
    hostedByOrg?: string | null; 
    createdBy?: string; 
    attendees?: string[]; 
    discovery?: "public" | "private"; 
    pendingApproval?: boolean;
    integrationPlatforms?:string[];
  }
  
export const getEventDetails = async (eventId: string): Promise<EventData | null> => {
  try {
    const eventRef = doc(db, "events", eventId);
    const eventSnap = await getDoc(eventRef);

    if (!eventSnap.exists()) {
      console.error(`Event ${eventId} not found.`);
      return null;
    }

    const eventData = eventSnap.data();

    return {
      id: eventSnap.id,
      name: eventData.name || "Untitled Event",
      description: eventData.description || "",
      date: eventData.date || "",
      startTime: eventData.startTime || "",
      endTime: eventData.endTime || "",
      location: eventData.location || "No location",
      categories: eventData.categories || [],
      hostedByOrg: eventData.hostedByOrg || null,
      createdBy: eventData.createdBy || "",
      attendees: eventData.attendees || [],
      discovery: eventData.discovery || "private",
      pendingApproval: eventData.pendingApproval || false,
      integrationPlatforms: eventData.integrationPlatforms || [],
    };
  } catch (error) {
    console.error("Error fetching event details:", error);
    return null;
  }
};

export const deleteEvent = async (eventId: string, orgId: string | null) => {
  try {
    const eventRef = doc(db, "events", eventId);
    await deleteDoc(eventRef);
    if (__DEV__) {
      console.log(`Event ${eventId} deleted.`);
    }

    if (orgId) {
      const orgRef = doc(db, "organizations", orgId);
      await updateDoc(orgRef, {
        events: arrayRemove(eventId),
      });
      if (__DEV__) {
        console.log(`Event ${eventId} removed from organization ${orgId}.`);
      }
    }
  } catch (error) {
    console.error("Error deleting event:", error);
    throw error;
  }
};

export const editEvent = async (eventId: string, updatedData: any) => {
  try {
    const eventRef = doc(db, "events", eventId);
    await updateDoc(eventRef, updatedData);
    if (__DEV__) {
      console.log(`Event ${eventId} updated.`);
    }
  } catch (error) {
    console.error("Error updating event:", error);
    throw error;
  }
};


export const unRsvpFromEvent = async (eventId: string, userId: string) => {
  try {
    const eventRef = doc(db, "events", eventId);
    const userRef = doc(db, "users", userId);

    await updateDoc(eventRef, {
      attendees: arrayRemove(userId), 
    });

    await updateDoc(userRef, {
      yourEvents: arrayRemove(eventId),
    });
  } catch (error) {
    console.error("Error leaving event:", error);
    throw error;
  }
};

export const isUserRSVPd = async (eventId: string, userId: string) => {
  try {
    const eventRef = doc(db, "events", eventId);
    const eventSnap = await getDoc(eventRef);
    if (eventSnap.exists()) {
      const eventData = eventSnap.data();
      return eventData.attendees?.includes(userId) || false;
    }
    return false;
  } catch (error) {
    console.error("Error checking RSVP status:", error);
    return false;
  }
};

import { enableIndexedDbPersistence, disableNetwork, enableNetwork } from "firebase/firestore";
export const getEventAttendees = async (eventId: string) => {
  if (__DEV__) {
    console.log("🔵 Entering getEventAttendees function with eventId:", eventId); 
  }

  try {
    const eventRef = doc(db, "events", eventId);
    if (__DEV__) {
      console.log("📌 Fetching event document from Firestore..."); 
    }
    const eventSnap = await getDoc(eventRef);

    if (!eventSnap.exists()) {
      console.error("❌ Event does not exist in Firestore.");
      return [];
    }
    if (__DEV__) {
      console.log("Event found! Data:", eventSnap.data()); 
    }

    const eventData = eventSnap.data();
    const attendeeIds = eventData.attendees || [];

    if (!Array.isArray(attendeeIds)) {
      console.error("Attendees field is missing or not an array.");
      return [];
    }

    if (attendeeIds.length === 0) {
      if (__DEV__) {
        console.log("No attendees found for this event.");
      }
      return [];
    }

    if (__DEV__) {
      console.log("Fetching attendees' details...");
    }

    const attendees = await Promise.all(
      attendeeIds.map(async (userId: string) => {
        if (__DEV__) {
          console.log(`📌 Fetching user: ${userId}`);
        }
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          return {
            id: userId,
            name: `${userData.firstName || "Unknown"} ${userData.lastName || ""}`.trim(),
          };
        } else {
          console.error(`❌ User ${userId} does not exist.`);
          return { id: userId, name: "Unknown User" };
        }
      })
    );
    if (__DEV__) {
      console.log("✅ Successfully fetched attendees:", attendees);
    }
    return attendees;
  } catch (error) {
    console.error("❌ Error fetching event attendees:", error);
    return [];
  }
};

export const getPastEvents = async (orgId: string) => {
  try {
    const q = query(
      collection(db, "pastEvents"),
      where("hostedByOrg", "==", orgId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching past events:", error);
    throw error;
  }
};
