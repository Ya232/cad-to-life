import { labels, Language } from "../i18n";

export function Landing({
  language,
  onLanguageChange,
  onStart,
}: {
  language: Language;
  onLanguageChange: () => void;
  onStart: () => void;
}) {
  const copy = labels[language];
  return (
    <main className="landing shell">
      <nav className="nav">
        <strong>CAD-to-Life</strong>
        <button className="language" onClick={onLanguageChange}>
          {language === "fr" ? "EN" : "FR"}
        </button>
      </nav>
      <section className="landing-hero">
        <div className="landing-copy">
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1>{copy.title}</h1>
          <p className="lead">{copy.description}</p>
          <p className="landing-features">{copy.features}</p>
          <button className="primary start-button" onClick={onStart}>
            {copy.start} <span aria-hidden="true">→</span>
          </button>
        </div>
        <div className="landing-visual" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="landing-shape" />
          <span className="visual-label">CAD / AI / PRINT</span>
        </div>
      </section>
    </main>
  );
}
