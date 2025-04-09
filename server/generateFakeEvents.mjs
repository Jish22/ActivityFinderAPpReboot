import admin from "firebase-admin";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { randomUUID } from "crypto";
import { faker } from '@faker-js/faker';


// FIREBASE ADMIN INIT (update path if needed)
import { readFileSync } from "fs";
const serviceAccount = JSON.parse(readFileSync("./config/firebase-admin.json", "utf-8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = getFirestore();

const INTEREST_CATEGORIES = [
  "Sports", "Technology", "Music", "Art", "Health", "Kinesiology", 
  "Computing", "Food", "Finance", "Education", "Business", "Gaming"
];

export const AVATAR_FILENAMES = [
    "default-avatar.png",
    "funEmoji-1744084251488.png",
    "funEmoji-1744084254071.png",
    "funEmoji-1744084256415.png",
    "funEmoji-1744084259009.png",
    "funEmoji-1744084261038.png",
    "funEmoji-1744084263053.png",
    "funEmoji-1744084265798.png",
    "funEmoji-1744084267832.png",
    "funEmoji-1744084270761.png",
    "funEmoji-1744084272872.png",
    "funEmoji-1744084275446.png",
    "funEmoji-1744084277230.png",
    "funEmoji-1744084279922.png",
    "funEmoji-1744084281879.png",
  ];
  
  export const ORG_AVATAR_FILENAMES = [
    "icons-1744084759269.png",
    "icons-1744084761657.png",
    "icons-1744084794743.png",
    "icons-1744084798156.png",
    "icons-1744084800100.png",
    "icons-1744084802664.png",
    "icons-1744084830235.png",
    "icons-1744084849446.png",
    "icons-1744084852912.png",
    "icons-1744084864853.png",
    "icons-1744084878991.png",
    "icons-1744084890545.png",
    "icons-1744084921216.png",
    "icons-1744084924390.png",
    "icons-1744084932581.png",
  ];
  

  const USERS = [];
  const ORGS = [];
  const EVENTS = [];

  const getRandomFromArray = (arr, count) => {
    return [...arr]
      .sort(() => 0.5 - Math.random()) // shuffle the array
      .slice(0, count); // take the first 'count' items
  };
  
  const generateUsers = async () => {
    const batch = db.batch();
    const collectionRef = db.collection("users");
  
    for (let i = 0; i < 50; i++) {
      const id = randomUUID();
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@illinois.edu`;
  
      USERS.push(id);
  
      const userDoc = {
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`.toLowerCase(),
        email,
        netID: email.split("@")[0],
        graduationYear: `${2025 + Math.floor(Math.random() * 4)}`,
        profileImage: getRandomFromArray(AVATAR_FILENAMES)[0],
        interests: getRandomFromArray(INTEREST_CATEGORIES, 3),
        joinedOrganizations: [],
        pendingFriendRequests: [],
        friends: [],
      };
  
      const docRef = collectionRef.doc(id);
      batch.set(docRef, userDoc);
    }
  
    await batch.commit();
    console.log("✅ 50 users created.");
  };
  
  const generateOrganizations = async () => {
    const batch = db.batch();
    const collectionRef = db.collection("organizations");
  
    for (let i = 0; i < 15; i++) {
      const id = randomUUID();
      ORGS.push(id);
  
      const orgDoc = {
        id,
        name: faker.company.name(),
        bio: faker.company.catchPhrase(),
        profileImage: getRandomFromArray(ORG_AVATAR_FILENAMES)[0],
        events: [],
        admins: getRandomFromArray(USERS, 1),
        superAdmin: USERS[Math.floor(Math.random() * USERS.length)],
        members: getRandomFromArray(USERS, Math.floor(Math.random() * 10 + 5)),
      };
  
      const docRef = collectionRef.doc(id);
      batch.set(docRef, orgDoc);
    }
  
    await batch.commit();
    console.log("✅ 15 organizations created.");
  };
  
  const generateEvents = async () => {
    const batch = db.batch();
    const collectionRef = db.collection("events");
  
    for (let i = 0; i < 100; i++) {
      const isPast = i < 30;
      const dateObj = new Date();
      dateObj.setDate(dateObj.getDate() + (isPast ? -Math.floor(Math.random() * 30) : Math.floor(Math.random() * 15)));
  
      const startTime = new Date(dateObj);
      startTime.setHours(10);
      const endTime = new Date(startTime);
      endTime.setHours(12);
  
      const orgId = Math.random() < 0.6 ? getRandomFromArray(ORGS)[0] : null;
      const creator = getRandomFromArray(USERS)[0];
      const attendees = getRandomFromArray(USERS, Math.floor(Math.random() * 10) + 1);
  
      const eventData = {
        name: faker.lorem.words(3),
        description: faker.lorem.sentence(),
        location: faker.location.streetAddress(),
        date: dateObj.toISOString().split("T")[0],
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        attendees,
        attendeesCount: attendees.length,
        createdBy: creator,
        discovery: "public",
        fileUrl: null,
        hostedByOrg: orgId,
        orgProfileImage: getRandomFromArray(ORG_AVATAR_FILENAMES)[0],
        categories: getRandomFromArray(INTEREST_CATEGORIES, Math.floor(Math.random() * 3 + 1)),
        integrationPlatforms: getRandomFromArray(["slack", "discord", "groupme"], Math.floor(Math.random() * 3)),
        pendingApproval: false,
      };
  
      const docRef = collectionRef.doc();
      batch.set(docRef, eventData);
      EVENTS.push({ id: docRef.id, orgId });
    }
  
    await batch.commit();
    console.log("✅ 100 events created.");
  };
  
  const linkEventsToOrganizations = async () => {
    const orgUpdates = {};
  
    EVENTS.forEach(({ id, orgId }) => {
      if (orgId) {
        if (!orgUpdates[orgId]) orgUpdates[orgId] = [];
        orgUpdates[orgId].push(id);
      }
    });
  
    const batch = db.batch();
  
    Object.entries(orgUpdates).forEach(([orgId, eventIds]) => {
      const docRef = db.collection("organizations").doc(orgId);
      batch.update(docRef, { events: admin.firestore.FieldValue.arrayUnion(...eventIds) });
    });
  
    await batch.commit();
    console.log("✅ Events linked to organizations.");
  };
  
  const linkUsersToOrganizations = async () => {
    const batch = db.batch();
    const usersRef = db.collection("users");
  
    USERS.forEach((userId) => {
      const orgs = getRandomFromArray(ORGS, Math.floor(Math.random() * 3) + 1);
      const docRef = usersRef.doc(userId);
      batch.update(docRef, { joinedOrganizations: orgs });
    });
  
    await batch.commit();
    console.log("✅ Users linked to organizations.");
  };
  
  const seedAll = async () => {
    await generateUsers();
    await generateOrganizations();
    await generateEvents();
    await linkEventsToOrganizations();
    await linkUsersToOrganizations();
  };
  
  seedAll().catch(console.error);