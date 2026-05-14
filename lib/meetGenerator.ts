import { connectDB } from "@/lib/mongodb";
import InterviewSession from "@/models/InterviewSession";

/**
 * Generate Jitsi Meet link for interview session
 * This avoids Google Calendar's strict Workspace account requirements.
 */
export async function generateMeetLink(sessionId: string) {
  try {
    await connectDB();

    const session = await InterviewSession.findById(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    if (session.googleMeetLink) {
      console.log("[Meet Generation] Meet link already exists");
      return { meetLink: session.googleMeetLink };
    }

    const meetLink = `https://meet.jit.si/PrepHub-${sessionId}`;

    console.log("[Meet Generation] Jitsi Meet link created:", { meetLink });

    // Update session with Meet link
    const updatedSession = await InterviewSession.findByIdAndUpdate(
      sessionId,
      {
        $set: {
          googleMeetLink: meetLink,
        },
      },
      { new: true }
    );

    return {
      meetLink,
      updatedSession,
    };
  } catch (error) {
    console.error("[Meet Generation Error]", error);
    throw error;
  }
}

/**
 * Delete from session
 */
export async function cancelMeetLink(sessionId: string) {
  try {
    await connectDB();

    // Clear from session
    await InterviewSession.findByIdAndUpdate(sessionId, {
      $unset: { googleMeetLink: "", calendarEventId: "" },
    });

    return { success: true };
  } catch (error) {
    console.error("[cancelMeetLink Error]", error);
    throw error;
  }
}

/**
 * Dummy function to preserve API compatibility
 */
export async function resendMeetInvite(sessionId: string) {
  console.log("[Resend Invite] Not applicable for pure Jitsi links");
  return { success: true };
}
