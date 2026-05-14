import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendConfirmationRequest(
  email: string,
  userData: {
    name: string;
    peerName: string;
    role: string;
    level: string;
    slotTime: Date;
    confirmationLink: string;
    declineLink: string;
  }
) {
  try {
    const response = await resend.emails.send({
      from: "PrepHub <noreply@prephub.dev>",
      to: email,
      subject: `🎯 Mock Interview Match Found - Confirm within 10 mins`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>We found a peer for your mock interview! 🎉</h2>
          <p>Hi <strong>${userData.name}</strong>,</p>
          <p>Great news! We matched you with <strong>${userData.peerName}</strong> for a peer-to-peer interview.</p>
          
          <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Interview Details:</strong></p>
            <p>Role: ${userData.role}</p>
            <p>Level: ${userData.level}</p>
            <p>Scheduled for: ${new Date(userData.slotTime).toLocaleString()}</p>
          </div>
          
          <p style="color: #e74c3c; font-weight: bold;">⏰ Please confirm within 10 minutes to secure your slot!</p>
          
          <div style="margin: 30px 0;">
            <a href="${userData.confirmationLink}" style="display: inline-block; background: #27ae60; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-right: 10px;">Accept Interview</a>
            <a href="${userData.declineLink}" style="display: inline-block; background: #95a5a6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">Decline</a>
          </div>
          
          <p style="color: #7f8c8d; font-size: 12px; margin-top: 30px;">If you don't respond within 10 minutes, the match will be cancelled and you'll be returned to the queue.</p>
        </div>
      `,
    });

    return response;
  } catch (error) {
    console.error("[Resend Confirmation Error]", error);
    throw error;
  }
}

export async function sendReadyCheckReminder(
  email: string,
  userData: {
    name: string;
    peerName: string;
    role: string;
    startTime: Date;
    readyLink: string;
    cancelLink: string;
  }
) {
  try {
    const response = await resend.emails.send({
      from: "PrepHub <noreply@prephub.dev>",
      to: email,
      subject: `⏰ Mock Interview Starting Soon - Ready Check Required`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Interview starts in 10 minutes! ⏰</h2>
          <p>Hi <strong>${userData.name}</strong>,</p>
          <p>Your mock interview with <strong>${userData.peerName}</strong> is about to start!</p>
          
          <div style="background: #f39c12; padding: 15px; border-radius: 8px; margin: 20px 0; color: white;">
            <p><strong>⏰ Interview Start Time:</strong></p>
            <p>${new Date(userData.startTime).toLocaleString()}</p>
          </div>
          
          <p><strong>Please confirm you're ready to proceed:</strong></p>
          
          <div style="margin: 30px 0;">
            <a href="${userData.readyLink}" style="display: inline-block; background: #27ae60; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-right: 10px;">I'm Ready</a>
            <a href="${userData.cancelLink}" style="display: inline-block; background: #e74c3c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">Cancel Interview</a>
          </div>
          
          <p style="color: #7f8c8d; font-size: 12px; margin-top: 30px;">If you don't respond, the interview will proceed as scheduled.</p>
        </div>
      `,
    });

    return response;
  } catch (error) {
    console.error("[Resend Ready Check Error]", error);
    throw error;
  }
}

export async function sendInterviewReminder(
  email: string,
  userData: {
    name: string;
    peerName: string;
    role: string;
    startTime: Date;
    meetLink: string;
  },
  minutesBefore: number
) {
  try {
    const response = await resend.emails.send({
      from: "PrepHub <noreply@prephub.dev>",
      to: email,
      subject:
        minutesBefore === 30
          ? `🔔 Mock Interview in 30 minutes - Join soon!`
          : `🔔 Mock Interview starts in 5 minutes - Join now!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>${minutesBefore === 30 ? "Interview in 30 minutes!" : "Interview starts in 5 minutes!"}</h2>
          <p>Hi <strong>${userData.name}</strong>,</p>
          <p>Your mock interview with <strong>${userData.peerName}</strong> is starting ${minutesBefore} minutes from now.</p>
          
          <div style="background: #3498db; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Interview Details:</strong></p>
            <p>Role: ${userData.role}</p>
            <p>Start Time: ${new Date(userData.startTime).toLocaleString()}</p>
          </div>
          
          <div style="margin: 30px 0;">
            <a href="${userData.meetLink}" target="_blank" style="display: inline-block; background: #e74c3c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Join Interview Now</a>
          </div>
          
          <p style="color: #7f8c8d; font-size: 12px; margin-top: 30px;">Make sure you're in a quiet environment and have a stable internet connection.</p>
        </div>
      `,
    });

    return response;
  } catch (error) {
    console.error("[Resend Reminder Error]", error);
    throw error;
  }
}

export async function sendPostInterviewRating(
  email: string,
  userData: {
    name: string;
    peerName: string;
    ratingLink: string;
  }
) {
  try {
    const response = await resend.emails.send({
      from: "PrepHub <noreply@prephub.dev>",
      to: email,
      subject: `📝 Rate Your Mock Interview with ${userData.peerName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Thank you for the interview! 🎉</h2>
          <p>Hi <strong>${userData.name}</strong>,</p>
          <p>Your mock interview with <strong>${userData.peerName}</strong> has been completed. Please help us improve by rating the experience.</p>
          
          <div style="margin: 30px 0;">
            <a href="${userData.ratingLink}" style="display: inline-block; background: #9b59b6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Rate Interview</a>
          </div>
          
          <p style="color: #7f8c8d; font-size: 12px; margin-top: 30px;">Your feedback helps us match better peers in the future.</p>
        </div>
      `,
    });

    return response;
  } catch (error) {
    console.error("[Resend Post-Interview Rating Error]", error);
    throw error;
  }
}
