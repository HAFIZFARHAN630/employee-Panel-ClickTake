"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { getStoredAuth } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ScanFace,
  Camera,
  Upload,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Video,
  Square,
} from "lucide-react";
import { toast } from "sonner";

type PopupState = "upload" | "verifying" | "uploading" | "success" | "error";

const MAX_RECORDING_SECONDS = 15;

function getInitialState(user: { userType?: string; onboardingStatus?: string } | null): { show: boolean; state: PopupState } {
  if (!user?.userType || user.userType === "admin" || user.userType === "super_admin" || user.userType === "client") {
    return { show: false, state: "upload" };
  }
  const status = user.onboardingStatus;
  if (status === "pending" || status === "reverification_required") {
    return { show: true, state: "upload" };
  } else if (status === "face_pending") {
    return { show: true, state: "verifying" };
  }
  return { show: false, state: "upload" };
}

export function KYCVerificationPopup() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [popupState, setPopupState] = useState<PopupState>("upload");
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [countdown, setCountdown] = useState(MAX_RECORDING_SECONDS);
  const [isRecording, setIsRecording] = useState(false);

  // Derive whether to show and in which state (computed, not from effect)
  const { show: shouldShow, state: initialState } = getInitialState(user);

  // Sync popupState when initialState changes
  useEffect(() => {
    setPopupState(initialState);
  }, [initialState]);

  // Open popup with delay when shouldShow is true
  useEffect(() => {
    if (!shouldShow) return;
    const timer = setTimeout(() => setOpen(true), 1500);
    return () => clearTimeout(timer);
  }, [shouldShow]);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    stopStream();
  }, [stopStream]);

  // Cleanup media stream on unmount
  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  const doUploadVideo = useCallback(async (file: File) => {
    try {
      setPopupState("uploading");
      setUploadProgress(0);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 15;
        });
      }, 300);

      const formData = new FormData();
      formData.append("video", file);

      const stored = getStoredAuth();
      const token = stored?.token || "";

      const res = await fetch("/api/verification", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (res.ok) {
        setPopupState("success");
        toast.success("Verification submitted! Admin will review it.");
      } else {
        setPopupState("error");
        toast.error("Failed to submit verification");
      }
    } catch {
      setPopupState("error");
      toast.error("Upload failed. Please try again.");
    }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      toast.error("Camera access denied. Please upload a video instead.");
    }
  }, []);

  const handleStartRecording = useCallback(async () => {
    if (!streamRef.current) {
      await startCamera();
      // Wait a moment for camera to initialize
      await new Promise((r) => setTimeout(r, 500));
    }
    if (!streamRef.current) return;

    chunksRef.current = [];
    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
        ? "video/webm;codecs=vp8"
        : "video/webm",
    });
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const file = new File([blob], "face-verification.webm", { type: "video/webm" });
      void doUploadVideo(file);
    };

    mediaRecorder.start();
    setIsRecording(true);
    setCountdown(MAX_RECORDING_SECONDS);

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          stopRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [startCamera, stopRecording, doUploadVideo]);

  const handleStopRecording = useCallback(() => {
    stopRecording();
  }, [stopRecording]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast.error("Please upload a video file for face verification");
      return;
    }

    stopStream();
    await doUploadVideo(file);
  };

  const handleClose = () => {
    if (popupState === "uploading") return;
    stopStream();
    setOpen(false);
  };

  const handleRetry = () => {
    setPopupState("upload");
    setUploadProgress(0);
    setCountdown(MAX_RECORDING_SECONDS);
    setIsRecording(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent
        className="max-w-md"
        onPointerDownOutside={(e) => {
          if (popupState !== "uploading") e.preventDefault();
          else e.stopPropagation();
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanFace className="h-5 w-5 text-primary" />
            {popupState === "verifying"
              ? "Verifying Your Details"
              : "Face Verification Required"}
          </DialogTitle>
          <DialogDescription>
            {popupState === "verifying"
              ? "Your face verification is being reviewed by an administrator."
              : "Please complete face verification to access all features. Upload a short video or record one now."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* UPLOAD STATE */}
          {popupState === "upload" && (
            <>
              <div className="border-2 border-dashed rounded-lg p-6 text-center space-y-4">
                {/* Camera preview */}
                <div className="relative w-40 h-40 mx-auto rounded-full bg-muted/50 flex items-center justify-center overflow-hidden border-2 border-muted">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover rounded-full"
                  />
                  {!isRecording && (
                    <Camera className="h-12 w-12 text-muted-foreground absolute" />
                  )}
                </div>

                {/* Warning text */}
                <div className="flex items-start gap-2 px-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-400 text-left">
                    Ensure face is visible, no masks, no dark rooms
                  </p>
                </div>

                {/* Recording controls */}
                <div className="space-y-3">
                  {!isRecording ? (
                    <div className="flex flex-col gap-2">
                      <Button onClick={handleStartRecording} className="gap-2">
                        <Video className="h-4 w-4" />
                        Record Video
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        or upload a file below
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-3">
                        <div className="relative">
                          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                        </div>
                        <span className="text-sm font-mono font-bold text-red-600">
                          {countdown}s
                        </span>
                        <Progress
                          value={((MAX_RECORDING_SECONDS - countdown) / MAX_RECORDING_SECONDS) * 100}
                          className="w-24 h-2"
                        />
                      </div>
                      <Button
                        onClick={handleStopRecording}
                        variant="destructive"
                        size="sm"
                        className="gap-2"
                      >
                        <Square className="h-3 w-3" />
                        Stop Recording
                      </Button>
                    </div>
                  )}
                </div>

                {/* File upload */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  capture="user"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                {!isRecording && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" />
                    Upload Video File
                  </Button>
                )}
              </div>
            </>
          )}

          {/* VERIFYING STATE */}
          {popupState === "verifying" && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
                <Loader2 className="h-12 w-12 animate-spin text-primary relative" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-semibold">
                  We are verifying your details
                </p>
                <p className="text-xs text-muted-foreground max-w-[260px]">
                  An admin will review your submission shortly. You will be notified once verification is complete.
                </p>
              </div>
            </div>
          )}

          {/* UPLOADING STATE */}
          {popupState === "uploading" && (
            <div className="flex flex-col items-center gap-4 py-6">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <div className="w-full max-w-[200px] space-y-2">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-xs text-center text-muted-foreground">
                  Uploading verification video... {Math.round(uploadProgress)}%
                </p>
              </div>
            </div>
          )}

          {/* SUCCESS STATE */}
          {popupState === "success" && (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-semibold">Submitted successfully!</p>
                <p className="text-xs text-muted-foreground">
                  An admin will review your verification shortly.
                </p>
              </div>
            </div>
          )}

          {/* ERROR STATE */}
          {popupState === "error" && (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="h-14 w-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <XCircle className="h-8 w-8 text-red-500 dark:text-red-400" />
              </div>
              <div className="text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  Upload failed. Please try again.
                </p>
                <Button variant="outline" size="sm" onClick={handleRetry}>
                  Try Again
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {popupState === "upload" && (
            <Button variant="ghost" onClick={handleClose}>
              Skip for now
            </Button>
          )}
          {popupState === "success" && (
            <Button onClick={handleClose}>
              Continue
            </Button>
          )}
          {popupState === "verifying" && (
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}