import { connectDB } from "@/lib/mongodb";
import MatchRequest from "@/models/MatchRequest";
import InterviewSession from "@/models/InterviewSession";
import User from "@/models/User";
import { sendConfirmationRequest } from "@/lib/resend";

interface MatchGroup {
  user1Id: string;
  user1Email: string;
  user1Name: string;
  user2Id: string;
  user2Email: string;
  user2Name: string;
  role: string;
  level: string;
  slot: Date;
}

export async function runBatchMatcher() {
  try {
    await connectDB();

    // Find all active match requests
    const activeRequests = await MatchRequest.find({
      status: "searching",
    }).lean();

    if (activeRequests.length < 2) {
      console.log("[Batch Matcher] Not enough requests to match");
      return { matched: 0, errors: [] };
    }

    // Group requests by role, level, and slot
    const groupMap = new Map<string, typeof activeRequests>();
    activeRequests.forEach((req) => {
      const key = `${req.role}-${req.level}-${req.slot.toISOString()}`;
      if (!groupMap.has(key)) {
        groupMap.set(key, []);
      }
      groupMap.get(key)!.push(req);
    });

    let matchedCount = 0;
    const errors = [];

    // Process each group
    for (const [key, requests] of groupMap.entries()) {
      if (requests.length < 2) continue;

      // Match pairs
      for (let i = 0; i < requests.length - 1; i += 2) {
        try {
          const user1Req = requests[i];
          const user2Req = requests[i + 1];

          // Fetch user details
          const [user1, user2] = await Promise.all([
            User.findById(user1Req.userId).select("email name").lean(),
            User.findById(user2Req.userId).select("email name").lean(),
          ]);

          if (!user1 || !user2) {
            errors.push(`Missing user details for match ${i}`);
            continue;
          }

          // Create interview session
          const confirmationDeadline = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
          const session = await InterviewSession.create({
            user1Id: user1Req.userId,
            user2Id: user2Req.userId,
            role: user1Req.role,
            experienceLevel: user1Req.level,
            scheduledTime: user1Req.slot,
            status: "pending_confirmation",
            confirmationDeadline,
            user1Confirmation: { confirmed: false },
            user2Confirmation: { confirmed: false },
          });

          // Update match requests to matched
          await Promise.all([
            MatchRequest.findByIdAndUpdate(user1Req._id, { status: "matched" }),
            MatchRequest.findByIdAndUpdate(user2Req._id, { status: "matched" }),
          ]);

          // Send confirmation emails
          const confirmationLink = `${process.env.NEXTAUTH_URL}/api/peer-interview/confirm?sessionId=${session._id}&userId=${user1Req.userId}&action=accept`;
          const declineLink = `${process.env.NEXTAUTH_URL}/api/peer-interview/confirm?sessionId=${session._id}&userId=${user1Req.userId}&action=decline`;

          await Promise.all([
            sendConfirmationRequest(user1.email, {
              name: user1.name,
              peerName: user2.name,
              role: user1Req.role,
              level: user1Req.level,
              slotTime: user1Req.slot,
              confirmationLink,
              declineLink: declineLink.replace(user1Req.userId, user2Req.userId),
            }),
            sendConfirmationRequest(user2.email, {
              name: user2.name,
              peerName: user1.name,
              role: user1Req.role,
              level: user1Req.level,
              slotTime: user1Req.slot,
              confirmationLink: confirmationLink.replace(user1Req.userId, user2Req.userId),
              declineLink,
            }),
          ]);

          matchedCount++;
          console.log(`[Batch Matcher] Matched ${user1.name} and ${user2.name}`);
        } catch (error) {
          console.error("[Batch Matcher] Match error:", error);
          errors.push((error as Error).message);
        }
      }
    }

    return { matched: matchedCount, errors };
  } catch (error) {
    console.error("[Batch Matcher Fatal Error]", error);
    throw error;
  }
}
