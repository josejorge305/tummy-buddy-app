import {
  AnalyzeDishResponse,
  DishOrganFlags,
  DishSummary,
  NutritionInsights,
} from "../../api/api";
import type { AllergenFlag, FodmapFlag } from "../../api/api";

export interface DishOrganLine {
  organKey: string;
  organLabel: string;
  score: number | null;
  levelRaw: string | null;
  severity: "low" | "medium" | "high" | "neutral";
  sentence: string | null;
}

export interface DishViewModel {
  allergens: { name: string; isUserAllergen: boolean }[];
  allergenSentence: string | null;
  fodmapPills: string[];
  fodmapLevel: string | null;
  fodmapSentence: string | null;
  organLines: DishOrganLine[];
  nutrition: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    sugar?: number;
    fiber?: number;
    sodium?: number;
  };
  dietTags?: string[];
  nutritionInsights?: NutritionInsights | null;
}

type OrganSeverity = "low" | "medium" | "high" | "neutral";

const CANONICAL_ORGANS: { key: string; label: string }[] = [
  { key: "gut", label: "Gut" },
  { key: "liver", label: "Liver" },
  { key: "heart", label: "Heart" },
  { key: "metabolic", label: "Metabolic" },
  { key: "immune", label: "Immune" },
  { key: "brain", label: "Brain" },
  { key: "kidney", label: "Kidney" },
];

function buildUserAllergenMatcher(userAllergens: string[]) {
  const lower = userAllergens.map((a) => a.toLowerCase());

  return (hitName: string) => {
    const h = hitName.toLowerCase();

    if (lower.includes(h)) return true;

    if (h === "milk" && lower.includes("dairy")) return true;
    if (h === "dairy" && lower.includes("milk")) return true;

    if (h === "peanut" && lower.includes("peanuts")) return true;
    if (h === "peanuts" && lower.includes("peanut")) return true;

    if (h === "tree nut" && lower.includes("tree nuts")) return true;
    if (h === "tree nuts" && lower.includes("tree nut")) return true;

    if (h === "gluten" && lower.includes("wheat")) return true;
    if (h === "wheat" && lower.includes("gluten")) return true;

    return false;
  };
}

function severityFromLevel(levelRaw?: string | null): OrganSeverity {
  const l = (levelRaw || "").toLowerCase();
  if (!l || l === "neutral") return "neutral";
  if (l.includes("high")) return "high";
  if (l.includes("mild") || l.includes("medium")) return "medium";
  return "neutral";
}

function organSentence(organ: string, score: number | null, severity: OrganSeverity): string {
  const o = organ.toLowerCase();
  if (score == null) {
    return `Neutral impact on your ${o}.`;
  }

  const negative = score < 0;
  const positive = score > 0;

  if (negative) {
    if (severity === "high") {
      return `May strongly stress your ${o}, based on ingredients linked to that organ.`;
    }
    if (severity === "medium") {
      return `May put extra load on your ${o}.`;
    }
    return `Slightly increased load on your ${o}.`;
  }

  if (positive) {
    if (severity === "high") {
      return `May be particularly supportive for your ${o}.`;
    }
    if (severity === "medium") {
      return `May offer some support for your ${o}.`;
    }
    return `Mildly supportive for your ${o}.`;
  }

  return `Neutral impact on your ${o}.`;
}

function legacyAllergenFlags(
  summary: DishSummary | null | undefined,
  flags: DishOrganFlags | undefined
): AllergenFlag[] {
  const allergenNames = summary?.keyFlags?.allergens ?? [];
  const msgs =
    flags?.allergens && flags.allergens.length > 0
      ? (flags.allergens.map((a) => a?.message).filter(Boolean) as string[])
      : [];

  return allergenNames.map((name) => ({
    kind: name,
    present: "yes",
    message: msgs.join(" ") || "",
    source: "legacy",
  }));
}

function chooseAllergenFlags(
  analysis: AnalyzeDishResponse,
  summary: DishSummary | null | undefined,
  flags: DishOrganFlags | undefined
): AllergenFlag[] {
  if (analysis.allergen_flags && analysis.allergen_flags.length > 0) {
    return analysis.allergen_flags;
  }
  return legacyAllergenFlags(summary, flags);
}

function chooseFodmapFlag(
  analysis: AnalyzeDishResponse,
  flags: DishOrganFlags | undefined,
  summary: DishSummary | null | undefined
): FodmapFlag | undefined {
  if (analysis.fodmap_flags) return analysis.fodmap_flags;
  if (flags?.fodmap) return flags.fodmap as FodmapFlag;
  if (summary?.keyFlags?.fodmapLevel) {
    return {
      level: summary.keyFlags.fodmapLevel as FodmapFlag["level"],
      reason: "",
      source: "legacy",
    };
  }
  return undefined;
}

export function buildDishViewModel(
  analysis: AnalyzeDishResponse,
  userAllergens: string[]
): DishViewModel {
  const summary: DishSummary | null | undefined = analysis.summary ?? null;
  const organsBlock = analysis.organs;
  const flags: DishOrganFlags | undefined = organsBlock?.flags;
  const lexDebug = (analysis.debug as any)?.lex_per_ingredient;
  const perIngredients = Array.isArray(lexDebug?.perIngredient) ? lexDebug.perIngredient : [];
  const dietTags = Array.isArray(summary?.edamamLabels) ? summary?.edamamLabels : [];

  const fodmapTriggerSet = new Set<string>();
  for (const entry of perIngredients) {
    const ingredientName = entry?.ingredient;
    if (!ingredientName) continue;
    const hits = Array.isArray(entry?.hits) ? entry.hits : [];
    const hasFodmapHit = hits.some((h: any) => !!h?.fodmap);
    if (hasFodmapHit) {
      fodmapTriggerSet.add(String(ingredientName));
    }
  }
  const fodmapPills = Array.from(fodmapTriggerSet);

  // 1. Allergens: prefer LLM flags, fallback to legacy
  const allergenFlags = chooseAllergenFlags(analysis, summary, flags);
  const matchesUserAllergen = buildUserAllergenMatcher(userAllergens);
  const allergens = allergenFlags
    .filter((flag) => (flag.present || "").toLowerCase() === "yes")
    .map((flag) => ({
      name: flag.kind,
      isUserAllergen: matchesUserAllergen(flag.kind),
    }));

  // Lactose pill when high and user cares about milk/dairy
  const lactose = analysis.lactose_flags;
  const caresAboutMilk = userAllergens.map((a) => a.toLowerCase()).includes("milk");
  if (lactose && lactose.level === "high" && caresAboutMilk) {
    allergens.push({
      name: "High lactose",
      isUserAllergen: true,
    });
  }

  // Allergen smart sentence from organs.flags.allergens if present
  let allergenSentence: string | null = null;
  if (flags?.allergens && flags.allergens.length > 0) {
    const msgs = flags.allergens.map((a) => a?.message).filter(Boolean) as string[];
    if (msgs.length > 0) {
      allergenSentence = msgs.join(" ");
    }
  }
  if (!allergenSentence && allergens.length > 0) {
    allergenSentence = `Contains ${allergens.map((a) => a.name).join(", ")}.`;
  }

  // 2. FODMAP (prefer LLM flag, fallback to legacy)
  const fodmapFlag = chooseFodmapFlag(analysis, flags, summary);
  const fodmapLevel = fodmapFlag?.level ?? null;
  let fodmapSentence: string | null = fodmapFlag?.reason ?? null;
  if (!fodmapSentence && fodmapLevel) {
    fodmapSentence = `FODMAP level ${fodmapLevel.toLowerCase()}.`;
  }

  const summaryOrgans = Array.isArray(summary?.organs) ? summary!.organs : [];
  const summaryOrganMap = new Map<string, { score: number | null; levelRaw: string | null }>();
  for (const o of summaryOrgans) {
    const key = (o.organ ?? "").toLowerCase();
    if (!key) continue;
    summaryOrganMap.set(key, { score: o.score ?? null, levelRaw: o.level ?? null });
  }
  const rawOrgansArray = Array.isArray(analysis.organs?.organs)
    ? analysis.organs!.organs
    : [];
  const rawOrganMap = new Map<string, { reasons: string[] }>();
  for (const o of rawOrgansArray) {
    const key = (o as any).organ ? String((o as any).organ).toLowerCase() : "";
    if (!key) continue;
    const reasons = Array.isArray((o as any).reasons) ? (o as any).reasons : [];
    rawOrganMap.set(key, { reasons });
  }

  // 3. Organ lines - always return all canonical organs
  const organLines: DishOrganLine[] = CANONICAL_ORGANS.map(({ key, label }) => {
    const entry = summaryOrganMap.get(key) || { score: null, levelRaw: "neutral" };
    const score = entry.score;
    const levelRaw = entry.levelRaw;
    const severity = severityFromLevel(levelRaw);

    const llmReasons = rawOrganMap.get(key)?.reasons ?? [];
    const llmSentence = llmReasons.length ? llmReasons.join(" ") : null;
    const fallbackSentence = organSentence(label.toLowerCase(), score, severity);
    const sentence = llmSentence || fallbackSentence;

    return {
      organKey: key,
      organLabel: label,
      score,
      levelRaw,
      severity,
      sentence,
    };
  });

  // 4. Nutrition – prefer top-level analysis.nutrition_summary,
  // then recipe.nutrition_summary, then recipe.out.nutrition_summary.
  const ns =
    (analysis as any)?.nutrition_summary ||
    (analysis.recipe as any)?.nutrition_summary ||
    (analysis.recipe as any)?.out?.nutrition_summary ||
    {};
  const nutrition = {
    calories: ns.energyKcal,
    protein: ns.protein_g,
    carbs: ns.carbs_g,
    fat: ns.fat_g,
    sugar: ns.sugar_g,
    fiber: ns.fiber_g,
    sodium: ns.sodium_mg,
  };

  return {
    allergens,
    allergenSentence,
    fodmapPills,
    fodmapLevel,
    fodmapSentence,
    organLines,
    nutrition,
    dietTags,
    nutritionInsights: analysis.nutrition_insights || null,
  };
}
