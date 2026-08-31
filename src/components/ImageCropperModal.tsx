"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  Check,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Crop as CropIcon,
  Move,
} from "lucide-react";
import { uploadImageFile } from "@/lib/upload";

interface ImageCropperModalProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onCropComplete: (uploadedUrl: string) => void;
  aspectRatioHint?: "16:9" | "4:3" | "1:1" | "free";
  title?: string;
}

export default function ImageCropperModal({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete,
  aspectRatioHint = "16:9",
  title = "Crop & Minimize Image",
}: ImageCropperModalProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "4:3" | "1:1" | "free">(aspectRatioHint);
  const [qualityMode, setQualityMode] = useState<"compact" | "hd">("compact");
  const [isProcessing, setIsProcessing] = useState(false);

  // Position offset (panning)
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const initialOffsetRef = useRef({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Reset states when a new image is provided
  useEffect(() => {
    if (isOpen && imageSrc) {
      setZoom(1);
      setRotation(0);
      setOffset({ x: 0, y: 0 });
      setAspectRatio(aspectRatioHint);
    }
  }, [isOpen, imageSrc, aspectRatioHint]);

  // Handle Drag / Pan with Mouse
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initialOffsetRef.current = { ...offset };
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setOffset({
        x: initialOffsetRef.current.x + dx,
        y: initialOffsetRef.current.y + dy,
      });
    },
    [isDragging]
  );

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle Drag / Pan with Touch
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      initialOffsetRef.current = { ...offset };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStartRef.current.x;
    const dy = e.touches[0].clientY - dragStartRef.current.y;
    setOffset({
      x: initialOffsetRef.current.x + dx,
      y: initialOffsetRef.current.y + dy,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Calculate crop box aspect ratio style
  const getCropBoxStyle = () => {
    switch (aspectRatio) {
      case "16:9":
        return "aspect-video max-w-full w-full max-h-[340px]";
      case "4:3":
        return "aspect-[4/3] max-w-[440px] w-full max-h-[340px]";
      case "1:1":
        return "aspect-square max-w-[320px] w-full max-h-[320px]";
      case "free":
      default:
        return "w-full h-[320px]";
    }
  };

  // Perform Crop & Compression
  const handleApplyCrop = async () => {
    if (!imageRef.current || !containerRef.current) return;

    try {
      setIsProcessing(true);
      const img = imageRef.current;
      const cropContainer = containerRef.current;
      const rect = cropContainer.getBoundingClientRect();

      // Output resolution targets
      let targetWidth = 1200;
      let targetHeight = 675; // 16:9 default

      if (aspectRatio === "1:1") {
        targetWidth = 800;
        targetHeight = 800;
      } else if (aspectRatio === "4:3") {
        targetWidth = 1024;
        targetHeight = 768;
      } else if (aspectRatio === "free") {
        targetWidth = Math.round(rect.width * 2);
        targetHeight = Math.round(rect.height * 2);
      }

      // If user selected compact minimize mode, scale target dimensions for ultra-fast loading
      if (qualityMode === "compact") {
        targetWidth = Math.round(targetWidth * 0.8);
        targetHeight = Math.round(targetHeight * 0.8);
      }

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");

      if (!ctx) throw new Error("Could not create canvas context");

      // Draw background
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      // Scale factors from viewport to canvas
      const scaleX = targetWidth / rect.width;
      const scaleY = targetHeight / rect.height;

      // Transform context to match user's visual zoom, rotation, and offset
      ctx.save();
      ctx.translate(targetWidth / 2 + offset.x * scaleX, targetHeight / 2 + offset.y * scaleY);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoom, zoom);

      // Calculate rendered dimensions of the original image inside viewport
      const imgNaturalRatio = img.naturalWidth / img.naturalHeight;
      const containerRatio = rect.width / rect.height;
      let renderW = rect.width;
      let renderH = rect.height;

      if (imgNaturalRatio > containerRatio) {
        renderW = rect.height * imgNaturalRatio;
        renderH = rect.height;
      } else {
        renderW = rect.width;
        renderH = rect.width / imgNaturalRatio;
      }

      const drawW = renderW * scaleX;
      const drawH = renderH * scaleY;

      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      // Export canvas with chosen quality
      const jpegQuality = qualityMode === "compact" ? 0.8 : 0.92;
      const dataUrl = canvas.toDataURL("image/jpeg", jpegQuality);

      // Convert data URL to Blob for upload
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `cropped_${Date.now()}.jpg`, { type: "image/jpeg" });

      const uploadedUrl = await uploadImageFile(file);
      onCropComplete(uploadedUrl);
      onClose();
    } catch (err) {
      console.error("Crop error:", err);
      alert("Failed to crop image. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen || !imageSrc) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col text-slate-100 max-h-[95vh]"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-400">
              <CropIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white">{title}</h2>
              <p className="text-xs text-slate-400">Drag to reposition, zoom slider to resize & minimize</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Crop Viewport */}
        <div className="p-4 sm:p-6 flex-1 flex flex-col items-center justify-center bg-slate-950/60 select-none overflow-hidden relative min-h-[300px]">
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={`relative mx-auto rounded-2xl overflow-hidden border-2 border-indigo-500 shadow-2xl bg-black cursor-grab active:cursor-grabbing flex items-center justify-center ${getCropBoxStyle()}`}
          >
            {/* Thirds Grid Overlay */}
            <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 z-10 opacity-30">
              <div className="border-r border-b border-white/50" />
              <div className="border-r border-b border-white/50" />
              <div className="border-b border-white/50" />
              <div className="border-r border-b border-white/50" />
              <div className="border-r border-b border-white/50" />
              <div className="border-b border-white/50" />
              <div className="border-r border-white/50" />
              <div className="border-r border-white/50" />
              <div />
            </div>

            {/* Draggable & Scalable Image */}
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Crop target"
              draggable={false}
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${zoom})`,
                transformOrigin: "center center",
                transition: isDragging ? "none" : "transform 0.1s ease-out",
                maxWidth: "none",
                maxHeight: "none",
              }}
              className="pointer-events-none object-contain select-none will-change-transform"
            />

            {/* Helper Tag */}
            <div className="absolute bottom-2 right-2 z-20 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-bold text-white/80 flex items-center gap-1">
              <Move className="w-3 h-3 text-indigo-400" />
              Drag to Reposition
            </div>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="p-4 sm:p-6 bg-slate-900 border-t border-slate-800 space-y-4">
          {/* Aspect Ratio & Rotate & Quality Chips */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700/50">
              <span className="text-[11px] font-bold text-slate-400 px-2">Ratio:</span>
              <button
                type="button"
                onClick={() => setAspectRatio("16:9")}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition ${
                  aspectRatio === "16:9" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-300 hover:text-white"
                }`}
              >
                16:9 Screen
              </button>
              <button
                type="button"
                onClick={() => setAspectRatio("4:3")}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition ${
                  aspectRatio === "4:3" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-300 hover:text-white"
                }`}
              >
                4:3 Photo
              </button>
              <button
                type="button"
                onClick={() => setAspectRatio("1:1")}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition ${
                  aspectRatio === "1:1" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-300 hover:text-white"
                }`}
              >
                1:1 Square
              </button>
              <button
                type="button"
                onClick={() => setAspectRatio("free")}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition ${
                  aspectRatio === "free" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-300 hover:text-white"
                }`}
              >
                Free
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRotation((prev) => (prev + 90) % 360)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700/60 text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
              >
                <RotateCw className="w-3.5 h-3.5 text-indigo-400" />
                Rotate 90°
              </button>

              <button
                type="button"
                onClick={() => setQualityMode((prev) => (prev === "compact" ? "hd" : "compact"))}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition active:scale-95 ${
                  qualityMode === "compact"
                    ? "bg-emerald-950/80 border-emerald-700 text-emerald-300"
                    : "bg-slate-800 border-slate-700 text-slate-300"
                }`}
              >
                {qualityMode === "compact" ? "⚡ Minimized (~100KB)" : "HD (~300KB)"}
              </button>
            </div>
          </div>

          {/* Zoom Slider */}
          <div className="flex items-center gap-3 bg-slate-950/50 p-3 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => setZoom((prev) => Math.max(0.5, Number((prev - 0.1).toFixed(2))))}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 accent-indigo-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
            />
            <button
              type="button"
              onClick={() => setZoom((prev) => Math.min(3, Number((prev + 0.1).toFixed(2))))}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold text-indigo-400 w-12 text-right">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-black rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleApplyCrop}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition active:scale-95"
            >
              {isProcessing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Crop & Apply Image</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
