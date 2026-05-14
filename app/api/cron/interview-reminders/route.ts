import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import InterviewSession from "@/models/InterviewSession";
import User from "@/models/User";
import { sendInterviewReminder, sendReadyCheckReminder } from "@/lib/resend";

/**
 * Vercel Cron Job - Runs every 10 minutes
 * POST /api/cron/interview-reminders
 * 
 * Checks all confirmed interviews and sends reminders at the right times
 */
export async function POST(req: NextRequest) {
  try {
    // Verify cron secret
    const cronSecret = req.headers.get("authorization")?.replace("Bearer ", "");
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const now = new Date();
    const updated = {
      earlyReminders: 0,
      finalReminders: 0,
      readyChecks: 0,
      noShows: 0,
    };

    // Get all confirmed interviews
    const sessions = await InterviewSession.find({
      status: "confirmed",
      scheduledTime: { $gte: new Date(now.getTime() - 60 * 60000) }, // Last hour
      $or: [
        { lastReminderSent: { $exists: false } },
        { lastReminderSent: null },
      ],
    });

    console.log(`[Cron] Found ${sessions.length} interviews to check`);

    for (const session of sessions) {
      const scheduledTime = new Date(session.scheduledTime);
      const diffMinutes = (scheduledTime.getTime() - now.getTime()) / (1000 * 60);

      // Fetch both users
      const [user1, user2] = await Promise.all([
        User.findById(session.user1Id).select("email name").lean(),
        User.findById(session.user2Id).select("email name").lean(),
      ]);

      if (!user1 || !user2) continue;

      // 30 mins before - early reminder
      if (diffMinutes > 25 && diffMinutes <= 35 && !session.earlyReminderSent) {
        console.log(
          `[Cron] Sending early reminder for session ${session._id}`
        );
        await Promise.all([
          sendInterviewReminder(
            user1.email,
            {
              name: user1.name,
              peerName: user2.name,
              role: session.role,
              startTime: scheduledTime,
              meetLink: session.googleMeetLink || "",
            },
            30
          ),
          sendInterviewReminder(
            user2.email,
            {
              name: user2.name,
              peerName: user1.name,
              role: session.role,
              startTime: scheduledTime,
              meetLink: session.googleMeetLink || "",
            },
            30
          ),
        ]).catch((error) => console.error("[Email Error]", error));

        session.earlyReminderSent = true;
        updated.earlyReminders++;
      }

      // 5 mins before - final reminder
      if (diffMinutes > 0 && diffMinutes <= 5 && !session.finalReminderSent) {
        console.log(
          `[Cron] Sending final reminder for session ${session._id}`
        );
        await Promise.all([
          sendInterviewReminder(
            user1.email,
            {
              name: user1.name,
              peerName: user2.name,
              role: session.role,
              startTime: scheduledTime,
              meetLink: session.googleMeetLink || "",
            },
            5
          ),
          sendInterviewReminder(
            user2.email,
            {
              name: user2.name,
              peerName: user1.name,
              role: session.role,
              startTime: scheduledTime,
              meetLink: session.googleMeetLink || "",
            },
            5
          ),
        ]).catch((error) => console.error("[Email Error]", error));

        session.finalReminderSent = true;
        updated.finalReminders++;
      }

      // 10 mins before - ready check
      if (
        diffMinutes > 5 &&
        diffMinutes <= 15 &&
        !session.readyCheckStatus?.checkedAt
      ) {
        console.log(
          `[Cron] Marking ready check needed for session ${session._id}`
        );
        if (!session.readyCheckStatus) {
          session.readyCheckStatus = { user1Ready: false, user2Ready: false };
        }
        session.readyCheckStatus.checkedAt = new Date();
        // Frontend will poll for this and show dialog
        updated.readyChecks++;
      }

      // 1.5 hours (90 mins) after - mark pending_feedback if in_progress
      if (diffMinutes <= -90 && session.status === "in_progress") {
        console.log(`[Cron] Marking pending_feedback for session ${session._id}`);
        session.status = "pending_feedback";
        updated.noShows++; // Reuse counter or add a new one, but let's just save it.
      }

      // 15 mins after - mark no-show if not started
      if (diffMinutes <= -15 && diffMinutes > -90 && session.status === "confirmed") {
        console.log(`[Cron] Marking no-show for session ${session._id}`);
        session.status = "no_show";
        session.completedAt = new Date();

        // Increment no-show counts
        await User.updateMany(
          { _id: { $in: [session.user1Id, session.user2Id] } },
          { $inc: { noShowCount: 1 } }
        );

        updated.noShows++;
      }

      await session.save();
    }

    console.log("[Cron] Job completed:", updated);

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      updates: updated,
    });
  } catch (error) {
    console.error("[Cron Error]", error);
    return NextResponse.json(
      { error: "Cron job failed", details: String(error) },
      { status: 500 }
    );
  }
}
