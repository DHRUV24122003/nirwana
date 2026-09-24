"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { SignedIn } from "@daveyplate/better-auth-ui";

import {
  ArrowRight,
  AudioLines,
  FileAudio,
  FileText,
  FolderOpen,
  Languages,
  Loader2,
  Search,
  Sparkles,
  Trash2,
  Video,
} from "lucide-react";

import {
  deleteProject,
  getUserProjects,
} from "~/actions/project";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";

type ProjectFilter = "ALL" | "VIDEO" | "AUDIO" | "TEXT";

interface SavedProject {
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

const workflows = [
  {
    title: "Video Dubbing",
    description:
      "Translate and dub videos while preserving timing, subtitles and background audio.",
    href: "/dashboard/video-dubbing",
    icon: Video,
    category: "Video",
  },
  {
    title: "Video Transcription",
    description:
      "Convert video speech into timestamped transcripts with TXT and SRT export.",
    href: "/dashboard/video-transcription",
    icon: FileText,
    category: "Video",
  },
  {
    title: "Audio Translator",
    description:
      "Translate spoken audio and generate a synchronized target-language voice track.",
    href: "/dashboard/audio-translator",
    icon: AudioLines,
    category: "Audio",
  },
  {
    title: "Audio Transcription",
    description:
      "Turn audio files into timestamped transcripts with downloadable text and subtitles.",
    href: "/dashboard/audio-transcription",
    icon: FileAudio,
    category: "Audio",
  },
  {
    title: "Text Translator",
    description:
      "Translate text across supported languages and generate spoken translated audio.",
    href: "/dashboard/text-translate",
    icon: Languages,
    category: "Language",
  },
] as const;

const TYPE_LABELS: Record<string, string> = {
  VIDEO_DUBBING: "Video Dubbing",
  VIDEO_TRANSCRIPTION: "Video Transcription",
  AUDIO_TRANSLATION: "Audio Translation",
  AUDIO_TRANSCRIPTION: "Audio Transcription",
  TEXT_TRANSLATION: "Text Translation",
};

function getProjectGroup(type: string): ProjectFilter {
  if (type.startsWith("VIDEO_")) return "VIDEO";
  if (type.startsWith("AUDIO_")) return "AUDIO";
  if (type.startsWith("TEXT_")) return "TEXT";
  return "ALL";
}

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

function getLanguageLine(project: SavedProject) {
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

function formatCreatedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<ProjectFilter>("ALL");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const result = await getUserProjects();

        if (result.success) {
          setProjects(result.projects);
        }
      } catch (error) {
        console.error("Could not load project history:", error);
      } finally {
        setIsLoading(false);
      }
    };

    void loadProjects();
  }, []);

  const filteredProjects = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return projects.filter((project) => {
      const matchesFilter =
        filter === "ALL" || getProjectGroup(project.type) === filter;

      const matchesSearch =
        normalizedSearch.length === 0 ||
        project.name.toLowerCase().includes(normalizedSearch) ||
        (project.inputName?.toLowerCase().includes(normalizedSearch) ?? false) ||
        (TYPE_LABELS[project.type] ?? project.type)
          .toLowerCase()
          .includes(normalizedSearch);

      return matchesFilter && matchesSearch;
    });
  }, [filter, projects, searchQuery]);

  const handleDelete = async (projectId: string) => {
    const confirmed = window.confirm(
      "Remove this item from your project history?",
    );

    if (!confirmed) return;

    setDeletingId(projectId);

    try {
      const result = await deleteProject(projectId);

      if (result.success) {
        setProjects((current) =>
          current.filter((project) => project.id !== projectId),
        );
      }
    } catch (error) {
      console.error("Could not delete project:", error);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <SignedIn>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FolderOpen className="text-primary h-6 w-6" />
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Projects
              </h1>
            </div>

            <p className="text-muted-foreground max-w-3xl text-sm sm:text-base">
              Launch Nirwana workflows and keep track of your recent
              multilingual media work.
            </p>
          </div>

          <Button asChild className="gap-2">
            <Link href="/dashboard/video-dubbing">
              <Sparkles className="h-4 w-4" />
              New Project
            </Link>
          </Button>
        </div>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Start a project</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Choose one of the currently available Nirwana AI workflows.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {workflows.map((workflow) => (
              <Card
                key={workflow.href}
                className="group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="bg-primary/10 flex h-11 w-11 items-center justify-center rounded-xl">
                      <workflow.icon className="text-primary h-5 w-5" />
                    </div>

                    <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide">
                      {workflow.category}
                    </span>
                  </div>

                  <CardTitle className="mt-4 text-base">
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

        <section className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Recent projects</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Completed work saved to your Nirwana account.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative sm:w-72">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />

                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search projects..."
                  className="pl-9"
                />
              </div>

              <select
                value={filter}
                onChange={(event) =>
                  setFilter(event.target.value as ProjectFilter)
                }
                className="border-input bg-background h-10 rounded-md border px-3 text-sm"
              >
                <option value="ALL">All projects</option>
                <option value="VIDEO">Video</option>
                <option value="AUDIO">Audio</option>
                <option value="TEXT">Text</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <Card>
              <CardContent className="flex min-h-52 items-center justify-center">
                <div className="text-muted-foreground flex items-center gap-3 text-sm">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading projects...
                </div>
              </CardContent>
            </Card>
          ) : filteredProjects.length === 0 ? (
            <Card>
              <CardContent className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
                <div className="bg-primary/10 mb-5 flex h-14 w-14 items-center justify-center rounded-2xl">
                  <FolderOpen className="text-primary h-6 w-6" />
                </div>

                <h3 className="text-base font-semibold">
                  {projects.length === 0
                    ? "No saved projects yet"
                    : "No matching projects"}
                </h3>

                <p className="text-muted-foreground mt-2 max-w-lg text-sm leading-6">
                  {projects.length === 0
                    ? "Complete any Nirwana workflow and it will appear here as recent work."
                    : "Try changing the search text or project filter."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredProjects.map((project) => {
                const Icon = getProjectIcon(project.type);
                const languageLine = getLanguageLine(project);

                return (
                  <Card
                    key={project.id}
                    className="transition-shadow hover:shadow-sm"
                  >
                    <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center">
                      <div className="bg-primary/10 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
                        <Icon className="text-primary h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate font-semibold">
                            {project.name}
                          </h3>

                          <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase">
                            {project.status}
                          </span>
                        </div>

                        <p className="text-muted-foreground mt-1 text-sm">
                          {TYPE_LABELS[project.type] ?? project.type}
                          {languageLine ? ` · ${languageLine}` : ""}
                        </p>

                        <div className="text-muted-foreground mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                          {project.inputName && (
                            <span className="truncate">
                              {project.inputName}
                            </span>
                          )}

                          <span>{formatCreatedAt(project.createdAt)}</span>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={project.workflowPath}>
                            Open workflow
                          </Link>
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive h-9 w-9 p-0"
                          disabled={deletingId === project.id}
                          onClick={() => void handleDelete(project.id)}
                          aria-label={`Delete ${project.name}`}
                        >
                          {deletingId === project.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </SignedIn>
  );
}
