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
import { Heading } from "../../components/ui/Heading";
import { Text } from "../../components/ui/Text";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Card } from "../../components/ui/Card";

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
        <Button variant="ghost" icon={ArrowLeft} onClick={() => router.push("/")} className="mb-6 -ml-2">
          Back to home
        </Button>
        
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

          {/* Settings Link */}
          <Link href="/settings">
            <Card variant="interactive" className="border-2">
              <div className="flex items-center justify-between">
                <div>
                  <Heading level={3}>Preferences & Settings</Heading>
                  <Text variant="muted" className="text-sm">Manage sports, spots, and personalization</Text>
                </div>
                <ChevronRight className="w-5 h-5 text-ink/60" />
              </div>
            </Card>
          </Link>

          {/* Error/Success Messages */}
          {error && <Text className="text-red-600 text-sm">{error}</Text>}
          {success && <Text className="text-green-600 text-sm">{success}</Text>}

          {/* Actions */}
          <div className="space-y-3 pt-4">
            <Button variant="primary" size="lg" fullWidth loading={saving} onClick={handleSave}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>

            <Button variant="secondary" size="lg" fullWidth disabled={saving} onClick={handleLogout} className="border-2">
              Log Out
            </Button>
          </div>
        </div>
      </div>
      <Footer />
    </MainLayout>
  );
}
