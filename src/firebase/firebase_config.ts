// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAoUeoCUs-sSrIdM0AYnqb5PIyaP3vB2Tw",
  authDomain: "owl-agent-11953.firebaseapp.com",
  projectId: "owl-agent-11953",
  storageBucket: "owl-agent-11953.firebasestorage.app",
  messagingSenderId: "255830645169",
  appId: "your app id",
  measurementId: "G-T7ZFQ3SY7E"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// const analytics = getAnalytics(app);
export const db = getFirestore(app);
export default app;
