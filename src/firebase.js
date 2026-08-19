import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAgt8sIz244tDzllcXG-ClT98DZP6sCGWo",
    authDomain: "worktrack-pavan.firebaseapp.com",
    projectId: "worktrack-pavan",
    storageBucket: "worktrack-pavan.firebasestorage.app",
    messagingSenderId: "403396938940",
    appId: "1:403396938940:web:44da016076627f95b394b9"
  };

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;