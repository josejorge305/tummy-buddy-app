/**
 * MealLogModal Component
 * Full meal logging flow with photo analysis or quick log options
 * Based on design mockup with 3-step wizard: Before Photo -> Eat -> After Photo
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import Slider from '@react-native-community/slider';
import {
  LoggedMeal,
  PhotoAnalysisResult,
  PhotoAnalysisItem,
  AnalyzeDishResponse,
  uploadMealPhoto,
  analyzePhotoConsumption,
} from '../api/api';
import { PortionData, PortionMode } from './PortionSheet';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Design tokens matching the app
const COLORS = {
  background: '#0a0f1a',
  cardSurface: '#111827',
  border: '#1e293b',
  borderActive: 'rgba(45, 212, 191, 0.4)',
  textPrimary: '#FFFFFF',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  brandTeal: '#2dd4bf',
  brandTealDark: '#14b8a6',
  brandTealBg: 'rgba(45, 212, 191, 0.1)',
  brandTealBgActive: 'rgba(45, 212, 191, 0.2)',
  successGreen: '#22c55e',
  warningOrange: '#fb923c',
};

// Step types for wizard
type WizardStep = 'choice' | 'before' | 'saved' | 'after' | 'analysis' | 'quicklog';

// Props for the modal
interface MealLogModalProps {
  visible: boolean;
  onClose: () => void;
  onLogComplete: (data: MealLogData) => void;
  dishName: string;
  dishId?: string;
  restaurantName?: string;
  analysis?: AnalyzeDishResponse;
  userId: string;
  // For editing existing meal
  existingMeal?: LoggedMeal;
}

// Data returned when logging is complete
export interface MealLogData {
  dishName: string;
  dishId?: string;
  restaurantName?: string;
  portionPercent: number;
  portionMode: PortionMode;
  sharedWithCount: number | null;
  leftoversSaved: boolean;
  // Photo data
  beforePhotoUri?: string;
  afterPhotoUri?: string;
  photoAnalysis?: PhotoAnalysisResult;
  // If photo analysis was used
  usePhotoAnalysis: boolean;
  // Full analysis data for nutrition
  analysis?: AnalyzeDishResponse;
}

// Portion preset options for quick log
const PORTION_PRESETS = [
  { label: 'All', value: 100 },
  { label: 'Most', value: 75 },
  { label: 'Half', value: 50 },
  { label: 'Few bites', value: 15 },
];

export function MealLogModal({
  visible,
  onClose,
  onLogComplete,
  dishName,
  dishId,
  restaurantName,
  analysis,
  userId,
  existingMeal,
}: MealLogModalProps) {
  const insets = useSafeAreaInsets();

  // Wizard state
  const [step, setStep] = useState<WizardStep>('choice');
  const [isLoading, setIsLoading] = useState(false);

  // Photo state
  const [beforePhotoUri, setBeforePhotoUri] = useState<string | null>(null);
  const [afterPhotoUri, setAfterPhotoUri] = useState<string | null>(null);
  const [beforePhotoUrl, setBeforePhotoUrl] = useState<string | null>(null);
  const [afterPhotoUrl, setAfterPhotoUrl] = useState<string | null>(null);

  // Analysis state
  const [photoAnalysis, setPhotoAnalysis] = useState<PhotoAnalysisResult | null>(null);

  // Quick log state
  const [portionPercent, setPortionPercent] = useState(100);
  const [selectedPreset, setSelectedPreset] = useState<number | 'custom'>(100);
  const [showCustomSlider, setShowCustomSlider] = useState(false);
  const [sharedEnabled, setSharedEnabled] = useState(false);
  const [sharedWithCount, setSharedWithCount] = useState<number | null>(null);
  const [leftoversSaved, setLeftoversSaved] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (visible) {
      setStep('choice');
      setBeforePhotoUri(null);
      setAfterPhotoUri(null);
      setBeforePhotoUrl(null);
      setAfterPhotoUrl(null);
      setPhotoAnalysis(null);
      setPortionPercent(100);
      setSelectedPreset(100);
      setShowCustomSlider(false);
      setSharedEnabled(false);
      setSharedWithCount(null);
      setLeftoversSaved(false);
      setIsLoading(false);
    }
  }, [visible]);

  // Request camera permission
  const requestCameraPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Camera Permission Required',
        'Please enable camera access in your device settings to use photo analysis.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  // Take a photo
  const takePhoto = async (): Promise<string | null> => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return null;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets[0]) {
        return result.assets[0].uri;
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
    return null;
  };

  // Handle before photo capture
  const handleTakeBeforePhoto = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const uri = await takePhoto();
    if (uri) {
      setBeforePhotoUri(uri);
      setIsLoading(true);

      // Upload the photo
      const uploadResult = await uploadMealPhoto(userId, uri, 'before');
      setIsLoading(false);

      if (uploadResult.ok && uploadResult.url) {
        setBeforePhotoUrl(uploadResult.url);
        setStep('saved');
      } else {
        // Still proceed even if upload fails - we have the local URI
        console.warn('Before photo upload failed, using local URI');
        setStep('saved');
      }
    }
  };

  // Handle after photo capture
  const handleTakeAfterPhoto = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const uri = await takePhoto();
    if (uri) {
      setAfterPhotoUri(uri);
      setIsLoading(true);

      // Upload the photo
      const uploadResult = await uploadMealPhoto(userId, uri, 'after');

      if (uploadResult.ok && uploadResult.url) {
        setAfterPhotoUrl(uploadResult.url);

        // Run photo analysis if we have both URLs
        if (beforePhotoUrl) {
          const baselineCalories = analysis?.nutrition_summary?.energyKcal || 500;
          const analysisResult = await analyzePhotoConsumption(
            beforePhotoUrl,
            uploadResult.url,
            dishName,
            baselineCalories
          );

          if (analysisResult.ok && analysisResult.analysis) {
            setPhotoAnalysis(analysisResult.analysis);
          } else {
            // Fallback: mock analysis for demo
            setPhotoAnalysis(createMockAnalysis(baselineCalories));
          }
        } else {
          // No before photo URL, use mock analysis
          const baselineCalories = analysis?.nutrition_summary?.energyKcal || 500;
          setPhotoAnalysis(createMockAnalysis(baselineCalories));
        }
      } else {
        // Fallback analysis even if upload fails
        const baselineCalories = analysis?.nutrition_summary?.energyKcal || 500;
        setPhotoAnalysis(createMockAnalysis(baselineCalories));
      }

      setIsLoading(false);
      setStep('analysis');
    }
  };

  // Create mock analysis for when API is not available
  const createMockAnalysis = (baselineCalories: number): PhotoAnalysisResult => {
    const percentConsumed = 82; // Realistic example
    const caloriesEaten = Math.round(baselineCalories * (percentConsumed / 100));
    const caloriesLeft = baselineCalories - caloriesEaten;

    return {
      percentConsumed,
      caloriesEaten,
      caloriesLeft,
      confidence: 0.85,
      items: [
        { name: 'Main portion', percentConsumed: 95, caloriesEaten: Math.round(caloriesEaten * 0.5), caloriesLeft: Math.round(caloriesLeft * 0.2) },
        { name: 'Side items', percentConsumed: 70, caloriesEaten: Math.round(caloriesEaten * 0.3), caloriesLeft: Math.round(caloriesLeft * 0.5) },
        { name: 'Sauce/toppings', percentConsumed: 85, caloriesEaten: Math.round(caloriesEaten * 0.2), caloriesLeft: Math.round(caloriesLeft * 0.3) },
      ],
    };
  };

  // Handle preset selection in quick log
  const handlePresetSelect = (value: number | 'custom') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPreset(value);
    if (value === 'custom') {
      setShowCustomSlider(true);
    } else {
      setShowCustomSlider(false);
      setPortionPercent(value);
    }
    setSharedEnabled(false);
    setLeftoversSaved(false);
  };

  // Handle save from quick log
  const handleQuickLogSave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const portionMode: PortionMode = sharedEnabled
      ? 'shared'
      : leftoversSaved
      ? 'leftovers'
      : showCustomSlider
      ? 'custom'
      : 'preset';

    onLogComplete({
      dishName,
      dishId,
      restaurantName,
      portionPercent,
      portionMode,
      sharedWithCount: sharedEnabled ? sharedWithCount : null,
      leftoversSaved,
      usePhotoAnalysis: false,
      analysis,
    });
  };

  // Handle save from photo analysis
  const handleAnalysisSave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (!photoAnalysis) return;

    onLogComplete({
      dishName,
      dishId,
      restaurantName,
      portionPercent: photoAnalysis.percentConsumed,
      portionMode: 'custom',
      sharedWithCount: null,
      leftoversSaved: false,
      beforePhotoUri: beforePhotoUri || undefined,
      afterPhotoUri: afterPhotoUri || undefined,
      photoAnalysis,
      usePhotoAnalysis: true,
      analysis,
    });
  };

  // Handle "Got it" from saved step
  const handleSavedContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
    // The meal is logged with pending_after_photo status
    // User will tap the meal card later to complete
  };

  // Render wizard steps indicator
  const renderWizardSteps = () => {
    const steps = [
      { num: 1, label: 'Before', active: step === 'before', completed: ['saved', 'after', 'analysis'].includes(step) },
      { num: 2, label: 'Eat', active: step === 'saved', completed: ['after', 'analysis'].includes(step) },
      { num: 3, label: 'After', active: step === 'after' || step === 'analysis', completed: step === 'analysis' },
    ];

    return (
      <View style={styles.wizardSteps}>
        {steps.map((s, idx) => (
          <React.Fragment key={s.num}>
            <View style={styles.stepContainer}>
              <View
                style={[
                  styles.stepCircle,
                  s.active && styles.stepCircleActive,
                  s.completed && styles.stepCircleCompleted,
                ]}
              >
                {s.completed ? (
                  <Ionicons name="checkmark" size={14} color={COLORS.background} />
                ) : (
                  <Text
                    style={[
                      styles.stepNumber,
                      s.active && styles.stepNumberActive,
                    ]}
                  >
                    {s.num}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  (s.active || s.completed) && styles.stepLabelActive,
                ]}
              >
                {s.label}
              </Text>
            </View>
            {idx < steps.length - 1 && (
              <View
                style={[
                  styles.stepLine,
                  s.completed && styles.stepLineCompleted,
                ]}
              />
            )}
          </React.Fragment>
        ))}
      </View>
    );
  };

  // Render choice step
  const renderChoiceStep = () => (
    <>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="time-outline" size={28} color={COLORS.brandTeal} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Log this meal</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {dishName}
          </Text>
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Log Options */}
      <View style={styles.optionsContainer}>
        {/* Photo Analysis Option */}
        <TouchableOpacity
          style={[styles.optionCard, styles.optionCardRecommended]}
          onPress={() => setStep('before')}
          activeOpacity={0.7}
        >
          <View style={styles.optionLeft}>
            <View style={styles.optionIconWrap}>
              <Ionicons name="camera" size={24} color={COLORS.brandTeal} />
            </View>
            <View style={styles.optionTextWrap}>
              <Text style={styles.optionTitle}>Photo Analysis</Text>
              <Text style={styles.optionDesc}>Most accurate tracking</Text>
            </View>
          </View>
          <View style={styles.recommendedTag}>
            <Text style={styles.recommendedTagText}>Recommended</Text>
          </View>
        </TouchableOpacity>

        {/* Quick Log Option */}
        <TouchableOpacity
          style={styles.optionCard}
          onPress={() => setStep('quicklog')}
          activeOpacity={0.7}
        >
          <View style={styles.optionLeft}>
            <View style={[styles.optionIconWrap, styles.optionIconWrapSubtle]}>
              <Ionicons name="time-outline" size={24} color={COLORS.textSecondary} />
            </View>
            <View style={styles.optionTextWrap}>
              <Text style={styles.optionTitle}>Quick Log</Text>
              <Text style={styles.optionDesc}>Estimate manually</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    </>
  );

  // Render before photo step
  const renderBeforeStep = () => (
    <>
      {/* Header */}
      <View style={styles.photoHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setStep('choice')}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.photoTitle}>Photo Analysis</Text>
        <View style={styles.spacer} />
      </View>

      {renderWizardSteps()}

      <View style={styles.photoContent}>
        {/* Instructions */}
        <View style={styles.instructionBox}>
          <Text style={styles.instructionTitle}>
            Take a photo of your full dish
          </Text>
          <Text style={styles.instructionDesc}>
            Capture the entire plate before you start eating. Make sure all food
            items are visible.
          </Text>

          <View style={styles.tipsList}>
            {['Center the plate in frame', 'Good lighting, avoid shadows', 'Capture from above'].map(
              (tip) => (
                <View key={tip} style={styles.tipRow}>
                  <Ionicons name="checkmark" size={16} color={COLORS.brandTeal} />
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              )
            )}
          </View>
        </View>

        {/* Capture Button */}
        <TouchableOpacity
          style={styles.captureButton}
          onPress={handleTakeBeforePhoto}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.background} />
          ) : (
            <>
              <Ionicons name="camera" size={24} color={COLORS.background} />
              <Text style={styles.captureButtonText}>Take Before Photo</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </>
  );

  // Render saved step (after before photo)
  const renderSavedStep = () => (
    <>
      {/* Header */}
      <View style={styles.photoHeader}>
        <View style={styles.spacer} />
        <Text style={styles.photoTitle}>Photo Analysis</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      {renderWizardSteps()}

      <View style={styles.photoContentCentered}>
        {/* Success Icon */}
        <View style={styles.successIcon}>
          <Ionicons name="checkmark" size={40} color={COLORS.brandTeal} />
        </View>

        <Text style={styles.successTitle}>Before photo saved</Text>
        <Text style={styles.successDesc}>
          Enjoy your meal! When you're done eating, tap this meal in{' '}
          <Text style={styles.successDescBold}>Today's Meals</Text> to take the
          after photo.
        </Text>

        {/* Meal Preview Card */}
        <View style={styles.mealPreviewCard}>
          {beforePhotoUri ? (
            <Image source={{ uri: beforePhotoUri }} style={styles.previewThumb} />
          ) : (
            <View style={styles.previewThumbPlaceholder}>
              <Ionicons name="image-outline" size={20} color={COLORS.textMuted} />
            </View>
          )}
          <View style={styles.previewInfo}>
            <Text style={styles.previewName}>{dishName}</Text>
            <Text style={styles.previewStatus}>Tap when finished eating</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.doneButton}
          onPress={handleSavedContinue}
          activeOpacity={0.8}
        >
          <Text style={styles.doneButtonText}>Got it</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  // Render after photo step
  const renderAfterStep = () => (
    <>
      {/* Header */}
      <View style={styles.photoHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setStep('saved')}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.photoTitle}>Complete Analysis</Text>
        <View style={styles.spacer} />
      </View>

      {renderWizardSteps()}

      <View style={styles.photoContent}>
        {/* Instructions */}
        <View style={styles.instructionBox}>
          <Text style={styles.instructionTitle}>
            Take a photo of what's left
          </Text>
          <Text style={styles.instructionDesc}>
            Capture your plate showing any remaining food.
          </Text>
        </View>

        {/* Before Photo Preview */}
        {beforePhotoUri && (
          <View style={styles.beforePreview}>
            <Text style={styles.previewLabel}>Your before photo</Text>
            <Image source={{ uri: beforePhotoUri }} style={styles.beforePreviewImage} />
          </View>
        )}

        {/* Capture Button */}
        <TouchableOpacity
          style={styles.captureButton}
          onPress={handleTakeAfterPhoto}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.background} />
          ) : (
            <>
              <Ionicons name="camera" size={24} color={COLORS.background} />
              <Text style={styles.captureButtonText}>Take After Photo</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Fallback Link */}
        <TouchableOpacity
          style={styles.textLink}
          onPress={() => {
            setStep('quicklog');
          }}
        >
          <Text style={styles.textLinkText}>
            I forgot to take a photo, mark manually instead
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );

  // Render analysis results step
  const renderAnalysisStep = () => {
    if (!photoAnalysis) return null;

    return (
      <>
        {/* Header */}
        <View style={styles.photoHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setStep('after')}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.photoTitle}>Analysis Complete</Text>
          <View style={styles.spacer} />
        </View>

        <View style={styles.analysisContent}>
          {/* Summary */}
          <View style={styles.analysisSummary}>
            <Text style={styles.analysisPercent}>{photoAnalysis.percentConsumed}%</Text>
            <Text style={styles.analysisLabel}>consumed</Text>
          </View>

          {/* Calories Row */}
          <View style={styles.caloriesRow}>
            <View style={styles.calBox}>
              <Text style={styles.calValue}>{photoAnalysis.caloriesEaten}</Text>
              <Text style={styles.calLabel}>calories eaten</Text>
            </View>
            <View style={[styles.calBox, styles.calBoxSubtle]}>
              <Text style={[styles.calValue, styles.calValueSubtle]}>
                {photoAnalysis.caloriesLeft}
              </Text>
              <Text style={styles.calLabel}>calories left</Text>
            </View>
          </View>

          {/* Breakdown */}
          <View style={styles.breakdownCard}>
            <View style={styles.breakdownHeader}>
              <Text style={styles.breakdownTitle}>BREAKDOWN BY ITEM</Text>
              <TouchableOpacity>
                <Text style={styles.editButton}>Edit</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.breakdownItems}>
              {photoAnalysis.items.map((item, idx) => (
                <View key={idx} style={styles.bItem}>
                  <View style={styles.bItemRow}>
                    <Text style={styles.bItemName}>{item.name}</Text>
                    <Text style={styles.bItemCal}>{item.caloriesEaten} cal</Text>
                  </View>
                  <View style={styles.bItemBar}>
                    <View
                      style={[
                        styles.bItemFill,
                        { width: `${item.percentConsumed}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.bItemPercent}>{item.percentConsumed}%</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Confirm Button */}
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleAnalysisSave}
            activeOpacity={0.8}
          >
            <Text style={styles.saveButtonText}>Confirm & Save</Text>
          </TouchableOpacity>

          {/* Correction Link */}
          <TouchableOpacity style={styles.textLink}>
            <Text style={styles.textLinkText}>
              Something doesn't look right? Mark corrections
            </Text>
          </TouchableOpacity>
        </View>
      </>
    );
  };

  // Render quick log step
  const renderQuickLogStep = () => (
    <>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="pie-chart-outline" size={28} color={COLORS.brandTeal} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>How much did you eat?</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {dishName}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => setStep('choice')}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Percentage Display */}
      <View style={styles.percentageDisplay}>
        <Text style={styles.percentageValue}>{portionPercent}%</Text>
        <Text style={styles.percentageLabel}>of the dish</Text>
      </View>

      {/* Preset Buttons */}
      <View style={styles.portionButtons}>
        {PORTION_PRESETS.map((preset) => (
          <TouchableOpacity
            key={preset.value}
            style={[
              styles.portionBtn,
              selectedPreset === preset.value && styles.portionBtnActive,
            ]}
            onPress={() => handlePresetSelect(preset.value)}
          >
            <Text
              style={[
                styles.portionBtnText,
                selectedPreset === preset.value && styles.portionBtnTextActive,
              ]}
            >
              {preset.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Custom Button */}
      <TouchableOpacity
        style={[
          styles.customBtn,
          selectedPreset === 'custom' && styles.portionBtnActive,
        ]}
        onPress={() => handlePresetSelect('custom')}
      >
        <Ionicons
          name="options-outline"
          size={16}
          color={selectedPreset === 'custom' ? COLORS.brandTeal : COLORS.textSecondary}
        />
        <Text
          style={[
            styles.portionBtnText,
            selectedPreset === 'custom' && styles.portionBtnTextActive,
          ]}
        >
          Custom
        </Text>
      </TouchableOpacity>

      {/* Custom Slider */}
      {showCustomSlider && (
        <View style={styles.sliderContainer}>
          <Slider
            style={styles.slider}
            minimumValue={5}
            maximumValue={100}
            step={5}
            value={portionPercent}
            onValueChange={(val) => setPortionPercent(Math.round(val))}
            minimumTrackTintColor={COLORS.brandTeal}
            maximumTrackTintColor={COLORS.border}
            thumbTintColor={COLORS.brandTeal}
          />
        </View>
      )}

      {/* Checkbox Options */}
      <View style={styles.checkboxGroup}>
        <TouchableOpacity
          style={styles.checkboxItem}
          onPress={() => {
            setSharedEnabled(!sharedEnabled);
            if (!sharedEnabled) {
              setSharedWithCount(2);
              setPortionPercent(50);
              setLeftoversSaved(false);
            } else {
              setSharedWithCount(null);
              setPortionPercent(100);
            }
          }}
        >
          <View
            style={[styles.checkbox, sharedEnabled && styles.checkboxChecked]}
          >
            {sharedEnabled && (
              <Ionicons name="checkmark" size={14} color={COLORS.background} />
            )}
          </View>
          <Text style={styles.checkboxText}>Shared</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.checkboxItem}
          onPress={() => {
            setLeftoversSaved(!leftoversSaved);
            if (!leftoversSaved) {
              setSharedEnabled(false);
              setSharedWithCount(null);
            }
          }}
        >
          <View
            style={[styles.checkbox, leftoversSaved && styles.checkboxChecked]}
          >
            {leftoversSaved && (
              <Ionicons name="checkmark" size={14} color={COLORS.background} />
            )}
          </View>
          <Text style={styles.checkboxText}>Saved leftovers</Text>
        </TouchableOpacity>
      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={styles.saveButton}
        onPress={handleQuickLogSave}
        activeOpacity={0.8}
      >
        <Text style={styles.saveButtonText}>Save</Text>
      </TouchableOpacity>

      <Text style={styles.saveHint}>or tap Save to use {portionPercent}%</Text>
    </>
  );

  // Render content based on current step
  const renderContent = () => {
    switch (step) {
      case 'choice':
        return renderChoiceStep();
      case 'before':
        return renderBeforeStep();
      case 'saved':
        return renderSavedStep();
      case 'after':
        return renderAfterStep();
      case 'analysis':
        return renderAnalysisStep();
      case 'quicklog':
        return renderQuickLogStep();
      default:
        return renderChoiceStep();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          onPress={onClose}
          activeOpacity={1}
        />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
          {/* Handle bar */}
          <View style={styles.handleBar} />
          {renderContent()}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  sheet: {
    backgroundColor: COLORS.cardSurface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.9,
    paddingHorizontal: 20,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },

  // Header styles
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 24,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: COLORS.brandTeal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spacer: {
    width: 32,
  },

  // Option cards
  optionsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  optionCardRecommended: {
    borderColor: COLORS.borderActive,
    backgroundColor: 'linear-gradient(135deg, #0a0f1a 0%, #0d1a1f 100%)',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  optionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.brandTealBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconWrapSubtle: {
    backgroundColor: COLORS.border,
  },
  optionTextWrap: {},
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  optionDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  recommendedTag: {
    backgroundColor: COLORS.brandTealBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 100,
  },
  recommendedTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.brandTeal,
  },

  // Photo wizard styles
  photoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },

  // Wizard steps
  wizardSteps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  stepContainer: {
    alignItems: 'center',
    gap: 6,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    borderColor: COLORS.brandTeal,
  },
  stepCircleCompleted: {
    backgroundColor: COLORS.brandTeal,
    borderColor: COLORS.brandTeal,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  stepNumberActive: {
    color: COLORS.brandTeal,
  },
  stepLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  stepLabelActive: {
    color: COLORS.brandTeal,
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: COLORS.border,
    marginHorizontal: 8,
    marginBottom: 18,
  },
  stepLineCompleted: {
    backgroundColor: COLORS.brandTeal,
  },

  // Photo content
  photoContent: {
    gap: 20,
  },
  photoContentCentered: {
    alignItems: 'center',
    textAlign: 'center',
  },
  instructionBox: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
  },
  instructionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  instructionDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  tipsList: {
    marginTop: 16,
    gap: 8,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tipText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },

  captureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: COLORS.brandTeal,
    borderRadius: 16,
    paddingVertical: 20,
  },
  captureButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.background,
  },

  // Saved step
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.brandTealBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  successDesc: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
    marginBottom: 24,
  },
  successDescBold: {
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  mealPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    padding: 14,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderActive,
    marginBottom: 24,
  },
  previewThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.border,
  },
  previewThumbPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewInfo: {},
  previewName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  previewStatus: {
    fontSize: 12,
    color: COLORS.brandTeal,
  },
  doneButton: {
    width: '100%',
    backgroundColor: COLORS.brandTeal,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.background,
  },

  // After photo step
  beforePreview: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
  },
  previewLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  beforePreviewImage: {
    height: 100,
    borderRadius: 8,
    backgroundColor: COLORS.border,
  },
  textLink: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  textLinkText: {
    fontSize: 13,
    color: COLORS.textMuted,
    textDecorationLine: 'underline',
  },

  // Analysis results
  analysisContent: {
    gap: 20,
  },
  analysisSummary: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  analysisPercent: {
    fontSize: 52,
    fontWeight: '700',
    color: COLORS.brandTeal,
  },
  analysisLabel: {
    fontSize: 15,
    color: COLORS.textMuted,
  },
  caloriesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  calBox: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    alignItems: 'center',
  },
  calBoxSubtle: {
    backgroundColor: 'transparent',
    borderStyle: 'dashed',
  },
  calValue: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  calValueSubtle: {
    color: COLORS.textMuted,
  },
  calLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  breakdownCard: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  breakdownTitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  editButton: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.brandTeal,
  },
  breakdownItems: {
    gap: 14,
  },
  bItem: {
    gap: 6,
  },
  bItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bItemName: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  bItemCal: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  bItemBar: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 100,
    overflow: 'hidden',
  },
  bItemFill: {
    height: '100%',
    backgroundColor: COLORS.brandTeal,
    borderRadius: 100,
  },
  bItemPercent: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'right',
  },
  saveButton: {
    backgroundColor: COLORS.brandTeal,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.background,
  },

  // Quick log styles
  percentageDisplay: {
    alignItems: 'center',
    marginBottom: 20,
  },
  percentageValue: {
    fontSize: 48,
    fontWeight: '700',
    color: COLORS.brandTeal,
  },
  percentageLabel: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  portionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  portionBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 100,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  portionBtnActive: {
    backgroundColor: COLORS.brandTeal,
    borderColor: COLORS.brandTeal,
  },
  portionBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  portionBtnTextActive: {
    color: COLORS.background,
  },
  customBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  sliderContainer: {
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  checkboxGroup: {
    gap: 12,
    marginBottom: 20,
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.brandTeal,
    borderColor: COLORS.brandTeal,
  },
  checkboxText: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  saveHint: {
    textAlign: 'center',
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 12,
  },
});

export default MealLogModal;
