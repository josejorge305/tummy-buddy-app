import React from "react";
import { View, Text, StyleSheet } from "react-native";

type Props = {
  size?: number;
};

const TB_CORAL = "#ff8a7a"; // replace with brand coral if available
const TB_TEAL = "#2dd4bf"; // replace with brand teal if available

export const BrandIcon: React.FC<Props> = ({ size = 30 }) => {
  const radius = size / 2;

  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: radius,
        },
      ]}
    >
      <Text style={[styles.raText, { fontSize: size * 0.55 }]}>
        <Text style={styles.rLetter}>R</Text>
        <Text style={styles.aLetter}>A</Text>
      </Text>
      <View
        style={[
          styles.dash,
          {
            width: size * 0.45,
            bottom: size * 0.16,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  circle: {
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#1f2937",
    alignItems: "center",
    justifyContent: "center",
  },
  raText: {
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  rLetter: {
    color: "#ffffff",
  },
  aLetter: {
    color: TB_TEAL,
  },
  dash: {
    position: "absolute",
    height: 2,
    borderRadius: 999,
    backgroundColor: TB_CORAL,
  },
});

export default BrandIcon;
