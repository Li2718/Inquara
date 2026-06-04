import { cookies } from "next/headers";
import { parseSidebarOpenPreference, CANVAS_SIDEBAR_OPEN_COOKIE } from "../../../features/canvas/sidebarPreference";
import { CanvasesLayoutClient } from "../CanvasesLayoutClient";

export default async function CanvasPage() {
  const cookieStore = await cookies();
  const initialSidebarOpen = parseSidebarOpenPreference(cookieStore.get(CANVAS_SIDEBAR_OPEN_COOKIE)?.value);

  return <CanvasesLayoutClient initialSidebarOpen={initialSidebarOpen} />;
}
