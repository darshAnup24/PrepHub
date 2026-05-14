require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection;
  const sessionDoc = await db.collection('interviewsessions').findOne({}, { sort: { _id: -1 } });
  
  // Directly try to create calendar event using googleapis
  const { google } = require('googleapis');
  
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXTAUTH_URL}/api/auth/google/callback`
  );
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });
  
  try {
    console.log("Creating event...");
    const result = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: `Test Mock Interview`,
        start: { dateTime: new Date().toISOString(), timeZone: "UTC" },
        end: { dateTime: new Date(Date.now() + 3600000).toISOString(), timeZone: "UTC" },
        conferenceData: {
          createRequest: {
            requestId: `peer-interview-test-${Date.now()}`,
            conferenceSolutionKey: { key: "hangoutsMeet" },
          },
        },
      },
      conferenceDataVersion: 1,
    });
    console.log("Success!", result.data);
  } catch (err) {
    console.error("Error creating event:", err.message);
  }
  process.exit(0);
}
run();
