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

export default function PrivacyPolicyScreen() {
  return (
    <LinearGradient colors={['#0f172a', '#020617']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <BackButton color="#fff" />
          <Text style={styles.headerTitle}>Privacy Policy</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <Text style={styles.lastUpdated}>Last Updated: January 2025</Text>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>1. Introduction</Text>
              <Text style={styles.paragraph}>
                Welcome to Tummy Buddy ("we," "our," or "us"). We are committed to protecting your privacy and ensuring you understand how we collect, use, and safeguard your personal information when you use our mobile application.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>2. Information We Collect</Text>
              <Text style={styles.subTitle}>2.1 Information You Provide</Text>
              <Text style={styles.paragraph}>
                {'\u2022'} Profile information (height, weight, age, dietary preferences){'\n'}
                {'\u2022'} Health goals and organ health priorities{'\n'}
                {'\u2022'} Food allergies and sensitivities{'\n'}
                {'\u2022'} Meal logging data and food photos{'\n'}
                {'\u2022'} Water intake tracking
              </Text>

              <Text style={styles.subTitle}>2.2 Automatically Collected Information</Text>
              <Text style={styles.paragraph}>
                {'\u2022'} Device information (device type, operating system){'\n'}
                {'\u2022'} Location data (only when you search for restaurants){'\n'}
                {'\u2022'} App usage analytics{'\n'}
                {'\u2022'} Crash reports and performance data
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>3. How We Use Your Information</Text>
              <Text style={styles.paragraph}>
                We use your information to:{'\n\n'}
                {'\u2022'} Provide personalized nutritional analysis{'\n'}
                {'\u2022'} Track your meals and health progress{'\n'}
                {'\u2022'} Identify foods that may affect your organ health{'\n'}
                {'\u2022'} Recommend restaurants and dishes based on your preferences{'\n'}
                {'\u2022'} Improve our app and services{'\n'}
                {'\u2022'} Send important updates about the app
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>4. Data Storage and Security</Text>
              <Text style={styles.paragraph}>
                Your data is stored securely using industry-standard encryption. We use Cloudflare for our backend services, which provides enterprise-grade security. Your personal health data is never sold to third parties.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>5. Third-Party Services</Text>
              <Text style={styles.paragraph}>
                We use the following third-party services:{'\n\n'}
                {'\u2022'} Google Maps - for restaurant location services{'\n'}
                {'\u2022'} OpenAI - for food analysis (anonymized data only){'\n'}
                {'\u2022'} Edamam - for nutritional information{'\n'}
                {'\u2022'} Expo/React Native - for app infrastructure
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>6. Your Rights</Text>
              <Text style={styles.paragraph}>
                You have the right to:{'\n\n'}
                {'\u2022'} Access your personal data{'\n'}
                {'\u2022'} Request correction of inaccurate data{'\n'}
                {'\u2022'} Request deletion of your data{'\n'}
                {'\u2022'} Export your data{'\n'}
                {'\u2022'} Opt-out of analytics collection
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>7. Data Retention</Text>
              <Text style={styles.paragraph}>
                We retain your data for as long as your account is active. If you delete your account, we will delete your personal data within 30 days, except where we are required to retain it for legal purposes.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>8. Children's Privacy</Text>
              <Text style={styles.paragraph}>
                Tummy Buddy is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>9. Changes to This Policy</Text>
              <Text style={styles.paragraph}>
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>10. Contact Us</Text>
              <Text style={styles.paragraph}>
                If you have any questions about this Privacy Policy, please contact us at:{'\n\n'}
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
  subTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginTop: 12,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 24,
    color: 'rgba(255,255,255,0.8)',
  },
  bottomSpacer: {
    height: 40,
  },
});
