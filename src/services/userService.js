import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import {
  ADMIN_USERNAMES,
  LEGACY_USER_EMAILS,
  slugifyUsername,
} from "../config/authConfig";

const usersRef = collection(db, "users");

const titleCaseUsername = (username) =>
  username.charAt(0).toUpperCase() + username.slice(1);

const buildProfilePayload = ({ uid, email, displayName, username }) => ({
  uid,
  email: email || "",
  displayName: displayName || titleCaseUsername(username),
  username,
  isAdmin: ADMIN_USERNAMES.includes(username),
  updatedAt: serverTimestamp(),
});

const usernameExists = async (username, excludeUid = null) => {
  const matches = await getDocs(query(usersRef, where("username", "==", username)));
  return matches.docs.some((snapshot) => snapshot.id !== excludeUid);
};

const resolveUsernameForNewUser = async (firebaseUser) => {
  const email = firebaseUser.email?.toLowerCase() || "";

  if (LEGACY_USER_EMAILS[email]) {
    const legacyUsername = LEGACY_USER_EMAILS[email];
    const legacyTaken = await usernameExists(legacyUsername);

    if (!legacyTaken) {
      return legacyUsername;
    }

    const legacyOwner = await getDocs(
      query(usersRef, where("username", "==", legacyUsername))
    );
    const ownerDoc = legacyOwner.docs[0];

    if (ownerDoc && ownerDoc.id === firebaseUser.uid) {
      return legacyUsername;
    }
  }

  const displaySlug = slugifyUsername(firebaseUser.displayName);
  if (ADMIN_USERNAMES.includes(displaySlug) && !(await usernameExists(displaySlug))) {
    return displaySlug;
  }

  const baseUsername = slugifyUsername(
    firebaseUser.displayName || email.split("@")[0] || firebaseUser.uid.slice(0, 8)
  );

  let candidate = baseUsername;
  let suffix = 2;

  while (await usernameExists(candidate, firebaseUser.uid)) {
    candidate = `${baseUsername}-${suffix}`;
    suffix += 1;
  }

  return candidate;
};

export const getUserProfile = async (uid) => {
  const snapshot = await getDoc(doc(db, "users", uid));
  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
};

export const ensureUserProfile = async (firebaseUser) => {
  const existingRef = doc(db, "users", firebaseUser.uid);
  const existingSnapshot = await getDoc(existingRef);

  if (existingSnapshot.exists()) {
    const existing = existingSnapshot.data();
    const username = existing.username;
    const payload = buildProfilePayload({
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName || existing.displayName,
      username,
    });

    await setDoc(existingRef, payload, { merge: true });

    return {
      id: firebaseUser.uid,
      ...payload,
      createdAt: existing.createdAt,
    };
  }

  const username = await resolveUsernameForNewUser(firebaseUser);
  const payload = {
    ...buildProfilePayload({
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      username,
    }),
    createdAt: serverTimestamp(),
  };

  await setDoc(existingRef, payload);

  return {
    id: firebaseUser.uid,
    ...payload,
  };
};

export const listUserProfiles = async () => {
  const snapshot = await getDocs(usersRef);

  return snapshot.docs
    .map((userDoc) => ({
      id: userDoc.id,
      ...userDoc.data(),
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
};
