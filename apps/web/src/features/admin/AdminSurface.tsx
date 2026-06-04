"use client";

import { useEffect, useState } from "react";
import { parseAdminPathSection, writeAdminPathSection, type AdminSection } from "../../shared/components/admin/adminUrlState";
import { RedemptionCodesAdminPage } from "./RedemptionCodesAdminPage";
import { UserListAdminPage } from "./UserListAdminPage";

type AdminSurfaceProps = {
  initialSection: AdminSection;
};

export function AdminSurface({ initialSection }: AdminSurfaceProps) {
  const [activeSection, setActiveSection] = useState(initialSection);

  useEffect(() => {
    if (window.location.pathname !== "/admin") return;
    writeAdminPathSection(initialSection, { replace: true });
  }, [initialSection]);

  useEffect(() => {
    function handlePopState() {
      const nextSection = parseAdminPathSection(window.location.pathname);
      if (nextSection) setActiveSection(nextSection);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function showSection(section: AdminSection) {
    if (activeSection === section) return;
    setActiveSection(section);
    writeAdminPathSection(section);
  }

  if (activeSection === "codes") {
    return <RedemptionCodesAdminPage activeSection={activeSection} onSectionNavigate={showSection} />;
  }

  return <UserListAdminPage activeSection={activeSection} onSectionNavigate={showSection} />;
}
