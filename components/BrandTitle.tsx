import React from "react";
import { Text, StyleSheet, View, ViewStyle, Image } from "react-native";

type Props = {
  style?: ViewStyle;
  size?: "small" | "medium" | "large";
  showIcon?: boolean;
  showTagline?: boolean;
};

const TEAL = "#14b8a6";

export const BrandTitle: React.FC<Props> = ({
  style,
  size = "medium",
  showIcon = true,
  showTagline = false,
}) => {
  const fontSize = size === "small" ? 18 : size === "large" ? 28 : 22;
  const taglineSize = size === "small" ? 10 : size === "large" ? 14 : 12;
  // Icon should be large enough that bottom of hat aligns with top of "R"
  // and middle bubble extends above the text
  const iconSize = size === "small" ? 44 : size === "large" ? 72 : 58;

  return (
    <View style={[styles.wrapper, style]}>
      {showIcon && (
        <Image
          source={require("../assets/images/REstaurant AI Icon.png")}
          style={{ width: iconSize, height: iconSize }}
          resizeMode="contain"
        />
      )}
      <View style={styles.textContainer}>
        <Text style={[styles.base, { fontSize }]}>
          <Text style={styles.restaurant}>Restaurant</Text>
          <Text style={styles.dash}>-</Text>
          <Text style={styles.ai}>AI</Text>
        </Text>
        {showTagline && (
          <Text style={[styles.tagline, { fontSize: taglineSize }]}>
            Smart restaurant and food insights
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexShrink: 1,
  },
  textContainer: {
    flexDirection: "column",
    marginTop: 8,
    flexShrink: 1,
  },
  base: {
    fontWeight: "700",
  },
  restaurant: {
    color: "#ffffff",
  },
  dash: {
    color: TEAL,
  },
  ai: {
    color: TEAL,
  },
  tagline: {
    color: "#9ca3af",
    marginTop: 2,
    flexShrink: 1,
  },
});

export default BrandTitle;
