import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BackButton } from '../components/navigation/BackButton';

const BG_DARK = '#0a0f14';
const CARD_BG = 'rgba(30, 41, 59, 0.6)';
const TEAL = '#2DD4BF';

export default function TermsScreen() {
  return (
    <LinearGradient colors={['#0f172a', '#020617']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <BackButton color="#fff" />
          <Text style={styles.headerTitle}>Terms of Service</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <Text style={styles.lastUpdated}>Last Updated: January 2025</Text>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
              <Text style={styles.paragraph}>
                By downloading, installing, or using Tummy Buddy ("the App"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the App.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>2. Description of Service</Text>
              <Text style={styles.paragraph}>
                Tummy Buddy is a nutritional tracking and analysis application that helps users:{'\n\n'}
                {'\u2022'} Track meals and nutritional intake{'\n'}
                {'\u2022'} Analyze how foods may affect organ health{'\n'}
                {'\u2022'} Discover restaurant menus and nutritional information{'\n'}
                {'\u2022'} Set and track health goals
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>3. Medical Disclaimer</Text>
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  IMPORTANT: Tummy Buddy is NOT a medical device and is NOT intended to diagnose, treat, cure, or prevent any disease. The nutritional and health information provided is for educational and informational purposes only.
                </Text>
              </View>
              <Text style={styles.paragraph}>
                {'\u2022'} Always consult with a qualified healthcare provider before making dietary changes{'\n'}
                {'\u2022'} Do not disregard professional medical advice based on information from this App{'\n'}
                {'\u2022'} If you have a medical emergency, contact your doctor or emergency services immediately{'\n'}
                {'\u2022'} Nutritional calculations are estimates and may not be 100% accurate
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>4. User Responsibilities</Text>
              <Text style={styles.paragraph}>
                You agree to:{'\n\n'}
                {'\u2022'} Provide accurate information about yourself{'\n'}
                {'\u2022'} Use the App only for personal, non-commercial purposes{'\n'}
                {'\u2022'} Not attempt to reverse engineer or hack the App{'\n'}
                {'\u2022'} Not use the App for any illegal purposes{'\n'}
                {'\u2022'} Keep your account credentials secure
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>5. Intellectual Property</Text>
              <Text style={styles.paragraph}>
                All content, features, and functionality of the App are owned by Tummy Buddy and are protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, or create derivative works without our written permission.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>6. Third-Party Content</Text>
              <Text style={styles.paragraph}>
                The App may display restaurant menus, nutritional data, and other information from third-party sources. We do not guarantee the accuracy of this information. Restaurant menus and prices may change without notice.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>7. Limitation of Liability</Text>
              <Text style={styles.paragraph}>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, TUMMY BUDDY SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:{'\n\n'}
                {'\u2022'} Health issues arising from dietary decisions{'\n'}
                {'\u2022'} Inaccurate nutritional information{'\n'}
                {'\u2022'} Loss of data{'\n'}
                {'\u2022'} Service interruptions
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>8. Indemnification</Text>
              <Text style={styles.paragraph}>
                You agree to indemnify and hold harmless Tummy Buddy and its officers, directors, employees, and agents from any claims, damages, or expenses arising from your use of the App or violation of these Terms.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>9. Modifications to Service</Text>
              <Text style={styles.paragraph}>
                We reserve the right to modify, suspend, or discontinue the App at any time without notice. We may also update these Terms from time to time, and your continued use of the App constitutes acceptance of any changes.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>10. Termination</Text>
              <Text style={styles.paragraph}>
                We may terminate or suspend your access to the App at any time, without prior notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>11. Governing Law</Text>
              <Text style={styles.paragraph}>
                These Terms shall be governed by and construed in accordance with the laws of the State of Florida, United States, without regard to its conflict of law provisions.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>12. Contact Information</Text>
              <Text style={styles.paragraph}>
                For questions about these Terms of Service, please contact us at:{'\n\n'}
                Email: support@tummybuddy.app
              </Text>
            </View>

            <View style={styles.bottomSpacer} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  lastUpdated: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEAL,
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 24,
    color: 'rgba(255,255,255,0.8)',
  },
  warningBox: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#FBBF24',
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 40,
  },
});
