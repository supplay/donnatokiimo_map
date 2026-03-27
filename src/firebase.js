import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyDIpgZj68CdmN85wSuLFlyYQDcvFfQdr1E",
  authDomain: "donnatokiimo-6e7be.firebaseapp.com",
  projectId: "donnatokiimo-6e7be",
  storageBucket: "donnatokiimo-6e7be.firebasestorage.app",
  messagingSenderId: "154464848783",
  appId: "1:154464848783:web:e68ae3d04a193c20c659fa",
  measurementId: "G-4D7XK01FY0",
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export { messaging, getToken, onMessage };
