"use client";

import type {
  ChangeEvent,
  DragEvent,
} from "react";

import {
  Check,
  Clipboard,
  Download,
  FileText,
  Loader2,
  Upload,
  Video,
  X,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { createProject } from "~/actions/project";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

const API_BASE_URL = "http://localhost:8000";
const MAX_FILE_SIZE = 200 * 1024 * 1024;

const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

type ProcessingStep =
  | "idle"
  | "extracting"
  | "transcribing"
  | "completed";

const STEP_ORDER: Record<ProcessingStep, number> = {
  idle: 0,
  extracting: 1,
  transcribing: 2,
  completed: 3,
};

interface TranscriptSegment {
  id: number;
  start: number;
  end: number;
  text: string;
}

interface TranscriptionPayload {
  text: string;
  segments: TranscriptSegment[];
}

const isTranscriptSegment = (
  value: unknown,
): value is TranscriptSegment => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return (
    "id" in value
    && typeof value.id === "number"
    && "start" in value
    && typeof value.start === "number"
    && "end" in value
    && typeof value.end === "number"
    && "text" in value
    && typeof value.text === "string"
  );
};

const isTranscriptionPayload = (
  value: unknown,
): value is TranscriptionPayload => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  if (!("text" in value) || typeof value.text !== "string") {
    return false;
  }

  if (
    !("segments" in value)
    || !Array.isArray(value.segments)
  ) {
    return false;
  }

  return value.segments.every(isTranscriptSegment);
};

const getErrorDetail = (
  value: unknown,
): string | null => {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  if (
    !("detail" in value)
    || typeof value.detail !== "string"
  ) {
    return null;
  }

  return value.detail;
};

const formatSrtTimestamp = (
  seconds: number,
): string => {
  const safeSeconds = Math.max(0, seconds);
  const totalMilliseconds = Math.round(
    safeSeconds * 1000,
  );

  const hours = Math.floor(
    totalMilliseconds / 3_600_000,
  );
  const minutes = Math.floor(
    (totalMilliseconds % 3_600_000) / 60_000,
  );
  const secs = Math.floor(
    (totalMilliseconds % 60_000) / 1000,
  );
  const milliseconds = totalMilliseconds % 1000;

  return (
    [
      String(hours).padStart(2, "0"),
      String(minutes).padStart(2, "0"),
      String(secs).padStart(2, "0"),
    ].join(":")
    + `,${String(milliseconds).padStart(3, "0")}`
  );
};

const formatDisplayTimestamp = (
  seconds: number,
): string => {
  const safeSeconds = Math.max(0, seconds);
  const totalSeconds = Math.floor(safeSeconds);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor(
    (totalSeconds % 3600) / 60,
  );
  const secs = totalSeconds % 60;

  if (hours > 0) {
    return [
      String(hours).padStart(2, "0"),
      String(minutes).padStart(2, "0"),
      String(secs).padStart(2, "0"),
    ].join(":");
  }

  return [
    String(minutes).padStart(2, "0"),
    String(secs).padStart(2, "0"),
  ].join(":");
};

const createSrtText = (
  segments: TranscriptSegment[],
): string => {
  return segments
    .filter(
      (segment) => segment.text.trim().length > 0,
    )
    .map((segment, index) => {
      const start = formatSrtTimestamp(segment.start);
      const end = formatSrtTimestamp(segment.end);
      const text = segment.text.trim();

      return `${index + 1}\n${start} --> ${end}\n${text}`;
    })
    .join("\n\n");
};

const getBaseFileName = (
  fileName: string,
): string => {
  const lastDot = fileName.lastIndexOf(".");

  const rawName =
    lastDot > 0
      ? fileName.slice(0, lastDot)
      : fileName;

  const safeName = rawName
    .trim()
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return safeName || "voxlingo-transcript";
};

const downloadBlob = (
  blob: Blob,
  fileName: string,
) => {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = objectUrl;
  anchor.download = fileName;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(objectUrl);
};

export default function VideoTranscriptionPage() {
  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [previewUrl, setPreviewUrl] =
    useState<string | null>(null);

  const [transcript, setTranscript] =
    useState("");

  const [segments, setSegments] =
    useState<TranscriptSegment[]>([]);

  const [error, setError] =
    useState<string | null>(null);

  const [isProcessing, setIsProcessing] =
    useState(false);

  const [processingStep, setProcessingStep] =
    useState<ProcessingStep>("idle");

  const [copied, setCopied] =
    useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const duration = useMemo(() => {
    if (segments.length === 0) {
      return 0;
    }

    return Math.max(
      ...segments.map(
        (segment) => segment.end,
      ),
    );
  }, [segments]);

  const wordCount = useMemo(() => {
    const value = transcript.trim();

    if (!value) {
      return 0;
    }

    return value
      .split(/\s+/)
      .filter(Boolean)
      .length;
  }, [transcript]);

  const resetResults = () => {
    setTranscript("");
    setSegments([]);
    setCopied(false);
    setProcessingStep("idle");
  };

  const handleVideoFile = (
    file: File,
  ) => {
    setError(null);
    resetResults();

    if (
      file.type
      && !ALLOWED_VIDEO_TYPES.includes(file.type)
    ) {
      setError(
        "Please upload an MP4, WebM or MOV video.",
      );
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(
        "Video must be smaller than 200MB.",
      );
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const objectUrl = URL.createObjectURL(file);

    setSelectedFile(file);
    setPreviewUrl(objectUrl);
  };

  const handleFileChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    handleVideoFile(file);
  };

  const handleDrop = (
    event: DragEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();

    if (isProcessing) {
      return;
    }

    const file =
      event.dataTransfer.files?.[0];

    if (!file) {
      return;
    }

    handleVideoFile(file);
  };

  const removeVideo = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    resetResults();

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getApiErrorMessage = async (
    response: Response,
    fallbackMessage: string,
  ) => {
    try {
      const data: unknown =
        await response.json();

      return (
        getErrorDetail(data)
        ?? fallbackMessage
      );
    } catch {
      return fallbackMessage;
    }
  };

  const isStepActive = (stepNumber: number) => {
  if (processingStep === "completed") {
    return false;
  }

  return STEP_ORDER[processingStep] === stepNumber;
};

const isStepComplete = (stepNumber: number) => {
  if (processingStep === "completed") {
    return true;
  }

  return STEP_ORDER[processingStep] > stepNumber;
};
  const handleStartTranscription =
    async () => {
      if (!selectedFile) {
        setError(
          "Please upload a video first.",
        );
        return;
      }

      try {
        setError(null);
        setCopied(false);
        setIsProcessing(true);
        setTranscript("");
        setSegments([]);

        // STEP 1: VIDEO -> WAV
        setProcessingStep("extracting");

        const extractFormData =
          new FormData();

        extractFormData.append(
          "video",
          selectedFile,
        );

        const extractResponse =
          await fetch(
            `${API_BASE_URL}/extract-audio`,
            {
              method: "POST",
              body: extractFormData,
            },
          );

        if (!extractResponse.ok) {
          throw new Error(
            await getApiErrorMessage(
              extractResponse,
              "Audio extraction failed.",
            ),
          );
        }

        const audioBlob =
          await extractResponse.blob();

        if (audioBlob.size === 0) {
          throw new Error(
            "Extracted audio was empty.",
          );
        }

        const audioFile = new File(
          [audioBlob],
          "voxlingo-extracted-audio.wav",
          {
            type: "audio/wav",
          },
        );

        // STEP 2: WAV -> TIMESTAMPED TRANSCRIPT
        setProcessingStep("transcribing");

        const transcriptionFormData =
          new FormData();

        transcriptionFormData.append(
          "audio",
          audioFile,
        );

        const transcriptionResponse =
          await fetch(
            `${API_BASE_URL}/transcribe`,
            {
              method: "POST",
              body: transcriptionFormData,
            },
          );

        if (!transcriptionResponse.ok) {
          throw new Error(
            await getApiErrorMessage(
              transcriptionResponse,
              "Video transcription failed.",
            ),
          );
        }

        const transcriptionData: unknown =
          await transcriptionResponse.json();

        if (
          !isTranscriptionPayload(
            transcriptionData,
          )
        ) {
          throw new Error(
            "Invalid transcription response received.",
          );
        }

        const cleanTranscript =
          transcriptionData.text.trim();

        if (!cleanTranscript) {
          throw new Error(
            "No speech was detected in this video.",
          );
        }

        setTranscript(cleanTranscript);
        setSegments(
          transcriptionData.segments,
        );

        setProcessingStep("completed");

        // Save project metadata/history only after transcription succeeds.
        // If history saving fails, the transcript remains available.
        try {
          const historyResult = await createProject({
            name: `${getBaseFileName(selectedFile.name)} Transcript`,
            type: "VIDEO_TRANSCRIPTION",
            sourceLanguage: null,
            targetLanguage: null,
            inputName: selectedFile.name,
            workflowPath: "/dashboard/video-transcription",
          });

          if (!historyResult.success) {
            console.warn(
              "Video transcription completed, but project history was not saved:",
              historyResult.error,
            );
          }
        } catch (historyError) {
          console.warn(
            "Video transcription completed, but project history could not be saved:",
            historyError,
          );
        }
      } catch (caughtError) {
        console.error(
          "Video transcription failed:",
          caughtError,
        );

        setProcessingStep("idle");

        if (
          caughtError
          instanceof Error
        ) {
          setError(caughtError.message);
        } else {
          setError(
            "Video transcription failed.",
          );
        }
      } finally {
        setIsProcessing(false);
      }
    };

  const handleCopyTranscript =
    async () => {
      if (!transcript) {
        return;
      }

      try {
        await navigator.clipboard.writeText(
          transcript,
        );

        setCopied(true);

        window.setTimeout(() => {
          setCopied(false);
        }, 1800);
      } catch {
        setError(
          "Could not copy the transcript.",
        );
      }
    };

  const handleDownloadTxt = () => {
    if (!selectedFile || !transcript) {
      return;
    }

    const blob = new Blob(
      [transcript],
      {
        type: "text/plain;charset=utf-8",
      },
    );

    downloadBlob(
      blob,
      `${getBaseFileName(
        selectedFile.name,
      )}-transcript.txt`,
    );
  };

  const handleDownloadSrt = () => {
    if (
      !selectedFile
      || segments.length === 0
    ) {
      return;
    }

    const srtText =
      createSrtText(segments);

    if (!srtText.trim()) {
      setError(
        "No timestamped segments are available.",
      );
      return;
    }

    const blob = new Blob(
      [srtText],
      {
        type:
          "application/x-subrip;charset=utf-8",
      },
    );

    downloadBlob(
      blob,
      `${getBaseFileName(
        selectedFile.name,
      )}-subtitles.srt`,
    );
  };

  const fileSizeMb = selectedFile
    ? (
        selectedFile.size
        / (1024 * 1024)
      ).toFixed(1)
    : null;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <FileText className="text-primary h-6 w-6" />

          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Video Transcription
          </h1>
        </div>

        <p className="text-muted-foreground max-w-3xl text-sm sm:text-base">
          Upload a video and Nirwana will generate a
          timestamped transcript that you can copy or
          download as TXT and SRT.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle>
              Upload video
            </CardTitle>

            <CardDescription>
              MP4, WebM and MOV files up to 200MB.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {!selectedFile ? (
              <div
                role="button"
                tabIndex={0}
                onDragOver={(event) => {
                  event.preventDefault();
                }}
                onDrop={handleDrop}
                onClick={() => {
                  fileInputRef.current?.click();
                }}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter"
                    || event.key === " "
                  ) {
                    event.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                className="border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30 flex min-h-72 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 text-center transition-colors"
              >
                <div className="bg-primary/10 mb-4 flex h-14 w-14 items-center justify-center rounded-full">
                  <Upload className="text-primary h-6 w-6" />
                </div>

                <h2 className="text-base font-semibold">
                  Drop your video here
                </h2>

                <p className="text-muted-foreground mt-2 max-w-sm text-sm">
                  Or click to browse a video from your computer.
                </p>

                <Button
                  type="button"
                  variant="outline"
                  className="mt-5"
                >
                  Choose Video
                </Button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="space-y-4">
                {previewUrl && (
                  <div className="overflow-hidden rounded-xl border bg-black">
                    <video
                      src={previewUrl}
                      controls
                      className="aspect-video w-full"
                    />
                  </div>
                )}

                <div className="bg-muted/30 flex items-center justify-between gap-4 rounded-lg border p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                      <Video className="text-primary h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {selectedFile.name}
                      </p>

                      <p className="text-muted-foreground text-xs">
                        {fileSizeMb} MB
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeVideo}
                    disabled={isProcessing}
                    className="shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <Button
                  type="button"
                  onClick={() => {
                    void handleStartTranscription();
                  }}
                  disabled={isProcessing}
                  className="w-full gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Transcribing...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" />
                      Generate Transcript
                    </>
                  )}
                </Button>
              </div>
            )}

            {error && (
              <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border px-4 py-3 text-sm">
                {error}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Processing
            </CardTitle>

            <CardDescription>
              Nirwana reuses the same smart timestamping
              engine used by Video Dubbing.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {[
              {
                number: 1,
                title: "Extract audio",
                description:
                  "Convert the uploaded video into speech-ready audio.",
              },
              {
                number: 2,
                title: "Transcribe and timestamp",
                description:
                  "Detect speech and create readable timestamped segments.",
              },
              {
                number: 3,
                title: "Transcript ready",
                description:
                  "Copy the text or download TXT and SRT files.",
              },
            ].map((step) => {
              const active =
                isStepActive(step.number);

              const complete =
                isStepComplete(step.number);

              return (
                <div
                  key={step.number}
                  className={`flex gap-3 rounded-lg border p-4 transition-colors ${
                    active
                      ? "border-primary/40 bg-primary/5"
                      : complete
                        ? "border-green-500/25 bg-green-500/5"
                        : "border-border"
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                      complete
                        ? "bg-green-500 text-white"
                        : active
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {complete ? (
                      <Check className="h-4 w-4" />
                    ) : active ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      step.number
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-medium">
                      {step.title}
                    </p>

                    <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {transcript && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="p-5">
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                  Words
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {wordCount}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                  Segments
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {segments.length}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                  Duration
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {formatDisplayTimestamp(duration)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>
                  Transcript
                </CardTitle>

                <CardDescription className="mt-1">
                  Complete speech detected in the uploaded video.
                </CardDescription>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void handleCopyTranscript();
                  }}
                  className="gap-2"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Clipboard className="h-4 w-4" />
                  )}

                  {copied
                    ? "Copied"
                    : "Copy"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTxt}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  TXT
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleDownloadSrt}
                  disabled={
                    segments.length === 0
                  }
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  SRT
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              <div className="bg-muted/30 max-h-80 overflow-y-auto rounded-lg border p-4">
                <p className="whitespace-pre-wrap text-sm leading-7">
                  {transcript}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                Timestamped segments
              </CardTitle>

              <CardDescription>
                Smart speech chunks generated from word-level timestamps.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {segments.length === 0 ? (
                <div className="text-muted-foreground rounded-lg border p-4 text-sm">
                  The transcript is ready, but no timestamped
                  segments were returned.
                </div>
              ) : (
                <div className="max-h-[32rem] space-y-3 overflow-y-auto pr-1">
                  {segments.map(
                    (segment, index) => (
                      <div
                        key={`${segment.id}-${segment.start}-${index}`}
                        className="grid gap-3 rounded-lg border p-4 sm:grid-cols-[120px_1fr]"
                      >
                        <div className="text-primary font-mono text-xs font-medium">
                          {formatDisplayTimestamp(
                            segment.start,
                          )}
                          {" → "}
                          {formatDisplayTimestamp(
                            segment.end,
                          )}
                        </div>

                        <p className="text-sm leading-6">
                          {segment.text.trim()}
                        </p>
                      </div>
                    ),
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
