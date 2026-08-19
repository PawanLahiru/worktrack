import { useState } from "react";
import {
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";

import { auth } from "../firebase";

function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGoogleLogin() {
    try {
      setLoading(true);
      setError("");
  
      const provider = new GoogleAuthProvider();
  
      await signInWithPopup(
        auth,
        provider
      );
    } catch (err) {
      console.error(
        "Google Login Error:",
        err
      );
  
      setError(
        `${err.code || "Unknown error"}: ${err.message}`
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          W
        </div>

        <h1>WorkTrack</h1>

        <p className="login-subtitle">
          Track your work hours,
          salary and expenses.
        </p>

        <button
          className="google-login-button"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          <span className="google-letter">
            G
          </span>

          {loading
            ? "Signing in..."
            : "Continue with Google"}
        </button>

        {error && (
          <p className="login-error">
            {error}
          </p>
        )}

        <p className="login-footer">
          Your WorkTrack data will sync
          securely across your devices.
        </p>
      </div>
    </div>
  );
}

export default Login;