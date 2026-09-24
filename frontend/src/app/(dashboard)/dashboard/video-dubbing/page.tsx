"use client";

import { LANGUAGE_LABELS, LANGUAGE_OPTIONS } from "~/config/languages";

import {
  AlertCircle,
  Captions,
  CheckCircle2,
  Download,
  FileText,
  Languages,
  Link2,
  Loader2,
  Mic2,
  Upload,
  Video,
  Volume2,
  X,
} from "lucide-react";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
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
  | "translating"
  | "generatingVoice"
  | "rendering"
  | "completed";

const STEP_ORDER: Record<ProcessingStep, number> = {
  idle: 0,
  extracting: 1,
  transcribing: 2,
  translating: 3,
  generatingVoice: 4,
  rendering: 5,
  completed: 6,
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

const isTranslatedSegment = (
  value: unknown,
): value is TranslatedSegment => {
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
    && "original_text" in value
    && typeof value.original_text === "string"
    && "translated_text" in value
    && typeof value.translated_text === "string"
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

  if (!("segments" in value) || !Array.isArray(value.segments)) {
    return false;
  }

  return value.segments.every(isTranscriptSegment);
};

const isTranslationPayload = (
  value: unknown,
): value is TranslationPayload => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  if (!("segments" in value) || !Array.isArray(value.segments)) {
    return false;
  }

  return value.segments.every(isTranslatedSegment);
};

const getErrorDetail = (
  value: unknown,
): string | null => {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  if (!("detail" in value) || typeof value.detail !== "string") {
    return null;
  }

  return value.detail;
};

const formatSrtTimestamp = (
  seconds: number,
): string => {
  const safeSeconds = Math.max(0, seconds);
  const totalMilliseconds = Math.round(safeSeconds * 1000);

  const hours = Math.floor(totalMilliseconds / 3_600_000);
  const minutes = Math.floor(
    (totalMilliseconds % 3_600_000) / 60_000,
  );
  const secs = Math.floor(
    (totalMilliseconds % 60_000) / 1000,
  );
  const milliseconds = totalMilliseconds % 1000;

  return [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
    String(secs).padStart(2, "0"),
  ].join(":") + `,${String(milliseconds).padStart(3, "0")}`;
};

const createSrtText = (
  segments: TranslatedSegment[],
): string => {
  return segments
    .filter(
      (segment) => segment.translated_text.trim().length > 0,
    )
    .map((segment, index) => {
      const start = formatSrtTimestamp(segment.start);
      const end = formatSrtTimestamp(segment.end);
      const text = segment.translated_text.trim();

      return `${index + 1}\n${start} --> ${end}\n${text}`;
    })
    .join("\n\n");
};

export default function VideoDubbingPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [transcript, setTranscript] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [segmentCount, setSegmentCount] = useState(0);

  const [dubbedAudioUrl, setDubbedAudioUrl] = useState<string | null>(null);
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);
  const [subtitleUrl, setSubtitleUrl] = useState<string | null>(null);

  const [sourceLanguage, setSourceLanguage] = useState("auto");
  const [targetLanguage, setTargetLanguage] = useState("fr");
  const [voiceStyle, setVoiceStyle] = useState("natural");
  const [preserveBackgroundAudio, setPreserveBackgroundAudio] =
    useState(false);
  const [generateSubtitles, setGenerateSubtitles] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<ProcessingStep>("idle");

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (dubbedAudioUrl) {
        URL.revokeObjectURL(dubbedAudioUrl);
      }
    };
  }, [dubbedAudioUrl]);

  useEffect(() => {
    return () => {
      if (finalVideoUrl) {
        URL.revokeObjectURL(finalVideoUrl);
      }
    };
  }, [finalVideoUrl]);

  useEffect(() => {
    return () => {
      if (subtitleUrl) {
        URL.revokeObjectURL(subtitleUrl);
      }
    };
  }, [subtitleUrl]);

  const resetResults = () => {
    setTranscript("");
    setTranslatedText("");
    setSegmentCount(0);
    setDubbedAudioUrl(null);
    setFinalVideoUrl(null);
    setSubtitleUrl(null);
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
      setError("Please upload an MP4, WebM or MOV video.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("Video must be smaller than 200MB.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);

    setSelectedFile(file);
    setPreviewUrl(objectUrl);
  };

  const handleFileChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

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

    const file = event.dataTransfer.files?.[0];

    if (!file) {
      return;
    }

    handleVideoFile(file);
  };

  const removeVideo = () => {
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
      const data: unknown = await response.json();
      return getErrorDetail(data) ?? fallbackMessage;
    } catch {
      return fallbackMessage;
    }
  };

  const isStepActive = (
    stepNumber: number,
  ) => STEP_ORDER[processingStep] === stepNumber;

  const isStepComplete = (
    stepNumber: number,
  ) => STEP_ORDER[processingStep] > stepNumber;

  const handleStartDubbing = async () => {
    if (!selectedFile) {
      setError("Please upload a video first.");
      return;
    }

    try {
      setError(null);
      setIsProcessing(true);

      setTranscript("");
      setTranslatedText("");
      setSegmentCount(0);
      setDubbedAudioUrl(null);
      setFinalVideoUrl(null);
      setSubtitleUrl(null);

      setProcessingStep("extracting");

      const extractFormData = new FormData();
      extractFormData.append("video", selectedFile);

      const extractResponse = await fetch(
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

      const audioBlob = await extractResponse.blob();

      setProcessingStep("transcribing");

      const audioFile = new File(
        [audioBlob],
        "voxlingo-extracted-audio.wav",
        {
          type: "audio/wav",
        },
      );

      let backgroundAudioFileForRender: File | null = null;

      if (preserveBackgroundAudio) {
        const backgroundFormData = new FormData();
        backgroundFormData.append(
          "video",
          selectedFile,
        );

        const backgroundResponse = await fetch(
          `${API_BASE_URL}/separate-background`,
          {
            method: "POST",
            body: backgroundFormData,
          },
        );

        if (!backgroundResponse.ok) {
          throw new Error(
            await getApiErrorMessage(
              backgroundResponse,
              "Background audio separation failed.",
            ),
          );
        }

        const backgroundBlob =
          await backgroundResponse.blob();

        if (backgroundBlob.size === 0) {
          throw new Error(
            "Separated background audio was empty.",
          );
        }

        backgroundAudioFileForRender = new File(
          [backgroundBlob],
          "voxlingo-background.wav",
          {
            type: "audio/wav",
          },
        );
      }

      const transcriptionFormData = new FormData();
      transcriptionFormData.append("audio", audioFile);

      const transcriptionResponse = await fetch(
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
            "Transcription failed.",
          ),
        );
      }

      const transcriptionData: unknown =
        await transcriptionResponse.json();

      if (!isTranscriptionPayload(transcriptionData)) {
        throw new Error(
          "Invalid transcription response received.",
        );
      }

      const originalTranscript = transcriptionData.text.trim();
      const transcriptSegments = transcriptionData.segments;

      if (!originalTranscript) {
        throw new Error(
          "The video did not contain any detectable speech.",
        );
      }

      if (transcriptSegments.length === 0) {
        throw new Error(
          "Timestamped transcription segments were not returned.",
        );
      }

      setTranscript(originalTranscript);
      setSegmentCount(transcriptSegments.length);

      setProcessingStep("translating");

      const translationResponse = await fetch(
        `${API_BASE_URL}/translate-segments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            segments: transcriptSegments,
            source_language: sourceLanguage,
            target_language: targetLanguage,
          }),
        },
      );

      if (!translationResponse.ok) {
        throw new Error(
          await getApiErrorMessage(
            translationResponse,
            "Segment translation failed.",
          ),
        );
      }

      const translationData: unknown =
        await translationResponse.json();

      if (!isTranslationPayload(translationData)) {
        throw new Error(
          "Invalid translation response received.",
        );
      }

      const translatedSegments = translationData.segments;

      if (translatedSegments.length === 0) {
        throw new Error(
          "No translated segments were returned.",
        );
      }

      const combinedTranslation = translatedSegments
        .map((segment) => segment.translated_text.trim())
        .filter((value) => value.length > 0)
        .join(" ");

      if (!combinedTranslation) {
        throw new Error(
          "Translation returned empty text.",
        );
      }

      setTranslatedText(combinedTranslation);

      let subtitleFileForRender: File | null = null;

      if (generateSubtitles) {
        const srtText = createSrtText(translatedSegments);

        if (srtText.trim().length > 0) {
          const subtitleBlob = new Blob(
            [srtText],
            {
              type: "application/x-subrip;charset=utf-8",
            },
          );

          const objectUrl = URL.createObjectURL(subtitleBlob);
          setSubtitleUrl(objectUrl);

          subtitleFileForRender = new File(
            [subtitleBlob],
            `voxlingo-${targetLanguage}-subtitles.srt`,
            {
              type: "application/x-subrip",
            },
          );
        }
      }

      setProcessingStep("generatingVoice");

      const speechResponse = await fetch(
        `${API_BASE_URL}/generate-segment-speech`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            segments: translatedSegments,
            target_language: targetLanguage,
            voice_style: voiceStyle,
          }),
        },
      );

      if (!speechResponse.ok) {
        throw new Error(
          await getApiErrorMessage(
            speechResponse,
            "Synchronized speech generation failed.",
          ),
        );
      }

      const synchronizedAudioBlob = await speechResponse.blob();

      if (synchronizedAudioBlob.size === 0) {
        throw new Error(
          "Generated synchronized audio was empty.",
        );
      }

      const synchronizedAudioUrl =
        URL.createObjectURL(synchronizedAudioBlob);

      setDubbedAudioUrl(synchronizedAudioUrl);

      const synchronizedAudioFile = new File(
        [synchronizedAudioBlob],
        "voxlingo-synchronized-dub.wav",
        {
          type: "audio/wav",
        },
      );

      setProcessingStep("rendering");

      const renderFormData = new FormData();
      renderFormData.append("video", selectedFile);
      renderFormData.append("dubbed_audio", synchronizedAudioFile);

      if (subtitleFileForRender) {
        renderFormData.append(
          "subtitles",
          subtitleFileForRender,
        );
      }

      if (backgroundAudioFileForRender) {
        renderFormData.append(
          "background_audio",
          backgroundAudioFileForRender,
        );
      }

      const renderResponse = await fetch(
        `${API_BASE_URL}/render-video`,
        {
          method: "POST",
          body: renderFormData,
        },
      );

      if (!renderResponse.ok) {
        throw new Error(
          await getApiErrorMessage(
            renderResponse,
            "Final video rendering failed.",
          ),
        );
      }

      const finalVideoBlob = await renderResponse.blob();

      if (finalVideoBlob.size === 0) {
        throw new Error(
          "Rendered video was empty.",
        );
      }

      const finalObjectUrl =
        URL.createObjectURL(finalVideoBlob);

      setFinalVideoUrl(finalObjectUrl);
      setProcessingStep("completed");

      // Save only project metadata/history.
      // A history save failure must never break the completed dubbing result.
      try {
        const baseName = selectedFile.name.replace(
          /\.[^/.]+$/,
          "",
        );

        const historyResult = await createProject({
          name: `${baseName} Dub`,
          type: "VIDEO_DUBBING",
          sourceLanguage:
            sourceLanguage === "auto"
              ? "Auto Detect"
              : LANGUAGE_LABELS[sourceLanguage] ?? sourceLanguage,
          targetLanguage:
            LANGUAGE_LABELS[targetLanguage] ?? targetLanguage,
          inputName: selectedFile.name,
          workflowPath: "/dashboard/video-dubbing",
        });

        if (!historyResult.success) {
          console.warn(
            "Video completed, but project history was not saved:",
            historyResult.error,
          );
        }
      } catch (historyError) {
        console.warn(
          "Video completed, but project history could not be saved:",
          historyError,
        );
      }
    } catch (processingError) {
      console.error(processingError);

      if (processingError instanceof Error) {
        setError(processingError.message);
      } else {
        setError(
          "Something went wrong while dubbing the video.",
        );
      }

      setProcessingStep("idle");
    } finally {
      setIsProcessing(false);
    }
  };

  const renderProgressItem = (
    number: number,
    title: string,
    description: string,
  ) => {
    const active = isStepActive(number);
    const complete = isStepComplete(number);

    return (
      <div className="flex items-start gap-3">
        <div
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border"
        >
          {complete ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          ) : active ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <span className="text-xs text-muted-foreground">
              {number}
            </span>
          )}
        </div>

        <div>
          <p className="text-sm font-medium">
            {title}
          </p>

          <p className="text-xs text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div
      className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-10"
    >
      <div>
        <div className="flex items-center gap-2">
          <Video className="h-6 w-6" />

          <h1 className="text-2xl font-semibold tracking-tight">
            Video Dubbing
          </h1>
        </div>

        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Translate and dub your video into another language with synchronized AI-generated speech.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          className="h-12 gap-2"
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
        >
          <Upload className="h-4 w-4" />
          Upload Video
        </Button>

        <Button
          variant="outline"
          className="h-12 gap-2"
          disabled
        >
          <Link2 className="h-4 w-4" />
          Import from Link

          <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-[10px]">
            Soon
          </span>
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={handleFileChange}
      />

      {!selectedFile ? (
        <Card>
          <CardContent className="p-6">
            <div
              onDragOver={(event) => {
                event.preventDefault();
              }}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="flex min-h-[260px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center transition-colors hover:bg-muted/40"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Upload className="h-5 w-5" />
              </div>

              <p className="font-medium">
                Drop your video here
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                or click to browse
              </p>

              <p className="mt-4 text-xs text-muted-foreground">
                MP4, WebM or MOV · Maximum 200MB
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base">
                  Source Video
                </CardTitle>

                <CardDescription>
                  {selectedFile.name}
                </CardDescription>
              </div>

              <Button
                size="icon"
                variant="ghost"
                onClick={removeVideo}
                disabled={isProcessing}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {previewUrl && (
              <video
                src={previewUrl}
                controls
                className="aspect-video w-full rounded-xl bg-black object-contain"
              />
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Dubbing Settings
          </CardTitle>

          <CardDescription>
            Choose languages, voice style and optional subtitle export.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid gap-5 md:grid-cols-3">
            <div className="space-y-2">
              <label
                htmlFor="source-language"
                className="text-sm font-medium"
              >
                Source Language
              </label>

              <select
                id="source-language"
                value={sourceLanguage}
                onChange={(event) => {
                  setSourceLanguage(event.target.value);
                }}
                disabled={isProcessing}
                className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="auto">Auto Detect</option>

                {LANGUAGE_OPTIONS.map((language) => (
                  <option key={language.value} value={language.value}>
                    {language.label}
                  </option>
                ))}</select>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="target-language"
                className="text-sm font-medium"
              >
                Target Language
              </label>

              <select
                id="target-language"
                value={targetLanguage}
                onChange={(event) => {
                  setTargetLanguage(event.target.value);
                }}
                disabled={isProcessing}
                className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                {LANGUAGE_OPTIONS.map((language) => (
                  <option key={language.value} value={language.value}>
                    {language.label}
                  </option>
                ))}</select>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="voice-style"
                className="text-sm font-medium"
              >
                Voice Style
              </label>

              <select
                id="voice-style"
                value={voiceStyle}
                onChange={(event) => {
                  setVoiceStyle(event.target.value);
                }}
                disabled={isProcessing}
                className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="natural">Natural</option>
                <option value="professional">Professional</option>
                <option value="warm">Warm</option>
                <option value="energetic">Energetic</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 rounded-lg border bg-muted/20 p-4 md:grid-cols-2">
            <div className="flex items-start gap-3">
              <input
                id="preserve-background-audio"
                type="checkbox"
                checked={preserveBackgroundAudio}
                onChange={(event) => {
                  setPreserveBackgroundAudio(
                    event.target.checked,
                  );
                }}
                disabled={isProcessing}
                className="mt-1 h-4 w-4"
              />

              <div>
                <label
                  htmlFor="preserve-background-audio"
                  className="flex cursor-pointer items-center gap-2 text-sm font-medium"
                >
                  <Volume2 className="h-4 w-4" />
                  Preserve background audio
                </label>

                <p className="mt-1 text-xs text-muted-foreground">
                  Remove original speech and mix the remaining music or ambient sound under the translated voice.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <input
                id="generate-subtitles"
                type="checkbox"
                checked={generateSubtitles}
                onChange={(event) => {
                  setGenerateSubtitles(event.target.checked);
                }}
                disabled={isProcessing}
                className="mt-1 h-4 w-4"
              />

              <div>
                <label
                  htmlFor="generate-subtitles"
                  className="flex cursor-pointer items-center gap-2 text-sm font-medium"
                >
                  <Captions className="h-4 w-4" />
                  Generate subtitles
                </label>

                <p className="mt-1 text-xs text-muted-foreground">
                  Burn translated subtitles into the final video and keep the SRT available for download.
                </p>
              </div>
            </div>
          </div>

          <Button
            className="w-full gap-2"
            size="lg"
            onClick={handleStartDubbing}
            disabled={!selectedFile || isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Dubbing Video...
              </>
            ) : (
              <>
                <Languages className="h-4 w-4" />
                Start Dubbing
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-600">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {processingStep !== "idle" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Dubbing Pipeline
            </CardTitle>

            <CardDescription>
              Nirwana is processing the video with synchronized dubbing.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {renderProgressItem(
              1,
              "Extract audio",
              preserveBackgroundAudio
                ? "Extract speech audio and separate the original background track."
                : "Extract speech audio from the video.",
            )}

            {renderProgressItem(
              2,
              "Generate timestamped transcript",
              "Detect speech with start and end timestamps.",
            )}

            {renderProgressItem(
              3,
              `Translate to ${LANGUAGE_LABELS[targetLanguage] ?? targetLanguage}`,
              generateSubtitles
                ? "Translate each timestamped segment and prepare subtitle timing."
                : "Translate each timestamped segment.",
            )}

            {renderProgressItem(
              4,
              "Generate synchronized voice",
              "Create and align translated speech clips.",
            )}

            {renderProgressItem(
              5,
              "Render final video",
              preserveBackgroundAudio && generateSubtitles
                ? "Mix synchronized speech with preserved background audio and burned-in subtitles."
                : preserveBackgroundAudio
                  ? "Mix synchronized speech with preserved background audio."
                  : generateSubtitles
                    ? "Combine visuals, synchronized speech and burned-in subtitles."
                    : "Combine original visuals with synchronized speech.",
            )}
          </CardContent>
        </Card>
      )}

      {transcript && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <CardTitle className="text-lg">
                Original Transcript
              </CardTitle>
            </div>

            <CardDescription>
              Detected {segmentCount} timestamped speech {segmentCount === 1 ? "segment" : "segments"}.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="rounded-lg border bg-muted/30 p-4 text-sm leading-7">
              {transcript}
            </div>
          </CardContent>
        </Card>
      )}

      {translatedText && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Languages className="h-5 w-5" />
              <CardTitle className="text-lg">
                {LANGUAGE_LABELS[targetLanguage] ?? targetLanguage}{" "}
                Translation
              </CardTitle>
            </div>

            <CardDescription>
              Translation generated while preserving segment timestamps.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="rounded-lg border bg-muted/30 p-4 text-sm leading-7">
              {translatedText}
            </div>
          </CardContent>
        </Card>
      )}

      {subtitleUrl && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Captions className="h-5 w-5" />
              <CardTitle className="text-lg">
                Translated Subtitles
              </CardTitle>
            </div>

            <CardDescription>
              Subtitles were burned into the final video, and the SRT is also ready for download.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Button asChild className="gap-2">
              <a
                href={subtitleUrl}
                download={`voxlingo-${targetLanguage}-subtitles.srt`}
              >
                <Download className="h-4 w-4" />
                Download SRT
              </a>
            </Button>
          </CardContent>
        </Card>
      )}

      {dubbedAudioUrl && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mic2 className="h-5 w-5" />
              <CardTitle className="text-lg">
                Synchronized Dubbed Audio
              </CardTitle>
            </div>

            <CardDescription>
              Translated speech aligned with the original speaking timeline.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <audio
              controls
              src={dubbedAudioUrl}
              className="w-full"
            />
          </CardContent>
        </Card>
      )}

      {finalVideoUrl && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <CardTitle className="text-lg">
                    Final Dubbed Video
                  </CardTitle>
                </div>

                <CardDescription>
                  Timestamp-synchronized dubbing completed successfully.
                </CardDescription>
              </div>

              <Button asChild className="gap-2">
                <a
                  href={finalVideoUrl}
                  download="voxlingo-synchronized-video.mp4"
                >
                  <Download className="h-4 w-4" />
                  Download Video
                </a>
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <video
              controls
              src={finalVideoUrl}
              className="aspect-video w-full rounded-xl bg-black object-contain"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
