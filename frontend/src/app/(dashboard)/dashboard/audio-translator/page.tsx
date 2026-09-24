"use client";

import { LANGUAGE_OPTIONS } from "~/config/languages";

import type {
  ChangeEvent,
  DragEvent,
} from "react";

import {
  Check,
  Download,
  FileAudio,
  Languages,
  Loader2,
  Upload,
  Volume2,
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
const MAX_FILE_SIZE = 100 * 1024 * 1024;

const ALLOWED_AUDIO_EXTENSIONS = [
  ".wav",
  ".mp3",
  ".m4a",
  ".mpeg",
  ".mpga",
  ".ogg",
  ".flac",
  ".aac",
];

const VOICE_STYLE_OPTIONS = [
  {
    value: "natural",
    label: "Natural",
  },
  {
    value: "professional",
    label: "Professional",
  },
  {
    value: "warm",
    label: "Warm",
  },
  {
    value: "energetic",
    label: "Energetic",
  },
];

type ProcessingStep =
  | "idle"
  | "transcribing"
  | "translating"
  | "generating"
  | "completed";

const STEP_ORDER: Record<
  ProcessingStep,
  number
> = {
  idle: 0,
  transcribing: 1,
  translating: 2,
  generating: 3,
  completed: 4,
};

interface TranscriptSegment {
  id: number;
  start: number;
  end: number;
  text: string;
}

interface TranslatedSegment {
  id: number;
  start: number;
  end: number;
  original_text: string;
  translated_text: string;
}

interface TranscriptionPayload {
  text: string;
  segments: TranscriptSegment[];
}

interface TranslationPayload {
  segments: TranslatedSegment[];
}

const isTranscriptSegment = (
  value: unknown,
): value is TranscriptSegment => {
  if (
    typeof value !== "object"
    || value === null
  ) {
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

const isTranslatedSegment = (
  value: unknown,
): value is TranslatedSegment => {
  if (
    typeof value !== "object"
    || value === null
  ) {
    return false;
  }

  return (
    "id" in value
    && typeof value.id === "number"
    && "start" in value
    && typeof value.start === "number"
    && "end" in value
    && typeof value.end === "number"
    && "original_text" in value
    && typeof value.original_text === "string"
    && "translated_text" in value
    && typeof value.translated_text === "string"
  );
};

const isTranscriptionPayload = (
  value: unknown,
): value is TranscriptionPayload => {
  if (
    typeof value !== "object"
    || value === null
  ) {
    return false;
  }

  if (
    !("text" in value)
    || typeof value.text !== "string"
  ) {
    return false;
  }

  if (
    !("segments" in value)
    || !Array.isArray(value.segments)
  ) {
    return false;
  }

  return value.segments.every(
    isTranscriptSegment,
  );
};

const isTranslationPayload = (
  value: unknown,
): value is TranslationPayload => {
  if (
    typeof value !== "object"
    || value === null
  ) {
    return false;
  }

  if (
    !("segments" in value)
    || !Array.isArray(value.segments)
  ) {
    return false;
  }

  return value.segments.every(
    isTranslatedSegment,
  );
};

const getErrorDetail = (
  value: unknown,
): string | null => {
  if (
    typeof value !== "object"
    || value === null
  ) {
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

const getFileExtension = (
  fileName: string,
): string => {
  const dotIndex = fileName.lastIndexOf(".");

  if (dotIndex < 0) {
    return "";
  }

  return fileName
    .slice(dotIndex)
    .toLowerCase();
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

  return safeName || "voxlingo-audio";
};

const formatDisplayTimestamp = (
  seconds: number,
): string => {
  const safeSeconds = Math.max(0, seconds);
  const totalSeconds = Math.floor(
    safeSeconds,
  );

  const hours = Math.floor(
    totalSeconds / 3600,
  );

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

export default function AudioTranslatorPage() {
  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [audioPreviewUrl, setAudioPreviewUrl] =
    useState<string | null>(null);

  const [translatedAudioUrl, setTranslatedAudioUrl] =
    useState<string | null>(null);

  const [sourceLanguage, setSourceLanguage] =
    useState("auto");

  const [targetLanguage, setTargetLanguage] =
    useState("hi");

  const [voiceStyle, setVoiceStyle] =
    useState("natural");

  const [transcript, setTranscript] =
    useState("");

  const [
    translatedSegments,
    setTranslatedSegments,
  ] = useState<TranslatedSegment[]>([]);

  const [error, setError] =
    useState<string | null>(null);

  const [isProcessing, setIsProcessing] =
    useState(false);

  const [processingStep, setProcessingStep] =
    useState<ProcessingStep>("idle");

  useEffect(() => {
    return () => {
      if (audioPreviewUrl) {
        URL.revokeObjectURL(
          audioPreviewUrl,
        );
      }

      if (translatedAudioUrl) {
        URL.revokeObjectURL(
          translatedAudioUrl,
        );
      }
    };
  }, [
    audioPreviewUrl,
    translatedAudioUrl,
  ]);

  const translatedText = useMemo(() => {
    return translatedSegments
      .map(
        (segment) =>
          segment.translated_text.trim(),
      )
      .filter(Boolean)
      .join(" ");
  }, [translatedSegments]);

  const duration = useMemo(() => {
    if (translatedSegments.length === 0) {
      return 0;
    }

    return Math.max(
      ...translatedSegments.map(
        (segment) => segment.end,
      ),
    );
  }, [translatedSegments]);

  const targetLanguageLabel =
    LANGUAGE_OPTIONS.find(
      (language) =>
        language.value === targetLanguage,
    )?.label ?? "Target";

  const resetResults = () => {
    setTranscript("");
    setTranslatedSegments([]);
    setProcessingStep("idle");

    if (translatedAudioUrl) {
      URL.revokeObjectURL(
        translatedAudioUrl,
      );

      setTranslatedAudioUrl(null);
    }
  };

  const handleAudioFile = (
    file: File,
  ) => {
    setError(null);
    resetResults();

    const extension =
      getFileExtension(file.name);

    if (
      !ALLOWED_AUDIO_EXTENSIONS.includes(
        extension,
      )
    ) {
      setError(
        "Please upload WAV, MP3, M4A, MPEG, MPGA, OGG, FLAC or AAC audio.",
      );
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(
        "Audio file must be smaller than 100MB.",
      );
      return;
    }

    if (audioPreviewUrl) {
      URL.revokeObjectURL(
        audioPreviewUrl,
      );
    }

    const objectUrl =
      URL.createObjectURL(file);

    setSelectedFile(file);
    setAudioPreviewUrl(objectUrl);
  };

  const handleFileChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    handleAudioFile(file);
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

    handleAudioFile(file);
  };

  const removeAudio = () => {
    if (audioPreviewUrl) {
      URL.revokeObjectURL(
        audioPreviewUrl,
      );
    }

    if (translatedAudioUrl) {
      URL.revokeObjectURL(
        translatedAudioUrl,
      );
    }

    setSelectedFile(null);
    setAudioPreviewUrl(null);
    setTranslatedAudioUrl(null);
    setError(null);
    setTranscript("");
    setTranslatedSegments([]);
    setProcessingStep("idle");

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

  const isStepActive = (
    stepNumber: number,
  ) => {
    if (
      processingStep === "completed"
    ) {
      return false;
    }

    return (
      STEP_ORDER[processingStep]
      === stepNumber
    );
  };

  const isStepComplete = (
    stepNumber: number,
  ) => {
    if (
      processingStep === "completed"
    ) {
      return true;
    }

    return (
      STEP_ORDER[processingStep]
      > stepNumber
    );
  };

  const handleStartTranslation =
    async () => {
      if (!selectedFile) {
        setError(
          "Please upload an audio file first.",
        );
        return;
      }

      if (
        sourceLanguage !== "auto"
        && sourceLanguage === targetLanguage
      ) {
        setError(
          "Source and target languages must be different.",
        );
        return;
      }

      try {
        setError(null);
        setIsProcessing(true);
        setTranscript("");
        setTranslatedSegments([]);

        if (translatedAudioUrl) {
          URL.revokeObjectURL(
            translatedAudioUrl,
          );

          setTranslatedAudioUrl(null);
        }

        // STEP 1: AUDIO -> TIMESTAMPED TRANSCRIPT
        setProcessingStep(
          "transcribing",
        );

        const transcriptionFormData =
          new FormData();

        transcriptionFormData.append(
          "audio",
          selectedFile,
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
              "Audio transcription failed.",
            ),
          );
        }

        const transcriptionPayload: unknown =
          await transcriptionResponse.json();

        if (
          !isTranscriptionPayload(
            transcriptionPayload,
          )
        ) {
          throw new Error(
            "Invalid transcription response received.",
          );
        }

        const cleanTranscript =
          transcriptionPayload.text.trim();

        if (!cleanTranscript) {
          throw new Error(
            "No speech was detected in this audio file.",
          );
        }

        if (
          transcriptionPayload.segments.length
          === 0
        ) {
          throw new Error(
            "No timestamped speech segments were returned.",
          );
        }

        setTranscript(
          cleanTranscript,
        );

        // STEP 2: TRANSCRIPT -> TRANSLATED SEGMENTS
        setProcessingStep(
          "translating",
        );

        const translationResponse =
          await fetch(
            `${API_BASE_URL}/translate-segments`,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                segments:
                  transcriptionPayload.segments,
                source_language:
                  sourceLanguage,
                target_language:
                  targetLanguage,
              }),
            },
          );

        if (!translationResponse.ok) {
          throw new Error(
            await getApiErrorMessage(
              translationResponse,
              "Audio translation failed.",
            ),
          );
        }

        const translationPayload: unknown =
          await translationResponse.json();

        if (
          !isTranslationPayload(
            translationPayload,
          )
        ) {
          throw new Error(
            "Invalid translation response received.",
          );
        }

        if (
          translationPayload.segments.length
          === 0
        ) {
          throw new Error(
            "No translated speech segments were returned.",
          );
        }

        setTranslatedSegments(
          translationPayload.segments,
        );

        // STEP 3: TRANSLATED SEGMENTS -> SYNCHRONIZED SPEECH
        setProcessingStep(
          "generating",
        );

        const speechResponse =
          await fetch(
            `${API_BASE_URL}/generate-segment-speech`,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                segments:
                  translationPayload.segments,
                target_language:
                  targetLanguage,
                voice_style:
                  voiceStyle,
              }),
            },
          );

        if (!speechResponse.ok) {
          throw new Error(
            await getApiErrorMessage(
              speechResponse,
              "Translated voice generation failed.",
            ),
          );
        }

        const translatedAudioBlob =
          await speechResponse.blob();

        if (
          translatedAudioBlob.size === 0
        ) {
          throw new Error(
            "Generated translated audio was empty.",
          );
        }

        const objectUrl =
          URL.createObjectURL(
            translatedAudioBlob,
          );

        setTranslatedAudioUrl(
          objectUrl,
        );

        setProcessingStep(
          "completed",
        );

        // Save project metadata/history only after the translated audio is ready.
        // A history save failure must not break the completed translation.
        try {
          const sourceLabel =
            sourceLanguage === "auto"
              ? "Auto Detect"
              : LANGUAGE_OPTIONS.find(
                  (language) =>
                    language.value === sourceLanguage,
                )?.label ?? sourceLanguage;

          const targetLabel =
            LANGUAGE_OPTIONS.find(
              (language) =>
                language.value === targetLanguage,
            )?.label ?? targetLanguage;

          const historyResult = await createProject({
            name: `${getBaseFileName(selectedFile.name)} Translation`,
            type: "AUDIO_TRANSLATION",
            sourceLanguage: sourceLabel,
            targetLanguage: targetLabel,
            inputName: selectedFile.name,
            workflowPath: "/dashboard/audio-translator",
          });

          if (!historyResult.success) {
            console.warn(
              "Audio translation completed, but project history was not saved:",
              historyResult.error,
            );
          }
        } catch (historyError) {
          console.warn(
            "Audio translation completed, but project history could not be saved:",
            historyError,
          );
        }
      } catch (caughtError) {
        console.error(
          "Audio translation failed:",
          caughtError,
        );

        setProcessingStep("idle");

        if (
          caughtError instanceof Error
        ) {
          setError(
            caughtError.message,
          );
        } else {
          setError(
            "Audio translation failed.",
          );
        }
      } finally {
        setIsProcessing(false);
      }
    };

  const handleDownloadAudio = () => {
    if (
      !selectedFile
      || !translatedAudioUrl
    ) {
      return;
    }

    const anchor =
      document.createElement("a");

    anchor.href =
      translatedAudioUrl;

    anchor.download =
      `${getBaseFileName(
        selectedFile.name,
      )}-${targetLanguage}-translated.wav`;

    document.body.appendChild(
      anchor,
    );

    anchor.click();
    anchor.remove();
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
          <Languages className="text-primary h-6 w-6" />

          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Audio Translator
          </h1>
        </div>

        <p className="text-muted-foreground max-w-3xl text-sm sm:text-base">
          Translate spoken audio into another language and
          generate a synchronized target-language voice track.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle>
              Upload audio
            </CardTitle>

            <CardDescription>
              WAV, MP3, M4A, MPEG, MPGA, OGG, FLAC and AAC
              files up to 100MB.
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
                className="border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30 flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 text-center transition-colors"
              >
                <div className="bg-primary/10 mb-4 flex h-14 w-14 items-center justify-center rounded-full">
                  <Upload className="text-primary h-6 w-6" />
                </div>

                <h2 className="text-base font-semibold">
                  Drop your audio here
                </h2>

                <p className="text-muted-foreground mt-2 max-w-sm text-sm">
                  Or click to choose an audio file from your computer.
                </p>

                <Button
                  type="button"
                  variant="outline"
                  className="mt-5"
                >
                  Choose Audio
                </Button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".wav,.mp3,.m4a,.mpeg,.mpga,.ogg,.flac,.aac,audio/*"
                  onChange={
                    handleFileChange
                  }
                  className="hidden"
                />
              </div>
            ) : (
              <div className="bg-muted/30 rounded-xl border p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="bg-primary/10 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg">
                      <FileAudio className="text-primary h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {
                          selectedFile.name
                        }
                      </p>

                      <p className="text-muted-foreground mt-1 text-xs">
                        {fileSizeMb} MB
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={
                      removeAudio
                    }
                    disabled={
                      isProcessing
                    }
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {audioPreviewUrl && (
                  <audio
                    src={
                      audioPreviewUrl
                    }
                    controls
                    className="mt-5 w-full"
                  />
                )}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="source-language"
                  className="text-sm font-medium"
                >
                  Source language
                </label>

                <select
                  id="source-language"
                  value={
                    sourceLanguage
                  }
                  onChange={(event) => {
                    setSourceLanguage(
                      event.target.value,
                    );
                  }}
                  disabled={
                    isProcessing
                  }
                  className="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 w-full rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="auto">
                    Auto Detect
                  </option>

                  {LANGUAGE_OPTIONS.map(
                    (language) => (
                      <option
                        key={
                          language.value
                        }
                        value={
                          language.value
                        }
                      >
                        {
                          language.label
                        }
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="target-language"
                  className="text-sm font-medium"
                >
                  Target language
                </label>

                <select
                  id="target-language"
                  value={
                    targetLanguage
                  }
                  onChange={(event) => {
                    setTargetLanguage(
                      event.target.value,
                    );
                  }}
                  disabled={
                    isProcessing
                  }
                  className="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 w-full rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {LANGUAGE_OPTIONS.map(
                    (language) => (
                      <option
                        key={
                          language.value
                        }
                        value={
                          language.value
                        }
                      >
                        {
                          language.label
                        }
                      </option>
                    ),
                  )}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="voice-style"
                className="text-sm font-medium"
              >
                Voice style
              </label>

              <select
                id="voice-style"
                value={
                  voiceStyle
                }
                onChange={(event) => {
                  setVoiceStyle(
                    event.target.value,
                  );
                }}
                disabled={
                  isProcessing
                }
                className="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 w-full rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {VOICE_STYLE_OPTIONS.map(
                  (style) => (
                    <option
                      key={
                        style.value
                      }
                      value={
                        style.value
                      }
                    >
                      {
                        style.label
                      }
                    </option>
                  ),
                )}
              </select>
            </div>

            <Button
              type="button"
              onClick={() => {
                void handleStartTranslation();
              }}
              disabled={
                isProcessing
                || !selectedFile
              }
              className="w-full gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Translating Audio...
                </>
              ) : (
                <>
                  <Languages className="h-4 w-4" />
                  Translate Audio
                </>
              )}
            </Button>

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
              Speech is transcribed, translated and regenerated
              while preserving the original timing.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            {[
              {
                number: 1,
                title:
                  "Transcribe audio",
                description:
                  "Detect the spoken content and build timestamped speech segments.",
              },
              {
                number: 2,
                title:
                  "Translate speech",
                description:
                  `Translate every segment into ${targetLanguageLabel} with duration-aware phrasing.`,
              },
              {
                number: 3,
                title:
                  "Generate synchronized voice",
                description:
                  "Create translated speech and fit it to the original timeline.",
              },
              {
                number: 4,
                title:
                  "Translated audio ready",
                description:
                  "Preview and download the translated WAV file.",
              },
            ].map((step) => {
              const active =
                isStepActive(
                  step.number,
                );

              const complete =
                isStepComplete(
                  step.number,
                );

              return (
                <div
                  key={
                    step.number
                  }
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
                      {
                        step.title
                      }
                    </p>

                    <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                      {
                        step.description
                      }
                    </p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {translatedAudioUrl && (
        <>
          <Card>
            <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>
                  Translated Audio
                </CardTitle>

                <CardDescription className="mt-1">
                  Synchronized {targetLanguageLabel} voice track
                  generated successfully.
                </CardDescription>
              </div>

              <Button
                type="button"
                onClick={
                  handleDownloadAudio
                }
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download WAV
              </Button>
            </CardHeader>

            <CardContent>
              <div className="bg-muted/30 rounded-xl border p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                    <Volume2 className="text-primary h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-sm font-medium">
                      {
                        targetLanguageLabel
                      } audio
                    </p>

                    <p className="text-muted-foreground text-xs">
                      Duration: {
                        formatDisplayTimestamp(
                          duration,
                        )
                      }
                    </p>
                  </div>
                </div>

                <audio
                  src={
                    translatedAudioUrl
                  }
                  controls
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>
                  Original Transcript
                </CardTitle>

                <CardDescription>
                  Speech detected in the source audio.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="bg-muted/30 max-h-80 overflow-y-auto rounded-lg border p-4">
                  <p className="whitespace-pre-wrap text-sm leading-7">
                    {
                      transcript
                    }
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  Translation
                </CardTitle>

                <CardDescription>
                  Duration-aware {
                    targetLanguageLabel
                  } translation.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="bg-muted/30 max-h-80 overflow-y-auto rounded-lg border p-4">
                  <p className="whitespace-pre-wrap text-sm leading-7">
                    {
                      translatedText
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>
                Translated segments
              </CardTitle>

              <CardDescription>
                Original and translated phrases aligned to the
                same speech timeline.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="max-h-[36rem] space-y-3 overflow-y-auto pr-1">
                {translatedSegments.map(
                  (
                    segment,
                    index,
                  ) => (
                    <div
                      key={`${segment.id}-${segment.start}-${index}`}
                      className="rounded-lg border p-4"
                    >
                      <div className="text-primary mb-3 font-mono text-xs font-medium">
                        {
                          formatDisplayTimestamp(
                            segment.start,
                          )
                        }
                        {" → "}
                        {
                          formatDisplayTimestamp(
                            segment.end,
                          )
                        }
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="bg-muted/30 rounded-md p-3">
                          <p className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">
                            Original
                          </p>

                          <p className="text-sm leading-6">
                            {
                              segment.original_text
                            }
                          </p>
                        </div>

                        <div className="bg-primary/5 rounded-md p-3">
                          <p className="text-primary mb-1 text-xs font-medium uppercase tracking-wide">
                            {
                              targetLanguageLabel
                            }
                          </p>

                          <p className="text-sm leading-6">
                            {
                              segment.translated_text
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
