import type { Canvas } from "@inquara/domain";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { parseSidebarOpenPreference, CANVAS_SIDEBAR_OPEN_COOKIE } from "../../../features/canvas/sidebarPreference";
import { CanvasesLayoutClient } from "../CanvasesLayoutClient";

const API_INTERNAL_ORIGIN =
  process.env.API_INTERNAL_ORIGIN || process.env.NEXT_PUBLIC_API_ORIGIN || "http://localhost:4000";

type CanvasPageProps = {
  params: Promise<{
    canvasId: string;
  }>;
};

export default async function CanvasPage({ params }: CanvasPageProps) {
  const { canvasId } = await params;
  if (canvasId !== "new") {
    await requireVisibleCanvas(canvasId);
  }
  const cookieStore = await cookies();
  const initialSidebarOpen = parseSidebarOpenPreference(cookieStore.get(CANVAS_SIDEBAR_OPEN_COOKIE)?.value);

  return <CanvasesLayoutClient initialSidebarOpen={initialSidebarOpen} />;
}

async function requireVisibleCanvas(canvasId: string): Promise<void> {
  const cookieStore = await cookies();
  const response = await fetch(`${API_INTERNAL_ORIGIN}/canvases`, {
    cache: "no-store",
    headers: {
      cookie: cookieStore.toString()
    }
  });

  if (response.status === 401) return;
  if (!response.ok) throw new Error("Could not verify canvas access.");

  const canvases = (await response.json()) as Canvas[];
  if (!canvases.some(canvas => canvas.id === canvasId)) {
    notFound();
  }
}
