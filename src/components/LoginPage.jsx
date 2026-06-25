import { useState } from "react";
import { useAuth } from "../context/useAuth";

export function LoginPage() {
  const { signInWithGoogle, authError } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [localError, setLocalError] = useState("");

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setLocalError("");

    try {
      await signInWithGoogle();
    } catch {
      setLocalError("Could not sign in with Google. Please try again.");
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <p className="eyebrow">Ryan's Workout Logger</p>
        <h1>Sign in to continue</h1>
        <p className="auth-copy">
          Sign in with Google to access your workouts. New users are automatically
          registered — no separate sign-up needed.
        </p>

        <button
          className="google-sign-in-btn"
          type="button"
          onClick={handleSignIn}
          disabled={isSigningIn}
        >
          <span className="google-mark" aria-hidden>
            G
          </span>
          {isSigningIn ? "Signing in..." : "Continue with Google"}
        </button>

        {(localError || authError) && (
          <p className="auth-error" role="alert">
            {localError || authError}
          </p>
        )}
      </section>
    </main>
  );
}
