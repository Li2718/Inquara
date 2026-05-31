import { cookies } from "next/headers";
import { parseSidebarOpenPreference, WORKSPACE_SIDEBAR_OPEN_COOKIE } from "../../features/canvas/sidebarPreference";
import { WorkspacesLayoutClient } from "./WorkspacesLayoutClient";

export default async function WorkspacesLayout() {
  const cookieStore = await cookies();
  const initialSidebarOpen = parseSidebarOpenPreference(cookieStore.get(WORKSPACE_SIDEBAR_OPEN_COOKIE)?.value);

  return <WorkspacesLayoutClient initialSidebarOpen={initialSidebarOpen} />;
}
