import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Design tokens
const COLORS = {
  background: '#020617',
  cardSurface: 'rgba(15, 23, 42, 0.95)',
  border: '#1e293b',
  textPrimary: '#FFFFFF',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  brandTeal: '#14b8a6',
  brandTealLight: '#2dd4bf',
  chipBg: 'rgba(30, 41, 59, 0.8)',
  chipBgActive: 'rgba(20, 184, 166, 0.2)',
  chipBorder: '#475569',
  chipBorderActive: '#14b8a6',
};

export type CourseType = 'entree' | 'appetizer' | 'dessert' | 'drink' | 'side' | 'unknown';
export type PortionMode = 'preset' | 'custom' | 'shared' | 'leftovers' | 'count';

export interface PortionData {
  portionPercent: number;
  portionMultiplier: number;
  sharedWithCount: number | null;
  leftoversSaved: boolean;
  portionMode: PortionMode;
  countEaten?: number | null;
  countTotal?: number | null;
}

interface PortionSheetProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (data: PortionData) => void;
  initialPortionPercent?: number;
  initialSharedWithCount?: number | null;
  initialLeftoversSaved?: boolean;
  courseType?: CourseType;
  dishName?: string;
}

type PresetValue = 100 | 75 | 50 | 15 | 'custom';

const PRESETS: { label: string; value: PresetValue; icon?: string }[] = [
  { label: 'All', value: 100 },
  { label: 'Most', value: 75 },
  { label: 'Half', value: 50 },
  { label: 'Few bites', value: 15 },
  { label: 'Custom', value: 'custom', icon: 'options-outline' },
];

const SHARE_COUNTS = [2, 3, 4, 5] as const;

const LEFTOVER_OPTIONS: { label: string; leftPercent: number }[] = [
  { label: 'Left 25%', leftPercent: 25 },
  { label: 'Left 50%', leftPercent: 50 },
  { label: 'Left 75%', leftPercent: 75 },
];

function getDefaultPortionPercent(courseType: CourseType): number {
  switch (courseType) {
    case 'appetizer':
    case 'dessert':
      return 50;
    default:
      return 100;
  }
}

function formatPortionLabel(percent: number, sharedWithCount: number | null): string {
  if (sharedWithCount && sharedWithCount > 1) {
    return `Shared (${sharedWithCount})`;
  }
  if (percent === 100) return '100%';
  if (percent === 75) return '75%';
  if (percent === 50) return '1/2';
  if (percent === 25) return '1/4';
  if (percent === 33) return '1/3';
  return `${percent}%`;
}

export function getPortionDisplayLabel(
  portionPercent: number,
  sharedWithCount: number | null
): string {
  return formatPortionLabel(portionPercent, sharedWithCount);
}

export const PortionSheet: React.FC<PortionSheetProps> = ({
  visible,
  onClose,
  onConfirm,
  initialPortionPercent,
  initialSharedWithCount = null,
  initialLeftoversSaved = false,
  courseType = 'unknown',
  dishName,
}) => {
  const insets = useSafeAreaInsets();

  // Derive default based on course type
  const defaultPercent = initialPortionPercent ?? getDefaultPortionPercent(courseType);

  const [portionPercent, setPortionPercent] = useState(defaultPercent);
  const [selectedPreset, setSelectedPreset] = useState<PresetValue | null>(
    PRESETS.find((p) => p.value === defaultPercent)?.value ?? null
  );
  const [showCustomSlider, setShowCustomSlider] = useState(false);
  const [sharedEnabled, setSharedEnabled] = useState(!!initialSharedWithCount);
  const [sharedWithCount, setSharedWithCount] = useState<number | null>(initialSharedWithCount);
  const [leftoversEnabled, setLeftoversEnabled] = useState(initialLeftoversSaved);
  const [portionMode, setPortionMode] = useState<PortionMode>('preset');

  // Reset state when sheet opens
  useEffect(() => {
    if (visible) {
      const defPercent = initialPortionPercent ?? getDefaultPortionPercent(courseType);
      setPortionPercent(defPercent);
      setSelectedPreset(PRESETS.find((p) => p.value === defPercent)?.value ?? null);
      setShowCustomSlider(false);
      setSharedEnabled(!!initialSharedWithCount);
      setSharedWithCount(initialSharedWithCount ?? null);
      setLeftoversEnabled(initialLeftoversSaved);
      setPortionMode(initialSharedWithCount ? 'shared' : 'preset');
    }
  }, [visible, initialPortionPercent, initialSharedWithCount, initialLeftoversSaved, courseType]);

  const handlePresetSelect = useCallback((preset: PresetValue) => {
    setSelectedPreset(preset);
    if (preset === 'custom') {
      setShowCustomSlider(true);
      setPortionMode('custom');
    } else {
      setShowCustomSlider(false);
      setPortionPercent(preset);
      setPortionMode('preset');
      // Clear sharing if manually selecting preset
      if (!sharedEnabled) {
        setSharedWithCount(null);
      }
    }
    setLeftoversEnabled(false);
  }, [sharedEnabled]);

  const handleSliderChange = useCallback((value: number) => {
    const rounded = Math.round(value / 5) * 5;
    setPortionPercent(Math.max(5, Math.min(100, rounded)));
    setPortionMode('custom');
  }, []);

  const handleSharedToggle = useCallback(() => {
    const newEnabled = !sharedEnabled;
    setSharedEnabled(newEnabled);
    if (newEnabled) {
      const count = sharedWithCount || 2;
      setSharedWithCount(count);
      setPortionPercent(Math.round(100 / count));
      setPortionMode('shared');
      setSelectedPreset(null);
      setShowCustomSlider(false);
      setLeftoversEnabled(false);
    } else {
      setSharedWithCount(null);
      setPortionPercent(100);
      setPortionMode('preset');
      setSelectedPreset(100);
    }
  }, [sharedEnabled, sharedWithCount]);

  const handleShareCountSelect = useCallback((count: number) => {
    setSharedWithCount(count);
    setPortionPercent(Math.round(100 / count));
    setPortionMode('shared');
  }, []);

  const handleLeftoversToggle = useCallback(() => {
    const newEnabled = !leftoversEnabled;
    setLeftoversEnabled(newEnabled);
    if (newEnabled) {
      setPortionPercent(50); // Default: left half, ate half
      setPortionMode('leftovers');
      setSelectedPreset(null);
      setShowCustomSlider(false);
      setSharedEnabled(false);
      setSharedWithCount(null);
    } else {
      setPortionPercent(100);
      setPortionMode('preset');
      setSelectedPreset(100);
    }
  }, [leftoversEnabled]);

  const handleLeftoverSelect = useCallback((leftPercent: number) => {
    const eatenPercent = 100 - leftPercent;
    setPortionPercent(eatenPercent);
    setPortionMode('leftovers');
  }, []);

  const handleConfirm = useCallback(() => {
    const clampedPercent = Math.max(5, Math.min(100, portionPercent));
    onConfirm({
      portionPercent: clampedPercent,
      portionMultiplier: clampedPercent / 100,
      sharedWithCount: sharedEnabled ? sharedWithCount : null,
      leftoversSaved: leftoversEnabled,
      portionMode,
    });
  }, [portionPercent, sharedEnabled, sharedWithCount, leftoversEnabled, portionMode, onConfirm]);

  const showLeftoversOption = courseType === 'entree' || courseType === 'unknown';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconCircle]}>
              <Ionicons name="pie-chart-outline" size={24} color={COLORS.brandTeal} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>How much did you eat?</Text>
              {dishName && <Text style={styles.subtitle} numberOfLines={1}>{dishName}</Text>}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Current Value Display */}
          <View style={styles.valueDisplay}>
            <Text style={styles.valueText}>
              {formatPortionLabel(portionPercent, sharedEnabled ? sharedWithCount : null)}
            </Text>
            <Text style={styles.valueSubtext}>of the dish</Text>
          </View>

          {/* Preset Chips */}
          <View style={styles.presetRow}>
            {PRESETS.map((preset) => {
              const isActive = selectedPreset === preset.value && !sharedEnabled && !leftoversEnabled;
              return (
                <TouchableOpacity
                  key={preset.value}
                  style={[styles.chip, isActive && styles.chipActive]}
                  onPress={() => handlePresetSelect(preset.value)}
                >
                  {preset.icon && (
                    <Ionicons
                      name={preset.icon as any}
                      size={14}
                      color={isActive ? COLORS.brandTeal : COLORS.textSecondary}
                      style={{ marginRight: 4 }}
                    />
                  )}
                  <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Custom Slider */}
          {showCustomSlider && (
            <View style={styles.sliderContainer}>
              <Slider
                style={styles.slider}
                minimumValue={5}
                maximumValue={100}
                step={5}
                value={portionPercent}
                onValueChange={handleSliderChange}
                minimumTrackTintColor={COLORS.brandTeal}
                maximumTrackTintColor={COLORS.border}
                thumbTintColor={COLORS.brandTealLight}
              />
              <Text style={styles.sliderValue}>{portionPercent}%</Text>
            </View>
          )}

          {/* Shared Toggle */}
          <View style={styles.toggleSection}>
            <TouchableOpacity
              style={[styles.toggleRow, sharedEnabled && styles.toggleRowActive]}
              onPress={handleSharedToggle}
            >
              <Ionicons
                name={sharedEnabled ? 'checkbox' : 'square-outline'}
                size={22}
                color={sharedEnabled ? COLORS.brandTeal : COLORS.textMuted}
              />
              <Text style={[styles.toggleLabel, sharedEnabled && styles.toggleLabelActive]}>
                Shared
              </Text>
              {sharedEnabled && sharedWithCount != null && sharedWithCount > 0 && (
                <Text style={styles.toggleBadge}>with {sharedWithCount}</Text>
              )}
            </TouchableOpacity>

            {sharedEnabled && (
              <View style={styles.shareCountRow}>
                <Text style={styles.shareLabel}>With:</Text>
                {SHARE_COUNTS.map((count) => (
                  <TouchableOpacity
                    key={count}
                    style={[
                      styles.shareChip,
                      sharedWithCount === count && styles.shareChipActive,
                    ]}
                    onPress={() => handleShareCountSelect(count)}
                  >
                    <Text
                      style={[
                        styles.shareChipText,
                        sharedWithCount === count && styles.shareChipTextActive,
                      ]}
                    >
                      {count}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[
                    styles.shareChip,
                    sharedWithCount != null && sharedWithCount > 5 && styles.shareChipActive,
                  ]}
                  onPress={() => handleShareCountSelect(6)}
                >
                  <Text
                    style={[
                      styles.shareChipText,
                      sharedWithCount != null && sharedWithCount > 5 && styles.shareChipTextActive,
                    ]}
                  >
                    5+
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Leftovers Toggle (only for entrees) */}
          {showLeftoversOption && (
            <View style={styles.toggleSection}>
              <TouchableOpacity
                style={[styles.toggleRow, leftoversEnabled && styles.toggleRowActive]}
                onPress={handleLeftoversToggle}
              >
                <Ionicons
                  name={leftoversEnabled ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={leftoversEnabled ? COLORS.brandTeal : COLORS.textMuted}
                />
                <Text style={[styles.toggleLabel, leftoversEnabled && styles.toggleLabelActive]}>
                  Saved leftovers
                </Text>
              </TouchableOpacity>

              {leftoversEnabled && (
                <View style={styles.leftoverRow}>
                  {LEFTOVER_OPTIONS.map((opt) => {
                    const eatenPercent = 100 - opt.leftPercent;
                    const isActive = portionPercent === eatenPercent;
                    return (
                      <TouchableOpacity
                        key={opt.leftPercent}
                        style={[styles.leftoverChip, isActive && styles.leftoverChipActive]}
                        onPress={() => handleLeftoverSelect(opt.leftPercent)}
                      >
                        <Text
                          style={[
                            styles.leftoverChipText,
                            isActive && styles.leftoverChipTextActive,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* Confirm Button */}
          <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
            <Text style={styles.confirmButtonText}>Save</Text>
          </TouchableOpacity>

          {/* Skip hint */}
          <TouchableOpacity style={styles.skipButton} onPress={handleConfirm}>
            <Text style={styles.skipButtonText}>or tap Save to use {portionPercent}%</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheet: {
    backgroundColor: COLORS.cardSurface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.75,
    paddingHorizontal: 20,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${COLORS.brandTeal}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueDisplay: {
    alignItems: 'center',
    marginVertical: 20,
  },
  valueText: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.brandTeal,
  },
  valueSubtext: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.chipBg,
    borderWidth: 1,
    borderColor: COLORS.chipBorder,
  },
  chipActive: {
    backgroundColor: COLORS.chipBgActive,
    borderColor: COLORS.chipBorderActive,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: COLORS.brandTeal,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  sliderValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.brandTeal,
    marginLeft: 12,
    minWidth: 45,
    textAlign: 'right',
  },
  toggleSection: {
    marginBottom: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: COLORS.chipBg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  toggleRowActive: {
    backgroundColor: COLORS.chipBgActive,
    borderColor: COLORS.chipBorderActive,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginLeft: 10,
    flex: 1,
  },
  toggleLabelActive: {
    color: COLORS.brandTeal,
  },
  toggleBadge: {
    fontSize: 13,
    color: COLORS.brandTeal,
    fontWeight: '500',
  },
  shareCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingLeft: 12,
    gap: 8,
  },
  shareLabel: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginRight: 4,
  },
  shareChip: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.chipBg,
    borderWidth: 1,
    borderColor: COLORS.chipBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareChipActive: {
    backgroundColor: COLORS.chipBgActive,
    borderColor: COLORS.chipBorderActive,
  },
  shareChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  shareChipTextActive: {
    color: COLORS.brandTeal,
  },
  leftoverRow: {
    flexDirection: 'row',
    marginTop: 10,
    paddingLeft: 12,
    gap: 8,
  },
  leftoverChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: COLORS.chipBg,
    borderWidth: 1,
    borderColor: COLORS.chipBorder,
  },
  leftoverChipActive: {
    backgroundColor: COLORS.chipBgActive,
    borderColor: COLORS.chipBorderActive,
  },
  leftoverChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  leftoverChipTextActive: {
    color: COLORS.brandTeal,
  },
  confirmButton: {
    backgroundColor: COLORS.brandTeal,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipButtonText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
});

export default PortionSheet;
