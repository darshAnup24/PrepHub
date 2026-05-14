import { google } from "googleapis";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXTAUTH_URL}/api/auth/google/callback`
);

/**
 * Get or refresh Google access token for a user
 * Automatically refreshes if token expired
 * Returns OAuth2 client ready to use
 */
export async function getGoogleAuthClient(userId?: string) {
  try {
    // If a global refresh token is provided in .env, use it directly!
    // This allows sharing the app with friends without them needing to sign in to Google Calendar.
    if (process.env.GOOGLE_REFRESH_TOKEN) {
      console.log("[Google Auth] Using global GOOGLE_REFRESH_TOKEN from environment");
      oauth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      });
      return oauth2Client;
    }

    if (!userId) {
      throw new Error("No global token and no userId provided");
    }

    await connectDB();

    const user = await User.findById(userId).lean();
    if (!user || !(user as any).googleAccessToken) {
      throw new Error("User not connected to Google Calendar");
    }

    const accessToken = (user as any).googleAccessToken;
    const refreshToken = (user as any).googleRefreshToken;
    const tokenExpiry = (user as any).googleTokenExpiry;

    // Check if token is expired
    const now = new Date();
    if (tokenExpiry && new Date(tokenExpiry) < now) {
      console.log("[Google Auth] Token expired, refreshing...");

      if (!refreshToken) {
        throw new Error("No refresh token available. User needs to reconnect to Google.");
      }

      // Refresh the token
      oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });

      try {
        const { credentials } = await oauth2Client.refreshAccessToken();

        if (!credentials.access_token) {
          throw new Error("Failed to get new access token");
        }

        // Update user with new tokens
        await User.findByIdAndUpdate(userId, {
          $set: {
            googleAccessToken: credentials.access_token,
            googleTokenExpiry: credentials.expiry_date
              ? new Date(credentials.expiry_date)
              : undefined,
            // Keep the refresh token (only update if new one provided)
            ...(credentials.refresh_token && {
              googleRefreshToken: credentials.refresh_token,
            }),
          },
        });

        console.log("[Google Auth] Token refreshed successfully");

        // Set credentials on client
        oauth2Client.setCredentials({
          access_token: credentials.access_token,
          refresh_token: refreshToken,
        });

        return oauth2Client;
      } catch (refreshError) {
        console.error("[Google Auth] Refresh failed:", refreshError);
        throw new Error("Failed to refresh Google credentials. Please reconnect.");
      }
    }

    // Token is still valid, use it as-is
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    return oauth2Client;
  } catch (error) {
    console.error("[getGoogleAuthClient Error]", error);
    throw error;
  }
}

/**
 * Check if user is connected to Google Calendar
 */
export async function isUserConnectedToGoogle(userId: string): Promise<boolean> {
  try {
    await connectDB();
    const user = await User.findById(userId).select("googleAccessToken").lean();
    return !!(user && (user as any).googleAccessToken);
  } catch (error) {
    console.error("[isUserConnectedToGoogle Error]", error);
    return false;
  }
}

/**
 * Disconnect user from Google Calendar (revoke tokens)
 */
export async function disconnectGoogleCalendar(userId: string) {
  try {
    await connectDB();

    const user = await User.findById(userId).lean();
    if (!user || !(user as any).googleAccessToken) {
      throw new Error("User not connected to Google");
    }

    // Revoke the token
    try {
      await oauth2Client.revokeCredentials((user as any).googleAccessToken);
    } catch (error) {
      console.error("[Google Revoke Error]", error);
      // Continue anyway to clear from DB
    }

    // Clear tokens from database
    await User.findByIdAndUpdate(userId, {
      $unset: {
        googleAccessToken: "",
        googleRefreshToken: "",
        googleTokenExpiry: "",
      },
    });

    return { success: true };
  } catch (error) {
    console.error("[disconnectGoogleCalendar Error]", error);
    throw error;
  }
}
