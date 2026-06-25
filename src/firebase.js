// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD92_KwJM1hdyoRpzMvx8TOSEs_olnSrpM",
  authDomain: "workoutlog-1b8b8.firebaseapp.com",
  projectId: "workoutlog-1b8b8",
  storageBucket: "workoutlog-1b8b8.firebasestorage.app",
  messagingSenderId: "978804990017",
  appId: "1:978804990017:web:e631aff8608e2a590766c0",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

