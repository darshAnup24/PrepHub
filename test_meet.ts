import { connectDB } from "./lib/mongodb";
import { generateMeetLink } from "./lib/meetGenerator";

async function run() {
  await connectDB();
  try {
    const res = await generateMeetLink("6a05fc8995d8cdb40ff1c47e"); // I need the actual sessionId
    console.log("Success:", res);
  } catch (err) {
    console.error("Error:", err);
  }
  process.exit(0);
}
run();
