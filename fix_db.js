require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection;
  const latestSession = await db.collection('interviewsessions').findOne({}, { sort: { _id: -1 } });
  
  if (latestSession && !latestSession.googleMeetLink) {
    await db.collection('interviewsessions').updateOne(
      { _id: latestSession._id },
      { $set: { googleMeetLink: `https://meet.jit.si/PrepHub-${latestSession._id}` } }
    );
    console.log("Fixed DB");
  }
  process.exit(0);
}
run();
