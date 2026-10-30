"use client";

import { useEffect, useState } from "react";
import { Landing } from "./components/Landing";
import { Workspace } from "./components/Workspace";
import { labels, Language } from "./i18n";
import { detectApiBaseUrl, getProjects, Project } from "./lib/api";

export default function Home() {
  const [language, setLanguage] = useState<Language>("fr");
  const [started, setStarted] = useState(false);
  const [apiUrl, setApiUrl] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      const baseUrl = await detectApiBaseUrl();
      if (!active) return;
      setApiUrl(baseUrl);
      if (!baseUrl) {
        setError(labels[language].backendUnavailable);
        return;
      }
      try {
        setProjects(await getProjects(baseUrl));
      } catch {
        setError(labels[language].backendUnavailable);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [language]);

  if (!started) {
    return (
      <Landing
        language={language}
        onLanguageChange={() => setLanguage(language === "fr" ? "en" : "fr")}
        onStart={() => setStarted(true)}
      />
    );
  }

  return (
    <>
      <Workspace
        language={language}
        apiUrl={apiUrl}
        projects={projects}
        selectedProjectId={selectedProjectId}
        historyOpen={historyOpen}
        onBack={() => setStarted(false)}
        onLanguageChange={() => setLanguage(language === "fr" ? "en" : "fr")}
        onToggleHistory={() => setHistoryOpen((open) => !open)}
        onSelectProject={setSelectedProjectId}
        onError={setError}
      />
      {error && <p className="error global-error">{error}</p>}
    </>
  );
}
