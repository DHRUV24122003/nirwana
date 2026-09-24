"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  ArrowRight,
  AudioLines,
  Calendar,
  FileAudio,
  FileText,
  FolderOpen,
  Languages,
  Loader2,
  Sparkles,
  TrendingUp,
  Video,
} from "lucide-react";

import { authClient } from "~/lib/auth-client";
import { getUserProjects } from "~/actions/project";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

interface DashboardProject {
  id: string;
  name: string;
  type: string;
  status: string;
  sourceLanguage: string | null;
  targetLanguage: string | null;
  inputName: string | null;
  workflowPath: string;
  createdAt: string;
}

interface DashboardUser {
  name?: string | null;
}

const workflows = [
  {
    title: "Video Dubbing",
    description:
      "Translate and dub videos with synchronized speech, subtitles and optional background preservation.",
    href: "/dashboard/video-dubbing",
    icon: Video,
  },
  {
    title: "Video Transcription",
    description:
      "Generate timestamped transcripts from video and export TXT or SRT.",
    href: "/dashboard/video-transcription",
    icon: FileText,
  },
  {
    title: "Audio Translator",
    description:
      "Translate spoken audio and generate a synchronized target-language voice track.",
    href: "/dashboard/audio-translator",
    icon: AudioLines,
  },
  {
    title: "Audio Transcription",
    description:
      "Turn audio files into clean timestamped transcripts with TXT and SRT export.",
    href: "/dashboard/audio-transcription",
    icon: FileAudio,
  },
  {
    title: "Text Translator",
    description:
      "Translate text and generate spoken output in the selected target language.",
    href: "/dashboard/text-translate",
    icon: Languages,
  },
] as const;

const PROJECT_LABELS: Record<string, string> = {
  VIDEO_DUBBING: "Video Dubbing",
  VIDEO_TRANSCRIPTION: "Video Transcription",
  AUDIO_TRANSLATION: "Audio Translation",
  AUDIO_TRANSCRIPTION: "Audio Transcription",
  TEXT_TRANSLATION: "Text Translation",
};

function getProjectIcon(type: string) {
  switch (type) {
    case "VIDEO_DUBBING":
      return Video;
    case "VIDEO_TRANSCRIPTION":
      return FileText;
    case "AUDIO_TRANSLATION":
      return AudioLines;
    case "AUDIO_TRANSCRIPTION":
      return FileAudio;
    case "TEXT_TRANSLATION":
      return Languages;
    default:
      return FolderOpen;
  }
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getLanguageLine(project: DashboardProject) {
  if (project.sourceLanguage && project.targetLanguage) {
    return `${project.sourceLanguage} → ${project.targetLanguage}`;
  }

  if (project.targetLanguage) {
    return `Target: ${project.targetLanguage}`;
  }

  if (project.sourceLanguage) {
    return project.sourceLanguage;
  }

  return null;
}

export default function Dashboard() {
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [projects, setProjects] = useState<DashboardProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        const [sessionResult, projectsResult] = await Promise.all([
          authClient.getSession(),
          getUserProjects(),
        ]);

        if (sessionResult?.data?.user) {
          setUser({
            name: sessionResult.data.user.name,
          });
        }

        if (projectsResult.success) {
          setProjects(projectsResult.projects);
        }
      } catch (error) {
        console.error("Dashboard initialization failed:", error);
      } finally {
        setIsLoading(false);
      }
    };

    void initializeDashboard();
  }, []);

  const stats = useMemo(() => {
    const now = new Date();

    const monthStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
    );

    const weekStart = new Date(
      now.getTime() - 7 * 24 * 60 * 60 * 1000,
    );

    return {
      total: projects.length,
      thisMonth: projects.filter(
        (project) =>
          new Date(project.createdAt).getTime()
          >= monthStart.getTime(),
      ).length,
      thisWeek: projects.filter(
        (project) =>
          new Date(project.createdAt).getTime()
          >= weekStart.getTime(),
      ).length,
    };
  }, [projects]);

  const recentProjects = projects.slice(0, 5);

  if (isLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="text-primary h-8 w-8 animate-spin" />

          <p className="text-muted-foreground text-sm">
            Loading your Nirwana workspace...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      <section className="overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-background p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="text-primary flex items-center gap-2 text-sm font-medium">
              <Sparkles className="h-4 w-4" />
              AI multilingual media workspace
            </div>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Welcome back{user?.name ? `, ${user.name}` : ""}
            </h1>

            <p className="text-muted-foreground max-w-2xl text-sm leading-6 sm:text-base">
              Dub videos, transcribe media, translate audio and text,
              and manage your recent Nirwana projects from one place.
            </p>
          </div>

          <Button asChild size="lg" className="gap-2">
            <Link href="/dashboard/video-dubbing">
              Start a project
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Projects
            </CardTitle>

            <FolderOpen className="text-primary h-4 w-4" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">
              {stats.total}
            </div>

            <p className="text-muted-foreground mt-1 text-xs">
              Completed Nirwana workflows
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              This Month
            </CardTitle>

            <Calendar className="text-primary h-4 w-4" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">
              {stats.thisMonth}
            </div>

            <p className="text-muted-foreground mt-1 text-xs">
              Projects created this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Last 7 Days
            </CardTitle>

            <TrendingUp className="text-primary h-4 w-4" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">
              {stats.thisWeek}
            </div>

            <p className="text-muted-foreground mt-1 text-xs">
              Recent workflow activity
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              AI Workflows
            </CardTitle>

            <Sparkles className="text-primary h-4 w-4" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">
              {workflows.length}
            </div>

            <p className="text-muted-foreground mt-1 text-xs">
              Ready-to-use media tools
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Create with Nirwana
          </h2>

          <p className="text-muted-foreground mt-1 text-sm">
            Choose a workflow and start processing multilingual media.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workflows.map((workflow) => (
            <Card
              key={workflow.href}
              className="group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <CardHeader>
                <div className="bg-primary/10 mb-3 flex h-11 w-11 items-center justify-center rounded-xl">
                  <workflow.icon className="text-primary h-5 w-5" />
                </div>

                <CardTitle className="text-base">
                  {workflow.title}
                </CardTitle>

                <CardDescription className="min-h-12 leading-5">
                  {workflow.description}
                </CardDescription>
              </CardHeader>

              <CardContent>
                <Button
                  asChild
                  variant="outline"
                  className="w-full justify-between"
                >
                  <Link href={workflow.href}>
                    Open workflow
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <Card>
          <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>
                Recent Projects
              </CardTitle>

              <CardDescription className="mt-1">
                Your latest completed Nirwana workflows.
              </CardDescription>
            </div>

            {projects.length > 0 && (
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/projects">
                  View all
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
          </CardHeader>

          <CardContent>
            {recentProjects.length === 0 ? (
              <div className="flex min-h-52 flex-col items-center justify-center px-6 py-10 text-center">
                <div className="bg-primary/10 mb-4 flex h-14 w-14 items-center justify-center rounded-2xl">
                  <FolderOpen className="text-primary h-6 w-6" />
                </div>

                <h3 className="font-semibold">
                  No projects yet
                </h3>

                <p className="text-muted-foreground mt-2 max-w-md text-sm leading-6">
                  Complete any Nirwana workflow and it will appear here
                  automatically.
                </p>

                <Button asChild className="mt-5 gap-2">
                  <Link href="/dashboard/video-dubbing">
                    Start your first project
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentProjects.map((project) => {
                  const Icon = getProjectIcon(project.type);
                  const languageLine = getLanguageLine(project);

                  return (
                    <div
                      key={project.id}
                      className="hover:bg-muted/40 flex flex-col gap-4 rounded-xl border p-4 transition-colors sm:flex-row sm:items-center"
                    >
                      <div className="bg-primary/10 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
                        <Icon className="text-primary h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-sm font-semibold">
                            {project.name}
                          </h3>

                          <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase">
                            {project.status}
                          </span>
                        </div>

                        <p className="text-muted-foreground mt-1 text-xs">
                          {PROJECT_LABELS[project.type] ?? project.type}
                          {languageLine ? ` · ${languageLine}` : ""}
                        </p>

                        <p className="text-muted-foreground mt-1 text-xs">
                          {formatDate(project.createdAt)}
                          {project.inputName
                            ? ` · ${project.inputName}`
                            : ""}
                        </p>
                      </div>

                      <Button asChild variant="ghost" size="sm">
                        <Link href={project.workflowPath}>
                          Open
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
