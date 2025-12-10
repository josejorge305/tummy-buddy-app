import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
} from "react-native";

export type PlateComponentKind =
  | "main"
  | "side"
  | "drink"
  | "sauce"
  | "dessert"
  | "other";

export type PlateComponentEntry = {
  id: string;
  name: string;
  kind: PlateComponentKind;
  calories: number | null;
  sharePercent: number | null;
  allergens: string[];
  fodmapLevel?: "low" | "medium" | "high" | "unknown";
  lactoseLevel?: "none" | "low" | "medium" | "high" | "unknown";
};

type Props = {
  title?: string;
  components: PlateComponentEntry[];
  totalCaloriesOverride?: number | null;
};

const COMPONENT_COLORS = ["#38bdf8", "#a855f7", "#f97316", "#22c55e", "#eab308"];
const TAG_BG = "rgba(15, 23, 42, 0.9)";
const TEXT_MUTED = "#9ca3af";
const TEXT_PRIMARY = "#e5e7eb";

export const PlateComponentsSection: React.FC<Props> = ({
  title = "Plate components",
  components,
  totalCaloriesOverride,
}) => {
  const [selected, setSelected] = useState<PlateComponentEntry | null>(null);

  const {
    totalCalories,
    sortedComponents,
    kindSummaryLabel,
    shareSummaryLabel,
    isSingleComponent,
  } = useMemo(() => {
    if (!components || components.length === 0) {
      return {
        totalCalories: 0,
        sortedComponents: [] as PlateComponentEntry[],
        kindSummaryLabel: "",
        shareSummaryLabel: "",
        isSingleComponent: false,
      };
    }

    const totalCals =
      typeof totalCaloriesOverride === "number"
        ? totalCaloriesOverride
        : components.reduce((sum, c) => sum + (c.calories ?? 0), 0);

    const sorted = [...components].sort((a, b) => {
      const aMain = a.kind === "main" ? 0 : 1;
      const bMain = b.kind === "main" ? 0 : 1;
      if (aMain !== bMain) return aMain - bMain;
      const aShare = a.sharePercent ?? 0;
      const bShare = b.sharePercent ?? 0;
      return bShare - aShare;
    });

    const isSingle = sorted.length === 1;

    const kindCounts: Record<PlateComponentKind, number> = {
      main: 0,
      side: 0,
      drink: 0,
      sauce: 0,
      dessert: 0,
      other: 0,
    };
    sorted.forEach((c) => {
      kindCounts[c.kind] = (kindCounts[c.kind] ?? 0) + 1;
    });

    const kindPieces: string[] = [];
    if (kindCounts.main) kindPieces.push(plural(kindCounts.main, "main"));
    if (kindCounts.side) kindPieces.push(plural(kindCounts.side, "side"));
    if (kindCounts.drink) kindPieces.push(plural(kindCounts.drink, "drink"));
    if (kindCounts.dessert) kindPieces.push(plural(kindCounts.dessert, "dessert"));
    if (kindCounts.sauce) kindPieces.push(plural(kindCounts.sauce, "sauce"));

    const top2 = sorted.slice(0, 2);
    const sharePieces = top2
      .filter((c) => c.sharePercent != null)
      .map((c) => `${shortName(c.name)} ${Math.round(c.sharePercent as number)}%`);

    return {
      totalCalories: totalCals,
      sortedComponents: sorted,
      kindSummaryLabel: kindPieces.join(" · "),
      shareSummaryLabel: sharePieces.join(" • "),
      isSingleComponent: isSingle,
    };
  }, [components, totalCaloriesOverride]);

  if (!components || components.length === 0) {
    return null;
  }

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{title}</Text>
        {!isSingleComponent && (
          <Text style={styles.totalKcal}>
            {totalCalories ? `${Math.round(totalCalories)} kcal total` : "— kcal total"}
          </Text>
        )}
      </View>

      {!isSingleComponent && (kindSummaryLabel || shareSummaryLabel) && (
        <Text style={styles.subheader} numberOfLines={2}>
          {kindSummaryLabel ? kindSummaryLabel : ""}
          {kindSummaryLabel && shareSummaryLabel ? " • " : ""}
          {shareSummaryLabel}
        </Text>
      )}

      {!isSingleComponent && <PlateStackedBar components={components} />}

      <View style={styles.rowsContainer}>
        {sortedComponents.map((comp, index) => (
          <TouchableOpacity key={comp.id} activeOpacity={0.85} onPress={() => setSelected(comp)}>
            <ComponentRow
              component={comp}
              color={COMPONENT_COLORS[index % COMPONENT_COLORS.length]}
              isSingle={isSingleComponent}
            />
          </TouchableOpacity>
        ))}
      </View>

      <PlateComponentModal component={selected} onClose={() => setSelected(null)} />
    </View>
  );
};

const PlateStackedBar: React.FC<{ components: PlateComponentEntry[] }> = ({ components }) => {
  const totalShare = components.reduce((sum, c) => sum + (c.sharePercent ?? 0), 0) || 100;
  if (!components.length) return null;

  return (
    <View style={styles.barContainer}>
      <View style={styles.barTrack}>
        {components.map((c, index) => {
          const share = c.sharePercent ?? 0;
          const flex = Math.max(share / totalShare, 0.05);
          const color = COMPONENT_COLORS[index % COMPONENT_COLORS.length];

          return (
            <View key={c.id} style={[styles.barSegment, { flex, backgroundColor: color }]}>
              {share >= 20 && (
                <Text style={styles.barSegmentLabel} numberOfLines={1}>
                  {shortName(c.name)}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
};

const ComponentRow: React.FC<{ component: PlateComponentEntry; color: string; isSingle?: boolean }> = ({
  component,
  color,
  isSingle,
}) => {
  const {
    name,
    kind,
    calories,
    sharePercent,
    allergens,
    fodmapLevel = "unknown",
    lactoseLevel = "unknown",
  } = component;

  return (
    <View style={styles.componentRow}>
      <View style={styles.componentLeftBorder(color)} />
      <View style={styles.componentContent}>
        <View style={styles.rowTop}>
          <View style={styles.rowTopLeft}>
            <Text style={styles.componentName} numberOfLines={2}>
              {name}
            </Text>
            <View style={styles.kindBadge(kind)}>
              <Text style={styles.kindBadgeText}>{kindLabel(kind)}</Text>
            </View>
          </View>
          <Text style={styles.componentKcal}>
            {calories != null ? `${Math.round(calories)} kcal` : "— kcal"}
          </Text>
        </View>

        <View style={styles.rowBottom}>
          <Text style={styles.componentShare}>
            {sharePercent != null ? `≈${Math.round(sharePercent)}% of plate` : "Share unknown"}
          </Text>
          <View style={styles.tagsRow}>
            {allergens.map((a) => (
              <TagPill key={a} label={a} variant="allergen" />
            ))}
            {fodmapLevel !== "unknown" && (
              <TagPill label={`FODMAP: ${fodmapLevel}`} variant="level" level={fodmapLevel} />
            )}
            {lactoseLevel !== "unknown" && (
              <TagPill label={`Lactose: ${lactoseLevel}`} variant="level" level={lactoseLevel} />
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

type TagVariant = "allergen" | "level";
type LevelType = "low" | "medium" | "high" | "unknown";

const TagPill: React.FC<{ label: string; variant: TagVariant; level?: LevelType }> = ({
  label,
  variant,
  level = "unknown",
}) => {
  const { borderColor, textColor, bgColor } =
    variant === "allergen"
      ? {
          borderColor: "rgba(248, 113, 113, 0.6)",
          textColor: "#fecaca",
          bgColor: TAG_BG,
        }
      : level === "high"
      ? {
          borderColor: "rgba(248, 113, 113, 0.7)",
          textColor: "#fecaca",
          bgColor: TAG_BG,
        }
      : level === "medium"
      ? {
          borderColor: "rgba(251, 191, 36, 0.7)",
          textColor: "#fef3c7",
          bgColor: TAG_BG,
        }
      : {
          borderColor: "rgba(52, 211, 153, 0.7)",
          textColor: "#bbf7d0",
          bgColor: TAG_BG,
        };

  return (
    <View style={[styles.tagPill, { borderColor, backgroundColor: bgColor }]}>
      <Text style={[styles.tagPillText, { color: textColor }]}>{label}</Text>
    </View>
  );
};

const PlateComponentModal: React.FC<{ component: PlateComponentEntry | null; onClose: () => void }> =
  ({ component, onClose }) => {
    if (!component) return null;

    return (
      <Modal visible={!!component} animationType="slide" transparent onRequestClose={onClose}>
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalBackdrop} onPress={onClose} />
        </View>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <ScrollView
            contentContainerStyle={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.modalTitle}>{component.name}</Text>
            <Text style={styles.modalSubtitle}>
              {kindLabel(component.kind)} •{" "}
              {component.calories != null ? `${Math.round(component.calories)} kcal` : "kcal unknown"}
              {component.sharePercent != null ? ` • ~${Math.round(component.sharePercent)}% of plate` : ""}
            </Text>

            <View style={styles.modalTagRow}>
              {component.allergens.map((a) => (
                <TagPill key={a} label={a} variant="allergen" />
              ))}
            </View>

            <Text style={styles.modalSectionTitle}>Coming soon:</Text>
            <Text style={styles.modalBodyText}>
              Here we can show per-component macros, organ impact, and a simple control like “I didn&apos;t eat this
              side” or “½ portion”.
            </Text>

            <View style={styles.modalFooter}>
              <Pressable style={styles.modalCloseBtn} onPress={onClose}>
                <Text style={styles.modalCloseBtnText}>Close</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  };

const plural = (count: number, label: string) => (count === 1 ? `1 ${label}` : `${count} ${label}s`);

const shortName = (name: string) => {
  if (!name) return "";
  if (name.length <= 18) return name;
  return name.slice(0, 15).trimEnd() + "…";
};

const kindLabel = (kind: PlateComponentKind) => {
  switch (kind) {
    case "main":
      return "Main";
    case "side":
      return "Side";
    case "drink":
      return "Drink";
    case "sauce":
      return "Sauce";
    case "dessert":
      return "Dessert";
    default:
      return "Component";
  }
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#020617",
    marginTop: 12,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: TEXT_PRIMARY,
  },
  totalKcal: {
    fontSize: 13,
    color: TEXT_MUTED,
  },
  subheader: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginBottom: 8,
  },
  barContainer: {
    marginBottom: 10,
  },
  barTrack: {
    height: 16,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    flexDirection: "row",
  },
  barSegment: {
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  barSegmentLabel: {
    fontSize: 9,
    color: "#0f172a",
    fontWeight: "600",
  },
  rowsContainer: {
    gap: 8,
  },
  componentRow: {
    flexDirection: "row",
  },
  componentLeftBorder: (color: string) => ({
    width: 3,
    borderRadius: 999,
    backgroundColor: color,
    marginRight: 8,
  }),
  componentContent: {
    flex: 1,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(148, 163, 184, 0.35)",
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  rowTopLeft: {
    flex: 1,
    paddingRight: 8,
  },
  componentName: {
    fontSize: 14,
    fontWeight: "600",
    color: TEXT_PRIMARY,
  },
  kindBadge: (kind: PlateComponentKind) => ({
    alignSelf: "flex-start",
    marginTop: 3,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor:
      kind === "main"
        ? "rgba(56, 189, 248, 0.18)"
        : kind === "side"
        ? "rgba(168, 85, 247, 0.18)"
        : "rgba(148, 163, 184, 0.22)",
  }),
  kindBadgeText: {
    fontSize: 10,
    fontWeight: "500",
    color: TEXT_MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  componentKcal: {
    fontSize: 13,
    color: TEXT_PRIMARY,
    fontWeight: "500",
  },
  rowBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 2,
    gap: 8,
  },
  componentShare: {
    fontSize: 12,
    color: TEXT_MUTED,
    flexShrink: 0,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    justifyContent: "flex-end",
    flex: 1,
  },
  tagPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
  },
  tagPillText: {
    fontSize: 10,
    textTransform: "capitalize",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
  },
  modalSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "70%",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: "#020617",
  },
  modalHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(148, 163, 184, 0.6)",
    marginTop: 8,
    marginBottom: 4,
  },
  modalContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: TEXT_MUTED,
    marginBottom: 8,
  },
  modalTagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginBottom: 12,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  modalBodyText: {
    fontSize: 13,
    color: TEXT_MUTED,
  },
  modalFooter: {
    marginTop: 14,
    marginBottom: 6,
    alignItems: "flex-end",
  },
  modalCloseBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#0ea5e9",
  },
  modalCloseBtnText: {
    color: "#0b1120",
    fontWeight: "600",
    fontSize: 13,
  },
});
