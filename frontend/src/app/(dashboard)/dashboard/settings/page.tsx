"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  ArrowRight,
  CircleUserRound,
  FolderOpen,
  Languages,
  Loader2,
  Settings,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { authClient } from "~/lib/auth-client";

import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

interface AccountInfo {
  name: string | null;
  email: string | null;
}

export default function SettingsPage() {
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAccount = async () => {
      try {
        const result = await authClient.getSession();

        if (result?.data?.user) {
          setAccount({
            name: result.data.user.name ?? null,
            email: result.data.user.email ?? null,
          });
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    void loadAccount();
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <div className="text-muted-foreground flex items-center gap-3 text-sm">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading Nirwana settings...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-10">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Settings className="text-primary h-6 w-6" />

          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Nirwana Settings
          </h1>
        </div>

        <p className="text-muted-foreground max-w-2xl text-sm sm:text-base">
          Manage your account information and access your Nirwana workspace.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="bg-primary/10 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl">
              <CircleUserRound className="text-primary h-6 w-6" />
            </div>

            <div>
              <CardTitle>Account Information</CardTitle>

              <CardDescription className="mt-1">
                Your currently authenticated Nirwana account.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="bg-muted/30 rounded-xl border p-4">
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                Name
              </p>

              <p className="mt-2 text-sm font-medium">
                {account?.name ?? "Not available"}
              </p>
            </div>

            <div className="bg-muted/30 rounded-xl border p-4">
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                Email
              </p>

              <p className="mt-2 break-all text-sm font-medium">
                {account?.email ?? "Not available"}
              </p>
            </div>
          </div>

          <div className="bg-muted/20 flex items-start gap-3 rounded-xl border p-4">
            <ShieldCheck className="text-primary mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="text-sm font-medium">
                Secure authentication
              </p>

              <p className="text-muted-foreground mt-1 text-xs leading-5">
                Your sign-in session and account authentication are handled by
                the Better Auth integration already connected to Nirwana.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="bg-primary/10 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl">
              <Sparkles className="text-primary h-6 w-6" />
            </div>

            <div>
              <CardTitle>Workspace</CardTitle>

              <CardDescription className="mt-1">
                Quick access to your main Nirwana tools.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border p-5">
            <div className="flex items-start gap-3">
              <FolderOpen className="text-primary mt-0.5 h-5 w-5 shrink-0" />

              <div>
                <p className="font-medium">Projects</p>

                <p className="text-muted-foreground mt-1 text-xs leading-5">
                  View your recent dubbing, transcription and translation
                  projects.
                </p>
              </div>
            </div>

            <Button
              asChild
              variant="outline"
              className="mt-5 w-full justify-between"
            >
              <Link href="/dashboard/projects">
                Open Projects
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="rounded-xl border p-5">
            <div className="flex items-start gap-3">
              <Languages className="text-primary mt-0.5 h-5 w-5 shrink-0" />

              <div>
                <p className="font-medium">Text Translator</p>

                <p className="text-muted-foreground mt-1 text-xs leading-5">
                  Translate text and generate multilingual spoken output.
                </p>
              </div>
            </div>

            <Button
              asChild
              variant="outline"
              className="mt-5 w-full justify-between"
            >
              <Link href="/dashboard/text-translate">
                Open Translator
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About Nirwana</CardTitle>
          <CardDescription>Portfolio build</CardDescription>
        </CardHeader>

        <CardContent>
          <p className="text-muted-foreground text-sm leading-6">
            Nirwana is an AI-powered multilingual media platform for video
            dubbing, video transcription, audio translation, audio
            transcription, and text translation with generated speech.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
