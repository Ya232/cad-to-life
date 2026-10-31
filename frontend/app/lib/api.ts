export type PartType = "enclosure" | "bracket" | "mounting_plate" | "spacer";

export type Project = {
  id: string;
  name: string;
  description: string;
  part_type: PartType;
  width_mm: number;
  depth_mm: number;
  height_mm: number;
  basic_dimension_warnings: string[];
  created_at: string;
};

export type ClarificationQuestion = {
  id: string;
  text: string;
  options: string[];
};

export type DesignSpec = {
  part_type: PartType;
  name: string;
  components: { query: string; library_id: string | null; confidence: number }[];
  constraints: {
    usb_access: boolean;
    mounting: "none" | "wall" | "screws";
    waterproof: boolean;
    max_size_mm: [number, number, number] | null;
    notes: string;
  };
  parameters: Record<string, number>;
  language: "fr" | "en";
};

export type AnalyzeResponse =
  | { status: "needs_clarification"; questions: ClarificationQuestion[] }
  | { status: "ready"; spec: DesignSpec };

export type GenerateResult = {
  project_id: string;
  files: { stl_url: string };
  bounding_box_mm: [number, number, number];
  parameters_used: Record<string, number>;
  warnings: string[];
};

export type Component = {
  id: string;
  name: string;
  category: string;
  manufacturer: string;
  dimensions_mm: { length: number; width: number; height: number };
  source: { url: string; document: string; page: string };
  verified: boolean;
  notes: string;
};

const candidates = [
  process.env.NEXT_PUBLIC_API_URL,
  "http://localhost:8000",
  "http://127.0.0.1:8000",
  "http://localhost:8001",
  "http://127.0.0.1:8001",
].filter((value): value is string => Boolean(value));

export async function detectApiBaseUrl(): Promise<string | null> {
  for (const baseUrl of candidates) {
    try {
      const health = await fetch(`${baseUrl}/api/health`, { cache: "no-store" });
      if (!health.ok) continue;
      const meta = await fetch(`${baseUrl}/api/meta/status`, { cache: "no-store" });
      if (!meta.ok) continue;
      const status = (await meta.json()) as { configured?: boolean; reachable?: boolean };
      if (status.configured && status.reachable) return baseUrl;
    } catch {
      continue;
    }
  }
  return null;
}

export async function getProjects(baseUrl: string): Promise<Project[]> {
  const response = await fetch(`${baseUrl}/api/projects`, { cache: "no-store" });
  if (!response.ok) throw new Error("projects_unavailable");
  return (await response.json()) as Project[];
}

export async function getComponents(baseUrl: string, search = ""): Promise<Component[]> {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  const response = await fetch(`${baseUrl}/api/components${query}`, { cache: "no-store" });
  if (!response.ok) throw new Error("components_unavailable");
  return (await response.json()) as Component[];
}

export async function analyzeDesign(
  baseUrl: string,
  description: string,
  language: "fr" | "en",
  answers: Record<string, string> | null = null,
): Promise<AnalyzeResponse> {
  const request = () =>
    fetch(`${baseUrl}/api/designs/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description, language, answers }),
    });
  let response = await request();
  if (response.status === 503) {
    const alternate = await detectApiBaseUrl();
    if (alternate && alternate !== baseUrl) {
      response = await fetch(`${alternate}/api/designs/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, language, answers }),
      });
    }
  }
  if (!response.ok) {
    let detail = "";
    try {
      const payload = (await response.json()) as { detail?: string };
      detail = payload.detail ?? "";
    } catch {
      detail = "";
    }
    const error = new Error(detail || "analysis_failed");
    error.name = response.status === 503 || response.status === 404
      ? "meta_not_connected"
      : "analysis_failed";
    throw error;
  }
  return (await response.json()) as AnalyzeResponse;
}

export async function generateDesign(
  baseUrl: string,
  spec: DesignSpec,
): Promise<GenerateResult> {
  const response = await fetch(`${baseUrl}/api/designs/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ spec }),
  });
  if (!response.ok) throw new Error("generation_failed");
  return (await response.json()) as GenerateResult;
}
