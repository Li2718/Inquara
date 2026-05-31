import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

const API_INTERNAL_ORIGIN =
  process.env.API_INTERNAL_ORIGIN || process.env.NEXT_PUBLIC_API_ORIGIN || "http://localhost:4000";

type CurrentUser = {
  role: string;
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdminAccess();
  return children;
}

async function requireAdminAccess() {
  const cookieStore = await cookies();
  const response = await fetch(`${API_INTERNAL_ORIGIN}/auth/me`, {
    cache: "no-store",
    headers: {
      cookie: cookieStore.toString()
    }
  });

  if (response.status === 401 || response.status === 403) notFound();
  if (!response.ok) throw new Error("Could not verify admin access.");

  const user = (await response.json()) as CurrentUser;
  if (user.role !== "admin") notFound();
}
