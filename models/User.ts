import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUserProfile {
  semester: string;   // "1" – "8"
  college: string;
  branch: string;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  streak: number;
  lastActive: Date;
  topicProgress: Record<string, string[]>;
  quizStats: Record<string, { attempts: number; avgScore: number; lastScore: number; lastTaken: Date }>;
  profile: IUserProfile;
  
  // Google Calendar OAuth
  googleAccessToken?: string;
  googleRefreshToken?: string;
  googleTokenExpiry?: Date;
  
  // Peer Interview Stats (Optional)
  credits?: number;
  reliability?: number;
  interviewsCompleted?: number;
  noShowCount?: number;
  
  createdAt: Date;
  updatedAt?: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name:          { type: String, required: true, trim: true },
    email:         { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:      { type: String, required: true },
    streak:        { type: Number, default: 0 },
    lastActive:    { type: Date, default: Date.now },
    topicProgress: { type: Schema.Types.Mixed, default: {} },
    quizStats:     { type: Schema.Types.Mixed, default: {} },
    profile: {
      semester: { type: String, default: "" },
      college:  { type: String, default: "" },
      branch:   { type: String, default: "" },
    },
    
    // Google Calendar OAuth (encrypted in production)
    googleAccessToken: { type: String, select: false }, // Not returned by default
    googleRefreshToken: { type: String, select: false },
    googleTokenExpiry: { type: Date },
    
    // Peer Interview Stats
    credits: { type: Number, default: 100 },
    reliability: { type: Number, default: 100 },
    interviewsCompleted: { type: Number, default: 0 },
    noShowCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>("User", UserSchema);

export default User;
