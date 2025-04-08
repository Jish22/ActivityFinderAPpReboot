import admin from "firebase-admin";
import { readFileSync } from "fs";

// Load service account credentials from environment variable
const serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();
export { admin, db };