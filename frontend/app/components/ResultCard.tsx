import { labels, Language } from "../i18n";
import { Project } from "../lib/api";

export function ResultCard({
  language,
  project,
}: {
  language: Language;
  project: Project | null;
}) {
  const copy = labels[language];
  if (!project) return null;

  return (
    <article className="design-result">
      <div className="result-heading">
        <span className="result-icon">·</span>
        <div>
          <strong>{copy.selectedProject}</strong>
          <span>{project.name}</span>
        </div>
      </div>
      <div className="result-preview">
        <div>
          <strong>{project.name}</strong>
          <p>{project.description}</p>
          {project.basic_dimension_warnings.length > 0 && (
            <span className="status">
              {project.basic_dimension_warnings.join(" ")}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
