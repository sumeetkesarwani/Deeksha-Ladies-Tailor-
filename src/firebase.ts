import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

export const firebaseConfig = {
  apiKey: "AIzaSyDA7qYT7x85-w4EV6DUCj5B5Iciwj3CZQQ",
  authDomain: "deeksha-ladies-tailors.firebaseapp.com",
  databaseURL: "https://deeksha-ladies-tailors-default-rtdb.firebaseio.com",
  projectId: "deeksha-ladies-tailors",
  storageBucket: "deeksha-ladies-tailors.firebasestorage.app",
  messagingSenderId: "932152998069",
  appId: "1:932152998069:web:051844e47174597deea6fc",
  measurementId: "G-09VETGCRDP",
};

export const firebaseApp = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
export const rtdb = getDatabase(firebaseApp);
