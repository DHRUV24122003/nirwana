"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  AudioLines,
  Captions,
  FileAudio,
  FileText,
  FolderOpen,
  Languages,
  LayoutDashboard,
  Settings2,
  Video,
} from "lucide-react";

import {
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "~/components/ui/sidebar";

type MenuItem = {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  disabled?: boolean;
  badge?: string;
};

type MenuSection = {
  title?: string;
  items: MenuItem[];
};

const sections: MenuSection[] = [
  {
    items: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: "VIDEO",
    items: [
      {
        title: "Video Dubbing",
        url: "/dashboard/video-dubbing",
        icon: Video,
      },
      {
        title: "Video Transcription",
        url: "/dashboard/video-transcription",
        icon: FileText,
      },
    ],
  },
  {
    title: "AUDIO",
    items: [
      {
        title: "Audio Translator",
        url: "/dashboard/audio-translator",
        icon: AudioLines,
      },
      {
        title: "Audio Transcription",
        url: "/dashboard/audio-transcription",
        icon: FileAudio,
      },
    ],
  },
  {
    title: "VOICE & TEXT",
    items: [
      {
        title: "Text Translator",
        url: "/dashboard/text-translate",
        icon: Languages,
      },
    ],
  },
  {
    title: "TOOLS",
    items: [
      {
        title: "Subtitle Studio",
        url: "/dashboard/subtitles",
        icon: Captions,
        disabled: true,
        badge: "Soon",
      },
      {
        title: "Projects",
        url: "/dashboard/projects",
        icon: FolderOpen,
      },
      {
        title: "Settings",
        url: "/dashboard/settings",
        icon: Settings2,
      },
    ],
  },
];

export function SidebarMenuItems() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  const handleMenuClick = () => {
    setOpenMobile(false);
  };

  return (
    <>
      {sections.map((section, sectionIndex) => (
        <li
          key={section.title ?? `main-${sectionIndex}`}
          role="presentation"
          className="list-none"
        >
          {section.title && (
            <div className="text-sidebar-foreground/50 mb-2 mt-5 px-2 text-[10px] font-semibold tracking-[0.18em]">
              {section.title}
            </div>
          )}

          <ul className="space-y-1">
            {section.items.map((item) => {
              const Icon = item.icon;

              const isActive =
                item.url === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname === item.url
                    || pathname.startsWith(`${item.url}/`);

              return (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                  >
                    <Link
                      href={item.url}
                      aria-disabled={item.disabled ?? undefined}
                      tabIndex={item.disabled ? -1 : undefined}
                      onClick={(event) => {
                        if (item.disabled) {
                          event.preventDefault();
                          return;
                        }

                        handleMenuClick();
                      }}
                      className={
                        item.disabled
                          ? "flex w-full cursor-not-allowed items-center gap-3 opacity-55"
                          : "flex w-full cursor-pointer items-center gap-3"
                      }
                    >
                      <Icon className="h-4 w-4 shrink-0" />

                      <span className="min-w-0 flex-1 truncate">
                        {item.title}
                      </span>

                      {item.badge && (
                        <span className="bg-sidebar-accent text-sidebar-accent-foreground rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </ul>
        </li>
      ))}
    </>
  );
}
