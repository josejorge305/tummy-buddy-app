import {
  AnalyzeDishResponse,
  DishOrganFlags,
  DishSummary,
  NutritionInsights,
} from "../../api/api";
import type { AllergenFlag, FodmapFlag, LactoseFlag } from "../../api/api";

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
  nutritionSource?: string | null;
  nutritionSourceLabel?: string | null;
  portionVision?: {
    factor: number;
    confidence: number;
    source: string;
    reason: string;
    hasImage: boolean;
  } | null;
  portion?: {
    manualFactor: number;
    aiFactor: number;
    effectiveFactor: number;
  } | null;
  plateComponents?: PlateComponentVM[];
  plateComponentsSummary?: string;
  componentAllergens?: ComponentAllergenVM[];
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
  { key: "eyes", label: "Eyes" },
  { key: "skin", label: "Skin" },
  { key: "bones", label: "Bones" },
  { key: "thyroid", label: "Thyroid" },
];

const LIFESTYLE_TAG_LABELS: Record<string, string> = {
  contains_red_meat: "Red meat",
  processed_meat: "Processed meat",
  contains_poultry: "Poultry",
  contains_pork: "Pork",
  contains_fish: "Fish",
  contains_shellfish: "Shellfish",
  high_sugar_dessert: "High-sugar dessert",
  comfort_food: "Comfort food",
  plant_forward: "Plant-forward",
};

const PRIORITY_LIFESTYLE_LABELS: string[] = [
  "Red meat",
  "Processed meat",
  "Comfort food",
  "High-sugar dessert",
  "Plant-forward",
  "Poultry",
  "Pork",
  "Fish",
  "Shellfish",
];

type PlateComponentVM = {
  component: string;
  role: string;
  category: string;
  shareRatio: number;
  energyKcal?: number;
  protein_g?: number;
  fat_g?: number;
  carbs_g?: number;
  sugar_g?: number;
  fiber_g?: number;
  sodium_mg?: number;
};

type AllergenPill = { name: string; kind?: string; isUserAllergen: boolean; present?: string };

type ComponentAllergenVM = {
  component: string;
  role: string;
  category: string;
  allergenPills: AllergenPill[];
  fodmapLevel?: string;
  lactoseLevel?: string;
};

function mapNutritionSourceToLabel(source: string | null | undefined): string | null {
  if (!source) return null;

  if (source === "restaurant_kcal_only") {
    return "Calories from restaurant label (kcal only).";
  }
  if (source.includes("restaurant_kcal")) {
    return "Calories aligned with restaurant label; macros estimated from recipe.";
  }
  if (source === "recipe_out" || source === "recipe_legacy") {
    return "Estimated from recipe provider.";
  }
  if (source === "edamam_totalNutrients" || source === "edamam_manual") {
    return "Estimated from recipe nutrition database.";
  }
  if (source === "enriched_ingredients_parsed" || source === "enriched_normalized_items") {
    return "Estimated from ingredient-level analysis.";
  }
  if (source === "usda") {
    return "Estimated from USDA nutrition database.";
  }

  return "Estimated from recipe and ingredient analysis.";
}

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

function mapOrganLevelToSeverity(level: string | undefined): OrganSeverity {
  if (!level) return "neutral";
  const l = level.toLowerCase();
  // Handle both negative and positive severity levels
  if (l.includes("high") || l.includes("severe")) return "high";
  if (l.includes("moderate")) return "medium";
  if (l.includes("mild")) return "low";
  return "neutral";
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
  const selectionDefault: any = (analysis as any)?.selection_default;
  const combinedFromSelection: AllergenFlag[] | undefined =
    selectionDefault && Array.isArray(selectionDefault.combined_allergens)
      ? (selectionDefault.combined_allergens as AllergenFlag[])
      : undefined;

  if (combinedFromSelection && combinedFromSelection.length > 0) {
    return combinedFromSelection;
  }

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
  const selectionDefault: any = (analysis as any)?.selection_default;
  if (selectionDefault && selectionDefault.combined_fodmap) {
    return selectionDefault.combined_fodmap as FodmapFlag;
  }
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

function buildAllergenPillsFromFlags(
  flags: AllergenFlag[],
  matchesUserAllergen: (name: string) => boolean,
): AllergenPill[] {
  const pills: AllergenPill[] = [];
  for (const flag of flags) {
    const present = (flag.present || "").toLowerCase();
    if (present !== "yes" && present !== "maybe") continue;
    const label = flag.kind || "";
    if (!label) continue;
    pills.push({
      name: label,
      kind: flag.kind,
      isUserAllergen: matchesUserAllergen(flag.kind),
      present: flag.present,
    });
  }
  const seen = new Set<string>();
  const deduped: AllergenPill[] = [];
  for (const pill of pills) {
    if (!pill || typeof pill.name !== "string") continue;
    if (seen.has(pill.name)) continue;
    seen.add(pill.name);
    deduped.push(pill);
  }
  return deduped;
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
  let dietTags: any[] = Array.isArray(summary?.edamamLabels) ? summary?.edamamLabels : [];
  const selectionDefault: any = (analysis as any)?.selection_default || null;
  const selectionComponents: Record<string, any> | null =
    ((analysis as any)?.selection_components as Record<string, any> | null) || null;

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

  const debugAny: any = (analysis as any)?.debug || {};
  const rawPortionVision: any = debugAny?.portion_vision || null;
  let portionVision: DishViewModel["portionVision"] = null;
  if (rawPortionVision && rawPortionVision.ok) {
    portionVision = {
      factor:
        typeof rawPortionVision.portionFactor === "number"
          ? rawPortionVision.portionFactor
          : 1,
      confidence:
        typeof rawPortionVision.confidence === "number"
          ? rawPortionVision.confidence
          : 0,
      source:
        typeof rawPortionVision.source === "string"
          ? rawPortionVision.source
          : "unknown",
      reason:
        typeof rawPortionVision.reason === "string" ? rawPortionVision.reason : "",
      hasImage: !!(rawPortionVision.input && rawPortionVision.input.hasImage),
    };
  }

  const analysisAny: any = (analysis as any)?.analysis || (analysis as any)?.result || (analysis as any);
  const rawPortionBlock: any = (analysisAny && analysisAny.portion) || (analysis as any)?.portion || null;
  let portion: DishViewModel["portion"] = null;
  if (rawPortionBlock) {
    const manual =
      typeof rawPortionBlock.manual_factor === "number" && Number.isFinite(rawPortionBlock.manual_factor)
        ? rawPortionBlock.manual_factor
        : 1;
    const ai =
      typeof rawPortionBlock.ai_factor === "number" && Number.isFinite(rawPortionBlock.ai_factor)
        ? rawPortionBlock.ai_factor
        : 1;
    const eff =
      typeof rawPortionBlock.effective_factor === "number" &&
      Number.isFinite(rawPortionBlock.effective_factor)
        ? rawPortionBlock.effective_factor
        : manual * ai;
    portion = {
      manualFactor: manual,
      aiFactor: ai,
      effectiveFactor: eff,
    };
  }

  const plateComponentsRaw = (analysis as any)?.plate_components || [];
  const nutritionBreakdownRaw = (analysis as any)?.nutrition_breakdown || [];
  const allergenBreakdownRaw = (analysis as any)?.allergen_breakdown || [];
  let plateComponents: PlateComponentVM[] | undefined;
  let plateComponentsSummary: string | undefined;

  if (Array.isArray(plateComponentsRaw) && plateComponentsRaw.length > 0) {
    plateComponents = plateComponentsRaw.map((comp: any, idx: number) => {
      const componentId = typeof comp?.component_id === "string" ? comp.component_id : undefined;
      let breakdown: any = null;

      if (selectionComponents && componentId && selectionComponents[componentId]) {
        const sel = selectionComponents[componentId];
        if (Array.isArray(sel?.nutrition) && sel.nutrition.length > 0) {
          breakdown = sel.nutrition[0];
        } else if (sel?.combined_nutrition) {
          breakdown = { ...sel.combined_nutrition };
        }
      }

      if (!breakdown && Array.isArray(nutritionBreakdownRaw)) {
        breakdown = nutritionBreakdownRaw[idx] || null;
      }

      const shareRatio =
        typeof breakdown?.share_ratio === "number" && breakdown.share_ratio > 0
          ? breakdown.share_ratio
          : typeof comp?.area_ratio === "number" && comp.area_ratio > 0
          ? comp.area_ratio
          : 0;

      const baseLabel =
        (comp && (comp.label || comp.component || comp.name)) ||
        (breakdown && (breakdown.component || breakdown.name)) ||
        `Component ${idx + 1}`;

      return {
        component: baseLabel,
        role: (comp && comp.role) || (breakdown && breakdown.role) || "unknown",
        category: (comp && comp.category) || (breakdown && breakdown.category) || "other",
        shareRatio,
        energyKcal:
          typeof breakdown?.energyKcal === "number" ? breakdown.energyKcal : undefined,
        protein_g:
          typeof breakdown?.protein_g === "number" ? breakdown.protein_g : undefined,
        fat_g: typeof breakdown?.fat_g === "number" ? breakdown.fat_g : undefined,
        carbs_g:
          typeof breakdown?.carbs_g === "number" ? breakdown.carbs_g : undefined,
        sugar_g:
          typeof breakdown?.sugar_g === "number" ? breakdown.sugar_g : undefined,
        fiber_g:
          typeof breakdown?.fiber_g === "number" ? breakdown.fiber_g : undefined,
        sodium_mg:
          typeof breakdown?.sodium_mg === "number" ? breakdown.sodium_mg : undefined,
      };
    });

    const summaryParts = plateComponents.map((pc) => {
      const label = pc.component || "Component";
      const roleSuffix =
        pc.role && pc.role !== "unknown" ? ` (${pc.role.toLowerCase()})` : "";
      return `${label}${roleSuffix}`;
    });
    plateComponentsSummary = summaryParts.join(" + ");
  }

  // 1. Allergens: prefer LLM flags, fallback to legacy
  const allergenFlags = chooseAllergenFlags(analysis, summary, flags);
  const matchesUserAllergen = buildUserAllergenMatcher(userAllergens);
  let allergenPills: AllergenPill[] = [];

  if (allergenFlags.length > 0) {
    allergenPills = buildAllergenPillsFromFlags(allergenFlags, matchesUserAllergen);
  } else {
    // Legacy fallback to summary.keyFlags
    const allergenNames = summary?.keyFlags?.allergens ?? [];
    allergenPills = allergenNames.map((name) => ({
      name,
      kind: name,
      isUserAllergen: matchesUserAllergen(name),
      present: "yes",
    }));
  }

  // Lactose pill when high and user cares about milk/dairy
  const selectionLactose: LactoseFlag | null =
    (analysis as any)?.lactose_flags ||
    (selectionDefault && selectionDefault.combined_lactose) ||
    null;
  const caresAboutMilk = userAllergens.map((a) => a.toLowerCase()).includes("milk");
  if (selectionLactose && selectionLactose.level === "high" && caresAboutMilk) {
    allergenPills.push({
      name: "High lactose",
      isUserAllergen: true,
    });
  }

  // Build per-component allergens/FODMAP/lactose from selection_components.
  // Always emit an entry for each plate component; if the backend reports none,
  // allergenPills stays empty (no fallback to whole-plate).
  const componentAllergens: ComponentAllergenVM[] | undefined = Array.isArray(plateComponentsRaw)
    ? plateComponentsRaw.map((comp: any, idx: number) => {
        const componentId = typeof comp?.component_id === "string" ? comp.component_id : undefined;
        const sel = componentId ? selectionComponents?.[componentId] : null;

        const flags: AllergenFlag[] = Array.isArray(sel?.combined_allergens)
          ? (sel.combined_allergens as AllergenFlag[])
          : [];

        const entryFodmapLevel =
          sel && sel.combined_fodmap && sel.combined_fodmap.level
            ? String(sel.combined_fodmap.level)
            : undefined;

        const entryLactoseLevel =
          sel && sel.combined_lactose && sel.combined_lactose.level
            ? String(sel.combined_lactose.level)
            : undefined;

        const vmBase = plateComponents?.[idx];

        const componentLabel =
          (comp && (comp.label || comp.component || comp.name)) ||
          vmBase?.component ||
          `Component ${idx + 1}`;
        const role = (comp && comp.role) || vmBase?.role || "unknown";
        const category = (comp && comp.category) || vmBase?.category || "other";

        return {
          component: componentLabel,
          role,
          category,
          allergenPills: buildAllergenPillsFromFlags(flags, matchesUserAllergen),
          fodmapLevel: entryFodmapLevel,
          lactoseLevel: entryLactoseLevel,
        };
      })
    : undefined;

  // Allergen smart sentence from organs.flags.allergens if present
  let allergenSentence: string | null = null;
  if (allergenFlags.length > 0) {
    const contains: string[] = [];
    const mayContain: string[] = [];
    for (const flag of allergenFlags) {
      const label = flag.kind;
      if (!label) continue;
      const present = (flag.present || "").toLowerCase();
      if (present === "yes") contains.push(label);
      else if (present === "maybe") mayContain.push(label);
    }
    const parts: string[] = [];
    if (contains.length) parts.push(`Contains ${contains.join(", ")}.`);
    if (mayContain.length)
      parts.push(`May contain ${mayContain.join(", ")} based on recipe ingredients.`);
    allergenSentence = parts.join(" ").trim() || null;
  }
  if (!allergenSentence && flags?.allergens && flags.allergens.length > 0) {
    const msgs = flags.allergens.map((a) => a?.message).filter(Boolean) as string[];
    if (msgs.length > 0) {
      allergenSentence = msgs.join(" ");
    }
  }
  if (!allergenSentence && allergenPills.length > 0) {
    allergenSentence = `Contains ${allergenPills.map((a) => a.name).join(", ")}.`;
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
  const rawOrganMap = new Map<string, { score: number | null; level: string | null; reasons: string[] }>();
  for (const o of rawOrgansArray) {
    const key = (o as any).organ ? String((o as any).organ).toLowerCase() : "";
    if (!key) continue;
    const reasons = Array.isArray((o as any).reasons) ? (o as any).reasons : [];
    const score = typeof (o as any).score === "number" ? (o as any).score : null;
    const level = (o as any).level ? String((o as any).level) : null;
    rawOrganMap.set(key, { score, level, reasons });
  }

  // 3. Organ lines - always return all canonical organs
  const organLines: DishOrganLine[] = CANONICAL_ORGANS.map(({ key, label }) => {
    const llmEntry = rawOrganMap.get(key);
    const summaryEntry = summaryOrganMap.get(key) || { score: null, levelRaw: "neutral" };
    const score = llmEntry?.score ?? summaryEntry.score;
    const levelRaw = llmEntry?.level ?? summaryEntry.levelRaw;
    const severity = llmEntry ? mapOrganLevelToSeverity(llmEntry.level || undefined) : severityFromLevel(levelRaw);

    const llmReasons = llmEntry?.reasons ?? [];
    const llmSentence = llmReasons.length ? llmReasons[0] : null;
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

  // 4. Nutrition – prefer selection_default.combined_nutrition, fallback to legacy nutrition_summary
  const ns =
    (selectionDefault && selectionDefault.combined_nutrition) ||
    analysis.nutrition_summary ||
    null;
  let nutrition: any = null;
  if (ns) {
    nutrition = {
      calories: ns.energyKcal ?? null,
      protein: ns.protein_g ?? null,
      carbs: ns.carbs_g ?? null,
      fat: ns.fat_g ?? null,
      sugar: ns.sugar_g ?? null,
      fiber: ns.fiber_g ?? null,
      sodium: ns.sodium_mg ?? null,
    };
  }

  // 5. Diet & lifestyle tags: start with Edamam labels, then merge LLM lifestyle tags/checks
  const lifestyleTags = analysis.lifestyle_tags || [];
  const lifestyleChecks = analysis.lifestyle_checks || null;

  const removeTag = (labelToRemove: string) => {
    dietTags = dietTags.filter((t) => {
      const tagLabel = typeof t === "string" ? t : t?.label;
      return tagLabel !== labelToRemove;
    });
  };

  const ensureTag = (labelToAdd: string) => {
    const exists = dietTags.some((t) => {
      const tagLabel = typeof t === "string" ? t : t?.label;
      return tagLabel === labelToAdd;
    });
    if (!exists) {
      if (dietTags.length === 0 || typeof dietTags[0] === "string") {
        dietTags.push(labelToAdd);
      } else {
        dietTags.push({ label: labelToAdd });
      }
    }
  };

  if (lifestyleChecks) {
    const { contains_red_meat, vegetarian, vegan } = lifestyleChecks;

    if (contains_red_meat === "yes") {
      removeTag("Vegetarian");
      removeTag("Vegan");
      removeTag("Red meat free");
    }

    if (vegetarian === "yes") {
      ensureTag("Vegetarian");
    }
    if (vegan === "yes") {
      ensureTag("Vegan");
    }
  }

  for (const code of lifestyleTags) {
    const label = LIFESTYLE_TAG_LABELS[code];
    if (!label) continue;
    const exists = dietTags.some((t) => {
      const tagLabel = typeof t === "string" ? t : t?.label;
      return tagLabel === label;
    });
    if (!exists) {
      if (dietTags.length === 0 || typeof dietTags[0] === "string") {
        dietTags.push(label);
      } else {
        dietTags.push({ label });
      }
    }
  }

  if (Array.isArray(dietTags) && dietTags.length > 0) {
    const getLabel = (t: any) => (typeof t === "string" ? t : t?.label);
    dietTags.sort((a: any, b: any) => {
      const aLabel = getLabel(a);
      const bLabel = getLabel(b);
      const aIndex = PRIORITY_LIFESTYLE_LABELS.indexOf(aLabel);
      const bIndex = PRIORITY_LIFESTYLE_LABELS.indexOf(bLabel);
      const aPriority = aIndex === -1 ? Number.POSITIVE_INFINITY : aIndex;
      const bPriority = bIndex === -1 ? Number.POSITIVE_INFINITY : bIndex;
      if (aPriority !== bPriority) return aPriority - bPriority;
      return 0;
    });
  }

  if (plateComponentsSummary) {
    if (allergenSentence) {
      allergenSentence = allergenSentence.trim().endsWith(".")
        ? `${allergenSentence} This analysis considers the whole plate, including: ${plateComponentsSummary}.`
        : `${allergenSentence}. This analysis considers the whole plate, including: ${plateComponentsSummary}.`;
    }
    if (fodmapSentence) {
      fodmapSentence = fodmapSentence.trim().endsWith(".")
        ? `${fodmapSentence} This analysis considers the whole plate, including: ${plateComponentsSummary}.`
        : `${fodmapSentence}. This analysis considers the whole plate, including: ${plateComponentsSummary}.`;
    }
  }

  return {
    allergens: allergenPills,
    allergenSentence,
    fodmapPills,
    fodmapLevel,
    fodmapSentence,
    organLines,
    nutrition,
    dietTags,
    nutritionInsights: analysis.nutrition_insights || null,
    nutritionSource: (analysis as any)?.nutrition_source || null,
    nutritionSourceLabel: mapNutritionSourceToLabel((analysis as any)?.nutrition_source || null),
    portionVision,
    portion,
    plateComponents,
    plateComponentsSummary,
    componentAllergens,
  };
}
