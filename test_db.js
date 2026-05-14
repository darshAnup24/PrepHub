const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection;
  const session = await db.collection('interviewsessions').findOne({}, { sort: { _id: -1 } });
  console.log(JSON.stringify(session, null, 2));
  process.exit(0);
});
