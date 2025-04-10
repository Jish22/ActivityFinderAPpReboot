import admin from "firebase-admin";
import fs from "fs";

const serviceAccountPath = "/etc/secrets/firebase-admin.json";
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();
export { admin, db };