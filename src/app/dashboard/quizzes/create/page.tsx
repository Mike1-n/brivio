"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  Check,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  HelpCircle,
  ListOrdered,
  CheckSquare,
  MessageSquare,
  BarChart2,
  CheckCircle2,
  Image as ImageIcon,
  Sliders,
  Eye,
  Settings as SettingsIcon,
  Play,
  Clock,
  Award,
  Globe,
  Lock,
} from "lucide-react";

export type QuestionType =
  | "MULTIPLE_CHOICE"
  | "TRUE_FALSE"
  | "TYPE_ANSWER"
  | "MULTI_SELECT"
  | "ORDERING"
  | "POLL";

interface QuestionForm {
  id: string;
  text: string;
  type: QuestionType;
  timeLimit: number;
  points: number;
  explanation: string;
  image?: string;
  answers: Array<{
    text: string;
    isCorrect: boolean;
    color: string;
    order?: number;
  }>;
}

import { uploadImageFile } from "@/lib/upload";
import ImageCropperModal from "@/components/ImageCropperModal";

const TIME_OPTIONS = [5, 10, 15, 20, 30, 60, 90, 120];

export default function CreateQuizPage() {
  const router = useRouter();

  // Stepper state: 1. Details, 2. Questions, 3. Settings, 4. Preview
  const [step, setStep] = useState<number>(1);

  // Meta (Step 1)
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [isPublic, setIsPublic] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [error, setError] = useState("");

  // Settings (Step 3)
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleAnswers, setShuffleAnswers] = useState(true);
  const [showLeaderboard, setShowLeaderboard] = useState(true);
  const [defaultTimeLimit, setDefaultTimeLimit] = useState(20);

  // Questions (Step 2)
  const [questions, setQuestions] = useState<QuestionForm[]>([
    {
      id: "q_1",
      text: "",
      type: "MULTIPLE_CHOICE",
      timeLimit: 20,
      points: 1000,
      explanation: "",
      image: "",
      answers: [
        { text: "", isCorrect: true, color: "red", order: 0 },
        { text: "", isCorrect: false, color: "blue", order: 1 },
        { text: "", isCorrect: false, color: "yellow", order: 2 },
        { text: "", isCorrect: false, color: "green", order: 3 },
      ],
    },
  ]);

  const [activeIdx, setActiveIdx] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"saved" | "saving" | "restored">("saved");
  const [lastSavedTime, setLastSavedTime] = useState<string>("");
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Restore Draft on Initial Mount
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem("quizarena_create_draft");
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        const hasLegacyFranceSeed =
          parsed.questions?.some(
            (q: any) =>
              q.text?.toLowerCase().includes("capital of france") ||
              q.explanation?.toLowerCase().includes("populous city of france") ||
              q.answers?.some((a: any) => a.text?.toLowerCase() === "paris")
          ) || parsed.title === "My Awesome Quiz";

        if (hasLegacyFranceSeed) {
          localStorage.removeItem("quizarena_create_draft");
        } else if (
          parsed.title ||
          parsed.coverImage ||
          (Array.isArray(parsed.questions) && parsed.questions.some((q: any) => q.text || q.image))
        ) {
          if (parsed.title !== undefined) setTitle(parsed.title);
          if (parsed.description !== undefined) setDescription(parsed.description);
          if (parsed.coverImage) setCoverImage(parsed.coverImage);
          if (parsed.categoryId) setCategoryId(parsed.categoryId);
          if (parsed.difficulty) setDifficulty(parsed.difficulty);
          if (parsed.isPublic !== undefined) setIsPublic(parsed.isPublic);
          if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
            setQuestions(parsed.questions);
          }
          setAutoSaveStatus("restored");
          setLastSavedTime(parsed.savedAt || "");
        }
      }
    } catch (e) {
      console.error("Failed to restore draft:", e);
    } finally {
      setIsInitialLoad(false);
    }
  }, []);

  // Debounced Auto-Save Draft to LocalStorage
  useEffect(() => {
    if (isInitialLoad) return;

    const hasContent = Boolean(
      title.trim() ||
      description.trim() ||
      coverImage ||
      questions.some((q) => q.text.trim() || q.image || q.answers.some((a) => a.text.trim()))
    );
    if (!hasContent) return;

    setAutoSaveStatus("saving");
    const timer = setTimeout(() => {
      try {
        const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        const draftData = {
          title,
          description,
          coverImage,
          categoryId,
          difficulty,
          isPublic,
          questions,
          savedAt: nowStr,
        };
        localStorage.setItem("quizarena_create_draft", JSON.stringify(draftData));
        setLastSavedTime(nowStr);
        setAutoSaveStatus("saved");
      } catch (e) {
        console.error("Auto-save failed:", e);
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [title, description, coverImage, categoryId, difficulty, isPublic, questions, isInitialLoad]);

  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingQImage, setIsUploadingQImage] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const qFileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Image Cropper Modal State
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [rawCropImageSrc, setRawCropImageSrc] = useState<string>("");
  const [cropTarget, setCropTarget] = useState<"cover" | "question">("cover");
  const [cropAspectRatioHint, setCropAspectRatioHint] = useState<"16:9" | "4:3" | "1:1" | "free">("16:9");

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setRawCropImageSrc(event.target?.result as string);
        setCropTarget("cover");
        setCropAspectRatioHint("16:9");
        setCropModalOpen(true);
      };
      reader.readAsDataURL(file);
      e.target.value = "";
    }
  };

  const handleQuestionImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setRawCropImageSrc(event.target?.result as string);
        setCropTarget("question");
        setCropAspectRatioHint("16:9");
        setCropModalOpen(true);
      };
      reader.readAsDataURL(file);
      e.target.value = "";
    }
  };

  const handleCropComplete = (uploadedUrl: string) => {
    let nextCover = coverImage;
    let nextQuestions = questions;

    if (cropTarget === "cover") {
      setCoverImage(uploadedUrl);
      nextCover = uploadedUrl;
    } else {
      nextQuestions = questions.map((q, idx) => (idx === activeIdx ? { ...q, image: uploadedUrl } : q));
      setQuestions(nextQuestions);
    }

    try {
      const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      localStorage.setItem(
        "quizarena_create_draft",
        JSON.stringify({
          title,
          description,
          coverImage: nextCover,
          categoryId,
          difficulty,
          isPublic,
          questions: nextQuestions,
          savedAt: nowStr,
        })
      );
      setLastSavedTime(nowStr);
      setAutoSaveStatus("saved");
    } catch (e) {
      console.error("Immediate image save error:", e);
    }
  };

  const handleClearDraft = () => {
    if (confirm("Are you sure you want to discard this draft and start fresh?")) {
      localStorage.removeItem("quizarena_create_draft");
      setTitle("");
      setDescription("");
      setCoverImage("");
      setQuestions([
        {
          id: `q_${Date.now()}`,
          text: "",
          type: "MULTIPLE_CHOICE",
          timeLimit: 20,
          points: 1000,
          explanation: "",
          image: "",
          answers: [
            { text: "", isCorrect: true, color: "red", order: 0 },
            { text: "", isCorrect: false, color: "blue", order: 1 },
            { text: "", isCorrect: false, color: "yellow", order: 2 },
            { text: "", isCorrect: false, color: "green", order: 3 },
          ],
        },
      ]);
      setAutoSaveStatus("saved");
      setLastSavedTime("");
    }
  };

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        if (data.categories) {
          setCategories(data.categories);
          if (data.categories.length > 0 && !categoryId) setCategoryId(data.categories[0].id);
        }
      });
  }, []);

  const currentQ = questions[activeIdx] || questions[0];

  const handleTypeChange = (newType: QuestionType) => {
    setQuestions((prev) => {
      const copy = [...prev];
      const target = { ...copy[activeIdx] };
      target.type = newType;

      if (newType === "TRUE_FALSE") {
        target.answers = [
          { text: "True", isCorrect: true, color: "blue", order: 0 },
          { text: "False", isCorrect: false, color: "red", order: 1 },
        ];
      } else if (newType === "TYPE_ANSWER") {
        target.answers = [
          { text: "", isCorrect: true, color: "blue", order: 0 },
        ];
      } else if (newType === "ORDERING") {
        target.answers = [
          { text: "", isCorrect: true, color: "red", order: 0 },
          { text: "", isCorrect: true, color: "blue", order: 1 },
          { text: "", isCorrect: true, color: "yellow", order: 2 },
          { text: "", isCorrect: true, color: "green", order: 3 },
        ];
      } else if (newType === "POLL") {
        target.answers = [
          { text: "", isCorrect: true, color: "red", order: 0 },
          { text: "", isCorrect: true, color: "blue", order: 1 },
          { text: "", isCorrect: true, color: "yellow", order: 2 },
          { text: "", isCorrect: true, color: "green", order: 3 },
        ];
      } else if (newType === "MULTI_SELECT") {
        target.answers = [
          { text: "", isCorrect: true, color: "red", order: 0 },
          { text: "", isCorrect: true, color: "blue", order: 1 },
          { text: "", isCorrect: false, color: "yellow", order: 2 },
          { text: "", isCorrect: false, color: "green", order: 3 },
        ];
      } else {
        target.answers = [
          { text: "", isCorrect: true, color: "red", order: 0 },
          { text: "", isCorrect: false, color: "blue", order: 1 },
          { text: "", isCorrect: false, color: "yellow", order: 2 },
          { text: "", isCorrect: false, color: "green", order: 3 },
        ];
      }

      copy[activeIdx] = target;
      return copy;
    });
  };

  const handleAddQuestion = () => {
    const newQ: QuestionForm = {
      id: `q_${Date.now()}`,
      text: "",
      type: "MULTIPLE_CHOICE",
      timeLimit: defaultTimeLimit,
      points: 1000,
      explanation: "",
      image: "",
      answers: [
        { text: "", isCorrect: true, color: "red", order: 0 },
        { text: "", isCorrect: false, color: "blue", order: 1 },
        { text: "", isCorrect: false, color: "yellow", order: 2 },
        { text: "", isCorrect: false, color: "green", order: 3 },
      ],
    };
    setQuestions((prev) => [...prev, newQ]);
    setActiveIdx(questions.length);
  };

  const handleDeleteCurrent = () => {
    if (questions.length <= 1) {
      alert("A quiz must have at least one question.");
      return;
    }
    const filtered = questions.filter((_, idx) => idx !== activeIdx);
    setQuestions(filtered);
    setActiveIdx((prev) => Math.min(prev, filtered.length - 1));
  };

  const updateCurrentQuestion = (updates: Partial<QuestionForm>) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[activeIdx] = { ...copy[activeIdx], ...updates };
      return copy;
    });
  };

  const updateAnswerText = (ansIdx: number, text: string) => {
    setQuestions((prev) => {
      const copy = [...prev];
      const answers = [...copy[activeIdx].answers];
      answers[ansIdx] = { ...answers[ansIdx], text };
      copy[activeIdx] = { ...copy[activeIdx], answers };
      return copy;
    });
  };

  const setCorrectAnswerSingle = (ansIdx: number) => {
    setQuestions((prev) => {
      const copy = [...prev];
      const answers = copy[activeIdx].answers.map((a, i) => ({
        ...a,
        isCorrect: i === ansIdx,
      }));
      copy[activeIdx] = { ...copy[activeIdx], answers };
      return copy;
    });
  };

  const toggleMultiSelectCorrect = (ansIdx: number) => {
    setQuestions((prev) => {
      const copy = [...prev];
      const answers = [...copy[activeIdx].answers];
      answers[ansIdx] = { ...answers[ansIdx], isCorrect: !answers[ansIdx].isCorrect };
      copy[activeIdx] = { ...copy[activeIdx], answers };
      return copy;
    });
  };

  const handleSaveQuiz = async (andHost = false) => {
    setError("");

    if (!title.trim()) {
      setError("Please enter a quiz title in Step 1 (Details).");
      setStep(1);
      return;
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) {
        setError(`Question #${i + 1} is missing a question prompt.`);
        setActiveIdx(i);
        setStep(2);
        return;
      }

      if (q.type === "TYPE_ANSWER") {
        if (!q.answers[0]?.text?.trim()) {
          setError(`Question #${i + 1} requires an accepted answer.`);
          setActiveIdx(i);
          setStep(2);
          return;
        }
      } else if (q.type !== "POLL") {
        const hasCorrect = q.answers.some((a) => a.isCorrect);
        if (!hasCorrect) {
          setError(`Question #${i + 1} must have at least one correct answer selected.`);
          setActiveIdx(i);
          setStep(2);
          return;
        }
        const hasEmpty = q.answers.some((a) => !a.text.trim());
        if (hasEmpty) {
          setError(`Question #${i + 1} has empty answer options.`);
          setActiveIdx(i);
          setStep(2);
          return;
        }
      }
    }

    try {
      setIsSaving(true);
      const res = await fetch("/api/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          coverImage,
          categoryId,
          difficulty,
          isPublic,
          questions,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save quiz.");
        return;
      }

      if (data.quiz) {
        try {
          localStorage.removeItem("quizarena_create_draft");
        } catch (e) {}

        if (andHost) {
          const sessionRes = await fetch("/api/sessions/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ quizId: data.quiz.id }),
          });
          const sData = await sessionRes.json();
          if (sData.session?.pin) {
            router.push(`/host/${sData.session.pin}`);
            return;
          }
        }
        router.push("/dashboard/quizzes");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to save quiz. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const getTypeBadge = (type: QuestionType) => {
    switch (type) {
      case "TRUE_FALSE":
        return "T/F";
      case "TYPE_ANSWER":
        return "Type";
      case "MULTI_SELECT":
        return "Multi";
      case "ORDERING":
        return "Order";
      case "POLL":
        return "Poll";
      default:
        return "MC";
    }
  };

  const totalPoints = questions.reduce((acc, q) => acc + (q.points || 1000), 0);
  const totalDurationSeconds = questions.reduce((acc, q) => acc + (q.timeLimit || 20), 0);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      {/* Top Stepper Header Bar */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-4 sm:gap-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <img src="/logo.png" alt="Brivio Logo" className="h-7 w-auto object-contain" />
            <span className="text-xl font-black text-slate-900 tracking-tight">
              brivio
            </span>
          </Link>
          <span className="text-slate-300 hidden sm:inline">|</span>
          <h2 className="text-sm sm:text-base font-black text-slate-900 hidden sm:block">Create Quiz</h2>
        </div>

        {/* 4-Step Stepper Navigation (Responsive) */}
        <div className="flex items-center gap-2 sm:gap-6 text-xs sm:text-sm font-bold overflow-x-auto no-scrollbar py-1">
          {[
            { num: 1, label: "Details" },
            { num: 2, label: "Questions" },
            { num: 3, label: "Settings" },
            { num: 4, label: "Preview" },
          ].map((s) => (
            <button
              key={s.num}
              type="button"
              onClick={() => setStep(s.num)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition ${
                step === s.num
                  ? "bg-indigo-50 text-indigo-700 font-black shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black ${
                  step === s.num ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                }`}
              >
                {s.num}
              </span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>

        {/* Action Controls & Auto-Save Badge */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Live Automatic Draft Indicator */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-xl text-xs font-bold border border-slate-200">
            {autoSaveStatus === "saving" ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-amber-700 text-[11px]">Auto-saving...</span>
              </>
            ) : autoSaveStatus === "restored" ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                <span className="text-indigo-700 text-[11px]">Restored</span>
                <button
                  type="button"
                  onClick={handleClearDraft}
                  className="text-slate-400 hover:text-rose-600 underline ml-0.5 text-[10px]"
                >
                  Discard
                </button>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 text-[11px]">
                  {lastSavedTime ? `Saved (${lastSavedTime})` : "Auto-saved"}
                </span>
              </>
            )}
          </div>

          <button
            onClick={() => handleSaveQuiz(false)}
            disabled={isSaving}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition flex items-center gap-1 active:scale-95 flex-shrink-0"
          >
            {isSaving ? "Publishing..." : "Publish"} <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {error && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-4">
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 1: QUIZ DETAILS & COVER */}
      {/* ========================================================================= */}
      {step === 1 && (
        <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 space-y-6 pb-24">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <span className="text-xs font-black text-indigo-600 uppercase tracking-wider block">Step 1 of 4</span>
              <h1 className="text-2xl font-black text-slate-900">Quiz Details & Topic</h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                Provide a title, description, and choose a category for your quiz.
              </p>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                Quiz Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. World History Champions or Cell Biology 101"
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-base font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                Description & Instructions
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell players what this quiz covers..."
                rows={3}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition resize-none"
              />
            </div>

            {/* Cover Image Upload & Preview */}
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                Cover Image (Upload from device or paste link)
              </label>

              {/* Hidden device file input */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />

              <div className="flex flex-col sm:flex-row gap-5 items-start">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full sm:w-56 h-36 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 hover:border-indigo-500 overflow-hidden flex-shrink-0 relative shadow-sm cursor-pointer transition flex flex-col items-center justify-center group"
                >
                  {coverImage ? (
                    <>
                      <img src={coverImage} alt="Cover preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-black">
                        Change Picture
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-3 space-y-1 text-slate-500">
                      <ImageIcon className="w-8 h-8 mx-auto text-slate-400 group-hover:text-indigo-600 transition" />
                      <span className="text-xs font-bold block text-slate-700">Upload Picture</span>
                      <span className="text-[10px] text-slate-400 block">PNG, JPG, WEBP (up to 5MB)</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-3 w-full">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-md transition flex items-center gap-1.5 active:scale-95"
                    >
                      <ImageIcon className="w-4 h-4" /> Upload from Device
                    </button>
                    {coverImage && (
                      <button
                        type="button"
                        onClick={() => setCoverImage("")}
                        className="px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-xl transition border border-rose-200"
                      >
                        Remove Image
                      </button>
                    )}
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400 font-bold block">Or paste an image web URL:</span>
                    <input
                      type="text"
                      value={coverImage}
                      onChange={(e) => setCoverImage(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  if (!title.trim()) {
                    setError("Please enter a quiz title.");
                    return;
                  }
                  setError("");
                  setStep(2);
                }}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-black rounded-xl shadow-md transition flex items-center gap-2 active:scale-95"
              >
                Continue to Questions <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </main>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: QUESTIONS BUILDER */}
      {/* ========================================================================= */}
      {step === 2 && (
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 pb-28 lg:pb-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Mobile Horizontal Question Carousel Strip */}
          <div className="lg:hidden bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-2 sticky top-14 z-20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <span>Question {activeIdx + 1} of {questions.length}</span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-md">
                  {getTypeBadge(currentQ.type)}
                </span>
              </span>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-sm active:scale-95 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Add Question
              </button>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {questions.map((q, idx) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setActiveIdx(idx)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                    activeIdx === idx
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span>Q{idx + 1}</span>
                  <span className={`text-[9px] uppercase px-1 py-0.2 rounded font-black ${activeIdx === idx ? "bg-indigo-700 text-indigo-100" : "bg-slate-200 text-slate-600"}`}>
                    {getTypeBadge(q.type)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Left Column: Questions Desktop List (Hidden on Mobile) */}
          <div className="hidden lg:flex lg:col-span-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Questions</h3>
                  <p className="text-xs text-slate-400 font-semibold">{questions.length} Questions</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-sm transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Question
                </button>
              </div>

              {/* Questions sidebar list */}
              <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                {questions.map((q, idx) => (
                  <div
                    key={q.id}
                    onClick={() => setActiveIdx(idx)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition flex items-center justify-between ${
                      activeIdx === idx
                        ? "bg-indigo-50 border-indigo-500 text-indigo-950 font-bold shadow-sm"
                        : "bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="text-xs font-black text-slate-400">{idx + 1}.</span>
                      <span className="text-xs font-bold truncate max-w-[130px]">
                        {q.text || `Question ${idx + 1}`}
                      </span>
                    </div>
                    <span className="text-[10px] uppercase font-black px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded">
                      {getTypeBadge(q.type)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1"
              >
                Settings ➔
              </button>
            </div>
          </div>

          {/* Center Column: Question Editor (6 cols) */}
          <div className="lg:col-span-6 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            {/* Question Type Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Question Type
              </label>
              <select
                value={currentQ.type}
                onChange={(e) => handleTypeChange(e.target.value as QuestionType)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-indigo-950 focus:outline-none focus:border-indigo-600 transition"
              >
                <option value="MULTIPLE_CHOICE">🎯 Multiple Choice (4 Options)</option>
                <option value="TRUE_FALSE">⚖️ True / False</option>
                <option value="TYPE_ANSWER">⌨️ Type Short Answer</option>
                <option value="MULTI_SELECT">☑️ Multiple Select (Checkboxes)</option>
                <option value="ORDERING">🔢 Puzzle / Ordering Sequence</option>
                <option value="POLL">📊 Poll / Survey (No right/wrong)</option>
              </select>
            </div>

            {/* Question Prompt */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Question Prompt
              </label>
              <input
                type="text"
                value={currentQ.text}
                onChange={(e) => updateCurrentQuestion({ text: e.target.value })}
                placeholder="Type your question prompt here..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition"
              />
            </div>

            {/* Question Media Image (Upload or URL) */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                  Question Image (Optional)
                </span>
                {currentQ.image && (
                  <button
                    type="button"
                    onClick={() => updateCurrentQuestion({ image: "" })}
                    className="text-[11px] text-rose-600 font-bold hover:underline"
                  >
                    Remove Image
                  </button>
                )}
              </label>

              <input
                type="file"
                ref={qFileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleQuestionImageUpload}
              />

              <div className="flex items-center gap-3">
                {currentQ.image ? (
                  <div className="w-20 h-16 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 relative group">
                    <img src={currentQ.image} alt="Question" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => qFileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/40 text-white text-[10px] font-black opacity-0 group-hover:opacity-100 flex items-center justify-center transition"
                    >
                      Change
                    </button>
                  </div>
                ) : null}

                <div className="flex-1 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                  <button
                    type="button"
                    onClick={() => qFileInputRef.current?.click()}
                    disabled={isUploadingQImage}
                    className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 transition flex-shrink-0 active:scale-95"
                  >
                    <ImageIcon className="w-4 h-4 text-indigo-600" />
                    {isUploadingQImage ? "Uploading..." : "Upload from Device"}
                  </button>
                  <input
                    type="text"
                    value={currentQ.image || ""}
                    onChange={(e) => updateCurrentQuestion({ image: e.target.value })}
                    placeholder="Or paste image URL..."
                    className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-600"
                  />
                </div>
              </div>
            </div>

            {/* Dynamic Question Body by Type */}
            {currentQ.type === "TRUE_FALSE" && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Select Correct Answer
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setCorrectAnswerSingle(0)}
                    className={`py-8 rounded-2xl font-black text-xl border-2 transition flex flex-col items-center justify-center gap-2 ${
                      currentQ.answers[0]?.isCorrect
                        ? "bg-blue-600 text-white border-blue-600 shadow-md"
                        : "bg-blue-50/60 border-blue-200 text-blue-800 hover:bg-blue-100"
                    }`}
                  >
                    <span>◆ True</span>
                    {currentQ.answers[0]?.isCorrect && <CheckCircle2 className="w-5 h-5 text-white" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCorrectAnswerSingle(1)}
                    className={`py-8 rounded-2xl font-black text-xl border-2 transition flex flex-col items-center justify-center gap-2 ${
                      currentQ.answers[1]?.isCorrect
                        ? "bg-red-600 text-white border-red-600 shadow-md"
                        : "bg-red-50/60 border-red-200 text-red-800 hover:bg-red-100"
                    }`}
                  >
                    <span>▲ False</span>
                    {currentQ.answers[1]?.isCorrect && <CheckCircle2 className="w-5 h-5 text-white" />}
                  </button>
                </div>
              </div>
            )}

            {currentQ.type === "TYPE_ANSWER" && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Accepted Short Answer
                </label>
                <input
                  type="text"
                  value={currentQ.answers[0]?.text || ""}
                  onChange={(e) => updateAnswerText(0, e.target.value)}
                  placeholder="Type the exact answer..."
                  className="w-full px-4 py-3 bg-indigo-50/40 border border-indigo-200 rounded-xl text-sm font-black text-indigo-950 focus:outline-none focus:border-indigo-600"
                />
                <p className="text-xs text-indigo-700 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Player answers will be matched case-insensitively.
                </p>
              </div>
            )}

            {currentQ.type === "MULTI_SELECT" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Answer Options (Check all correct answers)
                  </label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentQ.answers.map((ans, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border flex items-center gap-2.5 transition ${
                        ans.isCorrect ? "bg-indigo-50/70 border-indigo-400" : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleMultiSelectCorrect(idx)}
                        className={`w-6 h-6 rounded-lg border flex items-center justify-center flex-shrink-0 ${
                          ans.isCorrect ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 bg-white"
                        }`}
                      >
                        {ans.isCorrect && <Check className="w-4 h-4 stroke-[3]" />}
                      </button>
                      <input
                        type="text"
                        value={ans.text}
                        onChange={(e) => updateAnswerText(idx, e.target.value)}
                        placeholder={`Option ${idx + 1}`}
                        className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentQ.type === "ORDERING" && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Correct Sequence / Steps (1st to 4th)
                </label>
                <div className="space-y-2">
                  {currentQ.answers.map((ans, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-black flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={ans.text}
                        onChange={(e) => updateAnswerText(idx, e.target.value)}
                        placeholder={`Step ${idx + 1}...`}
                        className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(currentQ.type === "MULTIPLE_CHOICE" || currentQ.type === "POLL") && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {currentQ.type === "POLL" ? "Poll Survey Choices" : "Answer Choices (Click checkmark to set correct answer)"}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentQ.answers.map((ans, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border flex items-center gap-2.5 transition ${
                        ans.isCorrect && currentQ.type !== "POLL"
                          ? "bg-emerald-50/70 border-emerald-400 shadow-sm"
                          : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      {currentQ.type !== "POLL" && (
                        <button
                          type="button"
                          onClick={() => setCorrectAnswerSingle(idx)}
                          className={`w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 ${
                            ans.isCorrect ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300 bg-white"
                          }`}
                        >
                          {ans.isCorrect && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>
                      )}
                      <input
                        type="text"
                        value={ans.text}
                        onChange={(e) => updateAnswerText(idx, e.target.value)}
                        placeholder={`Option ${idx + 1}`}
                        className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Explanation Note */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Answer Explanation (Optional)
              </label>
              <textarea
                value={currentQ.explanation}
                onChange={(e) => updateCurrentQuestion({ explanation: e.target.value })}
                placeholder="Explain why this is correct..."
                rows={2}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 resize-none"
              />
            </div>
          </div>

          {/* Right Column: Question & Quick Settings (3 cols) */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-900">Question Options</h3>

              {/* Time Limit */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Timer Limit
                </label>
                <select
                  value={currentQ.timeLimit}
                  onChange={(e) => updateCurrentQuestion({ timeLimit: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-600"
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t} Seconds
                    </option>
                  ))}
                </select>
              </div>

              {/* Points */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Points
                </label>
                <select
                  value={currentQ.points}
                  onChange={(e) => updateCurrentQuestion({ points: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-600"
                >
                  <option value={1000}>Standard (1,000 pts)</option>
                  <option value={2000}>Double (2,000 pts)</option>
                  <option value={0}>No Points (0 pts)</option>
                </select>
              </div>

              {/* Delete Question */}
              <button
                type="button"
                onClick={handleDeleteCurrent}
                className="w-full py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Question
              </button>
            </div>
          </div>

          {/* Floating Sticky Mobile Bottom Navigation & Action Bar */}
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 shadow-lg flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={activeIdx === 0}
                onClick={() => setActiveIdx((prev) => Math.max(0, prev - 1))}
                className="px-2.5 py-2 bg-slate-100 disabled:opacity-30 text-slate-700 text-xs font-bold rounded-xl active:scale-95"
              >
                ◀
              </button>
              <span className="text-xs font-black text-slate-800 px-1">
                {activeIdx + 1} / {questions.length}
              </span>
              <button
                type="button"
                disabled={activeIdx === questions.length - 1}
                onClick={() => setActiveIdx((prev) => Math.min(questions.length - 1, prev + 1))}
                className="px-2.5 py-2 bg-slate-100 disabled:opacity-30 text-slate-700 text-xs font-bold rounded-xl active:scale-95"
              >
                ▶
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAddQuestion}
                className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-black rounded-xl border border-indigo-200 flex items-center gap-1 active:scale-95 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Add Question
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-md active:scale-95 transition"
              >
                Next ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: GAMEPLAY & HOST SETTINGS */}
      {/* ========================================================================= */}
      {step === 3 && (
        <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 space-y-6 pb-24">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <span className="text-xs font-black text-indigo-600 uppercase tracking-wider block">Step 3 of 4</span>
              <h1 className="text-2xl font-black text-slate-900">Game & Lobby Settings</h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                Customize rules, timers, scoring defaults, and visibility.
              </p>
            </div>

            {/* Visibility Setting */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${isPublic ? "bg-indigo-100 text-indigo-700" : "bg-slate-200 text-slate-700"}`}>
                  {isPublic ? <Globe className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">
                    {isPublic ? "Public Quiz (Discoverable in Explore)" : "Private Quiz (Direct Link & PIN only)"}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {isPublic ? "Other teachers and students can find and play this quiz in the public arena." : "Only players with your direct game PIN or challenge link can access."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPublic(!isPublic)}
                className={`px-4 py-2 rounded-xl text-xs font-black transition ${
                  isPublic ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-700"
                }`}
              >
                {isPublic ? "Public" : "Private"}
              </button>
            </div>

            {/* Default Timer & Scoring */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                  Default Timer Limit
                </label>
                <select
                  value={defaultTimeLimit}
                  onChange={(e) => {
                    const limit = parseInt(e.target.value, 10);
                    setDefaultTimeLimit(limit);
                    setQuestions((prev) => prev.map((q) => ({ ...q, timeLimit: limit })));
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t} Seconds per Question
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400">Applies this timer limit to all questions in this quiz.</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                  Live Podium & Leaderboard
                </label>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-bold text-slate-700">Display Top 5 Players</span>
                  <button
                    type="button"
                    onClick={() => setShowLeaderboard(!showLeaderboard)}
                    className={`w-12 h-6 rounded-full transition relative ${showLeaderboard ? "bg-indigo-600" : "bg-slate-300"}`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                        showLeaderboard ? "right-1" : "left-1"
                      }`}
                    />
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">Shows live animated leaderboard between questions.</p>
              </div>
            </div>

            {/* Shuffle Options */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Randomization & Anti-Cheating</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Shuffle Question Order</span>
                    <span className="text-[11px] text-slate-400">Randomize question sequence for each player</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShuffleQuestions(!shuffleQuestions)}
                    className={`w-12 h-6 rounded-full transition relative ${shuffleQuestions ? "bg-indigo-600" : "bg-slate-300"}`}
                  >
                    <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${shuffleQuestions ? "right-1" : "left-1"}`} />
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Shuffle Answer Choices</span>
                    <span className="text-[11px] text-slate-400">Randomize A/B/C/D choices</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShuffleAnswers(!shuffleAnswers)}
                    className={`w-12 h-6 rounded-full transition relative ${shuffleAnswers ? "bg-indigo-600" : "bg-slate-300"}`}
                  >
                    <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${shuffleAnswers ? "right-1" : "left-1"}`} />
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" /> Back to Questions
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-black rounded-xl shadow-md transition flex items-center gap-2 active:scale-95"
              >
                Continue to Preview <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </main>
      )}

      {/* ========================================================================= */}
      {/* STEP 4: FULL INTERACTIVE PREVIEW & PUBLISH */}
      {/* ========================================================================= */}
      {step === 4 && (
        <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 space-y-6 pb-24">
          {/* Header Summary Card */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="relative h-48 sm:h-56 w-full bg-slate-900">
              <img
                src={coverImage || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60"}
                alt={title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 text-white space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-indigo-600/90 backdrop-blur-md text-white text-xs font-black rounded-lg shadow-sm">
                    {isPublic ? "🌐 Public Quiz" : "🔒 Private Quiz"}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black">{title || "Untitled Quiz"}</h1>
                <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
                  {description || "No description provided."}
                </p>
              </div>
            </div>

            {/* Meta stats bar */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 grid grid-cols-3 text-center divide-x divide-slate-200">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase">Questions</span>
                <p className="text-xl font-black text-slate-900">{questions.length}</p>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase">Est. Duration</span>
                <p className="text-xl font-black text-slate-900">{Math.ceil(totalDurationSeconds / 60)} min</p>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase">Max Points</span>
                <p className="text-xl font-black text-indigo-600">{totalPoints.toLocaleString()} pts</p>
              </div>
            </div>
          </div>

          {/* Question Breakdown List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900">Questions Review ({questions.length})</h3>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline"
              >
                ✏️ Edit Questions
              </button>
            </div>

            <div className="space-y-3">
              {questions.map((q, idx) => (
                <div key={q.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-black flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-sm font-black text-slate-900">
                        {q.text || <span className="text-rose-500 italic">Empty Question Prompt</span>}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                        {getTypeBadge(q.type)}
                      </span>
                      <span className="text-[10px] font-black px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md">
                        {q.timeLimit}s
                      </span>
                    </div>
                  </div>

                  {/* Answers Display */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {q.answers.map((a, i) => (
                      <div
                        key={i}
                        className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-between border ${
                          a.isCorrect && q.type !== "POLL"
                            ? "bg-emerald-50 border-emerald-400 text-emerald-900"
                            : "bg-slate-50 border-slate-200 text-slate-700"
                        }`}
                      >
                        <span>{a.text || `Option ${i + 1}`}</span>
                        {a.isCorrect && q.type !== "POLL" && <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />}
                      </div>
                    ))}
                  </div>

                  {q.explanation && (
                    <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      💡 <strong>Explanation:</strong> {q.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Final Action Launch Buttons */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 w-full sm:w-auto justify-center"
            >
              <ChevronLeft className="w-4 h-4" /> Back to Settings
            </button>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => handleSaveQuiz(false)}
                disabled={isSaving}
                className="flex-1 sm:flex-initial px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-black rounded-xl shadow-md transition active:scale-95 text-center"
              >
                {isSaving ? "Saving..." : "Save Quiz to Library"}
              </button>

              <button
                type="button"
                onClick={() => handleSaveQuiz(true)}
                disabled={isSaving}
                className="flex-1 sm:flex-initial px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-black rounded-xl shadow-md transition flex items-center justify-center gap-2 active:scale-95"
              >
                <Play className="w-4 h-4 fill-white" />
                {isSaving ? "Publishing..." : "Publish & Host Live"}
              </button>
            </div>
          </div>
        </main>
      )}

      {/* Interactive Image Cropper & Resizer Modal */}
      <ImageCropperModal
        isOpen={cropModalOpen}
        imageSrc={rawCropImageSrc}
        onClose={() => setCropModalOpen(false)}
        onCropComplete={handleCropComplete}
        aspectRatioHint={cropAspectRatioHint}
        title={cropTarget === "cover" ? "Crop & Minimize Quiz Cover" : "Crop & Minimize Question Image"}
      />
    </div>
  );
}
