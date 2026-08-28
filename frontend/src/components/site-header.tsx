"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CalendarDays } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { listNotifications, markAllNotificationsRead } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function SiteHeader() {
  const { user, isAuthenticated, isAdmin, isTeacher, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const qc = useQueryClient();

  const notifications = useQuery({
    queryKey: ["notifications"],
    queryFn: listNotifications,
    enabled: isAuthenticated,
    refetchInterval: 60_000,
    retry: false,
  });

  const unread = notifications.data?.filter((n) => !n.read).length ?? 0;

  const handleSignOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    logout();
    router.replace("/login");
  };

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <CalendarDays className="size-5 text-primary" />
          Inquisitors Society
        </Link>

        {isAuthenticated && (
          <nav className="ml-4 hidden gap-4 text-sm sm:flex">
            <Link
              href="/events"
              className={
                isActive("/events")
                  ? "text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }
            >
              Events
            </Link>
            <Link
              href="/internships"
              className={
                isActive("/internships")
                  ? "text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }
            >
              Internships
            </Link>
            <Link
              href="/analytics"
              className={
                isActive("/analytics")
                  ? "text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }
            >
              Analytics
            </Link>
            {(isAdmin || isTeacher) && (
              <Link
                href="/teacher/create-event"
                className={
                  isActive("/teacher")
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }
              >
                Teacher
              </Link>
            )}
          </nav>
        )}

        <div className="ml-auto flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <Popover
                onOpenChange={(open) => {
                  if (open && unread > 0) {
                    markAllNotificationsRead()
                      .catch(() => undefined)
                      .finally(() =>
                        qc.invalidateQueries({ queryKey: ["notifications"] }),
                      );
                  }
                }}
              >
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
                    <Bell className="size-5" />
                    {unread > 0 && (
                      <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground">
                        {unread > 9 ? "9+" : unread}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 p-0">
                  <p className="border-b px-4 py-2 text-sm font-semibold">Notifications</p>
                  <ul className="max-h-80 divide-y overflow-auto">
                    {notifications.data?.map((n) => (
                      <li key={n._id} className="px-4 py-3">
                        <p className="text-sm font-medium">{n.title}</p>
                        <p className="text-xs text-muted-foreground">{n.message}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {new Date(n.createdAt).toLocaleString()}
                        </p>
                      </li>
                    ))}
                    {(!notifications.data || notifications.data.length === 0) && (
                      <li className="px-4 py-8 text-center text-sm text-muted-foreground">
                        You&apos;re all caught up.
                      </li>
                    )}
                  </ul>
                </PopoverContent>
              </Popover>

              <Badge variant="secondary" className="hidden sm:inline-flex">
                {user?.name} &middot; {user?.role}
              </Badge>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">Create account</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
