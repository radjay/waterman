"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { useAuth, useUser } from "../../components/auth/AuthProvider";
import { MainLayout } from "../../components/layout/MainLayout";
import { Header } from "../../components/layout/Header";
import { Footer } from "../../components/layout/Footer";
import { Loader2 } from "lucide-react";
import { Heading } from "../../components/ui/Heading";
import { Text } from "../../components/ui/Text";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";

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
      <div className="pt-2 pb-24">
        <Heading level={1} className="mb-8">Profile</Heading>

        <div className="space-y-8">
          {/* Email (read-only) */}
          <div>
            <Text variant="label" as="label" className="block mb-2">Email</Text>
            <div className="px-4 py-3 bg-ink/5 border-2 border-ink/20 rounded-md text-ink">
              {user.email}
            </div>
          </div>

          {/* Name */}
          <div>
            <Text variant="label" as="label" htmlFor="name" className="block mb-2">Name (optional)</Text>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>

          {/* Error/Success Messages */}
          {error && <Text className="text-red-600 text-sm">{error}</Text>}
          {success && <Text className="text-green-600 text-sm">{success}</Text>}

          {/* Log Out */}
          <div className="pt-4">
            <Button variant="secondary" size="lg" fullWidth disabled={saving} onClick={handleLogout} className="border-2">
              Log Out
            </Button>
          </div>
        </div>

        {/* Floating Save Button — sits above the pill nav bar on mobile */}
        <div className="fixed bottom-0 left-0 right-0 md:bottom-6 md:left-auto md:right-6 md:w-auto z-40 px-4 pt-3 pb-24 md:p-0 bg-newsprint md:bg-transparent border-t border-ink/10 md:border-0">
          <Button variant="primary" size="lg" fullWidth className="md:w-auto md:px-8" loading={saving} onClick={handleSave}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
      <Footer />
    </MainLayout>
  );
}
