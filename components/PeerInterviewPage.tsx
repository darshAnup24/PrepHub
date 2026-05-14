"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import CreateMatchRequest from "@/components/CreateMatchRequest";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import ReadyCheckDialog from "@/components/ReadyCheckDialog";
import InterviewRatingModal from "@/components/InterviewRatingModal";

interface MatchRequest {
  _id: string;
  role: string;
  level: string;
  slot: string;
  status: string;
  createdAt: string;
}

interface InterviewSession {
  _id: string;
  user1Id: string;
  user2Id: string;
  role: string;
  experienceLevel: string;
  scheduledTime: string;
  status: string;
  googleMeetLink?: string;
  readyCheckStatus?: {
    checkedAt?: string;
    user1Ready: boolean;
    user2Ready: boolean;
  };
  user1Confirmation?: { confirmed: boolean; ready: boolean };
  user2Confirmation?: { confirmed: boolean; ready: boolean };
  user1Rating?: any;
  user2Rating?: any;
}

export default function PeerInterviewPage() {
  const [matchRequests, setMatchRequests] = useState<MatchRequest[]>([]);
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDialog, setActiveDialog] = useState<{
    type: "confirmation" | "ready" | "rating";
    data: any;
  } | null>(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [reqsRes, sessionsRes] = await Promise.all([
        fetch("/api/peer-interview/request"),
        fetch("/api/peer-interview/sessions"),
      ]);

      if (reqsRes.ok) {
        const data = await reqsRes.json();
        setMatchRequests(data.requests || []);
      }

      if (sessionsRes.ok) {
        const data = await sessionsRes.json();
        const fetchedSessions = data.sessions || [];
        setSessions(fetchedSessions);
        if (data.userId) setCurrentUserId(data.userId);

        if (data.userId) {
          const readySession = fetchedSessions.find((s: any) => 
            s.status === "confirmed" && 
            s.readyCheckStatus?.checkedAt && 
            ((s.user1Id === data.userId && !s.readyCheckStatus.user1Ready) ||
             (s.user2Id === data.userId && !s.readyCheckStatus.user2Ready))
          );

          if (readySession) {
            setActiveDialog(prev => prev ? prev : {
              type: "ready",
              data: {
                sessionId: readySession._id,
                peerName: "Your Partner",
                startTime: readySession.scheduledTime,
                meetLink: readySession.googleMeetLink
              }
            });
          }
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (sessionId: string) => {
    if (!currentUserId) return;
    setConfirmingId(sessionId);
    try {
      const res = await fetch(`/api/peer-interview/confirm?sessionId=${sessionId}&userId=${currentUserId}&action=accept`);
      if (res.ok) {
        fetchData();
      } else {
        alert("Failed to confirm. Please check terminal logs.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setConfirmingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; icon: string }> = {
      searching: { bg: "bg-blue-100", text: "text-blue-800", icon: "🔍" },
      matched: { bg: "bg-yellow-100", text: "text-yellow-800", icon: "⏳" },
      cancelled: { bg: "bg-red-100", text: "text-red-800", icon: "❌" },
      completed: { bg: "bg-green-100", text: "text-green-800", icon: "✅" },
      pending_confirmation: { bg: "bg-purple-100", text: "text-purple-800", icon: "⏰" },
      confirmed: { bg: "bg-green-100", text: "text-green-800", icon: "✓" },
      in_progress: { bg: "bg-blue-100", text: "text-blue-800", icon: "▶️" },
      pending_feedback: { bg: "bg-orange-100", text: "text-orange-800", icon: "📝" },
    };

    const config = statusConfig[status] || statusConfig.searching;
    return (
      <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${config.bg} ${config.text}`}>
        {config.icon} {status.replace(/_/g, " ")}
      </span>
    );
  };

  const hasPendingAction = sessions.some((s) => 
    ["in_progress", "pending_feedback"].includes(s.status) && 
    !((s.user1Id === currentUserId && s.user1Rating) || (s.user2Id === currentUserId && s.user2Rating))
  );

  const isSessionComplete = (session: InterviewSession) => {
    if (["completed", "cancelled", "no_show"].includes(session.status)) return true;
    if (["in_progress", "pending_feedback"].includes(session.status)) {
      return (session.user1Id === currentUserId && session.user1Rating) || 
             (session.user2Id === currentUserId && session.user2Rating);
    }
    return false;
  };

  const activeSessions = sessions.filter(s => !isSessionComplete(s));
  const historySessions = sessions.filter(s => isSessionComplete(s));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
          🎤 Peer Interview Matching
        </h1>

        {hasPendingAction && (
          <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-300 p-4 rounded-lg mb-6 flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <p>You have an interview session that requires your feedback! Please submit your feedback before scheduling a new interview.</p>
          </div>
        )}

        {/* Create Match Request */}
        {!hasPendingAction && <CreateMatchRequest onSuccess={() => fetchData()} />}

        {/* Active Match Requests */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Your Search Requests
          </h2>

          {matchRequests.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400">No active requests. Create one above!</p>
          ) : (
            <div className="grid gap-4">
              {matchRequests.map((req) => (
                <div
                  key={req._id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {req.role} - {req.level}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        📅 {format(new Date(req.slot), "MMM dd, yyyy HH:mm")}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Created: {format(new Date(req.createdAt), "HH:mm")}
                      </p>
                    </div>
                    {getStatusBadge(req.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Interview Sessions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Your Interview Sessions
          </h2>

          {activeSessions.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400">No active sessions yet.</p>
          ) : (
            <div className="grid gap-4">
              {activeSessions.map((session) => (
                <div
                  key={session._id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {session.role} - {session.experienceLevel}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        📅 {format(new Date(session.scheduledTime), "MMM dd, yyyy HH:mm")}
                      </p>

                      {/* Session Status Details */}
                      {session.status === "pending_confirmation" && (
                        <div className="mt-2">
                          {((session.user1Id === currentUserId && session.user1Confirmation?.confirmed) || 
                            (session.user2Id === currentUserId && session.user2Confirmation?.confirmed)) ? (
                            <p className="text-xs text-yellow-600 dark:text-yellow-400">
                              ⏳ You have accepted! Waiting for peer to confirm...
                            </p>
                          ) : (
                            <>
                              <p className="text-xs text-red-500 font-medium">
                                ⚠️ Action Required: Please accept the match!
                              </p>
                              <button
                                onClick={() => handleConfirm(session._id)}
                                disabled={confirmingId === session._id}
                                className="mt-2 text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded disabled:opacity-50"
                              >
                                {confirmingId === session._id ? "Accepting..." : "Accept Match"}
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      {["confirmed", "in_progress"].includes(session.status) && session.googleMeetLink && (
                        <div className="mt-2">
                          <a
                            href={session.googleMeetLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
                          >
                            Join Meet
                          </a>
                        </div>
                      )}

                      {/* Feedback Button */}
                      {["in_progress", "pending_feedback"].includes(session.status) && 
                       !((session.user1Id === currentUserId && session.user1Rating) || 
                         (session.user2Id === currentUserId && session.user2Rating)) && (
                        <div className="mt-3">
                          <button
                            onClick={() => setActiveDialog({
                              type: "rating",
                              data: { sessionId: session._id, peerName: "Your Partner" }
                            })}
                            className="text-sm bg-purple-600 hover:bg-purple-700 text-white px-4 py-1.5 rounded-md font-medium shadow-sm transition-colors"
                          >
                            Finish & Leave Feedback
                          </button>
                        </div>
                      )}
                    </div>
                    {getStatusBadge(session.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Interview History */}
        {historySessions.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Interview History
            </h2>
            <div className="grid gap-4">
              {historySessions.map((session) => (
                <div
                  key={session._id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition opacity-80"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {session.role} - {session.experienceLevel}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        📅 {format(new Date(session.scheduledTime), "MMM dd, yyyy HH:mm")}
                      </p>
                    </div>
                    {getStatusBadge(session.status)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-gray-600 dark:text-gray-400 text-sm">Total Requests</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {matchRequests.length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-gray-600 dark:text-gray-400 text-sm">Active Sessions</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {sessions.filter((s) => ["confirmed", "pending_confirmation", "in_progress"].includes(s.status))
                .length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-gray-600 dark:text-gray-400 text-sm">Searching</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {matchRequests.filter((r) => r.status === "searching").length}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-gray-600 dark:text-gray-400 text-sm">Completed</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {sessions.filter((s) => s.status === "completed").length}
            </p>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      {activeDialog?.type === "confirmation" && (
        <ConfirmationDialog
          {...activeDialog.data}
          onClose={() => {
            setActiveDialog(null);
            fetchData();
          }}
        />
      )}

      {activeDialog?.type === "ready" && (
        <ReadyCheckDialog
          {...activeDialog.data}
          onClose={() => {
            setActiveDialog(null);
            fetchData();
          }}
        />
      )}

      {activeDialog?.type === "rating" && (
        <InterviewRatingModal
          {...activeDialog.data}
          onClose={() => {
            setActiveDialog(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
