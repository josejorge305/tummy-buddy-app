// NOTE: DishScreen is deprecated. Navigation to this screen has been removed.
// It will be replaced by a dedicated "Likely Recipe" screen in the future.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function DishScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        DishScreen is deprecated. This view should no longer be used.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#0b0b0f',
  },
  text: {
    color: '#fefefe',
    fontSize: 16,
    textAlign: 'center',
  },
});
