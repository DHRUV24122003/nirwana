import Link from "next/link";
import {
  AudioLines,
  Captions,
  Languages,
  Mic2,
  Sparkles,
  Video,
} from "lucide-react";

import { NirwanaBrand } from "~/components/brand/nirwana-brand";

const features = [
  {
    title: "AI Video Dubbing",
    description:
      "Translate and dub videos with timestamp-aware speech and preserved background audio.",
    icon: Video,
  },
  {
    title: "Transcription",
    description:
      "Turn video and audio into accurate multilingual transcripts and subtitles.",
    icon: Captions,
  },
  {
    title: "Audio Translation",
    description:
      "Translate spoken audio into another language and generate natural speech output.",
    icon: AudioLines,
  },
  {
    title: "Text to Speech",
    description:
      "Translate text and generate multilingual voice output from one workspace.",
    icon: Mic2,
  },
  {
    title: "25 Languages",
    description:
      "Work across a growing multilingual set for translation, transcription, and dubbing.",
    icon: Languages,
  },
  {
    title: "Project History",
    description:
      "Keep your multilingual media workflows organized and accessible in one place.",
    icon: Sparkles,
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f8f9fc] text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between py-6">
          <NirwanaBrand />

          <div className="flex items-center gap-3">
            <Link
              href="/auth/sign-in"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-white"
            >
              Sign in
            </Link>

            <Link
              href="/auth/sign-up"
              className="rounded-xl bg-[#201447] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5"
            >
              Get started
            </Link>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white px-3 py-1.5 text-xs font-semibold text-violet-700 shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              AI-powered multilingual media workspace
            </div>

            <h1 className="max-w-3xl text-5xl font-bold tracking-[-0.05em] text-slate-950 sm:text-6xl lg:text-7xl">
              Create, translate and dub media across languages.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              Nirwana combines AI transcription, translation, speech generation,
              subtitles and video dubbing into one multilingual workspace.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/auth/sign-up"
                className="rounded-2xl bg-[#201447] px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(32,20,71,0.18)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(32,20,71,0.22)]"
              >
                Start with Nirwana
              </Link>

              <Link
                href="/dashboard"
                className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50"
              >
                Open workspace
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-slate-500">
              <span>25-language support</span>
              <span>Video + audio workflows</span>
              <span>AI speech generation</span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 -z-10 scale-95 rounded-[36px] bg-gradient-to-br from-violet-200/40 via-indigo-100/50 to-sky-100/50 blur-3xl" />

            <div className="rounded-[30px] border border-white/80 bg-white/90 p-4 shadow-[0_30px_80px_rgba(15,23,42,0.10)] backdrop-blur">
              <div className="rounded-[24px] bg-[#101827] p-5 text-white sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Nirwana Workspace
                    </p>
                    <p className="mt-1 text-xl font-semibold tracking-tight">
                      Multilingual media, simplified.
                    </p>
                  </div>

                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                    <Sparkles className="h-5 w-5" />
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {features.slice(0, 4).map((feature) => {
                    const Icon = feature.icon;

                    return (
                      <div
                        key={feature.title}
                        className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"
                      >
                        <Icon className="h-5 w-5 text-violet-300" />

                        <p className="mt-3 text-sm font-semibold">
                          {feature.title}
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-400">
                          {feature.description}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-gradient-to-r from-violet-500/15 to-sky-500/10 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold">25 languages</p>
                      <p className="mt-1 text-xs text-slate-400">
                        One shared language system across translation and dubbing.
                      </p>
                    </div>

                    <Languages className="h-6 w-6 shrink-0 text-violet-300" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="pb-16 pt-4">
          <div className="grid gap-4 md:grid-cols-3">
            {features.slice(3).map((feature) => {
              const Icon = feature.icon;

              return (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                    <Icon className="h-5 w-5" />
                  </div>

                  <h2 className="mt-4 text-base font-semibold">
                    {feature.title}
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
