/**
 * Onboarding Flow Component
 * Manages the sequential display of feature tour and legal disclaimer
 */

import React from 'react';
import { Modal, StyleSheet } from 'react-native';
import { useDisclaimer } from '../../context/DisclaimerContext';
import { OnboardingCarousel } from './OnboardingCarousel';
import { WelcomeModal } from '../legal/WelcomeModal';

export function OnboardingFlow() {
  const {
    isLoading,
    shouldShowFeatureTour,
    completeFeatureTour,
    shouldShowOnboardingModal,
  } = useDisclaimer();

  // Don't render anything while loading
  if (isLoading) return null;

  const showTour = shouldShowFeatureTour();
  const showLegal = shouldShowOnboardingModal();

  // Show feature tour first (if needed)
  if (showTour) {
    return (
      <Modal
        visible={true}
        animationType="fade"
        statusBarTranslucent
      >
        <OnboardingCarousel onComplete={completeFeatureTour} />
      </Modal>
    );
  }

  // Then show legal disclaimer (if needed)
  if (showLegal) {
    return <WelcomeModal />;
  }

  return null;
}

export default OnboardingFlow;
