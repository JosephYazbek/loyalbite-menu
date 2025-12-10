"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { useRouter, useSearchParams } from "next/navigation";

type Mode = "login" | "signup";

const EMAIL_KEY = "lb_auth_email";
const REMEMBER_KEY = "lb_auth_remember";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const successStatus = searchParams?.get("success") === "password_updated";
  const redirectPath = searchParams?.get("redirect") ?? null;
  const safeRedirectPath =
    redirectPath && redirectPath.startsWith("/") ? redirectPath : null;

  useEffect(() => {
    try {
      const storedEmail = window.localStorage.getItem(EMAIL_KEY);
      const storedRemember = window.localStorage.getItem(REMEMBER_KEY);
      if (storedEmail) setEmail(storedEmail);
      if (storedRemember) setRememberMe(storedRemember === "true");
    } catch {
      // ignore storage failures
    }
  }, []);

  useEffect(() => {
    try {
      if (rememberMe && email) {
        window.localStorage.setItem(EMAIL_KEY, email);
      } else {
        window.localStorage.removeItem(EMAIL_KEY);
      }
      window.localStorage.setItem(REMEMBER_KEY, String(rememberMe));
    } catch {
      // ignore
    }
  }, [rememberMe, email]);

  const errorCode = searchParams?.get("error_code");
  const recoveryError = searchParams?.get("error") === "recovery_expired";
  const isRecovery = searchParams?.get("recovery") === "1";

  useEffect(() => {
    if (!errorCode) return;
    setError("This password reset link is invalid or has expired. Please request another reset email.");
    router.replace("/login");
  }, [errorCode, router]);

  useEffect(() => {
    if (!recoveryError) return;
    setError("This password reset link is invalid or has expired. Please request another reset email.");
    router.replace("/login");
  }, [recoveryError, router]);

  useEffect(() => {
    if (!isRecovery) return;
    setIsRecoveryMode(true);
    setMode("login");
    setError(null);
    setMessage(null);
    setResetMessage(null);
    setNewPassword("");
    setConfirmPassword("");
  }, [isRecovery]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecoveryMode(true);
        setMode("login");
        setError(null);
        setMessage(null);
        setResetMessage(null);
        setNewPassword("");
        setConfirmPassword("");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabaseBrowser.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo:
              typeof window !== "undefined"
                ? `${window.location.origin}/admin`
                : undefined,
          },
        });

        if (signUpError) {
          setError(signUpError.message);
          return;
        }

        if (data.session) {
          router.push(safeRedirectPath ?? "/onboarding");
        } else {
          setMessage("Check your inbox to verify your email before signing in.");
        }
        return;
      }

      const { error: signInError } =
        await supabaseBrowser.auth.signInWithPassword({
          email,
          password,
        });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      router.push(safeRedirectPath ?? "/admin");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    try {
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}${
              safeRedirectPath ?? "/admin"
            }`
          : undefined;
      await supabaseBrowser.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setError("Enter your email to receive a reset link.");
      return;
    }

    setError(null);
    setMessage(null);
    setResetting(true);
    try {
      const { error: resetError } =
        await supabaseBrowser.auth.resetPasswordForEmail(email, {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
        });
      if (resetError) {
        setError(resetError.message);
        return;
      }
      setMessage("Check your inbox for a password reset link.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password reset failed.");
    } finally {
      setResetting(false);
    }
  };

  const handlePasswordUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setResetMessage(null);

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords must match.");
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabaseBrowser.auth.updateUser({
        password: newPassword,
      });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      setIsRecoveryMode(false);
      setNewPassword("");
      setConfirmPassword("");
      setMode("login");
      router.replace("/login?success=password_updated");
      return;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950/95 px-4 py-12 text-white sm:px-8">
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
            LoyalBite Admin
          </p>
          <h1 className="text-4xl font-semibold text-white">
            {mode === "signup" ? "Create your workspace" : "Sign in to manage menus"}
          </h1>
          <p className="max-w-md text-sm text-slate-300">
            Access analytics, edit menus, and update branches from one dashboard.{" "}
            {mode === "signup"
              ? "Set up your credentials to get started instantly."
              : 'Your session stays active when "Remember me" is enabled.'}
          </p>
        </div>

        <div className="mt-10 w-full max-w-md rounded-3xl bg-white p-8 text-slate-900 shadow-2xl">
          {resetMessage && !isRecoveryMode && (
            <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {resetMessage}
            </div>
          )}
          {!isRecoveryMode && successStatus && (
            <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              Password updated successfully. Please sign in.
            </div>
          )}

          {isRecoveryMode ? (
            <>
              <div className="space-y-1 text-center">
                <h2 className="text-2xl font-semibold">Set a new password</h2>
                <p className="text-sm text-slate-500">
                  Enter and confirm your new password to finish resetting your account.
                </p>
              </div>

              <form onSubmit={handlePasswordUpdate} className="mt-6 space-y-4">
                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    New password
                  </label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    required
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    placeholder="••••••••"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Confirm password
                  </label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    placeholder="••••••••"
                    disabled={loading}
                  />
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-70"
                >
                  {loading ? "Updating..." : "Update password"}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="space-y-1 text-center">
                <h2 className="text-2xl font-semibold">
                  {mode === "signup" ? "Sign up" : "Welcome back"}
                </h2>
                <p className="text-sm text-slate-500">
                  {mode === "signup"
                    ? "Create a restaurant owner profile in seconds."
                    : "Enter your credentials to continue."}
                </p>
              </div>

              <form onSubmit={handleAuth} className="mt-6 space-y-4">
                {mode === "signup" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Full name
                    </label>
                    <input
                      type="text"
                      autoComplete="name"
                      required
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                      placeholder="e.g. Jenna Allen"
                      disabled={loading}
                    />
                  </div>
                )}

                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Email
                  </label>
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    placeholder="you@restaurant.com"
                    disabled={loading}
                  />
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Password
                  </label>
                  <input
                    type="password"
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    placeholder="••••••••"
                    disabled={loading}
                  />
                </div>

                <div className="flex items-center justify-between text-sm text-slate-500">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(event) => setRememberMe(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900/30"
                    />
                    Remember me
                  </label>
                  <button
                    type="button"
                    onClick={() => setMode(mode === "signup" ? "login" : "signup")}
                    className="font-semibold text-slate-900"
                  >
                    {mode === "signup" ? "Already have an account?" : "Need an account?"}
                  </button>
                </div>

                {mode === "login" && (
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    disabled={resetting}
                    className="text-left text-sm font-semibold text-slate-900 underline-offset-2 hover:underline disabled:opacity-60"
                  >
                    {resetting ? "Sending reset link..." : "Forgot password?"}
                  </button>
                )}

                {error && <p className="text-sm text-red-500">{error}</p>}
                {message && <p className="text-sm text-green-600">{message}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-70"
                >
                  {loading
                    ? "Please wait..."
                    : mode === "signup"
                      ? "Create account"
                      : "Sign in"}
                </button>
              </form>

              <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-slate-400">
                <div className="h-px flex-1 bg-slate-200" />
                or
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <button
                type="button"
                onClick={handleGoogle}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path
                    fill="#EA4335"
                    d="M12 10.2v3.9h5.4c-.2 1.2-1.4 3.5-5.4 3.5-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.6 2.4 14.5 1.5 12 1.5 6.8 1.5 2.6 5.7 2.6 11s4.2 9.5 9.4 9.5c5.4 0 9-3.8 9-9.2 0-.6-.1-1-.2-1.5H12z"
                  />
                </svg>
                Continue with Google
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

