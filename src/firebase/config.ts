import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

// Require the three fields auth + Firestore actually need (apiKey alone isn't
// enough to talk to a real project), and reject the `.env.example` placeholders
// so a half-filled env never flips accounts on with a broken backend.
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.apiKey !== "your-api-key" &&
    firebaseConfig.authDomain &&
    !firebaseConfig.authDomain.startsWith("your-project") &&
    firebaseConfig.projectId &&
    firebaseConfig.projectId !== "your-project-id"
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);

  if (import.meta.env.VITE_FIREBASE_USE_EMULATOR === 'true') {
    connectAuthEmulator(auth, 'http://localhost:9099');
  }
}

// Optional App Check — strongly recommended before a public launch to protect
// Auth, Firestore, and the Firebase AI Logic quota from abuse/bots. Activated
// only when a reCAPTCHA Enterprise site key is provided (lazy-imported so the
// SDK never loads otherwise); skipped in local dev so nothing breaks when the
// key is absent. To enable: create a reCAPTCHA Enterprise key, register it in
// Firebase console → App Check, and set VITE_RECAPTCHA_SITE_KEY (see
// .env.example). Enforcement is toggled per-product in the console.
if (app && import.meta.env.VITE_RECAPTCHA_SITE_KEY) {
  const firebaseApp = app;
  void import('firebase/app-check')
    .then(({ initializeAppCheck, ReCaptchaEnterpriseProvider }) => {
      initializeAppCheck(firebaseApp, {
        provider: new ReCaptchaEnterpriseProvider(
          import.meta.env.VITE_RECAPTCHA_SITE_KEY as string,
        ),
        isTokenAutoRefreshEnabled: true,
      });
    })
    .catch(() => {
      // App Check is best-effort; a failure here must not break the app.
    });
}

// `app` is exported so other Firebase services (e.g. AI Logic in `./ai`) can
// attach to the same initialized app. It is null when Firebase is unconfigured.
export { app, auth, db };
