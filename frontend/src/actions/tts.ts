"use server";

import { headers } from "next/headers";
import { cache } from "react";

import { env } from "~/env";
import { auth } from "~/lib/auth";
import { db } from "~/server/db";

export interface GeneratedAudio {
  s3_key: string;
  audioUrl: string;
  text: string;
  language: string;
  timestamp: Date;
}

interface GenerateSpeechData {
  text: string;

  voice_S3_key: string;

  language: string;
  exaggeration?: number;
  cfg_weight?: number;
}

interface GenerateSpeechResult {
  success: boolean;
  s3_key?: string;
  audioUrl?: string;
  projectId?: string;
  error?: string;
}

const S3_BUCKET_URL =
  "https://ai-voice-studio-dhruv.s3.eu-north-1.amazonaws.com";

/**
 * Generate speech using Modal backend.
 */
export async function generateSpeech(
  data: GenerateSpeechData,
): Promise<GenerateSpeechResult> {
  try {
    // ----------------------------
    // 1. Get logged-in user
    // ----------------------------
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const userId = session?.user?.id;

    if (!userId) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // ----------------------------
    // 2. Validate input
    // ----------------------------
    if (!data.text?.trim()) {
      return {
        success: false,
        error: "Text is required",
      };
    }

    if (!data.voice_S3_key) {
      return {
        success: false,
        error: "Voice is required",
      };
    }

    if (!data.language) {
      return {
        success: false,
        error: "Language is required",
      };
    }

    // ----------------------------
    // 3. Calculate required credits
    // ----------------------------
    const creditsNeeded = Math.max(
      1,
      Math.ceil(data.text.length / 100),
    );

    const user = await db.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        credits: true,
      },
    });

    if (!user) {
      return {
        success: false,
        error: "User not found",
      };
    }

    const currentCredits = user.credits ?? 0;

    if (currentCredits < creditsNeeded) {
      return {
        success: false,
        error: `Insufficient credits. Need ${creditsNeeded}, have ${currentCredits}`,
      };
    }

    // ----------------------------
    // 4. Call Modal TTS backend
    // ----------------------------
    const response = await fetch(env.MODAL_API_URL, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",

        "Modal-Key": env.MODAL_API_KEY,
        "Modal-Secret": env.MODAL_API_SECRET,
      },

      body: JSON.stringify({
        text: data.text,

        // IMPORTANT:
        // Python backend expects voice_s3_key
        voice_s3_key: data.voice_S3_key,

        language: data.language,

        exaggeration: data.exaggeration ?? 0.5,

        cfg_weight: data.cfg_weight ?? 0.5,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();

      console.error(
        "Modal API error:",
        response.status,
        errorText,
      );

      return {
        success: false,
        error: `Modal API failed (${response.status})`,
      };
    }

    // Support both versions temporarily:
    // s3_key  -> our cleaned backend
    // s3_Key  -> original reference backend
    const result = (await response.json()) as {
      s3_key?: string;
      s3_Key?: string;
    };

    const s3Key = result.s3_key ?? result.s3_Key;

    if (!s3Key) {
      console.error(
        "Modal response did not contain an S3 key:",
        result,
      );

      return {
        success: false,
        error: "Invalid response from TTS backend",
      };
    }

    // ----------------------------
    // 5. Build generated audio URL
    // ----------------------------
    const audioUrl = `${S3_BUCKET_URL}/${s3Key}`;

    // ----------------------------
    // 6. Deduct credits
    // ----------------------------
    await db.user.update({
      where: {
        id: userId,
      },

      data: {
        credits: {
          decrement: creditsNeeded,
        },
      },
    });

    // ----------------------------
    // 7. Save project in database
    // ----------------------------
    const audioProject = await db.audioProject.create({
      data: {
        text: data.text,

        audioUrl,

        s3Key,

        language: data.language,

        voiceS3Key: data.voice_S3_key,

        exaggeration: data.exaggeration ?? 0.5,

        cfgWeight: data.cfg_weight ?? 0.5,

        userId,
      },
    });

    // ----------------------------
    // 8. Return generated audio
    // ----------------------------
    return {
      success: true,

      s3_key: s3Key,

      audioUrl,

      projectId: audioProject.id,
    };
  } catch (error) {
    console.error(
      "Speech generation error:",
      error,
    );

    return {
      success: false,
      error: "Internal server error",
    };
  }
}

/**
 * Get all generated audio projects
 * belonging to current logged-in user.
 */
export const getUserAudioProjects = cache(async () => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const userId = session?.user?.id;

    if (!userId) {
      return {
        success: false,
        error: "Unauthorized",
        audioProjects: [],
      };
    }

    const audioProjects =
      await db.audioProject.findMany({
        where: {
          userId,
        },

        orderBy: {
          createdAt: "desc",
        },
      });

    return {
      success: true,
      audioProjects,
    };
  } catch (error) {
    console.error(
      "Error fetching audio projects:",
      error,
    );

    return {
      success: false,
      error: "Failed to fetch audio projects",
      audioProjects: [],
    };
  }
});

/**
 * Get current user's available credits.
 */
export const getUserCredits = cache(async () => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const userId = session?.user?.id;

    if (!userId) {
      return {
        success: false,
        error: "Unauthorized",
        credits: 0,
      };
    }

    const user = await db.user.findUnique({
      where: {
        id: userId,
      },

      select: {
        credits: true,
      },
    });

    if (!user) {
      return {
        success: false,
        error: "User not found",
        credits: 0,
      };
    }

    return {
      success: true,
      credits: user.credits ?? 0,
    };
  } catch (error) {
    console.error(
      "Error fetching user credits:",
      error,
    );

    return {
      success: false,
      error: "Failed to fetch credits",
      credits: 0,
    };
  }
});

/**
 * Delete one generated audio project.
 */
export async function deleteAudioProject(
  id: string,
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const userId = session?.user?.id;

    if (!userId) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    const project =
      await db.audioProject.findUnique({
        where: {
          id,
        },
      });

    
    if (!project || project.userId !== userId) {
      return {
        success: false,
        error: "Not found or unauthorized",
      };
    }

    await db.audioProject.delete({
      where: {
        id,
      },
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error(
      "Error deleting audio project:",
      error,
    );

    return {
      success: false,
      error: "Failed to delete audio project",
    };
  }
}