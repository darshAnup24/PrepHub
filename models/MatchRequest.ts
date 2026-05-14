import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMatchRequest extends Document {
  userId: string;
  role: string; // "Backend", "Frontend", "Full Stack", "DSA", etc.
  level: "beginner" | "intermediate" | "advanced";
  slot: Date; // Interview time slot
  status: "searching" | "matched" | "cancelled" | "completed";
  createdAt: Date;
  updatedAt: Date;
}

const MatchRequestSchema = new Schema<IMatchRequest>(
  {
    userId: { type: String, required: true, index: true },
    role: { type: String, required: true },
    level: { type: String, enum: ["beginner", "intermediate", "advanced"], required: true },
    slot: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ["searching", "matched", "cancelled", "completed"],
      default: "searching",
      index: true,
    },
  },
  { timestamps: true }
);

const MatchRequest: Model<IMatchRequest> =
  mongoose.models.MatchRequest ?? mongoose.model<IMatchRequest>("MatchRequest", MatchRequestSchema);

export default MatchRequest;
