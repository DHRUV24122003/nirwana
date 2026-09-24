"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  ChevronUp,
  LogOut,
  Settings,
  UserRound,
} from "lucide-react";

import { authClient } from "~/lib/auth-client";
//import { NirwanaBrand } from "~/components/brand/nirwana-brand";
import { NirwanaBrand } from "../brand/nirwana-brand";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
} from "~/components/ui/sidebar";

import { SidebarMenuItems } from "./sidebar-menu-items";

type SidebarUser = {
  name: string | null;
  email: string | null;
  image: string | null;
};

function getInitials(name: string | null, email: string | null) {
  const source = name?.trim() ?? email?.trim() ?? "N";

  const words = source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (words.length > 1) {
    return words
      .map((word) => word[0])
      .join("")
      .toUpperCase();
  }

  return source.slice(0, 1).toUpperCase();
}

function AppSidebar() {
  const router = useRouter();

  const [user, setUser] = useState<SidebarUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const result = await authClient.getSession();

        if (result?.data?.user) {
          setUser({
            name: result.data.user.name ?? null,
            email: result.data.user.email ?? null,
            image: result.data.user.image ?? null,
          });
        }
      } catch (error) {
        console.error("Failed to load sidebar account:", error);
      }
    };

    void loadUser();
  }, []);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);

      await authClient.signOut();

      router.push("/auth/sign-in");
      router.refresh();
    } catch (error) {
      console.error("Sign out failed:", error);
    } finally {
      setIsSigningOut(false);
    }
  };

  const initials = getInitials(
    user?.name ?? null,
    user?.email ?? null,
  );

  return (
    <Sidebar className="border-r-0">
      <SidebarContent className="flex flex-col overflow-hidden px-3 py-3">
        <div className="mb-4 px-1">
          <Link
            href="/dashboard"
            className="flex items-center rounded-xl px-2 py-2"
          >
            <NirwanaBrand
              imageClassName="h-9 w-auto max-w-[170px] object-contain"
            />
          </Link>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <SidebarGroup className="p-0">
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                <SidebarMenuItems />
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>

        <div className="relative z-30 -mx-3 -mb-3 mt-auto bg-background px-3 pb-3 pt-4">
          {menuOpen && (
            <div className="absolute bottom-[calc(100%+8px)] left-3 right-3 overflow-hidden rounded-2xl border bg-background shadow-[0_18px_50px_rgba(15,23,42,0.18)]">
              <div className="border-b px-4 py-3">
                <p className="truncate text-sm font-semibold">
                  {user?.name ?? "Nirwana User"}
                </p>

                <p className="text-muted-foreground mt-0.5 truncate text-xs">
                  {user?.email ?? "Signed in"}
                </p>
              </div>

              <div className="p-2">
                <Link
                  href="/dashboard/settings"
                  onClick={() => setMenuOpen(false)}
                  className="hover:bg-muted flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  Account settings
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    void handleSignOut();
                  }}
                  disabled={isSigningOut}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-red-950/20"
                >
                  <LogOut className="h-4 w-4" />

                  {isSigningOut
                    ? "Signing out..."
                    : "Sign out"}
                </button>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMenuOpen((current) => !current)}
            className="group flex w-full items-center gap-3 rounded-2xl bg-background p-2.5 text-left shadow-[0_8px_28px_rgba(15,23,42,0.12)] ring-1 ring-black/5 transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_34px_rgba(15,23,42,0.16)] dark:ring-white/10"
          >
            <div className="relative h-12 w-12 shrink-0">
              {user?.image ? (
                <img
                  src={user.image}
                  alt={user.name ?? "Profile"}
                  className="h-12 w-12 rounded-2xl object-cover ring-2 ring-white shadow-sm"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#201447] to-[#7259c8] text-sm font-bold text-white shadow-md ring-2 ring-white">
                  {initials || (
                    <UserRound className="h-5 w-5" />
                  )}
                </div>
              )}

              <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background bg-emerald-500" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {user?.name ?? "Your account"}
              </p>

              <p className="text-muted-foreground mt-0.5 truncate text-[11px]">
                {user?.email ?? "Manage your workspace"}
              </p>
            </div>

            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted/70 transition-transform ${
                menuOpen ? "rotate-180" : ""
              }`}
            >
              <ChevronUp className="h-4 w-4" />
            </div>
          </button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

export { AppSidebar };
export default AppSidebar;
