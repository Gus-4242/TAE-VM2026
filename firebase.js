// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBd2NU7zYpkbe4CbFs_hPEmutKJhZyaLQw",
  authDomain: "tae-vm2026.firebaseapp.com",
  projectId: "tae-vm2026",
  storageBucket: "tae-vm2026.firebasestorage.app",
  messagingSenderId: "922497387865",
  appId: "1:922497387865:web:5fa6080198501938d0d048",
  measurementId: "G-YBPMZY3K8B"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// TEST FUNCTION
export async function testFirebaseConnection() {
  try {
    const docRef = await addDoc(collection(db, "test"), {
      message: "Firebase connection works!",
      created: new Date().toISOString()
    });

    console.log("Firebase test success:", docRef.id);

    alert("🔥 Firebase connected successfully!");
  } catch (error) {
    console.error(error);

    alert("Firebase error: " + error.message);
  }
}
