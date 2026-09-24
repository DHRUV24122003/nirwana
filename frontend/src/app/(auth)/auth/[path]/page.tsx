"use client";

import type { FormEvent } from "react";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { AuthView } from "@daveyplate/better-auth-ui";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Sparkles,
} from "lucide-react";

import { authClient } from "~/lib/auth-client";
import { NirwanaBrand } from "~/components/brand/nirwana-brand";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

function SignUpPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || !cleanEmail || !password) {
      setError("Please complete all fields.");
      return;
    }

    if (password.length < 8) {
      setError(
        "Password must be at least 8 characters long.",
      );
      return;
    }

    try {
      setError(null);
      setIsSubmitting(true);

      const result = await authClient.signUp.email({
        name: cleanName,
        email: cleanEmail,
        password,
        callbackURL: "/dashboard",
      });

      if (result.error) {
        setError(
          result.error.message
            ?? "Could not create your account.",
        );
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (caughtError) {
      console.error("Sign up failed:", caughtError);

      setError(
        "Could not create your account. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen w-full overflow-hidden bg-white">
      <div className="grid min-h-screen w-full bg-white lg:grid-cols-[1.04fr_0.96fr]">
        <section
          className="relative hidden min-h-full overflow-hidden bg-slate-900 lg:block"
          style={{
            backgroundImage:
              "url('/nirwana-auth-visual.png')",
            backgroundPosition: "left center",
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/10 via-transparent to-black/5" />

          <div className="absolute bottom-8 left-8 right-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/20 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-xl">
              <Sparkles className="h-3.5 w-3.5" />
              AI-powered multilingual media workspace
            </div>
          </div>
        </section>

        <section className="relative flex min-h-full flex-col bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 lg:hidden">
            <Link
              href="/"
              className="flex items-center"
            >
              <NirwanaBrand
                imageClassName="h-8 w-auto max-w-[155px] object-contain"
              />
            </Link>

            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Multilingual AI
            </span>
          </div>

          <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-10 lg:px-12 xl:px-20">
            <div className="w-full max-w-[430px]">
              <div className="mb-8">
                <div className="mb-5 hidden lg:flex">
                  <NirwanaBrand
                    imageClassName="h-10 w-auto max-w-[190px] object-contain"
                  />
                </div>

                <p className="mb-2 text-sm font-medium text-[#6b55b4]">
                  Start creating without borders
                </p>

                <h1 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-[38px] sm:leading-[1.1]">
                  Create your account
                </h1>

                <p className="mt-3 max-w-sm text-sm leading-6 text-slate-500">
                  Dub, translate and transcribe multilingual
                  media from one AI workspace.
                </p>
              </div>

              <form
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label
                    htmlFor="name"
                    className="text-sm font-medium text-slate-700"
                  >
                    Full name
                  </label>

                  <Input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value);
                      setError(null);
                    }}
                    placeholder="Enter your full name"
                    disabled={isSubmitting}
                    className="h-12 rounded-xl border-slate-200 bg-slate-50/70 px-4 shadow-none focus-visible:ring-[#6b55b4]"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="text-sm font-medium text-slate-700"
                  >
                    Email address
                  </label>

                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setError(null);
                    }}
                    placeholder="you@example.com"
                    disabled={isSubmitting}
                    className="h-12 rounded-xl border-slate-200 bg-slate-50/70 px-4 shadow-none focus-visible:ring-[#6b55b4]"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <label
                      htmlFor="password"
                      className="text-sm font-medium text-slate-700"
                    >
                      Password
                    </label>

                    <span className="text-xs text-slate-400">
                      Minimum 8 characters
                    </span>
                  </div>

                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      autoComplete="new-password"
                      value={password}
                      onChange={(event) => {
                        setPassword(
                          event.target.value,
                        );
                        setError(null);
                      }}
                      placeholder="Create a strong password"
                      disabled={isSubmitting}
                      className="h-12 rounded-xl border-slate-200 bg-slate-50/70 px-4 pr-11 shadow-none focus-visible:ring-[#6b55b4]"
                    />

                    <button
                      type="button"
                      onClick={() => {
                        setShowPassword(
                          (current) => !current,
                        );
                      }}
                      disabled={isSubmitting}
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:text-slate-700 disabled:cursor-not-allowed"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-2 h-12 w-full rounded-xl bg-[#201447] text-white shadow-[0_10px_30px_rgba(32,20,71,0.22)] transition hover:bg-[#2b1b5f]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      Create account
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <div className="my-6 flex items-center gap-4">
                <div className="h-px flex-1 bg-slate-200" />

                <span className="text-xs text-slate-400">
                  Already a member?
                </span>

                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <Button
                asChild
                variant="outline"
                className="h-12 w-full rounded-xl border-slate-200 bg-white text-slate-700 shadow-none hover:bg-slate-50"
              >
                <Link href="/auth/sign-in">
                  Sign in to Nirwana
                </Link>
              </Button>

              <p className="mt-6 text-center text-xs leading-5 text-slate-400">
                Your projects stay connected to your
                authenticated Nirwana workspace.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function SignInPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setError(null);
      setIsSubmitting(true);

      const result = await authClient.signIn.email({
        email: cleanEmail,
        password,
        callbackURL: "/dashboard",
      });

      if (result.error) {
        setError(
          result.error.message
            ?? "Could not sign in. Please check your credentials.",
        );
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (caughtError) {
      console.error("Sign in failed:", caughtError);

      setError(
        "Could not sign in. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen w-full overflow-hidden bg-white">
      <div className="grid min-h-screen w-full bg-white lg:grid-cols-[1.04fr_0.96fr]">
        <section
          className="relative hidden min-h-full overflow-hidden bg-slate-900 lg:block"
          style={{
            backgroundImage:
              "url('/nirwana-auth-visual.png')",
            backgroundPosition: "left center",
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/10 via-transparent to-black/5" />

          <div className="absolute bottom-8 left-8 right-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/20 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-xl">
              <Sparkles className="h-3.5 w-3.5" />
              AI-powered multilingual media workspace
            </div>
          </div>
        </section>

        <section className="relative flex min-h-full flex-col bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 lg:hidden">
            <Link
              href="/"
              className="flex items-center"
            >
              <NirwanaBrand
                imageClassName="h-8 w-auto max-w-[155px] object-contain"
              />
            </Link>

            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Multilingual AI
            </span>
          </div>

          <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-10 lg:px-12 xl:px-20">
            <div className="w-full max-w-[430px]">
              <div className="mb-8">
                <div className="mb-5 hidden lg:flex">
                  <NirwanaBrand
                    imageClassName="h-10 w-auto max-w-[190px] object-contain"
                  />
                </div>

                <p className="mb-2 text-sm font-medium text-[#6b55b4]">
                  Welcome back
                </p>

                <h1 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-[38px] sm:leading-[1.1]">
                  Sign in to your workspace
                </h1>

                <p className="mt-3 max-w-sm text-sm leading-6 text-slate-500">
                  Continue your dubbing, translation and
                  transcription projects from one place.
                </p>
              </div>

              <form
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label
                    htmlFor="signin-email"
                    className="text-sm font-medium text-slate-700"
                  >
                    Email address
                  </label>

                  <Input
                    id="signin-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setError(null);
                    }}
                    placeholder="you@example.com"
                    disabled={isSubmitting}
                    className="h-12 rounded-xl border-slate-200 bg-slate-50/70 px-4 shadow-none focus-visible:ring-[#6b55b4]"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <label
                      htmlFor="signin-password"
                      className="text-sm font-medium text-slate-700"
                    >
                      Password
                    </label>

                    <Link
                      href="/auth/forgot-password"
                      className="text-xs font-medium text-[#6b55b4] transition hover:text-[#201447]"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  <div className="relative">
                    <Input
                      id="signin-password"
                      name="password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => {
                        setPassword(
                          event.target.value,
                        );
                        setError(null);
                      }}
                      placeholder="Enter your password"
                      disabled={isSubmitting}
                      className="h-12 rounded-xl border-slate-200 bg-slate-50/70 px-4 pr-11 shadow-none focus-visible:ring-[#6b55b4]"
                    />

                    <button
                      type="button"
                      onClick={() => {
                        setShowPassword(
                          (current) => !current,
                        );
                      }}
                      disabled={isSubmitting}
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:text-slate-700 disabled:cursor-not-allowed"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-2 h-12 w-full rounded-xl bg-[#201447] text-white shadow-[0_10px_30px_rgba(32,20,71,0.22)] transition hover:bg-[#2b1b5f]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign in
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <div className="my-6 flex items-center gap-4">
                <div className="h-px flex-1 bg-slate-200" />

                <span className="text-xs text-slate-400">
                  New to Nirwana?
                </span>

                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <Button
                asChild
                variant="outline"
                className="h-12 w-full rounded-xl border-slate-200 bg-white text-slate-700 shadow-none hover:bg-slate-50"
              >
                <Link href="/auth/sign-up">
                  Create an account
                </Link>
              </Button>

              <p className="mt-6 text-center text-xs leading-5 text-slate-400">
                Sign in to access your saved multilingual projects.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function ExistingAuthPage({
  path,
}: {
  path: string;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#eef0f4] px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
        <div className="mb-7 flex justify-center">
          <NirwanaBrand
            imageClassName="h-10 w-auto max-w-[190px] object-contain"
          />
        </div>

        <AuthView
          path={path}
          redirectTo="/dashboard"
        />
      </div>
    </main>
  );
}

export default function AuthPage() {
  const params = useParams<{ path: string }>();
  const path = params.path;

  if (path === "sign-up") {
    return <SignUpPage />;
  }

  if (path === "sign-in") {
    return <SignInPage />;
  }

  return <ExistingAuthPage path={path} />;
}
