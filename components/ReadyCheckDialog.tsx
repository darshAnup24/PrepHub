"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";

interface ReadyCheckDialogProps {
  sessionId: string;
  peerName: string;
  startTime: Date;
  meetLink?: string;
  onClose?: () => void;
}

export default function ReadyCheckDialog({
  sessionId,
  peerName,
  startTime,
  meetLink,
  onClose,
}: ReadyCheckDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleReady = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/peer-interview/ready", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          ready: true,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to mark ready");
        setLoading(false);
        return;
      }

      if (onClose) onClose();
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/peer-interview/ready", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          ready: false,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to cancel");
        setLoading(false);
        return;
      }

      if (onClose) onClose();
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          ⏰ Interview Starting Soon!
        </h2>

        <div className="bg-orange-50 dark:bg-orange-900 p-4 rounded-lg mb-6">
          <p className="text-gray-700 dark:text-gray-300 mb-2">
            Your interview with <span className="font-semibold">{peerName}</span> is starting in 10
            minutes.
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {format(new Date(startTime), "MMM dd, yyyy HH:mm")}
          </p>
        </div>

        {error && (
          <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 p-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded mb-6">
          <p className="text-blue-800 dark:text-blue-200 font-semibold mb-2">
            ✅ Are you ready to proceed?
          </p>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Make sure you're in a quiet environment with a stable internet connection.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleReady}
            disabled={loading}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-md transition"
          >
            {loading ? "Processing..." : "I'm Ready"}
          </button>
          <button
            onClick={handleCancel}
            disabled={loading}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-md transition"
          >
            Cancel
          </button>
        </div>

        {meetLink && (
          <a
            href={meetLink}
            target="_blank"
            rel="noopener noreferrer"
            className="block mt-4 text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md transition"
          >
            Join Meet
          </a>
        )}
      </div>
    </div>
  );
}
