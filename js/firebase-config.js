// ===== FIREBASE CONFIGURATION =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  onAuthStateChanged, signOut, updateProfile
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, deleteDoc,
  collection, addDoc, query, where, getDocs, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyAodUP4ovThYhIqyYSWnhtpL_KrhB6pILo",
  authDomain: "webbang-32962.firebaseapp.com",
  projectId: "webbang-32962",
  storageBucket: "webbang-32962.firebasestorage.app",
  messagingSenderId: "721233682498",
  appId: "1:721233682498:web:4f6148d2424f7fe9174ddb"
};

const app     = initializeApp(firebaseConfig);
const auth    = getAuth(app);
const db      = getFirestore(app);
const storage = getStorage(app);

export {
  app, auth, db, storage,
  GoogleAuthProvider, signInWithPopup,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  onAuthStateChanged, signOut, updateProfile,
  doc, setDoc, getDoc, updateDoc, deleteDoc,
  collection, addDoc, query, where, getDocs, serverTimestamp,
  ref, getDownloadURL
};
