import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUserConfirmation {
  confirmed: boolean;
  confirmedAt?: Date;
  ready?: boolean;
  readyAt?: Date;
}

export interface IPostInterviewRating {
  peerShowedUp: boolean;
  punctuality?: number; // 1-5
  communication?: number; // 1-5
  usefulness?: number; // 1-5
  feedback?: string;
  ratedAt?: Date;
}

export interface IInterviewSession extends Document {
  // User IDs
  user1Id: string;
  user2Id: string;
  
  // Interview Details
  role: string; // Backend, Frontend, DSA, etc.
  experienceLevel: "beginner" | "intermediate" | "advanced";
  interviewType: "technical" | "behavioral" | "mixed"; // Optional type
  
  // Scheduling
  scheduledTime: Date;
  confirmationDeadline: Date;
  
  // Status & States
  status:
    | "searching"
    | "pending_confirmation"
    | "confirmed"
    | "in_progress"
    | "pending_feedback"
    | "completed"
    | "cancelled"
    | "no_show";
  
  readyCheckStatus?: {
    user1Ready: boolean;
    user2Ready: boolean;
    checkedAt?: Date;
  };
  
  // Google Meet & Calendar
  googleMeetLink?: string;
  calendarEventId?: string;
  
  // Reminders
  earlyReminderSent?: boolean;
  finalReminderSent?: boolean;
  
  // Confirmations
  user1Confirmation: IUserConfirmation;
  user2Confirmation: IUserConfirmation;
  
  // Ratings
  user1Rating?: IPostInterviewRating;
  user2Rating?: IPostInterviewRating;
  
  // Timestamps
  createdAt: Date;
  completedAt?: Date;
  updatedAt: Date;
}

const UserConfirmationSchema = new Schema<IUserConfirmation>({
  confirmed: { type: Boolean, default: false },
  confirmedAt: { type: Date },
  ready: { type: Boolean, default: false },
  readyAt: { type: Date },
});

const PostInterviewRatingSchema = new Schema<IPostInterviewRating>({
  peerShowedUp: { type: Boolean, required: true },
  punctuality: { type: Number, min: 1, max: 5 },
  communication: { type: Number, min: 1, max: 5 },
  usefulness: { type: Number, min: 1, max: 5 },
  feedback: { type: String },
  ratedAt: { type: Date },
});

const ReadyCheckStatusSchema = new Schema({
  user1Ready: { type: Boolean, default: false },
  user2Ready: { type: Boolean, default: false },
  checkedAt: { type: Date },
});

const InterviewSessionSchema = new Schema<IInterviewSession>(
  {
    // User IDs
    user1Id: { type: String, required: true, index: true },
    user2Id: { type: String, required: true, index: true },

    // Interview Details
    role: { type: String, required: true, index: true },
    experienceLevel: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      required: true,
      index: true,
    },
    interviewType: {
      type: String,
      enum: ["technical", "behavioral", "mixed"],
      default: "technical",
    },

    // Scheduling
    scheduledTime: { type: Date, required: true, index: true },
    confirmationDeadline: { type: Date, required: true, index: true },

    // Status & States
    status: {
      type: String,
      enum: [
        "searching",
        "pending_confirmation",
        "confirmed",
        "in_progress",
        "pending_feedback",
        "completed",
        "cancelled",
        "no_show",
      ],
      default: "pending_confirmation",
      index: true,
    },

    readyCheckStatus: { type: ReadyCheckStatusSchema },

    // Google Meet & Calendar
    googleMeetLink: { type: String },
    calendarEventId: { type: String },

    // Reminders
    earlyReminderSent: { type: Boolean, default: false },
    finalReminderSent: { type: Boolean, default: false },

    // Confirmations
    user1Confirmation: { type: UserConfirmationSchema, required: true },
    user2Confirmation: { type: UserConfirmationSchema, required: true },

    // Ratings
    user1Rating: { type: PostInterviewRatingSchema },
    user2Rating: { type: PostInterviewRatingSchema },

    // Timestamps
    completedAt: { type: Date },
  },
  { timestamps: true }
);

const InterviewSession: Model<IInterviewSession> =
  mongoose.models.InterviewSession ??
  mongoose.model<IInterviewSession>("InterviewSession", InterviewSessionSchema);

export default InterviewSession;
