import { labels, Language } from "../i18n";
import { Project } from "../lib/api";
import { ChatPanel } from "./ChatPanel";
import { HistorySidebar } from "./HistorySidebar";

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

  return (
    <main className="workspace-shell">
      <nav className="nav">
        <strong>CAD-to-Life</strong>
        <div className="nav-actions">
          <button className="back-button" onClick={onBack}>{copy.back}</button>
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
    </main>
  );
}
