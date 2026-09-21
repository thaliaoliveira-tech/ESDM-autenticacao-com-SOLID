import React from "react";
import { View, StyleSheet, Text } from "react-native";
import Svg, { Path, Defs, LinearGradient, Stop } from "react-native-svg";

interface SintetizaLogoProps {
  size?: number;
  variant?: "colored" | "white";
  showTitle?: boolean;
  titleSize?: number;
  titleColor?: string;
}

export function SintetizaLogo({
  size = 64,
  variant = "colored",
  showTitle = true,
  titleSize = 32,
  titleColor,
}: SintetizaLogoProps) {
  const isWhite = variant === "white";
  const defaultTitleColor = isWhite ? "#FFFFFF" : "#1E3A8A";
  const finalTitleColor = titleColor || defaultTitleColor;

  return (
    <View style={styles.container}>
      <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <Defs>
          <LinearGradient id="gradientTop" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={isWhite ? "#FFFFFF" : "#50A6FF"} />
            <Stop offset="100%" stopColor={isWhite ? "#E0EFFF" : "#1D64ED"} />
          </LinearGradient>
          <LinearGradient id="gradientBottom" x1="100%" y1="100%" x2="0%" y2="0%">
            <Stop offset="0%" stopColor={isWhite ? "#FFFFFF" : "#0D4CD3"} />
            <Stop offset="100%" stopColor={isWhite ? "#BFDBFE" : "#2563EB"} />
          </LinearGradient>
        </Defs>

        {/* Top-left swirl petal */}
        <Path
          d="M 50 10 C 27.9 10 10 27.9 10 50 C 10 63.8 17 76 27.6 83.2 C 26.5 78.4 26 73.3 26 68 C 26 49.2 41.2 34 60 34 C 67.2 34 73.8 36.2 79.4 40 C 74.4 22.4 58.6 10 50 10 Z"
          fill="url(#gradientTop)"
        />

        {/* Bottom-right swirl petal */}
        <Path
          d="M 50 90 C 72.1 90 90 72.1 90 50 C 90 36.2 83 24 72.4 16.8 C 73.5 21.6 74 26.7 74 32 C 74 50.8 58.8 66 40 66 C 32.8 66 26.2 63.8 20.6 60 C 25.6 77.6 41.4 90 50 90 Z"
          fill="url(#gradientBottom)"
        />
      </Svg>

      {showTitle && (
        <Text
          style={[
            styles.title,
            {
              fontSize: titleSize,
              color: finalTitleColor,
            },
          ]}
        >
          Sintetiza
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontWeight: "700",
    letterSpacing: -0.5,
    marginTop: 12,
  },
});

