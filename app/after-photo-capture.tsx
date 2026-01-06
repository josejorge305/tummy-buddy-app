/**
 * After Photo Capture Screen
 * Allows user to take the after photo for a meal with pending_after_photo status
 * Analyzes the before/after photos to calculate actual consumption
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import {
  uploadMealPhoto,
  analyzePhotoConsumption,
  updateMeal,
} from '../api/api';
import { useUserPrefs } from '../context/UserPrefsContext';

const COLORS = {
  background: '#0a0f1a',
  cardSurface: '#111827',
  border: '#1e293b',
  borderActive: 'rgba(45, 212, 191, 0.4)',
  textPrimary: '#FFFFFF',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  brandTeal: '#2dd4bf',
  brandTealBg: 'rgba(45, 212, 191, 0.1)',
  successGreen: '#22c55e',
  warningOrange: '#fb923c',
};

export default function AfterPhotoCaptureScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    mealId: string;
    dishName: string;
    beforePhotoUrl: string;
    baselineCalories: string;
  }>();
  const { profile, loadDailyTracker } = useUserPrefs();
  const userId = profile?.user_id;

  const [isLoading, setIsLoading] = useState(false);
  const [afterPhotoUri, setAfterPhotoUri] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<{
    percentConsumed: number;
    caloriesEaten: number;
    caloriesLeft: number;
  } | null>(null);

  const mealId = params.mealId ? parseInt(params.mealId) : null;
  const dishName = params.dishName || 'Your meal';
  const beforePhotoUrl = params.beforePhotoUrl || '';
  const baselineCalories = params.baselineCalories ? parseInt(params.baselineCalories) : 0;

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

  // Take the after photo
  const handleTakePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        setAfterPhotoUri(uri);
        setIsLoading(true);

        // Upload the photo
        if (!userId) {
          Alert.alert('Error', 'User not logged in');
          setIsLoading(false);
          return;
        }

        const uploadResult = await uploadMealPhoto(userId, uri, 'after');

        if (!uploadResult.ok || !uploadResult.url) {
          Alert.alert('Upload Error', 'Could not upload photo. Please try again.');
          setIsLoading(false);
          return;
        }

        // Analyze the before/after photos
        if (beforePhotoUrl) {
          const analysis = await analyzePhotoConsumption(
            beforePhotoUrl,
            uploadResult.url,
            dishName,
            baselineCalories
          );

          if (analysis.ok && analysis.analysis) {
            setAnalysisResult({
              percentConsumed: analysis.analysis.percentConsumed,
              caloriesEaten: analysis.analysis.caloriesEaten,
              caloriesLeft: analysis.analysis.caloriesLeft,
            });
          } else {
            // Fallback to manual estimate
            Alert.alert(
              'Analysis Unavailable',
              'Could not analyze the photos. Please estimate how much you ate.',
              [{ text: 'OK' }]
            );
          }
        }

        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
      setIsLoading(false);
    }
  };

  // Save the analysis result and update the meal
  const handleSave = async () => {
    if (!mealId || !analysisResult || !userId) {
      Alert.alert('Error', 'Missing data to save');
      return;
    }

    setIsLoading(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      // Calculate adjusted calories based on consumption
      const adjustedCalories = analysisResult.caloriesEaten;
      const portionPercent = analysisResult.percentConsumed;

      // Update the meal with the new data
      const result = await updateMeal(userId, mealId, {
        photo_status: 'completed',
        portion_percent: portionPercent,
        calories: adjustedCalories,
      });

      if (!result.ok) {
        Alert.alert('Error', result.error || 'Could not update meal');
        setIsLoading(false);
        return;
      }

      // Reload tracker to show updated data
      await loadDailyTracker();

      Alert.alert(
        'Meal Updated!',
        `You ate ${analysisResult.percentConsumed}% of your ${dishName}.\n\nCalories consumed: ${analysisResult.caloriesEaten} cal`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Something went wrong');
    }

    setIsLoading(false);
  };

  // Skip and mark as complete without photo analysis
  const handleSkip = async () => {
    if (!mealId || !userId) return;

    Alert.alert(
      'Skip Photo Analysis?',
      'Your meal will be logged at 100% consumption without photo analysis.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          onPress: async () => {
            setIsLoading(true);
            try {
              await updateMeal(userId, mealId, {
                photo_status: 'manual',
                portion_percent: 100,
              });
              await loadDailyTracker();
              router.back();
            } catch (error: any) {
              Alert.alert('Error', error?.message || 'Something went wrong');
            }
            setIsLoading(false);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Complete Meal Log</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.content}>
        {/* Dish info */}
        <View style={styles.dishInfo}>
          <Text style={styles.dishName}>{dishName}</Text>
          <Text style={styles.subtitle}>Take a photo of what's left on your plate</Text>
        </View>

        {/* Before photo preview */}
        {beforePhotoUrl ? (
          <View style={styles.beforeSection}>
            <Text style={styles.sectionLabel}>Before</Text>
            <Image source={{ uri: beforePhotoUrl }} style={styles.beforeImage} />
          </View>
        ) : null}

        {/* After photo or capture button */}
        <View style={styles.afterSection}>
          <Text style={styles.sectionLabel}>After</Text>
          {afterPhotoUri ? (
            <View style={styles.afterImageContainer}>
              <Image source={{ uri: afterPhotoUri }} style={styles.afterImage} />
              {analysisResult && (
                <View style={styles.analysisOverlay}>
                  <Text style={styles.analysisPercent}>{analysisResult.percentConsumed}%</Text>
                  <Text style={styles.analysisLabel}>consumed</Text>
                </View>
              )}
            </View>
          ) : (
            <TouchableOpacity
              style={styles.captureButton}
              onPress={handleTakePhoto}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.background} size="large" />
              ) : (
                <>
                  <Ionicons name="camera" size={48} color={COLORS.background} />
                  <Text style={styles.captureText}>Tap to capture</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Analysis Results */}
        {analysisResult && (
          <View style={styles.resultsCard}>
            <View style={styles.resultRow}>
              <View style={styles.resultItem}>
                <Text style={styles.resultValue}>{analysisResult.caloriesEaten}</Text>
                <Text style={styles.resultLabel}>calories eaten</Text>
              </View>
              <View style={styles.resultDivider} />
              <View style={styles.resultItem}>
                <Text style={[styles.resultValue, styles.resultValueMuted]}>{analysisResult.caloriesLeft}</Text>
                <Text style={styles.resultLabel}>calories left</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Action buttons */}
      <View style={styles.footer}>
        {analysisResult ? (
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[COLORS.brandTeal, '#14b8a6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveButtonGradient}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.background} />
              ) : (
                <Text style={styles.saveButtonText}>Confirm & Save</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>Skip Photo Analysis</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  dishInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  dishName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  beforeSection: {
    marginBottom: 20,
  },
  beforeImage: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    backgroundColor: COLORS.cardSurface,
  },
  afterSection: {
    marginBottom: 24,
  },
  afterImageContainer: {
    position: 'relative',
  },
  afterImage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    backgroundColor: COLORS.cardSurface,
  },
  analysisOverlay: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  analysisPercent: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.brandTeal,
  },
  analysisLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  captureButton: {
    width: '100%',
    height: 200,
    backgroundColor: COLORS.brandTeal,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.background,
    marginTop: 8,
  },
  resultsCard: {
    backgroundColor: COLORS.cardSurface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultItem: {
    flex: 1,
    alignItems: 'center',
  },
  resultDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
    marginHorizontal: 16,
  },
  resultValue: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  resultValueMuted: {
    color: COLORS.textMuted,
  },
  resultLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  footer: {
    padding: 20,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  saveButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.background,
  },
  skipButton: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 15,
    color: COLORS.textMuted,
    textDecorationLine: 'underline',
  },
});
