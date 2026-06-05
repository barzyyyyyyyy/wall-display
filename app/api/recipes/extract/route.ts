import { NextResponse } from "next/server";
import { callGemini, type GeminiPart } from "@/lib/gemini";
import type { ExtractedRecipe } from "@/lib/recipes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PROMPT = `You are extracting a recipe. Accuracy is CRITICAL — wrong measurements can ruin the food.

Return ONLY this JSON object (no markdown fences, no commentary):

{"name":"...","ingredients":["..."],"instructions":["..."],"time":null,"servings":null}

ABSOLUTE RULES:
- Copy ingredients with EXACT quantities and units (e.g. "2 כוסות קמח", "1/2 כפית מלח").
- Include EVERY ingredient — don't skip salt, oil, water, garnishes.
- Each instruction is one ordered step. Don't combine or summarize.
- Preserve the original language (likely Hebrew).
- If multiple recipes are present, extract ONLY the main/featured one.
- "time" and "servings" are optional strings — null if not mentioned.
- If no recipe is found, return {"error":"no recipe found"}.`;

// ---------- JSON-LD parsing (works on most major recipe sites) ----------

type LdRecipe = {
  name?: string;
  recipeIngredient?: string[];
  recipeInstructions?:
    | string
    | Array<string | { text?: string; name?: string }>;
  totalTime?: string;
  recipeYield?: string | number;
};

function findRecipeInLd(obj: unknown): LdRecipe | null {
  if (!obj) return null;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const r = findRecipeInLd(item);
      if (r) return r;
    }
    return null;
  }
  if (typeof obj === "object") {
    const o = obj as Record<string, unknown>;
    const t = o["@type"];
    if (
      t === "Recipe" ||
      (Array.isArray(t) && (t as unknown[]).includes("Recipe"))
    ) {
      return o as LdRecipe;
    }
    if (o["@graph"]) return findRecipeInLd(o["@graph"]);
    for (const k of Object.keys(o)) {
      const r = findRecipeInLd(o[k]);
      if (r) return r;
    }
  }
  return null;
}

function parseLdInstructions(raw: LdRecipe["recipeInstructions"]): string[] {
  if (!raw) return [];
  if (typeof raw === "string") {
    return raw
      .split(/\n+|\.\s+(?=[A-Zא-ת])/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  if (Array.isArray(raw)) {
    return raw
      .map((s) => {
        if (typeof s === "string") return s.trim();
        if (s && typeof s === "object") return (s.text ?? s.name ?? "").trim();
        return "";
      })
      .filter((s) => s.length > 0);
  }
  return [];
}

function extractJsonLdRecipe(html: string, sourceUrl: string): ExtractedRecipe | null {
  const matches = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const m of matches) {
    try {
      const json = JSON.parse(m[1]);
      const r = findRecipeInLd(json);
      if (r && r.name && (r.recipeIngredient?.length || r.recipeInstructions)) {
        return {
          name: String(r.name).trim(),
          ingredients: (r.recipeIngredient ?? [])
            .map((s) => String(s).trim())
            .filter(Boolean),
          instructions: parseLdInstructions(r.recipeInstructions),
          time: r.totalTime ? String(r.totalTime) : undefined,
          servings: r.recipeYield ? String(r.recipeYield) : undefined,
          sourceUrl,
        };
      }
    } catch {
      /* not valid JSON, continue */
    }
  }
  return null;
}

// ---------- Fetch + strip HTML ----------

async function fetchPageText(url: string): Promise<{ html: string; text: string }> {
  const res = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
      accept: "text/html,application/xhtml+xml",
      "accept-language": "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7",
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#?\w+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return { html, text: text.slice(0, 30_000) };
}

// ---------- Gemini fallback (uses shared lib/gemini.ts) ----------

function parseGeminiJson(text: string): Record<string, unknown> | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter((s) => s.length > 0);
}

function asOptString(v: unknown): string | undefined {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "number") return String(v);
  return undefined;
}

// ---------- Handler ----------

export async function POST(req: Request) {
  let body: {
    type?: "url" | "image";
    url?: string;
    image?: string;
    mimeType?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid json" },
      { status: 400 },
    );
  }

  try {
    if (body.type === "url") {
      const url = body.url?.trim();
      if (!url || !/^https?:\/\//i.test(url)) {
        return NextResponse.json(
          { ok: false, error: "צריך כתובת URL תקינה" },
          { status: 400 },
        );
      }

      let pageText = "";
      try {
        const fetched = await fetchPageText(url);
        // First try the structured JSON-LD path — perfect accuracy when available.
        const ld = extractJsonLdRecipe(fetched.html, url);
        if (ld && ld.ingredients.length > 0 && ld.instructions.length > 0) {
          return NextResponse.json({ ok: true, recipe: ld });
        }
        pageText = fetched.text;
      } catch (e) {
        return NextResponse.json(
          {
            ok: false,
            error: `לא הצלחתי לטעון את הדף: ${
              e instanceof Error ? e.message : "unknown"
            }`,
          },
          { status: 500 },
        );
      }

      if (!pageText) {
        return NextResponse.json(
          { ok: false, error: "הדף ריק או חסום" },
          { status: 500 },
        );
      }

      const text = await callGemini([
        { text: `${PROMPT}\n\nWebpage text:\n${pageText}` },
      ]);
      const parsed = parseGeminiJson(text);
      if (!parsed) {
        return NextResponse.json(
          {
            ok: false,
            error: "Could not parse recipe from page",
            raw: text.slice(0, 300),
          },
          { status: 500 },
        );
      }
      if (parsed.error) {
        return NextResponse.json(
          { ok: false, error: String(parsed.error) },
          { status: 422 },
        );
      }
      const recipe: ExtractedRecipe = {
        name: asOptString(parsed.name) ?? "",
        ingredients: asStringArray(parsed.ingredients),
        instructions: asStringArray(parsed.instructions),
        time: asOptString(parsed.time),
        servings: asOptString(parsed.servings),
        sourceUrl: url,
      };
      if (!recipe.name || recipe.ingredients.length === 0) {
        return NextResponse.json(
          { ok: false, error: "המתכון לא זוהה במלואו" },
          { status: 422 },
        );
      }
      return NextResponse.json({ ok: true, recipe });
    }

    if (body.type === "image") {
      const image = body.image?.trim();
      const mimeType = body.mimeType || "image/jpeg";
      if (!image) {
        return NextResponse.json(
          { ok: false, error: "missing image" },
          { status: 400 },
        );
      }
      const text = await callGemini([
        { text: PROMPT },
        { inline_data: { mime_type: mimeType, data: image } },
      ]);
      const parsed = parseGeminiJson(text);
      if (!parsed) {
        return NextResponse.json(
          {
            ok: false,
            error: "Could not parse recipe from image",
            raw: text.slice(0, 300),
          },
          { status: 500 },
        );
      }
      if (parsed.error) {
        return NextResponse.json(
          { ok: false, error: String(parsed.error) },
          { status: 422 },
        );
      }
      const recipe: ExtractedRecipe = {
        name: asOptString(parsed.name) ?? "",
        ingredients: asStringArray(parsed.ingredients),
        instructions: asStringArray(parsed.instructions),
        time: asOptString(parsed.time),
        servings: asOptString(parsed.servings),
      };
      if (!recipe.name || recipe.ingredients.length === 0) {
        return NextResponse.json(
          { ok: false, error: "המתכון לא זוהה במלואו" },
          { status: 422 },
        );
      }
      return NextResponse.json({ ok: true, recipe });
    }

    return NextResponse.json(
      { ok: false, error: "missing or invalid 'type' (use 'url' or 'image')" },
      { status: 400 },
    );
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "unknown" },
      { status: 500 },
    );
  }
}
