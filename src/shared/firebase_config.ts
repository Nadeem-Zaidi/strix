// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
const firebaseConfig = {
  apiKey: "AIzaSyAoUeoCUs-sSrIdM0AYnqb5PIyaP3vB2Tw",
  authDomain: "owl-agent-11953.firebaseapp.com",
  projectId: "owl-agent-11953",
  storageBucket: "owl-agent-11953.firebasestorage.app",
  messagingSenderId: "255830645169",
  appId: "your app id",
  measurementId: "G-T7ZFQ3SY7E"
};


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
