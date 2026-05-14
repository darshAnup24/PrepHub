"use client";

import { useState } from "react";

interface InterviewRatingModalProps {
  sessionId: string;
  peerName: string;
  onClose?: () => void;
}

export default function InterviewRatingModal({
  sessionId,
  peerName,
  onClose,
}: InterviewRatingModalProps) {
  const [ratings, setRatings] = useState({
    peerShowedUp: true,
    punctuality: 0,
    communication: 0,
    usefulness: 0,
    feedback: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleRatingChange = (field: keyof typeof ratings, value: number | boolean | string) => {
    setRatings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (ratings.peerShowedUp && (ratings.punctuality === 0 || ratings.communication === 0 || ratings.usefulness === 0)) {
      setError("Please rate all categories");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/peer-interview/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          ...ratings,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to submit rating");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        if (onClose) onClose();
      }, 2000);
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const renderStars = (label: string, field: "punctuality" | "communication" | "usefulness") => (
    <div className="mb-4">
      <p className="text-gray-700 dark:text-gray-300 font-semibold mb-2">{label}</p>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => handleRatingChange(field, star)}
            className={`text-3xl transition ${
              star <= (ratings[field] as number)
                ? "text-yellow-400"
                : "text-gray-300 dark:text-gray-600 hover:text-yellow-400"
            }`}
          >
            ⭐
          </button>
        ))}
      </div>
    </div>
  );

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full mx-4 text-center">
          <p className="text-4xl mb-4">🎉</p>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Thank You!
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {ratings.peerShowedUp 
              ? "Your feedback has been recorded. You earned credits for this interview!" 
              : "We've recorded the no-show. Thank you for reporting this."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200]">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full mx-4 max-h-screen overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Rate Your Interview
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          with <span className="font-semibold">{peerName}</span>
        </p>

        {error && (
          <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 p-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="mb-6">
          <p className="text-gray-700 dark:text-gray-300 font-semibold mb-2">Did {peerName} show up to the interview?</p>
          <div className="flex gap-4">
            <button
              onClick={() => handleRatingChange("peerShowedUp", true)}
              className={`flex-1 py-3 rounded-xl font-medium border-2 transition-all ${ratings.peerShowedUp ? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}
            >
              Yes, they attended
            </button>
            <button
              onClick={() => handleRatingChange("peerShowedUp", false)}
              className={`flex-1 py-3 rounded-xl font-medium border-2 transition-all ${!ratings.peerShowedUp ? 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}
            >
              No, they didn't
            </button>
          </div>
        </div>

        {ratings.peerShowedUp ? (
          <div>
            {renderStars("Punctuality", "punctuality")}
            {renderStars("Communication", "communication")}
            {renderStars("Usefulness", "usefulness")}

            <div className="mb-6">
              <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">
                Additional Feedback (Optional)
              </label>
              <textarea
                value={ratings.feedback}
                onChange={(e) => handleRatingChange("feedback", e.target.value)}
                placeholder="Share your experience..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                rows={3}
              />
            </div>
          </div>
        ) : (
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800/30 mb-6 text-center">
            <p className="text-red-700 dark:text-red-400 font-medium mb-1">Mark as No-Show</p>
            <p className="text-red-600/80 dark:text-red-400/80 text-sm">A penalty will be applied to their account. Are you sure they didn't attend?</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => onClose && onClose()}
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-lg font-medium text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-[2] bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            {loading ? "Submitting..." : "Submit Report"}
          </button>
        </div>
      </div>
    </div>
  );
}
