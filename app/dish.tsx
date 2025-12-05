import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { analyzeDish, AnalyzeDishResponse } from '../api/api';
import BrainIcon from '../assets/images/brain_icon.png';
import GutIcon from '../assets/images/Gut_icon.png';
import HeartIcon from '../assets/images/heart_icon.png';
import ImmuneIcon from '../assets/images/Inmune_Icon.png';
import KidneyIcon from '../assets/images/kidney_icon.png';
import LiverIcon from '../assets/images/Liver_icon.png';
import MetabolicIcon from '../assets/images/Metabolic_Icon.png';
import { buildDishViewModel } from './utils/dishViewModel';
import { useUserPrefs } from '../context/UserPrefsContext';

const TB_SAFE_BG = 'rgba(0, 200, 160, 0.16)';
const TB_SAFE_BORDER = '#00C8A0';
const TB_SAFE_CHIP_BG = '#00C8A0';
const TB_SAFE_CHIP_TEXT = '#FFFFFF';

const TB_CAUTION_BG = 'rgba(255, 193, 79, 0.16)';
const TB_CAUTION_BORDER = '#FFC34F';
const TB_CAUTION_CHIP_BG = '#FFC34F';
const TB_CAUTION_CHIP_TEXT = '#2B1900';

const TB_UNSAFE_BG = 'rgba(255, 119, 119, 0.18)';
const TB_UNSAFE_BORDER = '#FF7777';
const TB_UNSAFE_CHIP_BG = '#FF4E4E';
const TB_UNSAFE_CHIP_TEXT = '#3A0606';

type RecipeFormatterInput = {
  dishName?: string;
  ingredients?: any[] | null;
  steps?: any[] | null;
  description?: string | null;
  estimatedServingSize?: string | number | null;
  servingUnit?: string | null;
};

function cleanText(value: string) {
  return value
    .replace(/\s+/g, ' ')
    .replace(/undefined|null/gi, '')
    .replace(/\s+$/g, '')
    .trim();
}

function normalizeIngredient(ing: any) {
  if (!ing) return '';
  if (typeof ing === 'string') {
    return cleanText(ing.replace(/to taste|as needed/gi, '').trim());
  }

  const qty = ing.quantity ?? ing.qty ?? ing.amount ?? ing.count ?? '';
  const unit = ing.unit ?? ing.measure ?? ing.measurement ?? '';
  const name = ing.name || ing.text || ing.food || ing.ingredient || '';
  const combined = cleanText([qty, unit, name].filter(Boolean).join(' '));
  return combined || (typeof ing === 'string' ? ing : '');
}

function classifyIngredient(text: string) {
  const lower = text.toLowerCase();
  if (!text) return 'other';
  if (lower.includes('optional')) return 'optional';
  if (/(chicken|beef|pork|salmon|shrimp|tofu|tempeh|lamb|turkey|fish)/.test(lower))
    return 'protein';
  if (/(rice|noodle|pasta|bread|tortilla|quinoa|grain|bun|wrap)/.test(lower)) return 'base';
  if (/(onion|garlic|pepper|tomato|lettuce|spinach|cabbage|broccoli|carrot)/.test(lower))
    return 'veg';
  if (/(salt|pepper|cumin|paprika|oregano|basil|chili|spice|seasoning|herb)/.test(lower))
    return 'seasoning';
  return 'other';
}

function orderIngredients(rawIngredients: any[] | null | undefined) {
  if (!Array.isArray(rawIngredients) || rawIngredients.length === 0) return [];
  const buckets: Record<string, string[]> = {
    protein: [],
    base: [],
    veg: [],
    seasoning: [],
    other: [],
    optional: [],
  };

  for (const ing of rawIngredients) {
    const normalized = normalizeIngredient(ing);
    if (!normalized) continue;
    const bucket = classifyIngredient(normalized);
    if (bucket === 'optional') {
      buckets.optional.push(`Optional: ${normalized.replace(/optional[:\-]?\s*/i, '')}`);
    } else {
      buckets[bucket].push(normalized);
    }
  }

  return [
    ...buckets.protein,
    ...buckets.base,
    ...buckets.veg,
    ...buckets.seasoning,
    ...buckets.other,
    ...buckets.optional,
  ].filter(Boolean);
}

function extractSteps(rawSteps: any[] | null | undefined) {
  if (!Array.isArray(rawSteps)) return [];
  const steps: string[] = [];
  for (const step of rawSteps) {
    if (!step) continue;
    if (typeof step === 'string') {
      steps.push(step);
      continue;
    }
    const text = step.step || step.text || step.instruction || step.description;
    if (typeof text === 'string') steps.push(text);
  }
  return steps.map((s) => cleanText(s)).filter(Boolean);
}

function condenseSteps(rawSteps: any[] | null | undefined, fallbackContext: string) {
  const steps = extractSteps(rawSteps);
  const limited = steps.slice(0, 6);

  if (limited.length >= 3) return limited;

  const fallback = [
    `Prep the key ingredients for ${fallbackContext}.`,
    'Season or marinate as appropriate, then cook using the primary method (saute, bake, grill).',
    'Assemble and finish with any sauces or garnishes.',
  ];

  return limited.length ? limited : fallback;
}

function buildDescription(dishName?: string, ingredients?: string[]) {
  const mains = (ingredients || []).slice(0, 3).join(', ');
  if (dishName && mains) {
    return `A likely take on ${dishName}, featuring ${mains}.`;
  }
  if (dishName) return `A likely take on ${dishName}.`;
  return mains ? `A simple dish built with ${mains}.` : 'A comforting, balanced plate.';
}

export function buildLikelyRecipeMarkdown({
  dishName,
  ingredients,
  steps,
  description,
  estimatedServingSize,
  servingUnit,
}: RecipeFormatterInput) {
  const title = dishName ? `### Likely Recipe: ${dishName}` : '### Likely Recipe';
  const orderedIngredients = orderIngredients(ingredients);
  const descriptionLine = `*${
    description && description.trim().length
      ? description.trim()
      : buildDescription(dishName, orderedIngredients)
  }*`;

  const condensedSteps = condenseSteps(steps, dishName || 'this dish').slice(0, 6);

  const servingLine =
    estimatedServingSize || servingUnit
      ? `**Estimated Serving Size:** about ${[estimatedServingSize, servingUnit]
          .filter(Boolean)
          .join(' ')}`
      : '';

  const lines: string[] = [];

  lines.push(title);
  lines.push(descriptionLine);
  lines.push('');
  lines.push('**Ingredients**');
  if (orderedIngredients.length) {
    for (const ing of orderedIngredients) {
      lines.push(`- ${ing}`);
    }
  } else {
    lines.push('- Ingredients not available.');
  }

  lines.push('');
  lines.push("**How It's Prepared**");
  if (condensedSteps.length) {
    condensedSteps.forEach((step, idx) => {
      lines.push(`${idx + 1}. ${step}`);
    });
  } else {
    lines.push('1. Preparation details not available.');
  }

  if (servingLine) {
    lines.push('');
    lines.push(servingLine);
  }

  lines.push('');
  lines.push(
    '**Based on typical recipes from Edamam and Spoonacular. Restaurant versions may vary.**'
  );

  return lines.join('\n');
}

function stripCalories(text?: string | null) {
  if (!text) return '';
  return text
    .replace(/\bcalories?:?\s*\d+[a-zA-Z]*/gi, '')
    .replace(/\b\d+\s*(k?cal(?:ories)?|cals?)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function formatFriendlyQuantity(value: any) {
  if (value == null || value === '') return '';
  const num = Number(value);
  if (Number.isNaN(num)) return `${value}`;

  const fractionMap: Record<number, string> = {
    0.25: '1/4',
    0.33: '1/3',
    0.5: '1/2',
    0.66: '2/3',
    0.67: '2/3',
    0.75: '3/4',
  };

  const rounded = Math.round(num * 100) / 100;
  const fractionKey = Object.keys(fractionMap).find((k) => Math.abs(rounded - Number(k)) < 0.02);

  if (fractionKey) return fractionMap[Number(fractionKey)];
  if (Number.isInteger(rounded)) return `${rounded}`;
  return `${rounded.toFixed(1)}`;
}

export default function DishScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    dishId?: string;
    dishName?: string;
    itemName?: string;
    dishDescription?: string;
    description?: string;
    menuDescription?: string;
    dishSection?: string;
    sectionName?: string;
    dishPrice?: string;
    price?: string;
    restaurantName?: string;
    dishImageUrl?: string;
  }>();

  const {
    dishName: dishNameParam,
    itemName,
    dishDescription: dishDescriptionParam,
    description: descriptionParam,
    menuDescription,
    dishSection: dishSectionParam,
    sectionName,
    dishPrice: dishPriceParam,
    price,
    restaurantName: restaurantNameParam,
    dishImageUrl,
  } = params;

  const dishName = (dishNameParam as string) || (itemName as string) || 'Dish';
  const restaurantName = (restaurantNameParam as string) || 'Restaurant';
  const dishSection = (dishSectionParam as string) || (sectionName as string) || '';
  const dishPrice = (dishPriceParam as string) || (price as string) || '';

  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const { selectedAllergens } = useUserPrefs();
  const [analysisDebug, setAnalysisDebug] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalyzeDishResponse | null>(null);

  const dishDescriptionRaw =
    (menuDescription as string) ||
    (dishDescriptionParam as string) ||
    (descriptionParam as string) ||
    ((analysis as any)?.recipe as any)?.description ||
    (analysis as any)?.description ||
    '';
  const dishDescription = stripCalories(dishDescriptionRaw);

  useEffect(() => {
    const runAnalysis = async () => {
      if (!dishName) return;

      setAnalysisLoading(true);
      setAnalysisError(null);
      setAnalysisDebug(null);

      try {
        const res = await analyzeDish({
          dishName,
          restaurantName,
          description: dishDescription,
          menuSection: dishSection,
          priceText: dishPrice,
          imageUrl: dishImageUrl,
        });

        setAnalysis(res);
        setAnalysisDebug(JSON.stringify(res, null, 2));
      } catch (e) {
        console.error(e);
        setAnalysisError('Failed to analyze dish with /pipeline/analyze-dish');
      } finally {
        setAnalysisLoading(false);
      }
    };

    runAnalysis();
  }, [dishName, restaurantName]);

  const analysisViewModel =
    analysis && analysis.ok ? buildDishViewModel(analysis, selectedAllergens) : null;

  const iconForOrgan = (key: string) => {
    switch (key) {
      case 'gut':
        return GutIcon;
      case 'liver':
        return LiverIcon;
      case 'heart':
        return HeartIcon;
      case 'metabolic':
        return MetabolicIcon;
      case 'immune':
        return ImmuneIcon;
      case 'brain':
        return BrainIcon;
      case 'kidney':
        return KidneyIcon;
      default:
        return GutIcon;
    }
  };

  const organSeverityStyle = (severity: 'low' | 'medium' | 'high' | 'neutral') => {
    switch (severity) {
      case 'high':
        return styles.organBadgeHigh;
      case 'medium':
        return styles.organBadgeMedium;
      case 'low':
        return styles.organBadgeLow;
      default:
        return styles.organBadgeNeutral;
    }
  };

  // Likely recipe: inner recipe object from analysis.recipe or
  // analysis.likely_recipe.
  const likelyRecipe =
    (analysis as any)?.likely_recipe?.recipe ||
    (analysis as any)?.recipe?.recipe ||
    (analysis as any)?.likely_recipe ||
    null;
  // -----------------------------------------------

  const toneColors: Record<string, string> = {
    safe: '#2ecc71',
    caution: '#f39c12',
    unsafe: '#e74c3c',
    neutral: '#7f8c8d',
  };

  const toneHighlights: Record<string, string> = {
    safe: 'rgba(0, 150, 0, 0.08)',
    caution: 'rgba(255, 140, 0, 0.08)',
    unsafe: 'rgba(255, 0, 0, 0.09)',
    neutral: 'rgba(127, 140, 141, 0.05)',
  };

  const tonePillBackgrounds: Record<string, string> = {
    safe: 'rgba(0, 170, 51, 0.16)',
    caution: 'rgba(202, 130, 0, 0.16)',
    unsafe: 'rgba(231, 76, 60, 0.18)',
    neutral: 'rgba(127, 140, 141, 0.14)',
  };

  const toneChipBackgrounds: Record<string, string> = {
    safe: TB_SAFE_CHIP_BG,
    caution: TB_CAUTION_CHIP_BG,
    unsafe: TB_UNSAFE_CHIP_BG,
    neutral: 'rgba(255,255,255,0.08)',
  };

  const toneChipText: Record<string, string> = {
    safe: TB_SAFE_CHIP_TEXT,
    caution: TB_CAUTION_CHIP_TEXT,
    unsafe: TB_UNSAFE_CHIP_TEXT,
    neutral: '#FFFFFF',
  };

  const hasFodmapDetails = fodmapInfo.triggers.length > 0 || !!fodmapInfo.explanation;

  const matchedAllergens = allergensDetected.filter((a: any) => isUserAllergen(a));
  const allergenListText = allergensDetected
    .map((a: any) => a.displayName || a.type)
    .filter(Boolean)
    .join(', ');
  const matchedAllergenNames = matchedAllergens
    .map((a: any) => a.displayName || a.type)
    .filter(Boolean)
    .join(', ');

  const allergenVerdict = (() => {
    if (!Array.isArray(allergensDetected)) {
      return {
        tone: 'neutral',
        label: 'Unknown',
        description: 'Allergen data unavailable for this dish.',
      };
    }

    if (matchedAllergens.length > 0) {
      return {
        tone: 'unsafe',
        label: 'Unsafe',
        description: matchedAllergenNames
          ? `Contains your allergen: ${matchedAllergenNames}.`
          : 'Contains allergens you flagged.',
      };
    }

    if (allergensDetected.length > 0) {
      return {
        tone: 'caution',
        label: 'Caution',
        description: allergenListText
          ? `Contains: ${allergenListText} (none match your profile).`
          : 'Contains common allergens (none match your profile).',
      };
    }

    return {
      tone: 'safe',
      label: 'Safe',
      description: 'No allergens matching your profile.',
    };
  })();

  const fodmapVerdict = (() => {
    const level = flags?.fodmap;
    const triggersText = fodmapInfo.triggers
      .map((t: any) => t.ingredient || t.name || t)
      .filter(Boolean)
      .join(', ');

    if (level === 'low') {
      return {
        tone: 'safe',
        label: 'Low',
        description: triggersText
          ? `Low FODMAP profile. Trigger ingredients noted: ${triggersText}.`
          : 'Low FODMAP profile based on available ingredients.',
      };
    }

    if (level === 'high') {
      return {
        tone: 'unsafe',
        label: 'High',
        description: triggersText
          ? `Trigger ingredients: ${triggersText} (high FODMAP load).`
          : 'High FODMAP load based on available ingredients.',
      };
    }

    if (level === 'moderate' || level === 'medium') {
      return {
        tone: 'caution',
        label: 'Moderate',
        description: triggersText
          ? `Trigger ingredients: ${triggersText} (moderate FODMAP load).`
          : 'Moderate FODMAP load. Monitor portion size.',
      };
    }

    if (hasFodmapDetails) {
      return {
        tone: 'caution',
        label: 'Unclear',
        description:
          triggersText ||
          fodmapInfo.explanation ||
          'FODMAP level unclear – ingredients incomplete.',
      };
    }

    return {
      tone: 'neutral',
      label: 'Unclear',
      description: 'FODMAP level unclear – ingredients incomplete.',
    };
  })();

  const overallVerdictText = (() => {
    if (allergenVerdict.tone === 'unsafe') {
      return 'Overall: Likely to cause discomfort if you are sensitive to the listed allergens.';
    }
    if (fodmapVerdict.tone === 'unsafe') {
      return 'Overall: High chance of GI discomfort due to FODMAP triggers.';
    }
    if (allergenVerdict.tone === 'caution' || fodmapVerdict.tone === 'caution') {
      return 'Overall: Proceed with caution if you have IBS or food sensitivities.';
    }
    if (allergenVerdict.tone === 'safe' && fodmapVerdict.tone === 'safe') {
      return 'Overall: Generally comfortable for most profiles based on available data.';
    }
    return 'Overall: Data limited; monitor how you feel after eating.';
  })();

  const overallTone = (() => {
    if (allergenVerdict.tone === 'unsafe' || fodmapVerdict.tone === 'unsafe') {
      return 'unsafe';
    }
    if (allergenVerdict.tone === 'caution' || fodmapVerdict.tone === 'caution') {
      return 'caution';
    }
    if (allergenVerdict.tone === 'safe' && fodmapVerdict.tone === 'safe') {
      return 'safe';
    }
    return 'neutral';
  })();

  const verdictAccentColor = toneColors[overallTone] || toneColors.neutral;
  const verdictAccentTint = toneHighlights[overallTone] || toneHighlights.neutral;

  const verdictCardSeverityStyle =
    overallTone === 'unsafe'
      ? styles.verdictCardUnsafe
      : overallTone === 'safe'
      ? styles.verdictCardSafe
      : styles.verdictCardCaution;

  const formatIngredient = (ing: any) => {
    if (!ing) return '';
    if (typeof ing === 'string') return cleanText(ing);

    const qtyRaw = ing.quantity ?? ing.qty ?? ing.amount ?? ing.count ?? '';
    const qty = formatFriendlyQuantity(qtyRaw);
    const unit = ing.unit ?? ing.measure ?? ing.measurement ?? '';
    const name = ing.name || ing.text || ing.food || ing.ingredient || '';

    const parts = [];
    if (qty) parts.push(qty.trim());
    if (unit) parts.push(`${unit}`.trim());
    if (name) parts.push(cleanText(name));

    const joined = parts.join(' ');
    return joined || (typeof ing === 'string' ? ing : '');
  };

  const organRows = [
    {
      key: 'gut',
      label: 'Gut',
      icon: GutIcon,
      color: '#f6a623',
      defaultText: 'Contains onion and garlic which can cause gas and bloating in IBS.',
    },
    {
      key: 'liver',
      label: 'Liver',
      icon: LiverIcon,
      color: '#8e44ad',
      defaultText: 'No specific liver impact identified from the current ingredients.',
    },
    {
      key: 'heart',
      label: 'Heart',
      icon: HeartIcon,
      color: '#e74c3c',
      defaultText: 'High mayonnaise and pecans increase saturated fat load.',
    },
    {
      key: 'brain',
      label: 'Brain',
      icon: BrainIcon,
      color: '#bdc3c7',
      defaultText: "We don't have specific brain impact data for this dish yet.",
    },
    {
      key: 'kidney',
      label: 'Kidneys',
      icon: KidneyIcon,
      color: '#f1c40f',
      defaultText: "We don't have specific kidney impact data for this dish yet.",
    },
    {
      key: 'immune',
      label: 'Immune',
      icon: ImmuneIcon,
      color: '#27ae60',
      defaultText: "We don't have specific immune impact data for this dish yet.",
    },
    {
      key: 'metabolic',
      label: 'Metabolic',
      icon: MetabolicIcon,
      color: '#3498db',
      defaultText: '1954 calories and 154 g fat increase metabolic strain.',
    },
  ];

  function findOrganDetail(key: string) {
    if (!organDetails || organDetails.length === 0) return null;
    return (
      organDetails.find((o: any) => o.key === key || o.system === key || o.organ === key) || null
    );
  }

  function getOrganTexts(row: { key: string; defaultText?: string }) {
    const detail = findOrganDetail(row.key);
    const score = detail && typeof detail.score === 'number' ? detail.score : null;
    const effect =
      detail?.summary ||
      detail?.reason ||
      detail?.description ||
      row.defaultText ||
      "We don't have specific data for this organ yet.";

    let badge = 'Neutral';
    let tone: 'safe' | 'caution' | 'unsafe' | 'neutral' = 'neutral';

    if (score == null && !detail) {
      badge = 'No data';
      tone = 'neutral';
    } else if (score != null && score > 10) {
      badge = 'Supportive';
      tone = 'safe';
    } else if (score != null && score < -10) {
      badge = 'High impact';
      tone = 'unsafe';
    } else if (score != null) {
      badge = 'Mild impact';
      tone = 'caution';
    }

    return { badge, effect, tone };
  }

  const recipeIngredients = Array.isArray(likelyRecipe?.ingredients)
    ? likelyRecipe.ingredients
    : [];

  const formattedIngredients = recipeIngredients
    .map((ing: any) => formatIngredient(ing))
    .filter(Boolean);

  const rawInstructions = (() => {
    const instructions =
      (likelyRecipe as any)?.instructions ||
      (likelyRecipe as any)?.steps ||
      (likelyRecipe as any)?.directions;
    if (Array.isArray(instructions)) return instructions;
    if (typeof instructions === 'string') return [instructions];
    return null;
  })();

  const preparationSteps = condenseSteps(rawInstructions, dishName || 'this dish');
  const preparationText = preparationSteps.length
    ? cleanText(preparationSteps.join(' '))
    : 'We estimate this dish is prepared by combining the main ingredients with a dressing, then serving it with greens or a base of your choice.';
  const descriptionText = dishDescription;

  const heroImageUrl =
    // Tier 1: backend final image (Uber > restaurant > recipe)
    (analysis?.imageUrl as string | undefined) ||
    // Tier 2: fallback to the passed dish image (e.g. from menu screen)
    dishImageUrl ||
    // Tier 3: recipe-core fallback
    (likelyRecipe?.image as string | undefined) ||
    // Tier 4: placeholder
    'https://via.placeholder.com/800x500.png?text=Dish+Photo';

  if (analysisLoading && !analysis) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#2ecc71" />
        <Text style={styles.infoText}>Analyzing dish...</Text>
      </View>
    );
  }

  if (analysisError && !analysis) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>{analysisError}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Back */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>{'‹ Back'}</Text>
        </TouchableOpacity>
      </View>

      {/* Title */}
      <View style={styles.titleBlock}>
        <Text style={styles.dishName}>{dishName}</Text>
        {restaurantName ? <Text style={styles.restaurantName}>{restaurantName}</Text> : null}
        {descriptionText ? (
          <Text style={styles.dishDescription}>{descriptionText}</Text>
        ) : null}
      </View>

      {/* Hero image */}
      <View className="heroImageWrapper" style={styles.heroImageWrapper}>
        <Image style={styles.heroImage} source={{ uri: heroImageUrl }} resizeMode="cover" />
      </View>

      {/* Safety Verdict */}
      <View style={[styles.card, styles.verdictCard, verdictCardSeverityStyle]}>
        <Text style={[styles.sectionTitle, styles.verdictTitle]}>Tummy Buddy Verdict</Text>
        <View style={styles.verdictBlock}>
          <View style={styles.verdictRow}>
            <Text style={styles.verdictLabel}>Allergen safety</Text>
            <View
              style={[
                styles.verdictPill,
                allergenVerdict.tone === 'unsafe'
                  ? styles.verdictPillUnsafe
                  : allergenVerdict.tone === 'safe'
                  ? styles.verdictPillSafe
                  : styles.verdictPillCaution,
              ]}
            >
              <Text
                style={[
                  styles.verdictPillText,
                  allergenVerdict.tone === 'unsafe'
                    ? styles.verdictPillTextUnsafe
                    : allergenVerdict.tone === 'safe'
                    ? styles.verdictPillTextSafe
                    : styles.verdictPillTextCaution,
                ]}
              >
                {allergenVerdict.label}
              </Text>
            </View>
          </View>
          <Text style={styles.infoText}>{allergenVerdict.description}</Text>
        </View>
        <View style={styles.verdictBlock}>
          <View style={styles.verdictRow}>
            <Text style={styles.verdictLabel}>FODMAP / IBS safety</Text>
            <View
              style={[
                styles.verdictPill,
                fodmapVerdict.tone === 'unsafe'
                  ? styles.verdictPillUnsafe
                  : fodmapVerdict.tone === 'safe'
                  ? styles.verdictPillSafe
                  : styles.verdictPillCaution,
              ]}
            >
              <Text
                style={[
                  styles.verdictPillText,
                  fodmapVerdict.tone === 'unsafe'
                    ? styles.verdictPillTextUnsafe
                    : fodmapVerdict.tone === 'safe'
                    ? styles.verdictPillTextSafe
                    : styles.verdictPillTextCaution,
                ]}
              >
                {fodmapVerdict.label}
              </Text>
            </View>
          </View>
          <Text style={styles.infoText}>{fodmapVerdict.description}</Text>
        </View>
        <View style={styles.verdictBlock}>
          <View style={styles.verdictRow}>
            <Text style={styles.verdictLabel}>Overall comfort</Text>
            <View
              style={[
                styles.verdictPill,
                overallTone === 'unsafe'
                  ? styles.verdictPillUnsafe
                  : overallTone === 'safe'
                  ? styles.verdictPillSafe
                  : overallTone === 'caution'
                  ? styles.verdictPillCaution
                  : styles.verdictPillOverall,
              ]}
            >
              <Text
                style={[
                  styles.verdictPillText,
                  overallTone === 'unsafe'
                    ? styles.verdictPillTextUnsafe
                    : overallTone === 'safe'
                    ? styles.verdictPillTextSafe
                    : overallTone === 'caution'
                    ? styles.verdictPillTextCaution
                    : styles.verdictPillTextOverall,
                ]}
              >
                Overall
              </Text>
            </View>
        </View>
        <Text style={styles.infoText}>{overallVerdictText}</Text>
      </View>

      {analysisViewModel && (
        <View style={styles.dietTagsSection}>
          <Text style={styles.dietTagsTitle}>Diet & lifestyle</Text>

          {analysisViewModel.dietTags && analysisViewModel.dietTags.length > 0 ? (
            <View style={styles.dietTagsRow}>
              {analysisViewModel.dietTags.map((label) => (
                <View key={label} style={styles.dietTagChip}>
                  <Text style={styles.dietTagText}>{label}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.dietTagsEmptyText}>
              No specific diet or lifestyle tags available for this dish yet.
            </Text>
          )}
        </View>
      )}
    </View>

    <TouchableOpacity style={[styles.swapButton, { marginTop: 16, marginBottom: 12 }]}>
      <Text style={styles.swapButtonText}>Suggest safer swaps</Text>
    </TouchableOpacity>

      <View style={[styles.titleBlock, { marginTop: 8, marginBottom: 12 }]}>
        <View style={styles.headerActionsRow}>
          <TouchableOpacity
            style={[styles.smallButton, styles.smallButtonFilled, { marginRight: 8 }]}
          >
            <Text style={styles.smallButtonFilledText}>Log this meal</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.smallButton, styles.smallButtonOutline, { marginLeft: 8 }]}
          >
            <Text style={styles.smallButtonOutlineText}>Add to favorites</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Organ impact */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Organ impact</Text>
        {analysisViewModel
          ? analysisViewModel.organLines.map((line, idx) => {
              const iconSource = iconForOrgan(line.organKey);
              const isLast = idx === analysisViewModel.organLines.length - 1;
              return (
                <View
                  key={line.organKey}
                  style={[styles.organImpactRow, !isLast && styles.organRowDivider]}
                >
                  <View style={styles.organIconBox}>
                    <Image source={iconSource} style={styles.organImpactIcon} />
                  </View>
                  <View style={styles.organImpactContent}>
                    <View style={styles.organHeaderLine}>
                      <Text style={styles.organName}>{line.organLabel}</Text>
                      <View style={[styles.organBadge, organSeverityStyle(line.severity)]}>
                        <Text style={styles.organBadgeText}>{line.severity}</Text>
                      </View>
                    </View>
                    <Text style={styles.organEffect}>
                      {line.sentence || 'Organ impact details to follow.'}
                    </Text>
                  </View>
                </View>
              );
            })
          : organRows.map((row, idx) => {
              const { badge, effect, tone } = getOrganTexts(row);
              const isLast = idx === organRows.length - 1;
              return (
                <View
                  key={row.key}
                  style={[styles.organImpactRow, !isLast && styles.organRowDivider]}
                >
                  <View style={styles.organIconBox}>
                    <Image source={row.icon} style={styles.organImpactIcon} />
                  </View>
                  <View style={styles.organImpactContent}>
                    <View style={styles.organHeaderLine}>
                      <Text style={styles.organName}>{row.label}</Text>
                      <View
                        style={[
                          styles.organBadge,
                          badge === 'No data'
                            ? styles.organBadgeNoData
                            : { backgroundColor: toneColors[tone] || toneColors.neutral },
                        ]}
                      >
                        <Text
                          style={[
                            styles.organBadgeText,
                            tone === 'unsafe' && styles.verdictPillTextOnDark,
                            badge === 'No data' && styles.organBadgeTextNoData,
                          ]}
                        >
                          {badge}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.organEffect}>{effect}</Text>
                  </View>
                </View>
              );
            })}
      </View>

      {/* Nutrition facts */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle} numberOfLines={1}>
          Nutrition facts (estimate)
        </Text>
        <View style={styles.nutritionGrid}>
          <View style={styles.nutritionTile}>
            <Text style={styles.nutritionLabel}>Calories</Text>
            <Text style={styles.nutritionValue}>
              {analysisViewModel?.nutrition.calories != null
                ? Math.round(analysisViewModel.nutrition.calories)
                : '—'}
            </Text>
          </View>
          <View style={styles.nutritionTile}>
            <Text style={styles.nutritionLabel}>Protein</Text>
            <Text style={styles.nutritionValue}>
              {analysisViewModel?.nutrition.protein != null
                ? `${Math.round(analysisViewModel.nutrition.protein)} g`
                : '—'}
            </Text>
          </View>
          <View style={styles.nutritionTile}>
            <Text style={styles.nutritionLabel}>Carbs</Text>
            <Text style={styles.nutritionValue}>
              {analysisViewModel?.nutrition.carbs != null
                ? `${Math.round(analysisViewModel.nutrition.carbs)} g`
                : '—'}
            </Text>
          </View>
          <View style={styles.nutritionTile}>
            <Text style={styles.nutritionLabel}>Fat</Text>
            <Text style={styles.nutritionValue}>
              {analysisViewModel?.nutrition.fat != null
                ? `${Math.round(analysisViewModel.nutrition.fat)} g`
                : '—'}
            </Text>
          </View>
          <View style={styles.nutritionTile}>
            <Text style={styles.nutritionLabel}>Fiber</Text>
            <Text style={styles.nutritionValue}>
              {analysisViewModel?.nutrition.fiber != null
                ? `${Math.round(analysisViewModel.nutrition.fiber)} g`
                : '—'}
            </Text>
          </View>
          <View style={styles.nutritionTile}>
            <Text style={styles.nutritionLabel}>Sugar</Text>
            <Text style={styles.nutritionValue}>
              {analysisViewModel?.nutrition.sugar != null
                ? `${Math.round(analysisViewModel.nutrition.sugar)} g`
                : '—'}
            </Text>
          </View>
        </View>
      </View>

      {/* Allergens & FODMAP */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Allergens & FODMAP details</Text>

        <Text style={styles.subheading}>Allergens</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
          {analysisViewModel ? (
            analysisViewModel.allergens.length === 0 ? (
              <Text style={styles.infoText}>No common allergens detected.</Text>
            ) : (
              analysisViewModel.allergens.map((pill) => {
                const isSelected = pill.isUserAllergen;
                return (
                  <View
                    key={pill.name}
                    style={[styles.allergenChip, isSelected && styles.allergenChipAlert]}
                  >
                    <Text
                      style={[
                        styles.allergenChipText,
                        isSelected && styles.allergenChipTextAlert,
                      ]}
                    >
                      {pill.name}
                    </Text>
                  </View>
                );
              })
            )
          ) : (
            <Text style={styles.infoText}>No common allergens detected.</Text>
          )}
        </View>

        <View style={[styles.divider, { marginVertical: 12 }]} />

        <Text style={styles.subheading}>FODMAP / IBS Impact</Text>
        {analysisViewModel?.fodmapLevel ? (
          <Text style={[styles.infoText, { marginTop: 4 }]}>
            Level: {analysisViewModel.fodmapLevel}
          </Text>
        ) : null}
        {analysisViewModel?.fodmapPills && analysisViewModel.fodmapPills.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
            {analysisViewModel.fodmapPills.map((pill) => (
              <View key={pill} style={[styles.allergenChip, styles.allergenChip]}>
                <Text style={styles.allergenChipText}>{pill}</Text>
              </View>
            ))}
          </View>
        ) : null}
        <Text style={[styles.infoText, { marginTop: 6 }]}>
          {analysisViewModel?.fodmapSentence || fodmapVerdict.description}
        </Text>
      </View>

      {/* Likely recipe */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle} numberOfLines={1}>
          Likely recipe
        </Text>
        <Text style={styles.recipeEstimateNote}>
          Estimated recipe. Actual restaurant recipe may vary.
        </Text>
        <View style={styles.recipeNotebook}>
          <Text style={styles.recipeSubheading}>Ingredients</Text>
          {formattedIngredients.length > 0 ? (
            <View style={styles.recipeIngredientList}>
              {formattedIngredients.map((ing: string, idx: number) => (
                <View key={idx} style={styles.recipeIngredientRow}>
                  <Text style={styles.recipeBullet}>{'\u2022'}</Text>
                  <Text style={styles.recipeIngredientText}>{ing}</Text>
                </View>
              ))}
            </View>
          ) : dishDescription ? (
            <Text style={styles.infoText}>Based on this description: {dishDescription}</Text>
          ) : (
            <Text style={styles.infoText}>Ingredients not available.</Text>
          )}

          <Text style={[styles.recipeSubheading, { marginTop: 24 }]}>How it's prepared</Text>
          <Text style={styles.recipeIngredientText}>
            {preparationText ||
              'We estimate this dish is prepared by combining the main ingredients with a dressing, then serving it with greens or a base of your choice.'}
          </Text>
        </View>
      </View>

      {/* Safety follow-up actions */}
      <TouchableOpacity style={[styles.swapButton, { marginTop: 24, marginBottom: 12 }]}>
        <Text style={styles.swapButtonText}>Suggest safer swaps</Text>
      </TouchableOpacity>

      <View style={[styles.actionsRow, { marginTop: 8, marginBottom: 12 }]}>
        <TouchableOpacity style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Log this meal</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Add to favorites</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.globalDisclaimerContainer}>
        <Text style={styles.globalDisclaimerTitle}>Disclaimer</Text>
        <Text style={styles.globalDisclaimerText}>
          Nutrition facts, ingredients, allergen information, and recipe details shown in Tummy
          Buddy are estimates generated by AI and third-party data sources (such as Edamam and
          Spoonacular). These are not provided by the restaurant and may differ from the actual
          dish. Always verify allergen and dietary information directly with the restaurant when
          needed.
        </Text>
      </View>
      {/* Developer debug (collapsed from main flow) */}
      <View style={[styles.card, { marginTop: 24, padding: 16 }]}>
        <Text
          style={[
            styles.sectionTitle,
            { fontSize: 13, fontWeight: '600', color: '#999', marginBottom: 8 },
          ]}
        >
          Developer debug
        </Text>
        {analysisLoading && (
          <Text style={[styles.debugText, { marginTop: 4 }]}>Analyzing dish…</Text>
        )}
        {analysisError && (
          <Text style={[styles.debugText, { color: '#e74c3c', marginTop: 4 }]}>
            {analysisError}
          </Text>
        )}
        {analysisDebug && (
          <View style={[styles.debugBox, { maxHeight: 140 }]}>
            <Text style={styles.debugText}>{analysisDebug}</Text>
          </View>
        )}
        {!analysisLoading && !analysisError && !analysisDebug && (
          <Text style={[styles.debugText, { marginTop: 4 }]}>
            Analysis results will appear here.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0f',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b0b0f',
  },
  content: {
    paddingTop: 40,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  headerRow: {
    marginBottom: 8,
  },
  backText: {
    color: '#aaa',
    fontSize: 14,
  },
  heroImageWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  heroImage: {
    width: '100%',
    height: 220,
  },
  titleBlock: {
    marginTop: 12,
    marginBottom: 12,
  },
  dishName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fefefe',
  },
  dishDescription: {
    marginTop: 6,
    fontSize: 16,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.75)',
  },
  restaurantName: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 2,
  },
  subMetaText: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 2,
  },
  card: {
    borderRadius: 12,
    backgroundColor: '#15151b',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 16,
    marginBottom: 12,
    marginTop: 24,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  headerActionsRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  smallButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2ecc71',
  },
  smallButtonFilled: {
    backgroundColor: '#01C7A4',
  },
  smallButtonOutline: {
    backgroundColor: 'transparent',
    borderColor: '#007F7A',
  },
  smallButtonFilledText: {
    color: '#0b0b0f',
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
  },
  smallButtonOutlineText: {
    color: '#007F7A',
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
  },
  verdictCard: {
    padding: 16,
    marginTop: 16,
    backgroundColor: '#EAFBF7',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
  },
  verdictTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  verdictCardSafe: {
    backgroundColor: TB_SAFE_BG,
    borderColor: TB_SAFE_BORDER,
    borderLeftWidth: 4,
  },
  verdictCardCaution: {
    backgroundColor: TB_CAUTION_BG,
    borderColor: TB_CAUTION_BORDER,
    borderLeftWidth: 4,
  },
  verdictCardUnsafe: {
    backgroundColor: '#FFE5E7',
    borderColor: TB_UNSAFE_BORDER,
    borderLeftWidth: 4,
  },
  verdictBlock: {
    marginBottom: 16,
  },
  verdictRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  verdictPill: {
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 8,
  },
  verdictPillText: {
    color: '#0b0b0f',
    fontWeight: '500',
    fontSize: 11,
  },
  verdictPillSafe: {
    backgroundColor: TB_SAFE_CHIP_BG,
  },
  verdictPillCaution: {
    backgroundColor: TB_CAUTION_CHIP_BG,
  },
  verdictPillUnsafe: {
    backgroundColor: TB_UNSAFE_CHIP_BG,
  },
  verdictPillOverall: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  verdictPillTextSafe: {
    color: TB_SAFE_CHIP_TEXT,
  },
  verdictPillTextCaution: {
    color: TB_CAUTION_CHIP_TEXT,
  },
  verdictPillTextUnsafe: {
    color: TB_UNSAFE_CHIP_TEXT,
  },
  verdictPillTextOverall: {
    color: '#ffffff',
  },
  verdictPillTextOnDark: {
    color: '#fefefe',
  },
  verdictLabel: {
    color: '#fefefe',
    fontWeight: '600',
    fontSize: 13,
  },
  allergenChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#222222',
    marginRight: 8,
    marginBottom: 8,
  },
  allergenChipText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
  allergenChipAlert: {
    backgroundColor: '#8b0000',
    borderColor: '#ff4d4f',
    borderWidth: 1,
  },
  allergenChipTextAlert: {
    color: '#ffecec',
  },
  infoText: {
    fontSize: 13,
    color: '#b5b5bd',
  },
  subheading: {
    color: '#fefefe',
    fontWeight: '700',
    marginTop: 4,
    fontSize: 13,
  },
  divider: {
    height: 1,
    backgroundColor: '#2a2a33',
    marginVertical: 12,
  },
  organImpactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  organRowDivider: {
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    paddingBottom: 4,
    marginBottom: 6,
  },
  organIconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#1c1c23',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginLeft: 6,
  },
  organImpactIcon: {
    width: 42,
    height: 42,
    resizeMode: 'contain',
  },
  organImpactContent: {
    flex: 1,
  },
  organHeaderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 4,
  },
  organName: {
    color: '#fefefe',
    fontWeight: '700',
    fontSize: 14,
  },
  organBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  organBadgeLow: {
    backgroundColor: '#10B981',
  },
  organBadgeMedium: {
    backgroundColor: '#F97316',
  },
  organBadgeHigh: {
    backgroundColor: '#EF4444',
  },
  organBadgeNeutral: {
    backgroundColor: '#6B7280',
  },
  organBadgeNoData: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    backgroundColor: '#32323b',
  },
  organBadgeText: {
    fontWeight: '700',
    fontSize: 10.5,
    color: '#0b0b0f',
  },
  organBadgeTextNoData: {
    color: '#b0b0b5',
  },
  organEffect: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  nutritionTile: {
    width: '48%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#18181f',
    borderWidth: 1,
    borderColor: '#2a2a33',
    marginBottom: 10,
  },
  nutritionLabel: {
    fontSize: 10,
    color: '#9aa0aa',
  },
  nutritionValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fefefe',
  },
  dietTagsSection: {
    marginTop: 12,
  },
  dietTagsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fefefe',
    marginBottom: 4,
  },
  dietTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dietTagChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginRight: 6,
    marginBottom: 6,
  },
  dietTagText: {
    fontSize: 12,
    color: '#ffffff',
  },
  dietTagsEmptyText: {
    fontSize: 12,
    color: '#ffffff',
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#01C7A4',
    borderRadius: 999,
    paddingVertical: 8,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  primaryButtonText: {
    color: '#0b0b0f',
    fontWeight: '700',
    textAlign: 'center',
    fontSize: 13,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 8,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#007F7A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  secondaryButtonText: {
    color: '#007F7A',
    fontWeight: '700',
    textAlign: 'center',
    fontSize: 13,
  },
  swapButton: {
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#007F7A',
    marginBottom: 16,
  },
  swapButtonText: {
    color: '#007F7A',
    fontWeight: '700',
  },
  errorText: {
    fontSize: 13,
    color: '#e74c3c',
  },
  debugBox: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2a33',
    backgroundColor: '#111118',
    padding: 8,
    marginTop: 8,
    maxHeight: 220,
  },
  debugText: {
    fontSize: 11,
    color: '#ccc',
  },
  recipeNotebook: {
    backgroundColor: '#1a1a20',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#2a2a33',
  },
  recipeMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
    columnGap: 12,
    rowGap: 4,
  },
  recipeMetaLabel: {
    color: '#aaa',
    fontSize: 12,
  },
  recipeMetaValue: {
    color: '#fefefe',
    fontWeight: '600',
    fontSize: 12,
  },
  recipeSectionHeading: {
    color: '#fefefe',
    fontWeight: '700',
    fontSize: 14,
    marginTop: 4,
    marginBottom: 6,
  },
  recipeIngredientList: {
    marginLeft: 6,
  },
  recipeIngredientRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  recipeBullet: {
    color: '#fefefe',
    marginRight: 6,
    marginTop: 2,
  },
  recipeIngredientText: {
    color: '#cfcfcf',
    fontSize: 13,
    flex: 1,
    lineHeight: 30,
  },
  recipeSubheading: {
    color: '#fefefe',
    fontWeight: '600',
    fontSize: 16,
    marginTop: 4,
    marginBottom: 8,
  },
  recipeEstimateNote: {
    marginTop: 4,
    marginBottom: 8,
    fontSize: 12,
    color: '#A0A0A0',
  },
  globalDisclaimerContainer: {
    marginTop: 24,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  globalDisclaimerTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#CCCCCC',
    marginBottom: 4,
  },
  globalDisclaimerText: {
    fontSize: 11,
    lineHeight: 16,
    color: '#8F8F8F',
  },
});
