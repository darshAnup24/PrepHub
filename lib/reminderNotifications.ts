import { connectDB } from "@/lib/mongodb";
import InterviewSession from "@/models/InterviewSession";
import User from "@/models/User";
import { sendInterviewReminder, sendReadyCheckReminder } from "@/lib/resend";
import { sendPostInterviewRating } from "@/lib/resend";

const REMINDER_EARLY_MINUTES = parseInt(process.env.REMINDER_EARLY_MINUTES || "30");
const REMINDER_FINAL_MINUTES = parseInt(process.env.REMINDER_FINAL_MINUTES || "5");
const READY_CHECK_MINUTES = parseInt(process.env.READY_CHECK_MINUTES_BEFORE || "10");

export async function sendReminderNotifications() {
  try {
    await connectDB();

    const now = new Date();
    const early30 = new Date(now.getTime() + REMINDER_EARLY_MINUTES * 60000);
    const final5 = new Date(now.getTime() + REMINDER_FINAL_MINUTES * 60000);
    const readyCheck = new Date(now.getTime() + READY_CHECK_MINUTES * 60000);

    // Find confirmed sessions that need reminders
    const confirmedSessions = await InterviewSession.find({
      status: "confirmed",
      scheduledTime: {
        $gte: now,
        $lte: new Date(now.getTime() + REMINDER_EARLY_MINUTES * 60000 + 60000), // 1 min buffer
      },
    }).lean();

    for (const session of confirmedSessions) {
      const [user1, user2] = await Promise.all([
        User.findById(session.user1Id).select("email name").lean(),
        User.findById(session.user2Id).select("email name").lean(),
      ]);

      if (!user1 || !user2) continue;

      const timeUntilStart = session.scheduledTime.getTime() - now.getTime();
      const minutesUntil = Math.round(timeUntilStart / 60000);

      // Send 30-minute reminder
      if (Math.abs(minutesUntil - REMINDER_EARLY_MINUTES) < 2) {
        await Promise.all([
          sendInterviewReminder(user1.email, {
            name: user1.name,
            peerName: user2.name,
            role: session.role,
            startTime: session.scheduledTime,
            meetLink: session.googleMeetLink || "#",
          }, REMINDER_EARLY_MINUTES),
          sendInterviewReminder(user2.email, {
            name: user2.name,
            peerName: user1.name,
            role: session.role,
            startTime: session.scheduledTime,
            meetLink: session.googleMeetLink || "#",
          }, REMINDER_EARLY_MINUTES),
        ]);
      }

      // Send 5-minute reminder
      if (Math.abs(minutesUntil - REMINDER_FINAL_MINUTES) < 2) {
        await Promise.all([
          sendInterviewReminder(user1.email, {
            name: user1.name,
            peerName: user2.name,
            role: session.role,
            startTime: session.scheduledTime,
            meetLink: session.googleMeetLink || "#",
          }, REMINDER_FINAL_MINUTES),
          sendInterviewReminder(user2.email, {
            name: user2.name,
            peerName: user1.name,
            role: session.role,
            startTime: session.scheduledTime,
            meetLink: session.googleMeetLink || "#",
          }, REMINDER_FINAL_MINUTES),
        ]);
      }

      // Send ready check 10 minutes before
      if (Math.abs(minutesUntil - READY_CHECK_MINUTES) < 2) {
        // Ready check is typically shown in UI, but can also be sent via email
        // This depends on your frontend implementation
      }
    }

    return { reminded: confirmedSessions.length };
  } catch (error) {
    console.error("[Reminder Notifications Error]", error);
    throw error;
  }
}

export async function sendPostInterviewSurveys() {
  try {
    await connectDB();

    // Find sessions that just completed (in last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60000);
    const now = new Date();

    const completedSessions = await InterviewSession.find({
      status: "in_progress",
      scheduledTime: {
        $gte: new Date(new Date().getTime() - 2 * 60 * 60 * 1000), // Last 2 hours
        $lt: now,
      },
    }).lean();

    for (const session of completedSessions) {
      // Only send if interview time has passed and both haven't rated yet
      if (session.scheduledTime < now && (!session.user1Rating || !session.user2Rating)) {
        const [user1, user2] = await Promise.all([
          User.findById(session.user1Id).select("email name").lean(),
          User.findById(session.user2Id).select("email name").lean(),
        ]);

        if (!user1 || !user2) continue;

        // Send rating requests
        if (!session.user1Rating) {
          const ratingLink = `${process.env.NEXTAUTH_URL}/peer-interview/${session._id}/rate`;
          await sendPostInterviewRating(user1.email, {
            name: user1.name,
            peerName: user2.name,
            ratingLink,
          });
        }

        if (!session.user2Rating) {
          const ratingLink = `${process.env.NEXTAUTH_URL}/peer-interview/${session._id}/rate`;
          await sendPostInterviewRating(user2.email, {
            name: user2.name,
            peerName: user1.name,
            ratingLink,
          });
        }
      }
    }

    return { surveyed: completedSessions.length };
  } catch (error) {
    console.error("[Post-Interview Survey Error]", error);
    throw error;
  }
}
