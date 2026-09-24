"use client";

import { LANGUAGE_OPTIONS } from "~/config/languages";

import {
  ArrowLeftRight,
  Check,
  Clipboard,
  Download,
  Languages,
  Loader2,
  Trash2,
  Volume2,
} from "lucide-react";

import {
  useEffect,
  useMemo,
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
const MAX_TEXT_LENGTH = 10_000;

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

type ProcessingState =
  | "idle"
  | "translating"
  | "speaking";

interface TranslationPayload {
  original_text: string;
  translated_text: string;
  source_language: string;
  target_language: string;
}

const isTranslationPayload = (
  value: unknown,
): value is TranslationPayload => {
  if (
    typeof value !== "object"
    || value === null
  ) {
    return false;
  }

  return (
    "original_text" in value
    && typeof value.original_text === "string"
    && "translated_text" in value
    && typeof value.translated_text === "string"
    && "source_language" in value
    && typeof value.source_language === "string"
    && "target_language" in value
    && typeof value.target_language === "string"
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

const getWordCount = (
  value: string,
): number => {
  const trimmed = value.trim();

  if (!trimmed) {
    return 0;
  }

  return trimmed
    .split(/\s+/)
    .filter(Boolean)
    .length;
};

const downloadTextFile = (
  content: string,
  fileName: string,
) => {
  const blob = new Blob(
    [content],
    {
      type: "text/plain;charset=utf-8",
    },
  );

  const objectUrl =
    URL.createObjectURL(blob);

  const anchor =
    document.createElement("a");

  anchor.href = objectUrl;
  anchor.download = fileName;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(objectUrl);
};

export default function TextTranslatorPage() {
  const [sourceLanguage, setSourceLanguage] =
    useState("auto");

  const [targetLanguage, setTargetLanguage] =
    useState("hi");

  const [voiceStyle, setVoiceStyle] =
    useState("natural");

  const [sourceText, setSourceText] =
    useState("");

  const [translatedText, setTranslatedText] =
    useState("");

  const [translatedAudioUrl, setTranslatedAudioUrl] =
    useState<string | null>(null);

  const [detectedSourceLabel, setDetectedSourceLabel] =
    useState<string | null>(null);

  const [translatedTargetLabel, setTranslatedTargetLabel] =
    useState<string | null>(null);

  const [processingState, setProcessingState] =
    useState<ProcessingState>("idle");

  const [copied, setCopied] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (translatedAudioUrl) {
        URL.revokeObjectURL(
          translatedAudioUrl,
        );
      }
    };
  }, [translatedAudioUrl]);

  const sourceWordCount = useMemo(
    () => getWordCount(sourceText),
    [sourceText],
  );

  const translatedWordCount = useMemo(
    () => getWordCount(translatedText),
    [translatedText],
  );

  const isProcessing =
    processingState !== "idle";

  const targetLanguageLabel =
    LANGUAGE_OPTIONS.find(
      (language) =>
        language.value === targetLanguage,
    )?.label ?? "Target";

  const resetGeneratedAudio = () => {
    if (translatedAudioUrl) {
      URL.revokeObjectURL(
        translatedAudioUrl,
      );

      setTranslatedAudioUrl(null);
    }
  };

  const resetResult = () => {
    setTranslatedText("");
    setDetectedSourceLabel(null);
    setTranslatedTargetLabel(null);
    setCopied(false);
    resetGeneratedAudio();
  };

  const clearTranslation = () => {
    setSourceText("");
    resetResult();
    setError(null);
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

  const generateSpeechForText = async (
    text: string,
  ) => {
    setProcessingState("speaking");

    const response = await fetch(
      `${API_BASE_URL}/generate-speech`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          text,
          target_language:
            targetLanguage,
          voice_style:
            voiceStyle,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        await getApiErrorMessage(
          response,
          "Translated speech generation failed.",
        ),
      );
    }

    const audioBlob =
      await response.blob();

    if (audioBlob.size === 0) {
      throw new Error(
        "Generated translated audio was empty.",
      );
    }

    resetGeneratedAudio();

    const objectUrl =
      URL.createObjectURL(
        audioBlob,
      );

    setTranslatedAudioUrl(
      objectUrl,
    );
  };

  const handleSwapLanguages = () => {
    if (
      sourceLanguage === "auto"
      || isProcessing
    ) {
      return;
    }

    const previousSourceLanguage =
      sourceLanguage;

    setSourceLanguage(
      targetLanguage,
    );

    setTargetLanguage(
      previousSourceLanguage,
    );

    if (translatedText.trim()) {
      const previousSourceText =
        sourceText;

      setSourceText(
        translatedText,
      );

      setTranslatedText(
        previousSourceText,
      );
    }

    setDetectedSourceLabel(null);
    setTranslatedTargetLabel(null);
    resetGeneratedAudio();
    setCopied(false);
    setError(null);
  };

  const handleTranslateAndSpeak =
    async () => {
      const cleanText =
        sourceText.trim();

      if (!cleanText) {
        setError(
          "Please enter some text to translate.",
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
        setCopied(false);
        resetResult();
        setProcessingState(
          "translating",
        );

        const response = await fetch(
          `${API_BASE_URL}/translate`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              text: cleanText,
              source_language:
                sourceLanguage,
              target_language:
                targetLanguage,
            }),
          },
        );

        if (!response.ok) {
          throw new Error(
            await getApiErrorMessage(
              response,
              "Text translation failed.",
            ),
          );
        }

        const payload: unknown =
          await response.json();

        if (
          !isTranslationPayload(
            payload,
          )
        ) {
          throw new Error(
            "Invalid translation response received.",
          );
        }

        const cleanTranslation =
          payload.translated_text.trim();

        if (!cleanTranslation) {
          throw new Error(
            "Translation returned empty text.",
          );
        }

        setTranslatedText(
          cleanTranslation,
        );

        setDetectedSourceLabel(
          payload.source_language,
        );

        setTranslatedTargetLabel(
          payload.target_language,
        );

        await generateSpeechForText(
          cleanTranslation,
        );

        // Save project history only after translation + speech succeeds.
        // Regenerating the voice later does not create duplicate history entries.
        try {
          const sourceLabel =
            sourceLanguage === "auto"
              ? payload.source_language || "Auto Detect"
              : LANGUAGE_OPTIONS.find(
                  (language) =>
                    language.value === sourceLanguage,
                )?.label ?? sourceLanguage;

          const targetLabel =
            LANGUAGE_OPTIONS.find(
              (language) =>
                language.value === targetLanguage,
            )?.label
            ?? payload.target_language
            ?? targetLanguage;

          const historyResult = await createProject({
            name: `Text Translation - ${targetLabel}`,
            type: "TEXT_TRANSLATION",
            sourceLanguage: sourceLabel,
            targetLanguage: targetLabel,
            inputName: null,
            workflowPath: "/dashboard/text-translate",
          });

          if (!historyResult.success) {
            console.warn(
              "Text translation completed, but project history was not saved:",
              historyResult.error,
            );
          }
        } catch (historyError) {
          console.warn(
            "Text translation completed, but project history could not be saved:",
            historyError,
          );
        }
      } catch (caughtError) {
        console.error(
          "Text translation or speech generation failed:",
          caughtError,
        );

        if (
          caughtError instanceof Error
        ) {
          setError(
            caughtError.message,
          );
        } else {
          setError(
            "Translation or speech generation failed.",
          );
        }
      } finally {
        setProcessingState("idle");
      }
    };

  const handleRegenerateVoice =
    async () => {
      if (!translatedText.trim()) {
        return;
      }

      try {
        setError(null);

        await generateSpeechForText(
          translatedText.trim(),
        );
      } catch (caughtError) {
        console.error(
          "Speech generation failed:",
          caughtError,
        );

        if (
          caughtError instanceof Error
        ) {
          setError(
            caughtError.message,
          );
        } else {
          setError(
            "Speech generation failed.",
          );
        }
      } finally {
        setProcessingState("idle");
      }
    };

  const handleCopyTranslation =
    async () => {
      if (!translatedText) {
        return;
      }

      try {
        await navigator.clipboard.writeText(
          translatedText,
        );

        setCopied(true);

        window.setTimeout(() => {
          setCopied(false);
        }, 1800);
      } catch {
        setError(
          "Could not copy the translation.",
        );
      }
    };

  const handleDownloadTranslation =
    () => {
      if (!translatedText) {
        return;
      }

      downloadTextFile(
        translatedText,
        `voxlingo-${targetLanguage}-translation.txt`,
      );
    };

  const handleDownloadAudio = () => {
    if (!translatedAudioUrl) {
      return;
    }

    const anchor =
      document.createElement("a");

    anchor.href =
      translatedAudioUrl;

    anchor.download =
      `voxlingo-${targetLanguage}-translation.mp3`;

    document.body.appendChild(
      anchor,
    );

    anchor.click();
    anchor.remove();
  };

  const processingLabel =
    processingState === "translating"
      ? "Translating..."
      : processingState === "speaking"
        ? "Generating Voice..."
        : null;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Languages className="text-primary h-6 w-6" />

          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Text Translator
          </h1>
        </div>

        <p className="text-muted-foreground max-w-3xl text-sm sm:text-base">
          Translate text naturally and hear the translated
          result spoken in the target language.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Translate & Speak
          </CardTitle>

          <CardDescription>
            Choose languages, enter text and Nirwana will
            translate it and generate a spoken version.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid items-end gap-3 md:grid-cols-[1fr_auto_1fr]">
            <div className="space-y-2">
              <label
                htmlFor="source-language"
                className="text-sm font-medium"
              >
                Source language
              </label>

              <select
                id="source-language"
                value={sourceLanguage}
                onChange={(event) => {
                  setSourceLanguage(
                    event.target.value,
                  );

                  resetResult();
                  setError(null);
                }}
                disabled={isProcessing}
                className="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 w-full rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="auto">
                  Auto Detect
                </option>

                {LANGUAGE_OPTIONS.map(
                  (language) => (
                    <option
                      key={language.value}
                      value={language.value}
                    >
                      {language.label}
                    </option>
                  ),
                )}
              </select>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={
                handleSwapLanguages
              }
              disabled={
                isProcessing
                || sourceLanguage === "auto"
              }
              className="h-10 gap-2 px-3"
              title={
                sourceLanguage === "auto"
                  ? "Choose a source language to swap"
                  : "Swap languages"
              }
            >
              <ArrowLeftRight className="h-4 w-4" />

              <span className="md:hidden">
                Swap
              </span>
            </Button>

            <div className="space-y-2">
              <label
                htmlFor="target-language"
                className="text-sm font-medium"
              >
                Target language
              </label>

              <select
                id="target-language"
                value={targetLanguage}
                onChange={(event) => {
                  setTargetLanguage(
                    event.target.value,
                  );

                  resetResult();
                  setError(null);
                }}
                disabled={isProcessing}
                className="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 w-full rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {LANGUAGE_OPTIONS.map(
                  (language) => (
                    <option
                      key={language.value}
                      value={language.value}
                    >
                      {language.label}
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
              value={voiceStyle}
              onChange={(event) => {
                setVoiceStyle(
                  event.target.value,
                );

                resetGeneratedAudio();
                setError(null);
              }}
              disabled={isProcessing}
              className="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 w-full rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {VOICE_STYLE_OPTIONS.map(
                (style) => (
                  <option
                    key={style.value}
                    value={style.value}
                  >
                    {style.label}
                  </option>
                ),
              )}
            </select>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label
                  htmlFor="source-text"
                  className="text-sm font-medium"
                >
                  Original text
                </label>

                <span className="text-muted-foreground text-xs">
                  {sourceText.length}
                  {" / "}
                  {MAX_TEXT_LENGTH}
                </span>
              </div>

              <textarea
                id="source-text"
                value={sourceText}
                onChange={(event) => {
                  const nextValue =
                    event.target.value.slice(
                      0,
                      MAX_TEXT_LENGTH,
                    );

                  setSourceText(
                    nextValue,
                  );

                  resetResult();
                  setError(null);
                }}
                disabled={isProcessing}
                placeholder="Type or paste text here..."
                className="border-input bg-background ring-offset-background focus-visible:ring-ring min-h-80 w-full resize-y rounded-xl border p-4 text-sm leading-7 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />

              <div className="text-muted-foreground flex items-center justify-between text-xs">
                <span>
                  {sourceWordCount} words
                </span>

                {detectedSourceLabel && (
                  <span>
                    Source: {detectedSourceLabel}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label
                  htmlFor="translated-text"
                  className="text-sm font-medium"
                >
                  Translation
                </label>

                {translatedTargetLabel && (
                  <span className="text-muted-foreground text-xs">
                    {translatedTargetLabel}
                  </span>
                )}
              </div>

              <div className="bg-muted/30 relative min-h-80 rounded-xl border">
                {processingState === "translating" ? (
                  <div className="flex min-h-80 flex-col items-center justify-center gap-3 p-6 text-center">
                    <Loader2 className="text-primary h-7 w-7 animate-spin" />

                    <div>
                      <p className="text-sm font-medium">
                        Translating...
                      </p>

                      <p className="text-muted-foreground mt-1 text-xs">
                        Nirwana is generating a natural {targetLanguageLabel} translation.
                      </p>
                    </div>
                  </div>
                ) : translatedText ? (
                  <div className="min-h-80 p-4">
                    <p
                      id="translated-text"
                      className="whitespace-pre-wrap text-sm leading-7"
                    >
                      {translatedText}
                    </p>
                  </div>
                ) : (
                  <div className="text-muted-foreground flex min-h-80 items-center justify-center p-6 text-center text-sm">
                    Your translated text will appear here.
                  </div>
                )}
              </div>

              <div className="text-muted-foreground flex items-center justify-between text-xs">
                <span>
                  {translatedWordCount} words
                </span>

                <span>
                  {translatedText.length} characters
                </span>
              </div>
            </div>
          </div>

          {translatedText && (
            <div className="bg-muted/30 rounded-xl border p-5">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                    <Volume2 className="text-primary h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-sm font-medium">
                      Spoken Translation
                    </p>

                    <p className="text-muted-foreground text-xs">
                      {targetLanguageLabel} · {
                        VOICE_STYLE_OPTIONS.find(
                          (style) =>
                            style.value === voiceStyle,
                        )?.label ?? "Natural"
                      } voice
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      void handleRegenerateVoice();
                    }}
                    disabled={isProcessing}
                    className="gap-2"
                  >
                    {processingState === "speaking" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}

                    Regenerate Voice
                  </Button>

                  {translatedAudioUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={
                        handleDownloadAudio
                      }
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download MP3
                    </Button>
                  )}
                </div>
              </div>

              {processingState === "speaking" ? (
                <div className="text-muted-foreground flex min-h-16 items-center justify-center gap-2 text-sm">
                  <Loader2 className="text-primary h-4 w-4 animate-spin" />
                  Generating spoken translation...
                </div>
              ) : translatedAudioUrl ? (
                <audio
                  src={translatedAudioUrl}
                  controls
                  className="w-full"
                />
              ) : (
                <p className="text-muted-foreground text-sm">
                  Voice is not generated yet. Use Regenerate Voice.
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={
                clearTranslation
              }
              disabled={
                isProcessing
                || (
                  !sourceText
                  && !translatedText
                )
              }
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Clear
            </Button>

            <div className="flex flex-col gap-2 sm:flex-row">
              {translatedText && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      void handleCopyTranslation();
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
                      : "Copy Translation"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={
                      handleDownloadTranslation
                    }
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download TXT
                  </Button>
                </>
              )}

              <Button
                type="button"
                onClick={() => {
                  void handleTranslateAndSpeak();
                }}
                disabled={
                  isProcessing
                  || !sourceText.trim()
                }
                className="gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {processingLabel}
                  </>
                ) : (
                  <>
                    <Languages className="h-4 w-4" />
                    Translate & Speak
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              Languages
            </p>

            <p className="mt-2 text-2xl font-bold">
              5
            </p>

            <p className="text-muted-foreground mt-1 text-xs">
              English, Hindi, French, Spanish and German
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              Voice output
            </p>

            <p className="mt-2 text-2xl font-bold">
              MP3
            </p>

            <p className="text-muted-foreground mt-1 text-xs">
              Listen to and download translated speech
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              Voice styles
            </p>

            <p className="mt-2 text-2xl font-bold">
              4
            </p>

            <p className="text-muted-foreground mt-1 text-xs">
              Natural, professional, warm and energetic
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
