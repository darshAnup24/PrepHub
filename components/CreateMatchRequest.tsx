"use client";

import { useState } from "react";
import { format, addDays, startOfToday, setHours, setMinutes } from "date-fns";
import { 
  Users, Code, Puzzle, MessageSquare, Database, BarChart, 
  X, Calendar, Clock 
} from "lucide-react";

interface CreateMatchRequestProps {
  onSuccess?: () => void;
}

const ROLES = [
  { id: "Product Management", label: "Product Management", icon: Users, desc: "Practice product sense, estimation, and more." },
  { id: "DSA", label: "Data Structures & Algorithms", icon: Code, desc: "Practice coding questions." },
  { id: "System Design", label: "System Design", icon: Puzzle, desc: "Practice designing technical architectures." },
  { id: "Behavioral", label: "Behavioral", icon: MessageSquare, desc: "Practice questions about your work experiences." },
  { id: "SQL", label: "SQL", icon: Database, desc: "Practice writing and optimizing SQL queries.", beta: true },
  { id: "Data Science", label: "Data Science & ML", icon: BarChart, desc: "Practice using data to answer questions and design systems.", beta: true },
  { id: "Frontend", label: "Frontend", icon: Code, desc: "Practice JavaScript with foundational exercises.", beta: true },
];

const LEVELS = [
  { id: "beginner", label: "Beginner", desc: "I am new to peer mock interviews." },
  { id: "intermediate", label: "Intermediate", desc: "I have done several interviews already." },
  { id: "advanced", label: "Advanced", desc: "I am a Jedi Master of mock interviews." },
];

export default function CreateMatchRequest({ onSuccess }: CreateMatchRequestProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    role: "",
    level: "",
    timeMode: "preset" as "preset" | "custom",
    presetSlot: null as Date | null,
    slotDate: "",
    slotTime: "",
  });

  const tomorrow = addDays(startOfToday(), 1);
  const dayAfter = addDays(startOfToday(), 2);

  const generateSlots = (date: Date) => [
    setMinutes(setHours(date, 9), 30),
    setMinutes(setHours(date, 13), 30),
    setMinutes(setHours(date, 18), 30),
    setMinutes(setHours(date, 21), 0),
  ];

  const presetDates = [
    { label: "Tomorrow", date: tomorrow, slots: generateSlots(tomorrow) },
    { label: format(dayAfter, "EEEE, MMM d"), date: dayAfter, slots: generateSlots(dayAfter) },
  ];

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    try {
      let finalSlot: Date;
      if (formData.timeMode === "preset" && formData.presetSlot) {
        finalSlot = formData.presetSlot;
      } else if (formData.timeMode === "custom" && formData.slotDate && formData.slotTime) {
        finalSlot = new Date(`${formData.slotDate}T${formData.slotTime}`);
      } else {
        setError("Please select a valid time slot.");
        setLoading(false);
        return;
      }

      if (finalSlot < new Date()) {
        setError("Please select a future time");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/peer-interview/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: formData.role,
          level: formData.level,
          slot: finalSlot.toISOString(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create request");
        setLoading(false);
        return;
      }

      setIsOpen(false);
      setStep(1);
      setFormData({
        role: "",
        level: "",
        timeMode: "preset",
        presetSlot: null,
        slotDate: "",
        slotTime: "",
      });

      if (onSuccess) onSuccess();
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 mb-8"
      >
        + Schedule Mock Interview
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {step === 1 && "Select your interview type"}
                {step === 2 && "Choose your interview level"}
                {step === 3 && "Select a time to practice"}
              </h2>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1">
              {error && (
                <div className="mb-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm font-medium border border-red-100 dark:border-red-800">
                  {error}
                </div>
              )}

              {/* Step 1: Role */}
              {step === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ROLES.map((role) => (
                    <button
                      key={role.id}
                      onClick={() => setFormData({ ...formData, role: role.id })}
                      className={`flex flex-col items-start p-4 border-2 rounded-xl text-left transition-all ${
                        formData.role === role.id 
                          ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20" 
                          : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700"
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <role.icon className={`w-5 h-5 ${formData.role === role.id ? "text-blue-600" : "text-gray-500"}`} />
                        <span className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                          {role.label}
                          {role.beta && (
                            <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[10px] uppercase font-bold rounded-full">
                              Beta
                            </span>
                          )}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                        {role.desc}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              {/* Step 2: Level */}
              {step === 2 && (
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    This will be used to help match you with the best partner.
                  </p>
                  {LEVELS.map((level) => (
                    <button
                      key={level.id}
                      onClick={() => setFormData({ ...formData, level: level.id })}
                      className={`flex flex-col items-start p-5 border-2 rounded-xl text-left transition-all ${
                        formData.level === level.id 
                          ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20" 
                          : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700"
                      }`}
                    >
                      <span className="font-semibold text-gray-900 dark:text-white text-lg mb-1">
                        {level.label}
                      </span>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {level.desc}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              {/* Step 3: Time */}
              {step === 3 && (
                <div className="flex flex-col gap-6">
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                    All times shown in your local timezone.
                  </p>

                  <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-full max-w-sm mx-auto mb-4">
                    <button
                      onClick={() => setFormData({ ...formData, timeMode: "preset" })}
                      className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                        formData.timeMode === "preset" ? "bg-white dark:bg-gray-700 shadow text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      Quick Select
                    </button>
                    <button
                      onClick={() => setFormData({ ...formData, timeMode: "custom" })}
                      className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                        formData.timeMode === "custom" ? "bg-white dark:bg-gray-700 shadow text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      Custom Time
                    </button>
                  </div>

                  {formData.timeMode === "preset" ? (
                    <div className="space-y-6">
                      {presetDates.map((day, i) => (
                        <div key={i}>
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                            {day.label}
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {day.slots.map((slot, j) => (
                              <button
                                key={j}
                                onClick={() => setFormData({ ...formData, presetSlot: slot })}
                                className={`py-3 px-4 border rounded-lg text-sm font-medium transition-all ${
                                  formData.presetSlot?.getTime() === slot.getTime()
                                    ? "bg-blue-600 border-blue-600 text-white"
                                    : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-400 dark:hover:border-blue-600"
                                }`}
                              >
                                {format(slot, "h:mm a")}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-xl border border-gray-100 dark:border-gray-700">
                      <div className="grid grid-cols-1 gap-5">
                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            <Calendar className="w-4 h-4 text-blue-500" />
                            Select Date
                          </label>
                          <input
                            type="date"
                            value={formData.slotDate}
                            onChange={(e) => setFormData({ ...formData, slotDate: e.target.value })}
                            min={format(new Date(), "yyyy-MM-dd")}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                          />
                        </div>
                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            <Clock className="w-4 h-4 text-blue-500" />
                            Select Time
                          </label>
                          <input
                            type="time"
                            value={formData.slotTime}
                            onChange={(e) => setFormData({ ...formData, slotTime: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between gap-4">
              {step > 1 ? (
                <button
                  onClick={() => setStep(step - 1)}
                  className="px-6 py-2.5 rounded-lg font-medium text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Back
                </button>
              ) : (
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-6 py-2.5 rounded-lg font-medium text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              )}

              {step < 3 ? (
                <button
                  onClick={() => setStep(step + 1)}
                  disabled={(step === 1 && !formData.role) || (step === 2 && !formData.level)}
                  className="px-8 py-2.5 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={loading || (formData.timeMode === "preset" ? !formData.presetSlot : (!formData.slotDate || !formData.slotTime))}
                  className="px-8 py-2.5 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {loading ? "Scheduling..." : "Schedule Match"}
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
}
