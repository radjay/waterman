"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { useAuth, useUser } from "../../components/auth/AuthProvider";
import { MainLayout } from "../../components/layout/MainLayout";
import { Header } from "../../components/layout/Header";
import { Footer } from "../../components/layout/Footer";
import Link from "next/link";
import { Loader2, ArrowLeft, ChevronRight } from "lucide-react";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

export default function ProfilePage() {
  const router = useRouter();
  const { sessionToken, logout: authLogout, refreshUser } = useAuth();
  const user = useUser();

  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!sessionToken) {
      router.push("/auth/login");
    }
  }, [sessionToken, router]);

  // Load user data
  useEffect(() => {
    if (user) {
      setName(user.name || "");
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      // Update user name if changed
      if (name !== (user?.name || "")) {
        await client.mutation(api.auth.updateUser, {
          sessionToken,
          name: name.trim() || undefined,
        });
      }

      setSuccess("Profile updated successfully!");

      // Refresh user data
      await refreshUser();
    } catch (err) {
      console.error("Error saving profile:", err);
      setError(err.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await authLogout();
    router.push("/");
  };

  if (!user) {
    return (
      <MainLayout>
        <Header />
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 text-ink/60 animate-spin" />
        </div>
        <Footer />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Back to home button */}
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-ink hover:text-ink/70 transition-colors mb-6 -ml-2"
        >
          <ArrowLeft size={20} />
          <span className="text-sm font-medium">Back to home</span>
        </button>
        
        <h1 className="text-3xl font-semibold text-ink mb-8">Profile</h1>

        <div className="space-y-8">
          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-medium text-ink/70 mb-2">
              Email
            </label>
            <div className="px-4 py-3 bg-ink/5 border-2 border-ink/20 rounded-md text-ink">
              {user.email}
            </div>
          </div>

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-ink/70 mb-2">
              Name (optional)
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full px-4 py-3 bg-white border-2 border-ink/20 rounded-md focus:outline-none focus:border-ink text-ink placeholder:text-ink/40 transition-colors"
            />
          </div>

          {/* Settings Link */}
          <Link
            href="/settings"
            className="block p-4 border-2 border-ink/20 rounded-md hover:border-ink/30 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-ink">Preferences & Settings</h3>
                <p className="text-sm text-ink/60">Manage sports, spots, and personalization</p>
              </div>
              <ChevronRight className="w-5 h-5 text-ink/60" />
            </div>
          </Link>

          {/* Error/Success Messages */}
          {error && (
            <div className="text-red-600 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="text-green-600 text-sm">
              {success}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3 pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-ink text-newsprint py-3 px-4 rounded-md hover:bg-ink/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </span>
              ) : (
                "Save Changes"
              )}
            </button>

            <button
              onClick={handleLogout}
              disabled={saving}
              className="w-full border-2 border-ink/20 text-ink py-3 px-4 rounded-md hover:border-ink/30 transition-colors disabled:opacity-50"
            >
              Log Out
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </MainLayout>
  );
}
