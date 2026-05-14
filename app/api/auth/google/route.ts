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
 * GET /api/auth/google
 * Redirects user to Google OAuth consent screen
 * Requests offline access to get refresh token
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const returnUrl = searchParams.get("returnUrl") || "/dashboard";

    // Store return URL in session (or use state parameter)
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline", // Important: get refresh token
      scope: [
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/calendar.events",
      ],
      prompt: "consent", // Force consent to get refresh token
      state: Buffer.from(JSON.stringify({ returnUrl })).toString("base64"),
    });

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("[Google OAuth Error]", error);
    return NextResponse.json({ error: "OAuth failed" }, { status: 500 });
  }
}
