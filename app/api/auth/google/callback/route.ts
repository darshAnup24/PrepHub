import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXTAUTH_URL}/api/auth/google/callback`
);

/**
 * GET /api/auth/google/callback
 * Handles Google OAuth callback
 * Exchanges authorization code for tokens
 * Stores refresh token securely
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      console.error("[Google OAuth Error]", error);
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard?error=google_oauth_failed`
      );
    }

    if (!code) {
      return NextResponse.json({ error: "No authorization code" }, { status: 400 });
    }

    // Exchange code for tokens FIRST to log the global refresh token immediately
    const { tokens } = await oauth2Client.getToken(code);

    if (tokens.refresh_token) {
      console.log("\n========================================================");
      console.log("🎉 NEW GOOGLE REFRESH TOKEN ACQUIRED 🎉");
      console.log("Add this to your .env.local as GOOGLE_REFRESH_TOKEN to use globally:");
      console.log(tokens.refresh_token);
      console.log("========================================================\n");
    }

    // Get current session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/login?redirect=google-oauth`
      );
    }

    if (!tokens.access_token) {
      throw new Error("No access token received");
    }

    // Connect to DB and store refresh token
    await connectDB();

    // Store tokens in user document
    const user = await User.findByIdAndUpdate(
      session.user.id,
      {
        $set: {
          googleAccessToken: tokens.access_token,
          googleRefreshToken: tokens.refresh_token || undefined,
          googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
        },
      },
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Parse return URL from state
    let returnUrl = "/dashboard";
    if (state) {
      try {
        const decodedState = JSON.parse(Buffer.from(state, "base64").toString());
        returnUrl = decodedState.returnUrl || "/dashboard";
      } catch (e) {
        console.error("[State decode error]", e);
      }
    }

    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}${returnUrl}?success=google_connected`
    );
  } catch (error) {
    console.error("[Google OAuth Callback Error]", error);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard?error=google_callback_failed`
    );
  }
}
