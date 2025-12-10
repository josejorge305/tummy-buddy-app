import React from "react";
import { Text, StyleSheet, View, ViewStyle } from "react-native";

type Props = {
  style?: ViewStyle;
};

// TODO: replace with brand palette when available
const TB_CORAL = "#ff8a7a";
const TB_TEAL = "#2dd4bf";

export const BrandTitle: React.FC<Props> = ({ style }) => {
  return (
    <View style={[styles.wrapper, style]}>
      <Text style={styles.base}>
        <Text style={styles.restaurant}>Restaurant</Text>
        <Text style={styles.dash}>-</Text>
        <Text style={styles.ai}>AI</Text>
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  base: {
    fontSize: 18,
    fontWeight: "700",
  },
  restaurant: {
    color: "#ffffff",
  },
  dash: {
    color: TB_CORAL,
  },
  ai: {
    color: TB_TEAL,
  },
});

export default BrandTitle;
