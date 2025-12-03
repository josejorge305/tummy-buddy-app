import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Image,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "../api/api";
import GutIcon from "../assets/images/Gut_icon.png";
import HeartIcon from "../assets/images/heart_icon.png";
import ImmuneIcon from "../assets/images/Inmune_Icon.png";
import LiverIcon from "../assets/images/Liver_icon.png";
import MetabolicIcon from "../assets/images/Metabolic_Icon.png";
import BrainIcon from "../assets/images/brain_icon.png";
import KidneyIcon from "../assets/images/kidney_icon.png";

const BG = "#020617";
const TEAL = "#14b8a6";

const getSeverityChipStyle = (severity: string) => {
  const s = (severity || "").toLowerCase();
  if (s.includes("generally safe") || s === "safe") {
    return { backgroundColor: "#16a34a" };
  }
  if (s.includes("caution")) {
    return { backgroundColor: "#f59e0b" };
  }
  if (s.includes("avoid") || s === "unsafe") {
    return { backgroundColor: "#ef4444" };
  }
  return { backgroundColor: "#4b5563" };
};

type MenuResponse = {
  restaurant?: { name?: string; address?: string };
  sections?: Array<{
    id?: string | number;
    name?: string;
    items?: Array<any>;
  }>;
};

export default function RestaurantScreen() {
  const router = useRouter();
  const { placeId, restaurantName, address } = useLocalSearchParams();
  const [menu, setMenu] = useState<MenuResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [likedItemIds, setLikedItemIds] = useState<Set<string>>(new Set());
  // Placeholder: per-item analysis; will be filled from /pipeline/analyze-dish later
  const [analysisByItemId, setAnalysisByItemId] = useState<Record<string, any>>({});
  const [analyzingItemId, setAnalyzingItemId] = useState<string | null>(null);

  const placeIdValue = Array.isArray(placeId) ? placeId[0] : placeId;
  const restaurantNameValue = Array.isArray(restaurantName) ? restaurantName[0] : restaurantName;
  const addressValue = Array.isArray(address) ? address[0] : address;

  useEffect(() => {
    async function loadMenu() {
      setError(null);
      setLoading(true);
      try {
        const url = `${API_BASE_URL}/menu/extract?placeId=${encodeURIComponent(
          placeIdValue as string
        )}`;
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }
        const data = await res.json();
        setMenu(data);
      } catch (e: any) {
        console.log("MENU ERROR:", e);
        setError("We couldn’t load this menu right now. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    if (placeIdValue) {
      loadMenu();
    } else {
      setError("We couldn’t load this menu right now. Please try again.");
      setLoading(false);
    }
  }, [placeIdValue]);

  const handleToggleAnalysis = async (item: any, sectionName?: string) => {
    const itemId = String(item?.id ?? item?.name ?? "");
    if (!itemId) return;

    // Collapse if tapping the same expanded item
    if (expandedItemId === itemId) {
      setExpandedItemId(null);
      return;
    }

    // Expand the tapped item
    setExpandedItemId(itemId);

    // If analysis already loaded, no need to refetch
    if (analysisByItemId[itemId]) {
      return;
    }

    try {
      setAnalyzingItemId(itemId);

      const body = {
        dishName: item?.name,
        restaurantName: restaurantNameValue || restaurantName || null,
        description: item?.description || "",
        menuSection: sectionName || "",
        priceText: item?.priceText || "",
        placeId: placeIdValue || placeId || null,
      };

      const resp = await fetch(`${API_BASE_URL}/pipeline/analyze-dish`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const json = await resp.json();
      console.log("analyze-dish response (trimmed):", JSON.stringify(json).slice(0, 300));

      if (!resp.ok || !json || json.ok === false) {
        console.warn("Analysis failed for item", itemId, json);
        return;
      }

      setAnalysisByItemId((prev) => ({
        ...prev,
        [itemId]: json,
      }));
    } catch (err) {
      console.error("Error calling /pipeline/analyze-dish", err);
    } finally {
      setAnalyzingItemId(null);
    }
  };

  const ORGAN_ORDER: Array<
    "gut" | "liver" | "heart" | "metabolic" | "immune" | "brain" | "kidney"
  > = ["gut", "liver", "heart", "metabolic", "immune", "brain", "kidney"];

  const ORGAN_ICONS: Record<string, any> = {
    gut: GutIcon,
    liver: LiverIcon,
    heart: HeartIcon,
    metabolic: MetabolicIcon,
    immune: ImmuneIcon,
    brain: BrainIcon,
    kidney: KidneyIcon,
  };

  const ORGAN_LABELS: Record<string, string> = {
    gut: "Gut",
    liver: "Liver",
    heart: "Heart",
    metabolic: "Metabolic",
    immune: "Immune",
    brain: "Brain",
    kidney: "Kidney",
  };

  // TODO: replace with real user prefs from backend
  const USER_ALLERGENS = ["gluten", "shellfish", "wheat", "dairy"];

  const mapOrganLevelToDelta = (level: string | undefined): number => {
    if (!level) return 0;
    const l = level.toLowerCase();
    if (l.includes("high_negative")) return -2;
    if (l.includes("mild_negative")) return -1;
    if (l.includes("neutral")) return 0;
    if (l.includes("mild_positive")) return 1;
    if (l.includes("high_positive")) return 2;
    return 0;
  };

  const trimSentence = (text: string, maxLen = 160): string => {
    if (!text) return "";
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen - 1).trimEnd() + "…";
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={TEAL} />
        <Text style={styles.loadingText}>Loading menu…</Text>
        <Text style={styles.loadingSubtext}>
          First-time menus may take a bit longer while we onboard them.
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!menu?.sections || menu.sections.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>No menu found.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content}>
          <TouchableOpacity style={styles.backRow} onPress={() => router.push("/")}>
            <Text style={styles.backText}>← Back to home</Text>
          </TouchableOpacity>

          <Text style={styles.headerName}>{restaurantNameValue || menu.restaurant?.name}</Text>
          <Text style={styles.headerAddress}>{addressValue || menu.restaurant?.address}</Text>

          {menu.sections.map((section) => (
            <View key={section.id || section.name} style={{ marginTop: 16 }}>
              {section.name ? <Text style={styles.sectionTitle}>{section.name}</Text> : null}

              {section.items?.map((item: any, index: number) => {
                const itemId = String(item?.id ?? item?.name ?? `${section.id}-${index}`);
                const isExpanded = expandedItemId === itemId;

                const analysis = analysisByItemId[itemId];

                const organsBlock = analysis?.organs || {};
                const flags = organsBlock.flags || {};
                const insightLines: string[] = organsBlock.insight_lines || [];

                // --- Nutrition from recipe-core ---
                const recipeBlock = analysis?.recipe?.recipe || {};
                const nutrition = {
                  calories: typeof recipeBlock.calories === "number" ? recipeBlock.calories : null,
                  protein:
                    typeof recipeBlock.macros?.protein === "number"
                      ? recipeBlock.macros.protein
                      : null,
                  carbs:
                    typeof recipeBlock.macros?.carbs === "number"
                      ? recipeBlock.macros.carbs
                      : null,
                  fat:
                    typeof recipeBlock.macros?.fat === "number" ? recipeBlock.macros.fat : null,
                };

                // --- Allergen safety (string[] OR objects) ---
                const rawAllergens: any[] = Array.isArray(flags.allergens)
                  ? flags.allergens
                  : [];

                const allergenKinds: string[] = rawAllergens
                  .map((a) => {
                    if (!a) return "";
                    if (typeof a === "string") return a;
                    if (typeof a.kind === "string") return a.kind;
                    if (typeof a.message === "string") return a.message;
                    return "";
                  })
                  .filter(Boolean);

                const allergenInsight =
                  insightLines.find((l) => l.toLowerCase().includes("allergen")) || "";

                const derivedAllergenDetail =
                  allergenInsight ||
                  (allergenKinds.length > 0
                    ? `Contains: ${allergenKinds.join(", ")}.`
                    : "No common allergens detected from our data.");

                // --- FODMAP / IBS safety ---
                const fodmapLevelRaw: string = flags.fodmap?.level || "unknown";
                const fodmapLevel = fodmapLevelRaw.toLowerCase();
                const fodmapSeverityMap: Record<string, string> = {
                  low: "Safe",
                  moderate: "Caution",
                  high: "Avoid",
                  unknown: "Unknown",
                };
                const derivedFodmapSeverity = fodmapSeverityMap[fodmapLevel] || "Unknown";

                const fodmapInsightLine =
                  insightLines.find((l) => l.toLowerCase().includes("fodmap")) ||
                  flags.fodmap?.reason ||
                  "";

                const derivedFodmapDetail = trimSentence(
                  fodmapInsightLine ||
                    (fodmapLevel === "unknown"
                      ? "FODMAP level is unclear from ingredients."
                      : `FODMAP level: ${fodmapLevelRaw}.`),
                  160
                );

                // --- Organ impact ordered list ---
                const organEntries: any[] = Array.isArray(organsBlock.organs)
                  ? organsBlock.organs
                  : [];

                const orderedOrgans = ORGAN_ORDER.map((key) => {
                  const match = organEntries.find((o) => o.organ === key) || {};
                  const level: string = match.level || "neutral";
                  const delta = mapOrganLevelToDelta(level);
                  const firstReason =
                    Array.isArray(match.reasons) && match.reasons.length > 0
                      ? match.reasons[0]
                      : "";
                  return {
                    key,
                    level,
                    delta,
                    reason: firstReason,
                  };
                });

                const firstOrganWithReason = orderedOrgans.find((o) => !!o.reason);
                const organImpactSummary =
                  firstOrganWithReason?.reason ||
                  "Organ impact details will appear here as we expand the model.";

                return (
                  <View key={itemId} style={styles.card}>
                    {item?.imageUrl ? (
                      <View style={styles.imageWrapper}>
                        <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
                        <TouchableOpacity
                          style={styles.heartButton}
                          onPress={() => {
                            setLikedItemIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(itemId)) {
                                next.delete(itemId);
                              } else {
                                next.add(itemId);
                              }
                              return next;
                            });
                          }}
                        >
                          <Ionicons
                            name={likedItemIds.has(itemId) ? "heart" : "heart-outline"}
                            size={22}
                            color={likedItemIds.has(itemId) ? "#f97373" : "#ffffff"}
                          />
                        </TouchableOpacity>
                      </View>
                    ) : null}

                    <Text style={styles.itemName} numberOfLines={2}>
                      {item?.name}
                    </Text>

                    {!!item?.priceText && <Text style={styles.itemPrice}>{item.priceText}</Text>}

                    {!!item?.description && (
                      <Text style={styles.itemDescription} numberOfLines={isExpanded ? 0 : 2}>
                        {item.description}
                      </Text>
                    )}

                    <TouchableOpacity onPress={() => handleToggleAnalysis(item, section.name)}>
                      <Text style={styles.showMoreText}>
                        {isExpanded ? "Hide analysis…" : "Show analysis…"}
                      </Text>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.expandedVerdictContainer}>
                        {/* Simple message if we have no analysis yet */}
                        {!analysis && (
                          <Text style={styles.verdictBodyText}>
                            {analyzingItemId === itemId
                              ? "Analyzing this dish with Tummy Buddy…"
                              : "Analysis not available yet. Tap “Show analysis…” to try again."}
                          </Text>
                        )}

                        {/* Only render sections when we have analysis */}
                    {analysis && (
                      <>
                        {/* 1) Allergens row */}
                        <View style={styles.sectionBlock}>
                          <Text style={styles.sectionTitle}>Allergens</Text>
                          <View style={styles.allergenPillRow}>
                            {allergenKinds.length === 0 && (
                              <View style={[styles.allergenPill, styles.allergenPillNeutral]}>
                                <Text style={styles.allergenPillText}>None detected</Text>
                              </View>
                            )}
                            {allergenKinds.map((name) => {
                              const lower = name.toLowerCase();
                              const isUserAllergen = USER_ALLERGENS.some((u) => lower.includes(u));
                              return (
                                <View
                                  key={name}
                                  style={[
                                    styles.allergenPill,
                                    isUserAllergen
                                      ? styles.allergenPillUser
                                      : styles.allergenPillOther,
                                  ]}
                                >
                                  <Text style={styles.allergenPillText}>{name}</Text>
                                </View>
                              );
                            })}
                          </View>
                          <Text style={styles.sectionBody}>{derivedAllergenDetail}</Text>
                        </View>

                        {/* 2) FODMAP row */}
                        <View style={styles.sectionBlock}>
                          <View style={styles.sectionHeaderRow}>
                            <Text style={styles.sectionTitle}>FODMAP / IBS</Text>
                            <View style={styles.chipContainer}>
                              <Text
                                style={[styles.chipSmall, getSeverityChipStyle(derivedFodmapSeverity)]}
                              >
                                {derivedFodmapSeverity}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.sectionBody}>{derivedFodmapDetail}</Text>
                        </View>

                        {/* 3) Organ impact grid with icons */}
                        <View style={styles.organSection}>
                          <Text style={styles.sectionTitle}>Organ impact</Text>
                          {(() => {
                            const firstRow = orderedOrgans.slice(0, 4);
                            const secondRow = orderedOrgans.slice(4);
                            return (
                              <View style={styles.organGrid}>
                                <View style={styles.organRow}>
                                  {firstRow.map((o) => {
                                    const iconSource = ORGAN_ICONS[o.key];
                                    const deltaText = o.delta > 0 ? `+${o.delta}` : `${o.delta}`;
                                    return (
                                <View key={o.key} style={styles.organItem}>
                                  {iconSource && (
                                    <View style={styles.organIconWrapper}>
                                      <Image source={iconSource} style={styles.organIcon} />
                                    </View>
                                  )}
                                  <Text style={styles.organDeltaText}>{deltaText}</Text>
                                  <Text style={styles.organLabel} numberOfLines={1}>
                                    {ORGAN_LABELS[o.key] ??
                                      o.key.charAt(0).toUpperCase() + o.key.slice(1)}
                                  </Text>
                                </View>
                              );
                                  })}
                                </View>

                                <View style={styles.organRow}>
                                  {secondRow.map((o) => {
                                    const iconSource = ORGAN_ICONS[o.key];
                                    const deltaText = o.delta > 0 ? `+${o.delta}` : `${o.delta}`;
                                    return (
                                <View key={o.key} style={styles.organItem}>
                                  {iconSource && (
                                    <View style={styles.organIconWrapper}>
                                      <Image source={iconSource} style={styles.organIcon} />
                                    </View>
                                  )}
                                  <Text style={styles.organDeltaText}>{deltaText}</Text>
                                  <Text style={styles.organLabel} numberOfLines={1}>
                                    {ORGAN_LABELS[o.key] ??
                                      o.key.charAt(0).toUpperCase() + o.key.slice(1)}
                                  </Text>
                                </View>
                              );
                                  })}
                                </View>
                              </View>
                            );
                          })()}
                          <Text style={styles.organDescription}>{organImpactSummary}</Text>
                        </View>

                        {/* 4) Nutrition facts */}
                        <View style={styles.nutritionSection}>
                          <Text style={styles.sectionTitle}>Nutrition facts (estimate)</Text>
                          <View style={styles.nutritionGrid}>
                            <View style={styles.nutritionTile}>
                              <Text style={styles.nutritionLabel}>Calories</Text>
                              <Text style={styles.nutritionValue}>
                                {nutrition.calories != null ? Math.round(nutrition.calories) : "--"}
                              </Text>
                            </View>
                            <View style={styles.nutritionTile}>
                              <Text style={styles.nutritionLabel}>Protein</Text>
                              <Text style={styles.nutritionValue}>
                                {nutrition.protein != null ? `${nutrition.protein} g` : "--"}
                              </Text>
                            </View>
                            <View style={styles.nutritionTile}>
                              <Text style={styles.nutritionLabel}>Carbs</Text>
                              <Text style={styles.nutritionValue}>
                                {nutrition.carbs != null ? `${nutrition.carbs} g` : "--"}
                              </Text>
                            </View>
                            <View style={styles.nutritionTile}>
                              <Text style={styles.nutritionLabel}>Fat</Text>
                              <Text style={styles.nutritionValue}>
                                {nutrition.fat != null ? `${nutrition.fat} g` : "--"}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </>
                    )}

                    {/* Buttons */}
                    <View style={styles.buttonRow}>
                      <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => {
                          console.log("Log meal pressed", {
                            name: item?.name,
                            placeId: placeIdValue,
                            restaurantName: restaurantNameValue,
                          });
                        }}
                      >
                        <Text style={styles.primaryButtonText}>Log this meal</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={() => {
                          router.push({
                            pathname: "/dish",
                            params: {
                              itemName: item?.name,
                              placeId: placeIdValue,
                              restaurantName: restaurantNameValue,
                              description: item?.description ?? "",
                              price: item?.priceText ?? "",
                              mode: "likely_recipe",
                            },
                          });
                        }}
                      >
                        <Text style={styles.secondaryButtonText}>Likely recipe</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            );
              })}
            </View>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },
  screen: {
    flex: 1,
    backgroundColor: BG,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 32,
  },
  backRow: {
    marginBottom: 12,
  },
  backText: {
    fontSize: 14,
    fontWeight: "700",
    color: TEAL,
  },
  headerName: {
    fontSize: 26,
    fontWeight: "800",
    color: "#ffffff",
  },
  headerAddress: {
    marginTop: 4,
    fontSize: 14,
    color: "#9ca3af",
  },
  sectionTitle: {
    marginTop: 16,
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },
  card: {
    backgroundColor: "#020819",
    borderRadius: 24,
    padding: 16,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  imageWrapper: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 12,
  },
  itemImage: {
    width: "100%",
    height: 240,
    resizeMode: "cover",
  },
  heartButton: {
    position: "absolute",
    right: 12,
    top: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#00000066",
    alignItems: "center",
    justifyContent: "center",
  },
  itemName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
    lineHeight: 22,
  },
  itemPrice: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: "600",
    color: "#d1d5db",
  },
  itemDescription: {
    marginTop: 4,
    fontSize: 13,
    color: "#9ca3af",
  },
  showMoreText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "600",
    color: "#9ca3af",
  },
  verdictTitle: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
  verdictText: {
    marginTop: 4,
    fontSize: 14,
    color: "#9ca3af",
  },
  verdictBodyText: {
    marginTop: 8,
    fontSize: 13,
    color: "#9ca3af",
  },
  buttonRow: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: TEAL,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
    color: "#020617",
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: TEAL,
    backgroundColor: "transparent",
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
    color: TEAL,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: BG,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
    textAlign: "center",
  },
  loadingSubtext: {
    marginTop: 4,
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#f97373",
    textAlign: "center",
  },
  expandedVerdictContainer: {
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#111827",
  },
  tbHeader: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 8,
  },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 10,
  },
  sectionTextCol: {
    flex: 1,
  },
  chipContainer: {
    alignItems: "flex-end",
  },
  sectionBody: {
    marginTop: 4,
    fontSize: 13,
    color: "#9ca3af",
  },
  sectionBlock: {
    marginTop: 10,
    marginBottom: 6,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    color: "#020617",
    fontWeight: "800",
    overflow: "hidden",
  },
  allergenPillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
    marginBottom: 2,
  },
  allergenPill: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 999,
    marginRight: 4,
    marginBottom: 4,
  },
  allergenPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#020617",
  },
  allergenPillUser: {
    backgroundColor: "#ef4444",
  },
  allergenPillOther: {
    backgroundColor: "#4b5563",
  },
  allergenPillNeutral: {
    backgroundColor: "#374151",
  },
  chipSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: "700",
    color: "#020617",
  },
  organSection: {
    marginTop: 10,
  },
  organGrid: {
    marginTop: 8,
  },
  organRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  organItem: {
    width: "23%",
    alignItems: "center",
  },
  organIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  organIcon: {
    width: 36,
    height: 36,
    resizeMode: "contain",
  },
  organDeltaText: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: "700",
    color: "#ffffff",
    textAlign: "center",
  },
  organLabel: {
    marginTop: 1,
    fontSize: 11,
    color: "#9ca3af",
    textAlign: "center",
  },
  organDescription: {
    marginTop: 4,
    fontSize: 13,
    color: "#9ca3af",
  },
  nutritionSection: {
    marginTop: 10,
  },
  nutritionGrid: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
  },
  nutritionTile: {
    width: "48%",
    backgroundColor: "#020819",
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  nutritionLabel: {
    fontSize: 12,
    color: "#9ca3af",
  },
  nutritionValue: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffff",
  },
});
