import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { API_BASE_URL, AnalyzeDishResponse, analyzeDish } from '../api/api';
import BrainIcon from '../assets/images/brain_icon.png';
import GutIcon from '../assets/images/Gut_icon.png';
import HeartIcon from '../assets/images/heart_icon.png';
import ImmuneIcon from '../assets/images/Inmune_Icon.png';
import KidneyIcon from '../assets/images/kidney_icon.png';
import LiverIcon from '../assets/images/Liver_icon.png';
import MetabolicIcon from '../assets/images/Metabolic_Icon.png';
import { useUserPrefs } from '../context/UserPrefsContext';
import { buildDishViewModel } from './utils/dishViewModel';

const BG = '#020617';
const TEAL = '#14b8a6';
const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;
const USER_SELECTED_ALLERGENS: string[] = []; // TODO: wire from user profile/preferences

const getSeverityChipStyle = (severity: string) => {
  const s = (severity || '').toLowerCase();
  if (s.includes('generally safe') || s === 'safe') {
    return { backgroundColor: '#16a34a' };
  }
  if (s.includes('caution')) {
    return { backgroundColor: '#f59e0b' };
  }
  if (s.includes('avoid') || s === 'unsafe') {
    return { backgroundColor: '#ef4444' };
  }
  return { backgroundColor: '#4b5563' };
};

type MenuResponse = {
  restaurant?: {
    id?: string | number;
    name?: string;
    address?: string;
    imageUrl?: string | null;
    imageRef?: string | null;
  };
  sections?: Array<{
    id?: string | number;
    name?: string;
    items?: Array<MenuItem>;
  }>;
};

type MenuItem = {
  id?: string | number;
  name?: string;
  description?: string;
  menuDescription?: string;
  subtitle?: string;
  shortDescription?: string;
  rawDescription?: string;
  priceText?: string;
  restaurantCalories?: number | null;
  imageUrl?: string | null;
  [key: string]: any;
};

function buildPhotoUrl(photoRef?: string | null) {
  if (!photoRef) return null;
  const params = new URLSearchParams({
    maxwidth: '1200',
    photoreference: photoRef,
    key: GOOGLE_API_KEY || '',
  });
  return `https://maps.googleapis.com/maps/api/place/photo?${params.toString()}`;
}

export default function RestaurantScreen() {
  const router = useRouter();
  const { placeId, restaurantName, address, lat, lng } = useLocalSearchParams();
  const { selectedAllergens } = useUserPrefs();
  const scrollViewRef = useRef<ScrollView | null>(null);
  const itemLayouts = useRef<Record<string, number>>({});
  const [menu, setMenu] = useState<MenuResponse | null>(null);
  const [restaurant, setRestaurant] = useState<MenuResponse['restaurant'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [likedItemIds, setLikedItemIds] = useState<Set<string>>(new Set());
  const [analysisByItemId, setAnalysisByItemId] = useState<
    Record<string, AnalyzeDishResponse | null>
  >({});
  const [analysisLoadingByItemId, setAnalysisLoadingByItemId] = useState<Record<string, boolean>>(
    {}
  );
  const [focusedComponentIndex, setFocusedComponentIndex] = useState<number | null>(null);

  const placeIdValue = Array.isArray(placeId) ? placeId[0] : placeId;
  const restaurantNameValue = Array.isArray(restaurantName) ? restaurantName[0] : restaurantName;
  const addressValue = Array.isArray(address) ? address[0] : address;
  const latValueRaw = Array.isArray(lat) ? lat[0] : lat;
  const lngValueRaw = Array.isArray(lng) ? lng[0] : lng;

  // keep as strings for now (backend will parse to numbers)
  const latValue = latValueRaw ?? undefined;
  const lngValue = lngValueRaw ?? undefined;

  const organSeverityLabel = (severity: 'low' | 'medium' | 'high' | 'neutral') => severity;
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

  useEffect(() => {
    async function loadMenu() {
      setError(null);
      setLoading(true);
      try {
        const params = new URLSearchParams();

        if (placeIdValue) {
          params.append('placeId', String(placeIdValue));
        }
        if (restaurantNameValue) {
          params.append('restaurantName', String(restaurantNameValue));
        }
        if (addressValue) {
          params.append('address', String(addressValue));
        }
        if (latValue) {
          params.append('lat', String(latValue));
        }
        if (lngValue) {
          params.append('lng', String(lngValue));
        }

        const url = `${API_BASE_URL}/menu/extract?${params.toString()}`;
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }
        const data = await res.json();
        const normalizedSections = Array.isArray((data as any)?.sections)
          ? (data as any).sections.map((section: any) => ({
              ...section,
              items: Array.isArray(section?.items)
                ? section.items.map((item: any) => ({
                    ...item,
                    description: item?.description ?? item?.menuDescription ?? '',
                    menuDescription: item?.menuDescription ?? item?.description ?? '',
                    imageUrl: item?.imageUrl ?? null,
                  }))
                : [],
            }))
          : [];

        setMenu({
          ...(data as any),
          sections: normalizedSections,
        });
        setRestaurant((data as any)?.restaurant ?? null);
      } catch (e: any) {
        console.log('MENU ERROR:', e);
        setError('We couldn’t load this menu right now. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    if (placeIdValue) {
      loadMenu();
    } else {
      setError('We couldn’t load this menu right now. Please try again.');
      setLoading(false);
    }
  }, [placeIdValue, restaurantNameValue, addressValue, latValue, lngValue]);

  const runAnalysisForItem = async ({
    itemId,
    item,
    sectionName,
    descriptionText,
  }: {
    itemId: string;
    item: any;
    sectionName?: string;
    descriptionText: string;
  }) => {
    setAnalysisLoadingByItemId((prev) => ({ ...prev, [itemId]: true }));

    try {
      const result = await analyzeDish({
        dishName: item?.name,
        restaurantName: restaurant?.name || restaurantNameValue || restaurantName || null,
        description: descriptionText,
        menuSection: sectionName || '',
        priceText: item?.priceText || '',
        placeId: placeIdValue || placeId || null,
        source: 'edamam_recipe_card',
        restaurantCalories: item?.restaurantCalories,
        imageUrl: item?.imageUrl ?? null,
      });

      setAnalysisByItemId((prev) => ({
        ...prev,
        [itemId]: result,
      }));
    } catch (err) {
      console.error('Error calling analyzeDish', err);
      setAnalysisByItemId((prev) => ({
        ...prev,
        [itemId]: {
          ok: false,
          error: 'Analysis failed',
        } as AnalyzeDishResponse,
      }));
    } finally {
      setAnalysisLoadingByItemId((prev) => ({ ...prev, [itemId]: false }));
    }
  };

  const handleToggleAnalysis = async (itemId: string, item: any, sectionName?: string) => {
    if (!itemId) return;

    const descriptionText =
      item?.menuDescription ??
      item?.description ??
      item?.subtitle ??
      item?.shortDescription ??
      item?.rawDescription ??
      '';

    // Collapse if tapping the same expanded item
    if (expandedItemId === itemId) {
      setExpandedItemId(null);
      return;
    }

    // If analysis already loaded, just expand
    if (analysisByItemId[itemId]) {
      setExpandedItemId(itemId);
      return;
    }

    setExpandedItemId(itemId);
    await runAnalysisForItem({
      itemId,
      item,
      sectionName,
      descriptionText,
    });
  };

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
    gut: 'Gut',
    liver: 'Liver',
    heart: 'Heart',
    metabolic: 'Metabolic',
    immune: 'Immune',
    brain: 'Brain',
    kidney: 'Kidney',
  };

  const heroUrl = buildPhotoUrl(restaurant?.imageRef) || restaurant?.imageUrl || undefined;

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
        <ScrollView ref={scrollViewRef} contentContainerStyle={styles.content}>
          <TouchableOpacity style={styles.backRow} onPress={() => router.push('/')}>
            <Text style={styles.backText}>← Back to home</Text>
          </TouchableOpacity>

          {restaurant && (
            <View style={{ marginTop: 12, marginBottom: 8, marginHorizontal: -16 }}>
              <View
                style={{
                  overflow: 'hidden',
                }}
              >
                {heroUrl ? (
                  <ImageBackground
                    source={{ uri: heroUrl }}
                    style={{ height: 220, justifyContent: 'flex-end' }}
                  >
                    <View
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 16,
                        backgroundColor: 'rgba(0,0,0,0.35)',
                      }}
                    >
                      <Text
                        style={{
                          color: 'white',
                          fontSize: 24,
                          fontWeight: '700',
                        }}
                      >
                        {restaurant.name || restaurantNameValue || menu.restaurant?.name}
                      </Text>
                      <Text
                        style={{
                          color: '#f0f0f0',
                          fontSize: 14,
                          marginTop: 4,
                        }}
                        numberOfLines={1}
                      >
                        {restaurant.address || addressValue || menu.restaurant?.address}
                      </Text>
                    </View>
                  </ImageBackground>
                ) : (
                  <View style={{ padding: 16 }}>
                    <Text style={{ fontSize: 24, fontWeight: '700', color: '#ffffff' }}>
                      {restaurant.name || restaurantNameValue || menu.restaurant?.name}
                    </Text>
                    <Text style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
                      {restaurant.address || addressValue || menu.restaurant?.address}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {menu.sections.map((section) => (
            <View key={section.id || section.name} style={{ marginTop: 16 }}>
              {section.name ? <Text style={styles.sectionTitle}>{section.name}</Text> : null}

              {section.items?.map((item: any, index: number) => {
                const itemId = String(item?.id ?? item?.name ?? `${section.id}-${index}`);
                const isExpanded = expandedItemId === itemId;

                const analysis = analysisByItemId[itemId];
                const isAnalysisLoading = !!analysisLoadingByItemId[itemId];
                const viewModel =
                  analysis && analysis.ok ? buildDishViewModel(analysis, selectedAllergens) : null;
                const descriptionText =
                  item?.menuDescription ??
                  item?.description ??
                  item?.subtitle ??
                  item?.shortDescription ??
                  item?.rawDescription ??
                  '';

                if (item?.name && item.name.toLowerCase().includes('egg mcmuffin')) {
                  console.log('DEBUG MENU ITEM – Egg McMuffin', item, Object.keys(item || {}));
                }

                return (
                  <View
                    key={itemId}
                    style={styles.card}
                    onLayout={(e) => {
                      itemLayouts.current[itemId] = e.nativeEvent.layout.y;
                    }}
                  >
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
                            name={likedItemIds.has(itemId) ? 'heart' : 'heart-outline'}
                            size={22}
                            color={likedItemIds.has(itemId) ? '#f97373' : '#ffffff'}
                          />
                        </TouchableOpacity>
                      </View>
                    ) : null}

                    <Text style={styles.itemName} numberOfLines={2}>
                      {item?.name}
                    </Text>

                    {descriptionText ? (
                      <Text style={styles.dishDescription} numberOfLines={isExpanded ? 0 : 3}>
                        {descriptionText}
                      </Text>
                    ) : null}

                    {!!item?.priceText && <Text style={styles.itemPrice}>{item.priceText}</Text>}

                    <TouchableOpacity
                      onPress={() => handleToggleAnalysis(String(itemId), item, section.name || '')}
                    >
                      <Text style={styles.showMoreText}>
                        {isExpanded ? 'Hide analysis…' : 'Show analysis…'}
                      </Text>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.expandedVerdictContainer}>
                        {isAnalysisLoading && (
                          <Text style={styles.verdictBodyText}>
                            Analyzing this dish with Tummy Buddy…
                          </Text>
                        )}

                        {!isAnalysisLoading && !analysis && (
                          <Text style={styles.verdictBodyText}>
                            Analysis not available yet. Tap “Show analysis…” to try again.
                          </Text>
                        )}

                        {!isAnalysisLoading && analysis && !analysis.ok && (
                          <Text style={styles.verdictBodyText}>
                            Analysis failed or is unavailable for this dish.
                          </Text>
                        )}

                        {!isAnalysisLoading && viewModel && (
                          <>
                            {viewModel.plateComponents && viewModel.plateComponents.length > 0 && (
                              <View style={styles.focusChipsRow}>
                                <ScrollView
                                  horizontal
                                  showsHorizontalScrollIndicator={false}
                                  contentContainerStyle={styles.focusChipsContent}
                                >
                                  <TouchableOpacity
                                    onPress={() => setFocusedComponentIndex(null)}
                                    style={[
                                      styles.focusChip,
                                      (focusedComponentIndex === null ||
                                        focusedComponentIndex < 0 ||
                                        focusedComponentIndex >=
                                          viewModel.plateComponents.length) &&
                                        styles.focusChipActive,
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.focusChipText,
                                        (focusedComponentIndex === null ||
                                          focusedComponentIndex < 0 ||
                                          focusedComponentIndex >=
                                            viewModel.plateComponents.length) &&
                                          styles.focusChipTextActive,
                                      ]}
                                    >
                                      Whole plate
                                    </Text>
                                  </TouchableOpacity>
                                  {viewModel.plateComponents.map((pc, idx) => {
                                    const isActive = focusedComponentIndex === idx;
                                    return (
                                      <TouchableOpacity
                                        key={`focus-${idx}`}
                                        onPress={() => setFocusedComponentIndex(idx)}
                                        style={[
                                          styles.focusChip,
                                          isActive && styles.focusChipActive,
                                        ]}
                                      >
                                        <Text
                                          style={[
                                            styles.focusChipText,
                                            isActive && styles.focusChipTextActive,
                                          ]}
                                        >
                                          {pc.component || `Item ${idx + 1}`}
                                        </Text>
                                      </TouchableOpacity>
                                    );
                                  })}
                                </ScrollView>
                                <Text style={styles.focusHint}>
                                  Tap a component to see allergens and nutrition just for that item.
                                </Text>
                              </View>
                            )}

                            {(() => {
                              const hasComponents =
                                viewModel.plateComponents && viewModel.plateComponents.length > 0;
                              const activeComponent =
                                hasComponents &&
                                focusedComponentIndex !== null &&
                                focusedComponentIndex >= 0 &&
                                focusedComponentIndex < (viewModel.plateComponents?.length || 0)
                                  ? viewModel.plateComponents![focusedComponentIndex]
                                  : null;
                              const activeComponentAllergens =
                                viewModel.componentAllergens &&
                                focusedComponentIndex !== null &&
                                focusedComponentIndex >= 0 &&
                                viewModel.componentAllergens.length > focusedComponentIndex
                                  ? viewModel.componentAllergens[focusedComponentIndex]
                                  : null;
                              const isWholePlateFocus =
                                !hasComponents ||
                                focusedComponentIndex === null ||
                                focusedComponentIndex < 0 ||
                                focusedComponentIndex >= (viewModel.plateComponents?.length || 0);
                              const activeAllergenPills = isWholePlateFocus
                                ? viewModel.allergens
                                : activeComponentAllergens?.allergenPills || viewModel.allergens;
                              const activeAllergenTitleSuffix = isWholePlateFocus
                                ? ''
                                : activeComponent
                                ? ` (${activeComponent.component} only)`
                                : '';
                              const activeAllergenSentence = (() => {
                                if (isWholePlateFocus || !activeComponentAllergens) {
                                  return viewModel.allergenSentence;
                                }
                                const names = activeComponentAllergens.allergenPills
                                  ?.map((p) => p.name)
                                  .join(', ');
                                if (!names) {
                                  return `Allergens for ${activeComponentAllergens.component} only.`;
                                }
                                return `Contains ${names} for ${activeComponentAllergens.component} only.`;
                              })();

                              const activeFodmapLevel = isWholePlateFocus
                                ? viewModel.fodmapLevel
                                : activeComponentAllergens?.fodmapLevel || viewModel.fodmapLevel;
                              const activeFodmapSentence = (() => {
                                if (isWholePlateFocus || !activeComponentAllergens) {
                                  return viewModel.fodmapSentence;
                                }
                                if (!activeComponentAllergens.fodmapLevel) {
                                  return viewModel.fodmapSentence;
                                }
                                return `FODMAP for ${activeComponentAllergens.component}: ${activeComponentAllergens.fodmapLevel}.`;
                              })();

                              const fodmapLevelScore = (level?: string | null): number => {
                                switch (level) {
                                  case 'low':
                                    return 1;
                                  case 'medium':
                                    return 2;
                                  case 'high':
                                    return 3;
                                  default:
                                    return 0;
                                }
                              };

                              let sideFodmapWarning: string | null = null;

                              if (
                                isWholePlateFocus &&
                                viewModel.componentAllergens &&
                                viewModel.componentAllergens.length > 0 &&
                                viewModel.plateComponents &&
                                viewModel.plateComponents.length ===
                                  viewModel.componentAllergens.length
                              ) {
                                const wholeScore = fodmapLevelScore(viewModel.fodmapLevel);

                                let bestSideIndex: number | null = null;
                                let bestSideScore = 0;

                                viewModel.componentAllergens.forEach((ca, idx) => {
                                  const comp = viewModel.plateComponents![idx];
                                  if (!comp || comp.role !== 'side') return;
                                  const s = fodmapLevelScore(ca.fodmapLevel);
                                  if (s > bestSideScore) {
                                    bestSideScore = s;
                                    bestSideIndex = idx;
                                  }
                                });

                                if (bestSideIndex !== null && bestSideScore > wholeScore) {
                                  const comp = viewModel.componentAllergens[bestSideIndex];
                                  const name = comp?.component || 'this side';
                                  sideFodmapWarning = `FODMAP risk is mostly driven by ${name}.`;
                                }
                              }

                              const activeNutrition = (() => {
                                if (isWholePlateFocus || !activeComponent || !viewModel.nutrition) {
                                  return viewModel.nutrition;
                                }
                                return {
                                  calories:
                                    activeComponent.energyKcal ?? viewModel.nutrition.calories,
                                  protein: activeComponent.protein_g ?? viewModel.nutrition.protein,
                                  carbs: activeComponent.carbs_g ?? viewModel.nutrition.carbs,
                                  fat: activeComponent.fat_g ?? viewModel.nutrition.fat,
                                  sugar: activeComponent.sugar_g ?? viewModel.nutrition.sugar,
                                  fiber: activeComponent.fiber_g ?? viewModel.nutrition.fiber,
                                  sodium: activeComponent.sodium_mg ?? viewModel.nutrition.sodium,
                                };
                              })();
                              const activeNutritionSubtitle =
                                !isWholePlateFocus && activeComponent
                                  ? `${activeComponent.component} only`
                                  : undefined;

                              return (
                                <>
                                  {/* 1) Allergens row */}
                                  <View style={styles.sectionBlock}>
                                    <Text style={styles.sectionTitle}>
                                      Allergens{activeAllergenTitleSuffix}
                                    </Text>
                                    <View style={styles.pillRow}>
                                      {activeAllergenPills.length === 0 && (
                                        <View
                                          style={[styles.allergenPill, styles.allergenPillNeutral]}
                                        >
                                          <Text style={styles.allergenPillText}>None detected</Text>
                                        </View>
                                      )}
                                      {activeAllergenPills.map((pill) => {
                                        const isSelected = pill.isUserAllergen;
                                        return (
                                          <View
                                            key={pill.name}
                                            style={[
                                              styles.allergenPill,
                                              isSelected && styles.allergenPillSelected,
                                            ]}
                                          >
                                            <Text
                                              style={
                                                isSelected
                                                  ? styles.allergenPillTextSelected
                                                  : styles.allergenPillText
                                              }
                                            >
                                              {pill.name}
                                            </Text>
                                          </View>
                                        );
                                      })}
                                    </View>
                                    {activeAllergenSentence ? (
                                      <Text style={styles.sectionBody}>
                                        {activeAllergenSentence}
                                      </Text>
                                    ) : null}
                                    <Text style={styles.allergenDisclaimer}>
                                      Based on recipe analysis and external ingredient data.
                                      Ingredients may vary by restaurant—always confirm if you have
                                      a severe allergy.
                                    </Text>
                                  </View>

                                  {/* 2) FODMAP row */}
                                  <View style={styles.sectionBlock}>
                                    <View style={styles.sectionHeaderRow}>
                                      <Text style={styles.sectionTitle}>FODMAP / IBS</Text>
                                    </View>
                                    {activeFodmapLevel ? (
                                      <View style={styles.fodmapLevelBadge}>
                                        <Text style={styles.fodmapLevelText}>
                                          {activeFodmapLevel.toLowerCase()}
                                        </Text>
                                      </View>
                                    ) : null}
                                    {viewModel?.fodmapPills && viewModel.fodmapPills.length > 0 ? (
                                      <View style={styles.pillRow}>
                                        {viewModel.fodmapPills.map((name) => (
                                          <View key={name} style={styles.fodmapPill}>
                                            <Text style={styles.fodmapPillText}>{name}</Text>
                                          </View>
                                        ))}
                                      </View>
                                    ) : null}
                                    {activeFodmapSentence ? (
                                      <Text style={styles.sectionBody}>{activeFodmapSentence}</Text>
                                    ) : null}
                                    {isWholePlateFocus && sideFodmapWarning && (
                                      <Text style={styles.sideFodmapWarningText}>
                                        {sideFodmapWarning}
                                      </Text>
                                    )}
                                    <Text style={styles.lifestyleDisclaimer}>
                                      Lifestyle tags are inferred from dish name, description, and
                                      typical recipes.
                                    </Text>
                                  </View>

                                  {/* 2.5) Diet & lifestyle */}
                                  <View style={styles.dietTagsSection}>
                                    <Text style={styles.sectionTitle}>Diet & lifestyle</Text>

                                    {viewModel.dietTags && viewModel.dietTags.length > 0 ? (
                                      <View style={styles.dietTagsRow}>
                                        {viewModel.dietTags.map((label) => (
                                          <View key={label} style={styles.dietTagChip}>
                                            <Text style={styles.dietTagText}>{label}</Text>
                                          </View>
                                        ))}
                                      </View>
                                    ) : (
                                      <Text style={styles.dietTagsEmptyText}>
                                        No specific diet or lifestyle tags available for this dish
                                        yet.
                                      </Text>
                                    )}
                                  </View>

                                  {/* 3) Organ impact list */}
                                  <View style={styles.organSection}>
                                    <Text style={styles.sectionTitle}>
                                      Organ impact (whole plate)
                                    </Text>
                                    <View style={styles.organListCard}>
                                      {viewModel.organLines.map((line, idx) => {
                                        const organKey = line.organKey.toLowerCase();
                                        const iconSource =
                                          ORGAN_ICONS[organKey as keyof typeof ORGAN_ICONS];
                                        const isLast = idx === viewModel.organLines.length - 1;
                                        return (
                                          <View
                                            key={line.organKey}
                                            style={[
                                              styles.organImpactRow,
                                              !isLast && styles.organRowDividerCompact,
                                            ]}
                                          >
                                            <View style={styles.organIconBox}>
                                              {iconSource ? (
                                                <Image
                                                  source={iconSource}
                                                  style={styles.organImpactIcon}
                                                />
                                              ) : (
                                                <Text style={{ color: '#fff' }}>
                                                  {line.organLabel?.[0] || 'O'}
                                                </Text>
                                              )}
                                            </View>
                                            <View style={styles.organImpactContent}>
                                              <View style={styles.organHeaderLine}>
                                                <Text style={styles.organName}>
                                                  {line.organLabel}
                                                </Text>
                                                <View
                                                  style={[
                                                    styles.organBadge,
                                                    organSeverityStyle(line.severity),
                                                  ]}
                                                >
                                                  <Text style={styles.organBadgeText}>
                                                    {organSeverityLabel(line.severity)}
                                                  </Text>
                                                </View>
                                              </View>
                                              <Text style={styles.organEffect}>
                                                {line.sentence || 'Organ impact details to follow.'}
                                              </Text>
                                            </View>
                                          </View>
                                        );
                                      })}
                                    </View>
                                  </View>

                                  {viewModel?.plateComponents &&
                                    viewModel.plateComponents.length > 0 && (
                                      <View style={styles.sectionBlock}>
                                        <Text style={styles.sectionTitle}>Plate components</Text>
                                        {viewModel.plateComponentsSummary ? (
                                          <Text style={styles.sectionBody}>
                                            {viewModel.plateComponentsSummary}
                                          </Text>
                                        ) : null}
                                        {viewModel.plateComponents.map((pc, idx) => {
                                          const compAllergens = viewModel.componentAllergens?.[idx];
                                          return (
                                            <View
                                              key={`pc-${idx}`}
                                              style={styles.plateComponentRow}
                                            >
                                              <View style={styles.plateComponentMain}>
                                                <Text style={styles.plateComponentName}>
                                                  {pc.component}
                                                  {pc.role && pc.role !== 'unknown'
                                                    ? ` (${pc.role})`
                                                    : ''}
                                                </Text>
                                                {typeof pc.shareRatio === 'number' &&
                                                pc.shareRatio > 0 ? (
                                                  <Text style={styles.plateComponentMeta}>
                                                    ~{Math.round(pc.shareRatio * 100)}% of plate
                                                  </Text>
                                                ) : null}
                                              </View>
                                              <View style={styles.plateComponentMacros}>
                                                {typeof pc.energyKcal === 'number' &&
                                                pc.energyKcal > 0 ? (
                                                  <Text style={styles.plateComponentMacro}>
                                                    {Math.round(pc.energyKcal)} kcal
                                                  </Text>
                                                ) : null}
                                              </View>
                                              {compAllergens && (
                                                <View style={styles.plateComponentAllergens}>
                                                  {compAllergens.allergenPills &&
                                                    compAllergens.allergenPills.length > 0 && (
                                                      <View style={styles.plateComponentPillsRow}>
                                                        {compAllergens.allergenPills.map(
                                                          (pill, pillIdx) => (
                                                            <View
                                                              key={`pc-pill-${idx}-${pillIdx}`}
                                                              style={styles.allergenPill}
                                                            >
                                                              <Text style={styles.allergenPillText}>
                                                                {pill.name}
                                                                {pill.present === 'maybe'
                                                                  ? ' (?)'
                                                                  : ''}
                                                              </Text>
                                                            </View>
                                                          )
                                                        )}
                                                      </View>
                                                    )}

                                                  {(compAllergens.fodmapLevel ||
                                                    compAllergens.lactoseLevel) && (
                                                    <Text style={styles.plateComponentFodmapText}>
                                                      {compAllergens.fodmapLevel
                                                        ? `FODMAP: ${compAllergens.fodmapLevel}`
                                                        : ''}
                                                      {compAllergens.fodmapLevel &&
                                                      compAllergens.lactoseLevel
                                                        ? ' · '
                                                        : ''}
                                                      {compAllergens.lactoseLevel
                                                        ? `Lactose: ${compAllergens.lactoseLevel}`
                                                        : ''}
                                                    </Text>
                                                  )}
                                                </View>
                                              )}
                                            </View>
                                          );
                                        })}
                                      </View>
                                    )}

                                  {viewModel?.portion &&
                                    viewModel.portion.effectiveFactor !== 1 && (
                                      <View style={{ marginTop: 4 }}>
                                        <Text style={{ fontSize: 12, opacity: 0.8 }}>
                                          Portion (AI estimate):{' '}
                                          <Text style={{ fontWeight: '600' }}>
                                            {viewModel.portion.effectiveFactor.toFixed(2)}× typical
                                            serving
                                          </Text>
                                        </Text>
                                      </View>
                                    )}
                                  {viewModel?.portionVision && (
                                    <View style={{ marginTop: 4 }}>
                                      <Text style={{ fontSize: 11, opacity: 0.6 }}>
                                        {viewModel.portionVision.hasImage
                                          ? `Photo-based portion: ${viewModel.portionVision.factor.toFixed(
                                              2
                                            )}× · ${Math.round(
                                              viewModel.portionVision.confidence * 100
                                            )}% confidence`
                                          : `Estimated portion: ${viewModel.portionVision.factor.toFixed(
                                              2
                                            )}×`}
                                      </Text>
                                      {viewModel.portionVision.reason ? (
                                        <Text style={{ fontSize: 11, opacity: 0.5 }}>
                                          {viewModel.portionVision.reason}
                                        </Text>
                                      ) : null}
                                    </View>
                                  )}

                                  {/* 4) Nutrition facts */}
                                  <View style={styles.nutritionSection}>
                                    <Text style={styles.sectionTitle}>
                                      Nutrition facts (per serving, estimate)
                                    </Text>
                                    {activeNutritionSubtitle ? (
                                      <Text style={styles.sectionBody}>
                                        {activeNutritionSubtitle}
                                      </Text>
                                    ) : null}
                                    {viewModel.nutrition && viewModel.nutritionSource
                                      ? console.log(
                                          'TB nutrition source:',
                                          viewModel.nutritionSource
                                        )
                                      : null}
                                    {activeNutrition ? (
                                      <>
                                        <View style={styles.nutritionGrid}>
                                          <View style={styles.nutritionTile}>
                                            <Text style={styles.nutritionLabel}>Calories</Text>
                                            <Text style={styles.nutritionValue}>
                                              {activeNutrition.calories != null
                                                ? Math.round(activeNutrition.calories)
                                                : '--'}
                                            </Text>
                                          </View>
                                          <View style={styles.nutritionTile}>
                                            <Text style={styles.nutritionLabel}>Protein</Text>
                                            <Text style={styles.nutritionValue}>
                                              {activeNutrition.protein != null
                                                ? `${Math.round(activeNutrition.protein)} g`
                                                : '--'}
                                            </Text>
                                          </View>
                                          <View style={styles.nutritionTile}>
                                            <Text style={styles.nutritionLabel}>Carbs</Text>
                                            <Text style={styles.nutritionValue}>
                                              {activeNutrition.carbs != null
                                                ? `${Math.round(activeNutrition.carbs)} g`
                                                : '--'}
                                            </Text>
                                          </View>
                                          <View style={styles.nutritionTile}>
                                            <Text style={styles.nutritionLabel}>Fat</Text>
                                            <Text style={styles.nutritionValue}>
                                              {activeNutrition.fat != null
                                                ? `${Math.round(activeNutrition.fat)} g`
                                                : '--'}
                                            </Text>
                                          </View>
                                          <View style={styles.nutritionTile}>
                                            <Text style={styles.nutritionLabel}>Sugar</Text>
                                            <Text style={styles.nutritionValue}>
                                              {activeNutrition.sugar != null
                                                ? `${Math.round(activeNutrition.sugar)} g`
                                                : '--'}
                                            </Text>
                                          </View>
                                          <View style={styles.nutritionTile}>
                                            <Text style={styles.nutritionLabel}>Fiber</Text>
                                            <Text style={styles.nutritionValue}>
                                              {activeNutrition.fiber != null
                                                ? `${Math.round(activeNutrition.fiber)} g`
                                                : '--'}
                                            </Text>
                                          </View>
                                          <View style={styles.nutritionTile}>
                                            <Text style={styles.nutritionLabel}>Sodium</Text>
                                            <Text style={styles.nutritionValue}>
                                              {activeNutrition.sodium != null
                                                ? `${Math.round(activeNutrition.sodium)} mg`
                                                : '--'}
                                            </Text>
                                          </View>
                                        </View>
                                        {viewModel.nutritionSourceLabel ? (
                                          <Text style={styles.nutritionSourceLabel}>
                                            {viewModel.nutritionSourceLabel}
                                          </Text>
                                        ) : null}
                                        {viewModel.nutritionInsights ? (
                                          <View style={styles.nutritionInsightsBox}>
                                            {!!viewModel.nutritionInsights.summary && (
                                              <Text style={styles.nutritionInsightsSummary}>
                                                {viewModel.nutritionInsights.summary}
                                              </Text>
                                            )}
                                            {viewModel.nutritionInsights.highlights
                                              ?.slice(0, 2)
                                              .map((line: string, idx: number) => (
                                                <Text
                                                  key={`ni-hi-${idx}`}
                                                  style={styles.nutritionInsightsHighlight}
                                                >
                                                  • {line}
                                                </Text>
                                              ))}
                                            {viewModel.nutritionInsights.cautions
                                              ?.slice(0, 1)
                                              .map((line: string, idx: number) => (
                                                <Text
                                                  key={`ni-c-${idx}`}
                                                  style={styles.nutritionInsightsCaution}
                                                >
                                                  ⚠ {line}
                                                </Text>
                                              ))}
                                          </View>
                                        ) : null}
                                      </>
                                    ) : (
                                      <Text style={styles.nutritionUnavailable}>
                                        Nutrition details are not available for this dish yet.
                                      </Text>
                                    )}
                                    <Text style={styles.nutritionDisclaimer}>
                                      Nutrition values are estimates based on recipe analysis and
                                      nutrition databases, not official restaurant labels.
                                    </Text>
                                  </View>
                                </>
                              );
                            })()}
                          </>
                        )}
                        {/* Buttons */}
                        <View style={styles.buttonRow}>
                          <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={() => {
                              console.log('Log meal pressed', {
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
                              console.log('Likely recipe coming soon for dish:', item?.name);
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

        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.bottomNavItem} onPress={() => router.push('/')}>
            <Ionicons name="home" size={22} color="#ffffff" />
            <Text style={styles.bottomNavText}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bottomNavItem}
            onPress={() => router.push('/(tabs)/explore')}
          >
            <Ionicons name="bar-chart-outline" size={22} color="#ffffff" />
            <Text style={styles.bottomNavText}>Tracker</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bottomNavItem} onPress={() => router.push('/profile')}>
            <Ionicons name="person-circle" size={22} color="#ffffff" />
            <Text style={styles.bottomNavText}>Profile</Text>
          </TouchableOpacity>
        </View>
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
    paddingBottom: 140,
  },
  backRow: {
    marginBottom: 12,
  },
  backText: {
    fontSize: 14,
    fontWeight: '700',
    color: TEAL,
  },
  headerName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
  },
  headerAddress: {
    marginTop: 4,
    fontSize: 14,
    color: '#9ca3af',
  },
  sectionTitle: {
    marginTop: 16,
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  card: {
    backgroundColor: '#020819',
    borderRadius: 24,
    padding: 16,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  imageWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 12,
  },
  itemImage: {
    width: '100%',
    height: 240,
    resizeMode: 'cover',
  },
  heartButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#00000066',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 22,
  },
  itemPrice: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: '600',
    color: '#d1d5db',
  },
  dishDescription: {
    marginTop: 6,
    fontSize: 16,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.75)',
  },
  showMoreText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: TEAL,
  },
  verdictTitle: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  verdictText: {
    marginTop: 4,
    fontSize: 14,
    color: '#9ca3af',
  },
  verdictBodyText: {
    marginTop: 8,
    fontSize: 13,
    color: '#9ca3af',
  },
  buttonRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: TEAL,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: '#020617',
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: TEAL,
    backgroundColor: 'transparent',
  },
  secondaryButtonText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: TEAL,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: BG,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  loadingSubtext: {
    marginTop: 4,
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#f97373',
    textAlign: 'center',
  },
  expandedVerdictContainer: {
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#111827',
  },
  tbHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 10,
  },
  sectionTextCol: {
    flex: 1,
  },
  chipContainer: {
    alignItems: 'flex-end',
  },
  sectionBody: {
    marginTop: 4,
    fontSize: 13,
    color: '#9ca3af',
  },
  sectionBlock: {
    marginTop: 10,
    marginBottom: 6,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    color: '#020617',
    fontWeight: '800',
    overflow: 'hidden',
  },
  allergenPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    marginBottom: 2,
  },
  allergenPill: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 999,
    marginRight: 4,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  allergenPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
  },
  allergenPillUser: {
    backgroundColor: '#F97373',
    borderColor: '#F97373',
  },
  allergenPillOther: {
    backgroundColor: '#4b5563',
  },
  allergenPillNeutral: {
    backgroundColor: '#374151',
  },
  allergenPillSelected: {
    backgroundColor: '#F97373',
    borderColor: '#F97373',
  },
  allergenPillTextSelected: {
    color: '#0B1120',
    fontWeight: '600',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    marginBottom: 4,
  },
  fodmapLevelBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#6B7280',
    marginTop: 4,
    marginBottom: 4,
  },
  fodmapLevelText: {
    color: '#F9FAFB',
    fontWeight: '600',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  fodmapPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#4B5563',
    marginRight: 8,
    marginBottom: 8,
  },
  fodmapPillText: {
    color: '#E5E7EB',
    fontSize: 13,
  },
  chipSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: '700',
    color: '#020617',
  },
  organSection: {
    marginTop: 10,
  },
  organListCard: {
    marginTop: 8,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  organImpactRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.3)',
  },
  organRowDividerCompact: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  organIconBox: {
    marginRight: 12,
    marginTop: 4,
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  organImpactIcon: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  organImpactContent: {
    flex: 1,
  },
  organHeaderLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  organName: {
    color: '#fefefe',
    fontWeight: '700',
    fontSize: 16,
  },
  organBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  organBadgeText: {
    color: '#0B1120',
    fontWeight: '600',
    fontSize: 12,
    textTransform: 'lowercase',
  },
  organBadgeLow: {
    backgroundColor: '#14B8A6',
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
  organEffect: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 17,
  },
  nutritionSection: {
    marginTop: 10,
  },
  plateComponentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  plateComponentMain: {
    flex: 1,
    marginRight: 8,
  },
  plateComponentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  plateComponentMeta: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  plateComponentMacros: {
    alignItems: 'flex-end',
  },
  plateComponentMacro: {
    fontSize: 12,
    fontWeight: '500',
    color: '#e5e7eb',
  },
  plateComponentAllergens: {
    marginTop: 4,
  },
  plateComponentPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 2,
  },
  plateComponentFodmapText: {
    fontSize: 11,
    color: '#9ca3af',
  },
  focusChipsRow: {
    marginTop: 8,
    marginBottom: 4,
  },
  focusChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#444',
    marginRight: 6,
  },
  focusChipActive: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  focusChipText: {
    fontSize: 12,
    color: '#cccccc',
  },
  focusChipTextActive: {
    color: '#000000',
  },
  focusChipsContent: {
    paddingHorizontal: 4,
  },
  focusHint: {
    fontSize: 11,
    color: '#888888',
    marginTop: 4,
  },
  sideFodmapWarningText: {
    fontSize: 11,
    color: '#f0c36a',
    marginTop: 4,
  },
  nutritionGrid: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  nutritionTile: {
    width: '48%',
    backgroundColor: '#020819',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  nutritionLabel: {
    fontSize: 12,
    color: '#9ca3af',
  },
  nutritionValue: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  nutritionUnavailable: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  dietTagsSection: {
    marginTop: 12,
  },
  dietTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  dietTagChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#eee',
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
  allergenDisclaimer: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
  },
  nutritionDisclaimer: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
  },
  lifestyleDisclaimer: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
  },
  nutritionInsightsBox: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
  },
  nutritionSourceLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
  },
  nutritionInsightsSummary: {
    color: '#e5e7eb',
    fontSize: 13,
    marginBottom: 4,
  },
  nutritionInsightsHighlight: {
    color: '#cbd5e1',
    fontSize: 12,
    marginBottom: 2,
  },
  nutritionInsightsCaution: {
    color: '#fbbf24',
    fontSize: 12,
    marginTop: 4,
  },
  bottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#050509',
    borderTopWidth: 1,
    borderTopColor: '#1f2230',
  },
  bottomNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bottomNavText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
});
