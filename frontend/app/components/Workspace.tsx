import { useState } from "react";
import { labels, Language } from "../i18n";
import { Project } from "../lib/api";
import { ChatPanel } from "./ChatPanel";
import { HistorySidebar } from "./HistorySidebar";
import { LibraryPanel } from "./LibraryPanel";

export function Workspace({
  language,
  apiUrl,
  projects,
  selectedProjectId,
  historyOpen,
  onBack,
  onLanguageChange,
  onToggleHistory,
  onSelectProject,
  onError,
}: {
  language: Language;
  apiUrl: string | null;
  projects: Project[];
  selectedProjectId: string | null;
  historyOpen: boolean;
  onBack: () => void;
  onLanguageChange: () => void;
  onToggleHistory: () => void;
  onSelectProject: (id: string) => void;
  onError: (message: string) => void;
}) {
  const copy = labels[language];
  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? null;
  const [libraryOpen, setLibraryOpen] = useState(false);

  return (
    <main className="workspace-shell">
      <nav className="nav">
        <strong>CAD-to-Life</strong>
        <div className="nav-actions">
          <button className="back-button" onClick={onBack}>{copy.back}</button>
          <button className="back-button" onClick={() => setLibraryOpen(true)}>
            {language === "fr" ? "Bibliothèque" : "Library"}
          </button>
          <button className="language" onClick={onLanguageChange}>
            {language === "fr" ? "EN" : "FR"}
          </button>
        </div>
      </nav>
      <section className="chat-layout">
        <HistorySidebar
          language={language}
          projects={projects}
          selectedProjectId={selectedProjectId}
          open={historyOpen}
          onToggle={onToggleHistory}
          onSelect={onSelectProject}
        />
        <ChatPanel language={language} apiUrl={apiUrl} project={selectedProject} onError={onError} />
      </section>
      {libraryOpen && <LibraryPanel language={language} apiUrl={apiUrl} onClose={() => setLibraryOpen(false)} />}
    </main>
  );
}
