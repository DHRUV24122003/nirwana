"use server";

import { headers } from "next/headers";

import { auth } from "~/lib/auth";
import { db } from "~/server/db";

type ProjectType =
  | "VIDEO_DUBBING"
  | "VIDEO_TRANSCRIPTION"
  | "AUDIO_TRANSLATION"
  | "AUDIO_TRANSCRIPTION"
  | "TEXT_TRANSLATION";

type CreateProjectInput = {
  name?: string;
  type: ProjectType;
  sourceLanguage?: string | null;
  targetLanguage?: string | null;
  inputName?: string | null;
  workflowPath: string;
};

const defaultProjectNames: Record<ProjectType, string> = {
  VIDEO_DUBBING: "Video Dubbing Project",
  VIDEO_TRANSCRIPTION: "Video Transcription Project",
  AUDIO_TRANSLATION: "Audio Translation Project",
  AUDIO_TRANSCRIPTION: "Audio Transcription Project",
  TEXT_TRANSLATION: "Text Translation Project",
};

async function getCurrentUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user?.id ?? null;
}

export async function createProject(input: CreateProjectInput) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    const project = await db.project.create({
      data: {
        name: input.name?.trim() ?? defaultProjectNames[input.type],
        type: input.type,
        status: "COMPLETED",
        sourceLanguage: input.sourceLanguage ?? null,
        targetLanguage: input.targetLanguage ?? null,
        inputName: input.inputName ?? null,
        workflowPath: input.workflowPath,
        userId,
      },
    });

    return {
      success: true,
      project: {
        id: project.id,
        name: project.name,
        type: project.type,
        status: project.status,
        sourceLanguage: project.sourceLanguage,
        targetLanguage: project.targetLanguage,
        inputName: project.inputName,
        workflowPath: project.workflowPath,
        createdAt: project.createdAt.toISOString(),
      },
    };
  } catch (error) {
    console.error("Create project failed:", error);

    return {
      success: false,
      error: "Could not save project.",
    };
  }
}

export async function getUserProjects() {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return {
        success: false,
        projects: [],
        error: "Unauthorized",
      };
    }

    const projects = await db.project.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      success: true,
      projects: projects.map((project) => ({
        id: project.id,
        name: project.name,
        type: project.type,
        status: project.status,
        sourceLanguage: project.sourceLanguage,
        targetLanguage: project.targetLanguage,
        inputName: project.inputName,
        workflowPath: project.workflowPath,
        createdAt: project.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    console.error("Get projects failed:", error);

    return {
      success: false,
      projects: [],
      error: "Could not load projects.",
    };
  }
}

export async function deleteProject(projectId: string) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    await db.project.deleteMany({
      where: {
        id: projectId,
        userId,
      },
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error("Delete project failed:", error);

    return {
      success: false,
      error: "Could not delete project.",
    };
  }
}
