"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";

interface ConfirmationDialogProps {
  sessionId: string;
  peerName: string;
  role: string;
  level: string;
  slotTime: Date;
  onClose?: () => void;
}

export default function ConfirmationDialog({
  sessionId,
  peerName,
  role,
  level,
  slotTime,
  onClose,
}: ConfirmationDialogProps) {
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleAction = async (action: "accept" | "decline") => {
    setLoading(true);
    setError("");

    try {
      // Get user ID from session
      const response = await fetch(
        `/api/peer-interview/confirm?sessionId=${sessionId}&userId=${localStorage.getItem("userId")}&action=${action}`
      );

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to process action");
        setLoading(false);
        return;
      }

      if (onClose) onClose();
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          🎉 Match Found!
        </h2>

        <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg mb-6">
          <p className="text-gray-700 dark:text-gray-300 mb-2">
            We matched you with <span className="font-semibold">{peerName}</span>
          </p>
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <p>📚 Role: {role}</p>
            <p>📊 Level: {level}</p>
            <p>⏰ Time: {format(new Date(slotTime), "MMM dd, yyyy HH:mm")}</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 p-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="bg-yellow-50 dark:bg-yellow-900 p-3 rounded mb-6">
          <p className="text-yellow-800 dark:text-yellow-200 font-semibold">
            ⏳ Confirm within {minutes}:{seconds.toString().padStart(2, "0")} minutes
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => handleAction("accept")}
            disabled={loading || timeLeft === 0}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-md transition"
          >
            {loading ? "Processing..." : "Accept"}
          </button>
          <button
            onClick={() => handleAction("decline")}
            disabled={loading || timeLeft === 0}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-md transition"
          >
            Decline
          </button>
        </div>

        {timeLeft === 0 && (
          <p className="text-center text-red-600 dark:text-red-400 mt-4 font-semibold">
            Time expired. Match cancelled.
          </p>
        )}
      </div>
    </div>
  );
}
