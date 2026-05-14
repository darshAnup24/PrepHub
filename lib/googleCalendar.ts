import { google } from "googleapis";

const calendar = google.calendar("v3");

export async function createGoogleCalendarEvent(
  email: string,
  eventData: {
    title: string;
    description: string;
    startTime: Date;
    endTime: Date;
    meetLink?: string;
    attendeeEmails: string[];
  }
) {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        type: "service_account",
        project_id: process.env.GOOGLE_PROJECT_ID,
        private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        client_id: process.env.GOOGLE_CLIENT_ID,
      },
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });

    const calendarInstance = google.calendar({ version: "v3", auth });

    const event = {
      summary: eventData.title,
      description: eventData.description,
      start: {
        dateTime: eventData.startTime.toISOString(),
        timeZone: "UTC",
      },
      end: {
        dateTime: eventData.endTime.toISOString(),
        timeZone: "UTC",
      },
      conferenceData: {
        createRequest: {
          requestId: `peer-interview-${Date.now()}`,
          conferenceSolutionKey: {
            key: "hangoutsMeet",
          },
        },
      },
      attendees: eventData.attendeeEmails.map((email) => ({
        email,
        responseStatus: "needsAction",
      })),
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 30 },
          { method: "popup", minutes: 10 },
        ],
      },
    };

    const response = await calendarInstance.events.insert({
      calendarId: "primary",
      requestBody: event as any,
      conferenceDataVersion: 1,
      sendUpdates: "all",
    });

    return {
      eventId: response.data.id,
      meetLink: response.data.conferenceData?.entryPoints?.[0]?.uri,
      htmlLink: response.data.htmlLink,
    };
  } catch (error) {
    console.error("[Google Calendar Error]", error);
    throw error;
  }
}

export async function updateCalendarEvent(
  eventId: string,
  updates: {
    meetLink?: string;
    status?: string;
  }
) {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        type: "service_account",
        project_id: process.env.GOOGLE_PROJECT_ID,
        private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        client_id: process.env.GOOGLE_CLIENT_ID,
      },
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });

    const calendarInstance = google.calendar({ version: "v3", auth });

    const response = await calendarInstance.events.update({
      calendarId: "primary",
      eventId,
      requestBody: {
        status: updates.status || "confirmed",
      } as any,
    });

    return response.data;
  } catch (error) {
    console.error("[Google Calendar Update Error]", error);
    throw error;
  }
}

export async function cancelCalendarEvent(eventId: string) {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        type: "service_account",
        project_id: process.env.GOOGLE_PROJECT_ID,
        private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        client_id: process.env.GOOGLE_CLIENT_ID,
      },
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });

    const calendarInstance = google.calendar({ version: "v3", auth });

    await calendarInstance.events.delete({
      calendarId: "primary",
      eventId,
      sendUpdates: "all",
    });

    return { success: true };
  } catch (error) {
    console.error("[Google Calendar Delete Error]", error);
    throw error;
  }
}
