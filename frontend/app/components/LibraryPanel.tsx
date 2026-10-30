"use client";

import { useEffect, useState } from "react";
import { labels, Language } from "../i18n";
import { Component, getComponents } from "../lib/api";

export function LibraryPanel({
  language,
  apiUrl,
  onClose,
}: {
  language: Language;
  apiUrl: string | null;
  onClose: () => void;
}) {
  const copy = labels[language];
  const [search, setSearch] = useState("");
  const [components, setComponents] = useState<Component[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!apiUrl) return;
    getComponents(apiUrl, search)
      .then(setComponents)
      .catch(() => setError(copy.backendUnavailable));
  }, [apiUrl, search, copy.backendUnavailable]);

  return (
    <div className="library-overlay">
      <section className="library-panel">
        <div className="library-heading">
          <div>
            <p className="eyebrow">CAD-to-Life</p>
            <h2>{language === "fr" ? "Bibliothèque de composants" : "Component library"}</h2>
          </div>
          <button className="back-button" onClick={onClose}>×</button>
        </div>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={language === "fr" ? "Rechercher un composant..." : "Search components..."}
          aria-label={language === "fr" ? "Rechercher un composant" : "Search components"}
        />
        {error && <p className="error">{error}</p>}
        <div className="library-table">
          {components.map((component) => (
            <article className="library-row" key={component.id}>
              <div>
                <strong>{component.name}</strong>
                <span>{component.manufacturer} · {component.category}</span>
              </div>
              <span>
                {component.dimensions_mm.length} × {component.dimensions_mm.width} × {component.dimensions_mm.height} mm
              </span>
              <span className={component.verified ? "status good" : "status"}>
                {component.verified ? "Verified" : "Unverified"}
              </span>
              <a href={component.source.url} target="_blank" rel="noreferrer">Source</a>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
