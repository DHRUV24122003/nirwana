export type NirwanaLanguage = {
  value: string;
  label: string;
  popular?: boolean;
};

export const LANGUAGE_OPTIONS: NirwanaLanguage[] = [
  { value: "en", label: "English", popular: true },
  { value: "hi", label: "Hindi", popular: true },
  { value: "es", label: "Spanish", popular: true },
  { value: "fr", label: "French", popular: true },
  { value: "de", label: "German", popular: true },
  { value: "pt", label: "Portuguese", popular: true },

  { value: "it", label: "Italian" },
  { value: "ja", label: "Japanese" },
  { value: "zh", label: "Chinese" },
  { value: "ko", label: "Korean" },
  { value: "ar", label: "Arabic" },
  { value: "ru", label: "Russian" },
  { value: "nl", label: "Dutch" },
  { value: "tr", label: "Turkish" },
  { value: "fil", label: "Filipino" },
  { value: "pl", label: "Polish" },
  { value: "id", label: "Indonesian" },
  { value: "sv", label: "Swedish" },
  { value: "ro", label: "Romanian" },
  { value: "cs", label: "Czech" },
  { value: "el", label: "Greek" },
  { value: "fi", label: "Finnish" },
  { value: "ta", label: "Tamil" },
  { value: "uk", label: "Ukrainian" },
  { value: "ms", label: "Malay" },
];

export const LANGUAGE_LABELS: Record<string, string> = {
  auto: "Auto Detect",
  ...Object.fromEntries(
    LANGUAGE_OPTIONS.map((language) => [
      language.value,
      language.label,
    ]),
  ),
};

export const POPULAR_LANGUAGES = LANGUAGE_OPTIONS.filter(
  (language) => language.popular,
);

export function getLanguageLabel(value: string) {
  return LANGUAGE_LABELS[value] ?? value;
}
