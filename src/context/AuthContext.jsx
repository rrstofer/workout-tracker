import { useEffect, useMemo, useRef, useState } from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  browserLocalPersistence,
  setPersistence,
} from "firebase/auth";
import { auth } from "../firebase";
import { AuthContext } from "./authContext";
import { ensureUserProfile, getUserProfile } from "../services/userService";

export function AuthProvider({ children }) {
  const [authUser, setAuthUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch(() => {});

    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setAuthError("");

      if (!nextUser) {
        setAuthUser(null);
        setUserProfile(null);
        setLoading(false);
        return;
      }

      try {
        const profile = await ensureUserProfile(nextUser);
        setAuthUser(nextUser);
        setUserProfile(profile);
      } catch (error) {
        console.error("Failed to load user profile", error);
        setAuthUser(nextUser);
        try {
          const fallbackProfile = await getUserProfile(nextUser.uid);
          setUserProfile(fallbackProfile);
        } catch {
          setUserProfile(null);
        }
        setAuthError("We could not finish setting up your profile. Try signing in again.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // useRef survives StrictMode double-invocation in dev
  const signInInProgress = useRef(false);

  const signInWithGoogle = async () => {
    if (signInInProgress.current) return;
    signInInProgress.current = true;
    setAuthError("");

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    try {
      // Use popup for everything — popups work on mobile Safari when triggered
      // by a user click. The redirect flow has iOS Safari ITP issues that cause
      // the user to bounce back to the login page after authenticating.
      await signInWithPopup(auth, provider);
    } catch (error) {
      // Ignore user-closed popup (they just changed their mind)
      if (error.code === "auth/popup-closed-by-user") return;

      console.error("Google sign-in failed", error?.code, error?.message);
      setAuthError("Could not sign in with Google. Please try again.");
      throw error;
    } finally {
      signInInProgress.current = false;
    }
  };

  const signOut = async () => {
    setAuthError("");
    await firebaseSignOut(auth);
  };

  const value = useMemo(
    () => ({
      authUser,
      userProfile,
      loading,
      authError,
      signInWithGoogle,
      signOut,
      isAdmin: Boolean(userProfile?.isAdmin),
    }),
    [authError, authUser, loading, userProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
