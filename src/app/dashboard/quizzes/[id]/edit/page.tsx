"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, Trash2, ArrowUp, ArrowDown, Save, Play, Image as ImageIcon, Check, HelpCircle } from "lucide-react";
import { uploadImageFile } from "@/lib/upload";
import ImageCropperModal from "@/components/ImageCropperModal";

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
  type: QuestionType | string;
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

const DEFAULT_ANSWERS = [
  { text: "", isCorrect: true, color: "red" },
  { text: "", isCorrect: false, color: "blue" },
  { text: "", isCorrect: false, color: "yellow" },
  { text: "", isCorrect: false, color: "green" },
];

const TRUE_FALSE_ANSWERS = [
  { text: "True", isCorrect: true, color: "blue" },
  { text: "False", isCorrect: false, color: "red" },
];

const TIME_OPTIONS = [5, 10, 15, 20, 30, 60, 90, 120];
const POINT_OPTIONS = [
  { label: "Standard (1,000 pts)", value: 1000 },
  { label: "Double Points (2,000 pts)", value: 2000 },
  { label: "No Points (0 pts)", value: 0 },
];

export default function EditQuizPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.id as string;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [isPublic, setIsPublic] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);

  const [questions, setQuestions] = useState<QuestionForm[]>([]);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [autoSaveStatus, setAutoSaveStatus] = useState<"saved" | "saving" | "idle">("idle");
  const [lastSavedTime, setLastSavedTime] = useState<string>("");
  const [isUploadingQImage, setIsUploadingQImage] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const qFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const coverFileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Image Cropper Modal State
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [rawCropImageSrc, setRawCropImageSrc] = useState<string>("");
  const [cropTarget, setCropTarget] = useState<"cover" | "question">("cover");
  const [cropAspectRatioHint, setCropAspectRatioHint] = useState<"16:9" | "4:3" | "1:1" | "free">("16:9");

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

  const handleCoverImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleCropComplete = async (uploadedUrl: string) => {
    let nextCover = coverImage;
    let nextQuestions = questions;

    if (cropTarget === "cover") {
      setCoverImage(uploadedUrl);
      nextCover = uploadedUrl;
    } else {
      nextQuestions = questions.map((q, idx) => (idx === activeQuestionIndex ? { ...q, image: uploadedUrl } : q));
      setQuestions(nextQuestions);
    }

    try {
      const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      localStorage.setItem(
        `quizarena_edit_draft_${quizId}`,
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
      setAutoSaveStatus("saving");

      // Direct instant DB save
      const res = await fetch(`/api/quizzes/${quizId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          coverImage: nextCover,
          categoryId,
          difficulty,
          isPublic,
          questions: nextQuestions,
        }),
      });
      if (res.ok) {
        setAutoSaveStatus("saved");
      }
    } catch (e) {
      console.error("Auto-sync error after image crop:", e);
    }
  };

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        if (data.categories) setCategories(data.categories);
      });

    fetch(`/api/quizzes/${quizId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.quiz) {
          setTitle(data.quiz.title);
          setDescription(data.quiz.description || "");
          setCoverImage(data.quiz.coverImage || "");
          setCategoryId(data.quiz.categoryId || "");
          setDifficulty(data.quiz.difficulty || "MEDIUM");
          setIsPublic(data.quiz.isPublic);
          if (data.quiz.questions?.length > 0) {
            setQuestions(
              data.quiz.questions.map((q: any) => ({
                id: q.id,
                text: q.text,
                type: q.type,
                timeLimit: q.timeLimit,
                points: q.points,
                explanation: q.explanation || "",
                image: q.image || "",
                answers: q.answers.map((a: any) => ({
                  text: a.text,
                  isCorrect: a.isCorrect,
                  color: a.color,
                  order: a.order,
                })),
              }))
            );
          }
          setAutoSaveStatus("saved");
        }
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load quiz details.");
      })
      .finally(() => setIsLoading(false));
  }, [quizId]);

  // Debounced Auto-Save Draft to LocalStorage
  useEffect(() => {
    if (isLoading) return;

    setAutoSaveStatus("saving");
    const timer = setTimeout(() => {
      try {
        const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        localStorage.setItem(
          `quizarena_edit_draft_${quizId}`,
          JSON.stringify({
            title,
            description,
            coverImage,
            categoryId,
            difficulty,
            isPublic,
            questions,
            savedAt: nowStr,
          })
        );
        setLastSavedTime(nowStr);
        setAutoSaveStatus("saved");
      } catch (e) {
        console.error("Auto-save failed:", e);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [title, description, coverImage, categoryId, difficulty, isPublic, questions, isLoading, quizId]);

  const currentQ = questions[activeQuestionIndex] || questions[0];

  const handleAddQuestion = (type: "MULTIPLE_CHOICE" | "TRUE_FALSE" = "MULTIPLE_CHOICE") => {
    const newQ: QuestionForm = {
      id: `q_${Date.now()}`,
      text: "",
      type,
      timeLimit: 20,
      points: 1000,
      explanation: "",
      image: "",
      answers: type === "TRUE_FALSE" ? JSON.parse(JSON.stringify(TRUE_FALSE_ANSWERS)) : JSON.parse(JSON.stringify(DEFAULT_ANSWERS)),
    };
    setQuestions([...questions, newQ]);
    setActiveQuestionIndex(questions.length);
  };

  const handleDeleteQuestion = (idx: number) => {
    if (questions.length <= 1) {
      alert("A quiz must have at least one question.");
      return;
    }
    const updated = questions.filter((_, i) => i !== idx);
    setQuestions(updated);
    setActiveQuestionIndex(Math.max(0, idx - 1));
  };

  const handleMoveQuestion = (idx: number, direction: "UP" | "DOWN") => {
    const targetIdx = direction === "UP" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= questions.length) return;

    const copy = [...questions];
    const temp = copy[idx];
    copy[idx] = copy[targetIdx];
    copy[targetIdx] = temp;

    setQuestions(copy);
    setActiveQuestionIndex(targetIdx);
  };

  const handleTypeChange = (newType: string) => {
    setQuestions((prev) => {
      const copy = [...prev];
      const target = { ...copy[activeQuestionIndex] };
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
      } else if (newType === "ORDERING" || newType === "POLL") {
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

      copy[activeQuestionIndex] = target;
      return copy;
    });
  };

  const updateCurrentQuestion = (fields: Partial<QuestionForm>) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[activeQuestionIndex] = { ...copy[activeQuestionIndex], ...fields };
      return copy;
    });
  };

  const updateAnswerText = (aIdx: number, text: string) => {
    setQuestions((prev) => {
      const copy = [...prev];
      const ansCopy = [...copy[activeQuestionIndex].answers];
      ansCopy[aIdx].text = text;
      copy[activeQuestionIndex].answers = ansCopy;
      return copy;
    });
  };

  const setCorrectAnswer = (aIdx: number) => {
    setQuestions((prev) => {
      const copy = [...prev];
      const ansCopy = copy[activeQuestionIndex].answers.map((a, i) => ({
        ...a,
        isCorrect: i === aIdx,
      }));
      copy[activeQuestionIndex].answers = ansCopy;
      return copy;
    });
  };

  const handleSave = async (andHost: boolean = false) => {
    setError("");

    if (!title.trim()) {
      setError("Please provide a title for your quiz.");
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) {
        setError(`Question #${i + 1} is missing question text.`);
        setActiveQuestionIndex(i);
        return;
      }
      const hasCorrect = q.answers.some((a) => a.isCorrect);
      if (!hasCorrect) {
        setError(`Question #${i + 1} must have at least one correct answer selected.`);
        setActiveQuestionIndex(i);
        return;
      }
      const hasEmpty = q.answers.some((a) => !a.text.trim());
      if (hasEmpty) {
        setError(`Question #${i + 1} has empty answer choices.`);
        setActiveQuestionIndex(i);
        return;
      }
    }

    try {
      setIsSaving(true);
      const res = await fetch(`/api/quizzes/${quizId}`, {
        method: "PUT",
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
        setError(data.error || "Failed to update quiz.");
        return;
      }

      if (andHost) {
        const sessionRes = await fetch("/api/sessions/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quizId }),
        });
        const sessionData = await sessionRes.json();
        if (sessionData.session?.pin) {
          router.push(`/host/${sessionData.session.pin}`);
          return;
        }
      }

      router.push("/dashboard/quizzes");
    } catch {
      setError("Failed to update quiz. Please check your connection.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-16 text-center text-slate-500 font-bold flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <span>Loading quiz details...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header & Save Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Edit Quiz</h1>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-0.5">
            Update questions, choices, timer limits, and explanation notes
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Live Automatic Draft Indicator */}
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold shadow-sm">
            {autoSaveStatus === "saving" ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-amber-700">Auto-saving...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                <span className="text-emerald-700">
                  {lastSavedTime ? `Draft saved (${lastSavedTime})` : "Draft saved"}
                </span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={isSaving}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 text-xs sm:text-sm font-black rounded-xl border border-slate-300 shadow-sm transition flex items-center gap-1.5 active:scale-95"
          >
            <Save className="w-4 h-4 text-slate-600" />
            {isSaving ? "Saving..." : "Save Changes"}
          </button>

          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={isSaving}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-black rounded-xl shadow-md shadow-indigo-600/30 transition flex items-center gap-1.5 active:scale-95"
          >
            <Play className="w-4 h-4 fill-white" />
            Save & Host Live
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          {error}
        </div>
      )}

      {currentQ && (
        <div className="space-y-6 pb-28 lg:pb-0">
          {/* Mobile Horizontal Question Carousel Strip (Visible only on mobile/tablet) */}
          <div className="lg:hidden bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-2 sticky top-0 z-20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <span>Question {activeQuestionIndex + 1} of {questions.length}</span>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100">
                  {currentQ.type}
                </span>
              </span>
              <button
                type="button"
                onClick={() => handleAddQuestion()}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl flex items-center gap-1 shadow-sm active:scale-95 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Add Question
              </button>
            </div>

            {/* Horizontal scrollable question chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {questions.map((q, idx) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setActiveQuestionIndex(idx)}
                  className={`flex-shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                    activeQuestionIndex === idx
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                      : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <span>Q{idx + 1}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Questions list (Hidden on Mobile) */}
            <div className="hidden lg:block lg:col-span-1 space-y-4">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                Questions ({questions.length})
              </span>

              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {questions.map((q, idx) => (
                  <div
                    key={q.id}
                    onClick={() => setActiveQuestionIndex(idx)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                      activeQuestionIndex === idx
                        ? "bg-indigo-50 border-indigo-500 text-indigo-950 shadow-sm"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <span
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${
                          activeQuestionIndex === idx
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-150 bg-slate-200 text-slate-800"
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold truncate max-w-[120px] text-slate-900">
                        {q.text || `Question ${idx + 1}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveQuestion(idx, "UP");
                        }}
                        disabled={idx === 0}
                        className="p-1 hover:text-slate-900 disabled:opacity-20 text-slate-400"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveQuestion(idx, "DOWN");
                        }}
                        disabled={idx === questions.length - 1}
                        className="p-1 hover:text-slate-900 disabled:opacity-20 text-slate-400"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteQuestion(idx);
                        }}
                        className="p-1 text-rose-500 hover:text-rose-700"
                        title="Delete Question"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleAddQuestion()}
                  className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black text-xs rounded-xl border border-indigo-200 transition flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Plus className="w-4 h-4" /> Add Question
                </button>
              </div>
            </div>

            {/* Active Question Editor */}
            <div className="lg:col-span-3 space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <span className="text-base font-black text-slate-900">
                    Question {activeQuestionIndex + 1} Editor
                  </span>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-500">Timer:</span>
                      <select
                        value={currentQ.timeLimit}
                        onChange={(e) => updateCurrentQuestion({ timeLimit: parseInt(e.target.value, 10) })}
                        className="bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-indigo-600"
                      >
                        {TIME_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {t} seconds
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-500">Points:</span>
                      <select
                        value={currentQ.points}
                        onChange={(e) => updateCurrentQuestion({ points: parseInt(e.target.value, 10) })}
                        className="bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-indigo-600"
                      >
                        {POINT_OPTIONS.map((p) => (
                          <option key={p.value} value={p.value}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                    Question Type
                  </label>
                  <select
                    value={currentQ.type}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl text-sm font-black focus:outline-none focus:border-indigo-600 transition"
                  >
                    <option value="MULTIPLE_CHOICE">🎯 Multiple Choice (4 Options)</option>
                    <option value="TRUE_FALSE">⚖️ True / False (2 Options)</option>
                    <option value="TYPE_ANSWER">⌨️ Type Short Answer</option>
                    <option value="MULTI_SELECT">☑️ Multiple Select (Checkboxes)</option>
                    <option value="ORDERING">🔢 Puzzle / Correct Order</option>
                    <option value="POLL">📊 Poll / Survey</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                    Question Prompt Text
                  </label>
                  <textarea
                    value={currentQ.text}
                    onChange={(e) => updateCurrentQuestion({ text: e.target.value })}
                    placeholder="Type your question prompt..."
                    rows={2}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-base font-bold placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition resize-none"
                  />
                </div>

                {/* Question Media Image (Upload from device or URL) */}
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

                {/* 1. TRUE_FALSE */}
                {currentQ.type === "TRUE_FALSE" && (
                  <div className="space-y-3">
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                      Select Correct Answer
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setCorrectAnswer(0)}
                        className={`p-6 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition ${
                          currentQ.answers[0]?.isCorrect
                            ? "bg-blue-600 text-white border-blue-600 shadow-md scale-[1.02]"
                            : "bg-blue-50/70 border-blue-200 text-blue-900 hover:bg-blue-100"
                        }`}
                      >
                        <span className="text-3xl font-black">◆</span>
                        <span className="text-xl font-black">True</span>
                        {currentQ.answers[0]?.isCorrect && (
                          <span className="text-xs bg-white text-blue-900 font-black px-3 py-1 rounded-full mt-1 shadow-sm">
                            ✓ Correct
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setCorrectAnswer(1)}
                        className={`p-6 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition ${
                          currentQ.answers[1]?.isCorrect
                            ? "bg-rose-600 text-white border-rose-600 shadow-md scale-[1.02]"
                            : "bg-rose-50/70 border-rose-200 text-rose-900 hover:bg-rose-100"
                        }`}
                      >
                        <span className="text-3xl font-black">▲</span>
                        <span className="text-xl font-black">False</span>
                        {currentQ.answers[1]?.isCorrect && (
                          <span className="text-xs bg-white text-rose-900 font-black px-3 py-1 rounded-full mt-1 shadow-sm">
                            ✓ Correct
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. TYPE_ANSWER */}
                {currentQ.type === "TYPE_ANSWER" && (
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                      Accepted Answer Text
                    </label>
                    <input
                      type="text"
                      value={currentQ.answers[0]?.text || ""}
                      onChange={(e) => updateAnswerText(0, e.target.value)}
                      placeholder="Type the exact answer..."
                      className="w-full px-4 py-3 bg-indigo-50/50 border border-indigo-200 rounded-xl text-indigo-950 font-bold text-sm focus:outline-none focus:border-indigo-600"
                    />
                    <p className="text-xs text-indigo-700 font-bold">
                      Matching is case-insensitive.
                    </p>
                  </div>
                )}

                {/* 3. ORDERING */}
                {currentQ.type === "ORDERING" && (
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                      Items in Correct Sequence (1 to 4)
                    </label>
                    <div className="space-y-2">
                      {currentQ.answers.map((ans, aIdx) => (
                        <div key={aIdx} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                          <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center flex-shrink-0">
                            {aIdx + 1}
                          </span>
                          <input
                            type="text"
                            value={ans.text}
                            onChange={(e) => updateAnswerText(aIdx, e.target.value)}
                            placeholder={`Step ${aIdx + 1}...`}
                            className="flex-1 bg-transparent text-slate-900 text-sm font-bold placeholder-slate-400 focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. POLL */}
                {currentQ.type === "POLL" && (
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                      Poll / Survey Options
                    </label>
                    <div className="space-y-2">
                      {currentQ.answers.map((ans, aIdx) => (
                        <div key={aIdx} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                          <span className="font-black text-xs text-slate-500 w-4">{["A", "B", "C", "D"][aIdx]}</span>
                          <input
                            type="text"
                            value={ans.text}
                            onChange={(e) => updateAnswerText(aIdx, e.target.value)}
                            placeholder={`Option ${["A", "B", "C", "D"][aIdx]}...`}
                            className="flex-1 bg-transparent text-slate-900 text-sm font-bold placeholder-slate-400 focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. MULTIPLE_CHOICE / MULTI_SELECT */}
                {(currentQ.type === "MULTIPLE_CHOICE" || currentQ.type === "MULTI_SELECT" || !currentQ.type) && (
                  <div className="space-y-3">
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                      {currentQ.type === "MULTI_SELECT"
                        ? "Answer Choices (Select ALL correct checkboxes)"
                        : "Answer Choices (Click checkmark to select correct answer)"}
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {currentQ.answers.map((ans, aIdx) => {
                        const shape = ["▲", "◆", "●", "■"][aIdx % 4];
                        const bgAndBorder = [
                          "bg-red-50/70 border-red-200 hover:border-red-300 text-red-950",
                          "bg-blue-50/70 border-blue-200 hover:border-blue-300 text-blue-950",
                          "bg-amber-50/70 border-amber-200 hover:border-amber-300 text-amber-950",
                          "bg-emerald-50/70 border-emerald-200 hover:border-emerald-300 text-emerald-950",
                        ][aIdx % 4];

                        return (
                          <div
                            key={aIdx}
                            className={`p-3.5 rounded-2xl border-2 flex items-center gap-3 transition ${bgAndBorder} ${
                              ans.isCorrect ? "ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/80 shadow-sm" : ""
                            }`}
                          >
                            <span className="text-xl font-black">{shape}</span>
                            <input
                              type="text"
                              value={ans.text}
                              onChange={(e) => updateAnswerText(aIdx, e.target.value)}
                              placeholder={`Answer option ${aIdx + 1}...`}
                              className="flex-1 bg-transparent text-slate-900 font-bold placeholder-slate-400 text-sm focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (currentQ.type === "MULTI_SELECT") {
                                  setQuestions((prev) => {
                                    const copy = [...prev];
                                    const ansCopy = copy[activeQuestionIndex].answers.map((a, i) =>
                                      i === aIdx ? { ...a, isCorrect: !a.isCorrect } : a
                                    );
                                    copy[activeQuestionIndex].answers = ansCopy;
                                    return copy;
                                  });
                                } else {
                                  setCorrectAnswer(aIdx);
                                }
                              }}
                              title={ans.isCorrect ? "Correct answer" : "Mark as correct"}
                              className={`w-8 h-8 rounded-xl flex items-center justify-center transition ${
                                ans.isCorrect
                                  ? "bg-emerald-600 text-white shadow-md"
                                  : "bg-white border border-slate-300 text-slate-300 hover:text-slate-600 hover:border-slate-400"
                              }`}
                            >
                              <Check className="w-4 h-4 stroke-[3]" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                    Explanation Note
                  </label>
                  <textarea
                    value={currentQ.explanation || ""}
                    onChange={(e) => updateCurrentQuestion({ explanation: e.target.value })}
                    placeholder="Explain why this answer is correct..."
                    rows={2}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium placeholder-slate-400 focus:outline-none focus:border-indigo-600 transition resize-none"
                  />
                </div>
              </div>

              {/* Quiz Overall Settings */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-base font-black text-slate-900">Quiz Details & Metadata</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                      Quiz Title
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Quiz title..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold text-sm focus:outline-none focus:border-indigo-600"
                    />
                  </div>

                  {/* Cover Image Upload & Preview */}
                  <div className="space-y-2 pt-1">
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                      Quiz Cover Image
                    </label>

                    <input
                      type="file"
                      ref={coverFileInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={handleCoverImageUpload}
                    />

                    <div className="flex flex-col sm:flex-row gap-4 items-start">
                      <div
                        onClick={() => coverFileInputRef.current?.click()}
                        className="w-full sm:w-48 h-28 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 hover:border-indigo-500 overflow-hidden flex-shrink-0 relative shadow-sm cursor-pointer transition flex flex-col items-center justify-center group"
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
                            <ImageIcon className="w-6 h-6 mx-auto text-slate-400 group-hover:text-indigo-600 transition" />
                            <span className="text-xs font-bold block text-slate-700">Upload Cover</span>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 space-y-2.5 w-full">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => coverFileInputRef.current?.click()}
                            disabled={isUploadingCover}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-sm transition flex items-center gap-1.5 active:scale-95"
                          >
                            <ImageIcon className="w-4 h-4" />
                            {isUploadingCover ? "Uploading..." : "Upload from Device"}
                          </button>
                          {coverImage && (
                            <button
                              type="button"
                              onClick={() => setCoverImage("")}
                              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-xl transition border border-rose-200"
                            >
                              Remove Cover
                            </button>
                          )}
                        </div>

                        <input
                          type="text"
                          value={coverImage}
                          onChange={(e) => setCoverImage(e.target.value)}
                          placeholder="Or paste image web URL..."
                          className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-600"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Sticky Mobile Bottom Navigation & Action Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 shadow-2xl flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={activeQuestionIndex === 0}
            onClick={() => setActiveQuestionIndex((prev) => Math.max(0, prev - 1))}
            className="px-3 py-2 bg-slate-100 disabled:opacity-30 text-slate-800 text-xs font-bold rounded-xl active:scale-95 border border-slate-200"
          >
            ◀
          </button>
          <span className="text-xs font-black text-slate-900 px-1">
            {activeQuestionIndex + 1} / {questions.length}
          </span>
          <button
            type="button"
            disabled={activeQuestionIndex === questions.length - 1}
            onClick={() => setActiveQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1))}
            className="px-3 py-2 bg-slate-100 disabled:opacity-30 text-slate-800 text-xs font-bold rounded-xl active:scale-95 border border-slate-200"
          >
            ▶
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleAddQuestion()}
            className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-black rounded-xl border border-indigo-200 flex items-center gap-1 active:scale-95 transition"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={isSaving}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-md active:scale-95 transition"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

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
