import { query, mutation, action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// =============================================================================
// CONSTANTS
// =============================================================================

const MAGIC_LINK_EXPIRY_MINUTES = 15;
const SESSION_EXPIRY_DAYS = 30;
const MAX_MAGIC_LINKS_PER_HOUR = 10; // Increased for better UX during testing and legitimate use

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate a secure random token for magic links or sessions
 * Uses Web Crypto API available in Convex runtime
 * @returns URL-safe base64 encoded string (32 bytes = 43 characters)
 */
function generateToken(): string {
  // Generate 32 random bytes using Web Crypto API
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  
  // Convert to base64url encoding
  const base64 = btoa(String.fromCharCode(...array));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check rate limiting for magic link requests
 */
async function checkRateLimit(
  ctx: any,
  email: string
): Promise<{ allowed: boolean; message?: string }> {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  
  const recentLinks = await ctx.db
    .query("magic_links")
    .withIndex("by_email", (q) => q.eq("email", email))
    .filter((q: any) => q.gte(q.field("createdAt"), oneHourAgo))
    .collect();
  
  if (recentLinks.length >= MAX_MAGIC_LINKS_PER_HOUR) {
    return {
      allowed: false,
      message: `Too many requests. Please wait before requesting another magic link.`,
    };
  }
  
  return { allowed: true };
}

// =============================================================================
// PUBLIC MUTATIONS
// =============================================================================

/**
 * Request a magic link for email authentication
 * Creates a new user if email doesn't exist
 */
export const requestMagicLink = mutation({
  args: {
    email: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (ctx, args) => {
    // Validate email format
    const email = args.email.toLowerCase().trim();
    if (!isValidEmail(email)) {
      return {
        success: false,
        message: "Please enter a valid email address",
      };
    }
    
    // Check rate limiting
    const rateLimit = await checkRateLimit(ctx, email);
    if (!rateLimit.allowed) {
      return {
        success: false,
        message: rateLimit.message!,
      };
    }
    
    // Find or create user
    let user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    
    if (!user) {
      // Create new user
      const userId = await ctx.db.insert("users", {
        email,
        emailVerified: false,
        onboardingCompleted: false,
        createdAt: Date.now(),
      });
      user = await ctx.db.get(userId);
    }
    
    if (!user) {
      return {
        success: false,
        message: "Failed to create user account",
      };
    }
    
    // Generate secure token
    const token = generateToken();
    const expiresAt = Date.now() + MAGIC_LINK_EXPIRY_MINUTES * 60 * 1000;
    
    // Create magic link record
    await ctx.db.insert("magic_links", {
      userId: user._id,
      email,
      token,
      expiresAt,
      used: false,
      createdAt: Date.now(),
    });
    
    // Schedule email sending (fire-and-forget)
    await ctx.scheduler.runAfter(0, internal.auth.sendMagicLinkEmail, {
      email,
      token,
      userId: user._id,
    });
    
    return {
      success: true,
      message: "Magic link sent! Check your email.",
    };
  },
});

/**
 * Verify magic link token and create session
 */
export const verifyMagicLink = mutation({
  args: {
    token: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    sessionToken: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    needsOnboarding: v.optional(v.boolean()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // Find magic link by token
    const magicLink = await ctx.db
      .query("magic_links")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    
    if (!magicLink) {
      return {
        success: false,
        error: "Invalid magic link",
      };
    }
    
    // Check if already used
    if (magicLink.used) {
      return {
        success: false,
        error: "This magic link has already been used",
      };
    }
    
    // Check if expired
    if (Date.now() > magicLink.expiresAt) {
      return {
        success: false,
        error: "This magic link has expired",
      };
    }
    
    // Mark magic link as used
    await ctx.db.patch(magicLink._id, {
      used: true,
      usedAt: Date.now(),
    });
    
    // Get user
    const user = await ctx.db.get(magicLink.userId);
    if (!user) {
      return {
        success: false,
        error: "User not found",
      };
    }
    
    // Update user - mark email as verified and update last login
    await ctx.db.patch(user._id, {
      emailVerified: true,
      lastLoginAt: Date.now(),
    });
    
    // Create session
    const sessionToken = generateToken();
    const expiresAt = Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    
    await ctx.db.insert("sessions", {
      userId: user._id,
      token: sessionToken,
      expiresAt,
      lastActivityAt: Date.now(),
      createdAt: Date.now(),
    });
    
    return {
      success: true,
      sessionToken,
      userId: user._id,
      needsOnboarding: !user.onboardingCompleted,
    };
  },
});

/**
 * Complete user onboarding
 */
export const completeOnboarding = mutation({
  args: {
    sessionToken: v.string(),
    favoriteSpots: v.array(v.id("spots")),
    favoriteSports: v.array(v.string()),
    name: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // Verify session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();
    
    if (!session || Date.now() > session.expiresAt) {
      throw new Error("Invalid or expired session");
    }
    
    // Update user preferences
    const updates: any = {
      favoriteSpots: args.favoriteSpots,
      favoriteSports: args.favoriteSports,
      onboardingCompleted: true,
    };
    
    if (args.name) {
      updates.name = args.name;
    }
    
    await ctx.db.patch(session.userId, updates);
    
    // Update session activity
    await ctx.db.patch(session._id, {
      lastActivityAt: Date.now(),
    });
    
    return { success: true };
  },
});

/**
 * Logout - invalidate session
 */
export const logout = mutation({
  args: {
    sessionToken: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // Find and delete session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();
    
    if (session) {
      await ctx.db.delete(session._id);
    }
    
    return { success: true };
  },
});

// =============================================================================
// PUBLIC QUERIES
// =============================================================================

/**
 * Verify if a session token is valid
 */
export const verifySession = query({
  args: {
    sessionToken: v.string(),
  },
  returns: v.object({
    valid: v.boolean(),
    userId: v.optional(v.id("users")),
  }),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();
    
    if (!session) {
      return { valid: false };
    }
    
    // Check expiry
    if (Date.now() > session.expiresAt) {
      // Note: Can't delete in query (read-only), but cleanup cron will handle this
      return { valid: false };
    }
    
    // Note: Session activity tracking removed since queries are read-only
    // Sessions expire after 30 days regardless
    
    return {
      valid: true,
      userId: session.userId,
    };
  },
});

/**
 * Get current user data
 */
export const getCurrentUser = query({
  args: {
    sessionToken: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      email: v.string(),
      name: v.optional(v.string()),
      emailVerified: v.boolean(),
      onboardingCompleted: v.boolean(),
      favoriteSpots: v.optional(v.array(v.id("spots"))),
      favoriteSports: v.optional(v.array(v.string())),
      createdAt: v.number(),
      lastLoginAt: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // Verify session
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .first();
    
    if (!session || Date.now() > session.expiresAt) {
      return null;
    }
    
    // Get user
    const user = await ctx.db.get(session.userId);
    if (!user) {
      return null;
    }
    
    // Note: Session activity tracking removed since queries are read-only
    // This is acceptable - sessions will still expire after 30 days
    
    return user;
  },
});

// =============================================================================
// INTERNAL ACTIONS
// =============================================================================

/**
 * Send magic link email via Resend
 * This is an internal action that gets triggered by requestMagicLink
 */
export const sendMagicLinkEmail = internalAction({
  args: {
    email: v.string(),
    token: v.string(),
    userId: v.id("users"),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const magicLinkUrl = `${appUrl}/auth/verify?token=${args.token}`;
      
      // Get Resend API key
      const resendApiKey = process.env.RESEND_API_KEY;
      if (!resendApiKey) {
        console.error("RESEND_API_KEY not configured");
        return { success: false };
      }
      
      // Send email via Resend API
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: "Waterman <waterman@radx.dev>",
          to: args.email,
          subject: "Sign in to Waterman",
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <p>Hi there,</p>
              <p>Click the button below to sign in to Waterman:</p>
              <div style="margin: 30px 0;">
                <a href="${magicLinkUrl}" 
                   style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Sign In to Waterman
                </a>
              </div>
              <p style="color: #666; font-size: 14px;">
                This link will expire in ${MAGIC_LINK_EXPIRY_MINUTES} minutes and can only be used once.
              </p>
              <p style="color: #666; font-size: 14px;">
                If you didn't request this email, you can safely ignore it.
              </p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
              <p style="color: #999; font-size: 12px;">
                The Waterman Team
              </p>
            </div>
          `,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Resend API error:", response.status, errorText);
        return { success: false };
      }
      
      const data = await response.json();
      console.log("Magic link email sent:", { emailId: data.id, email: args.email });
      
      return { success: true };
    } catch (error) {
      console.error("Error sending magic link email:", error);
      return { success: false };
    }
  },
});

// =============================================================================
// CLEANUP FUNCTIONS (to be scheduled as cron jobs)
// =============================================================================

/**
 * Clean up expired magic links
 * Should be run daily via cron
 */
export const cleanupExpiredMagicLinks = internalAction({
  args: {},
  returns: v.object({
    deleted: v.number(),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const expiredLinks = await ctx.runQuery(internal.auth.getExpiredMagicLinks, {});
    
    let deleted = 0;
    for (const link of expiredLinks) {
      await ctx.runMutation(internal.auth.deleteMagicLink, { linkId: link._id });
      deleted++;
    }
    
    console.log(`Cleaned up ${deleted} expired magic links`);
    return { deleted };
  },
});

/**
 * Clean up expired sessions
 * Should be run daily via cron
 */
export const cleanupExpiredSessions = internalAction({
  args: {},
  returns: v.object({
    deleted: v.number(),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const expiredSessions = await ctx.runQuery(internal.auth.getExpiredSessions, {});
    
    let deleted = 0;
    for (const session of expiredSessions) {
      await ctx.runMutation(internal.auth.deleteSession, { sessionId: session._id });
      deleted++;
    }
    
    console.log(`Cleaned up ${deleted} expired sessions`);
    return { deleted };
  },
});

// Internal queries for cleanup
export const getExpiredMagicLinks = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("magic_links"),
      expiresAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const now = Date.now();
    const links = await ctx.db.query("magic_links").collect();
    return links
      .filter((link) => link.expiresAt < now)
      .map((link) => ({ _id: link._id, expiresAt: link.expiresAt }));
  },
});

export const getExpiredSessions = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("sessions"),
      expiresAt: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const now = Date.now();
    const sessions = await ctx.db.query("sessions").collect();
    return sessions
      .filter((session) => session.expiresAt < now)
      .map((session) => ({ _id: session._id, expiresAt: session.expiresAt }));
  },
});

export const deleteMagicLink = mutation({
  args: { linkId: v.id("magic_links") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.linkId);
    return null;
  },
});

export const deleteSession = mutation({
  args: { sessionId: v.id("sessions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.sessionId);
    return null;
  },
});
