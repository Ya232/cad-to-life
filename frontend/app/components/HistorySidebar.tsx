import { labels, Language } from "../i18n";
import { Project } from "../lib/api";

export function HistorySidebar({
  language,
  projects,
  selectedProjectId,
  open,
  onToggle,
  onSelect,
}: {
  language: Language;
  projects: Project[];
  selectedProjectId: string | null;
  open: boolean;
  onToggle: () => void;
  onSelect: (id: string) => void;
}) {
  const copy = labels[language];
  return (
    <aside className={`history-sidebar ${open ? "" : "collapsed"}`}>
      <div className="history-sidebar-heading">
        {open && <strong>{copy.history}</strong>}
        <button
          className="history-toggle"
          onClick={onToggle}
          aria-label={open ? copy.collapseHistory : copy.expandHistory}
        >
          {open ? "‹" : "›"}
        </button>
      </div>
      {open && (
        <div className="sidebar-projects">
          {projects.length === 0 ? (
            <p className="muted">{copy.empty}</p>
          ) : (
            projects.map((project) => (
              <button
                className={`sidebar-project ${selectedProjectId === project.id ? "selected" : ""}`}
                key={project.id}
                onClick={() => onSelect(project.id)}
              >
                <strong>{project.name.slice(0, 32)}</strong>
                <span>{project.part_type}</span>
              </button>
            ))
          )}
        </div>
      )}
    </aside>
  );
}
