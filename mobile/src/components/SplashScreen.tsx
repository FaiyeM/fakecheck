import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { palette, spacing } from "../theme";

interface SplashScreenProps {
  onAnimationEnd?: () => void;
}

export function SplashScreen({ onAnimationEnd }: SplashScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Fade in the logo elements
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      // 2. Hold for 1.2s
      Animated.delay(1200),
      // 3. Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onAnimationEnd) {
        onAnimationEnd();
      }
    });
  }, [fadeAnim, onAnimationEnd]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.logoFrame}>
          <Text style={styles.logoText}>[SC]</Text>
        </View>
        <Text style={styles.title}>SNAP CHECK</Text>
        <Text style={styles.subtitle}>POWERED BY FLOSSIN</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    alignItems: "center",
  },
  logoFrame: {
    borderWidth: 2,
    borderColor: palette.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    backgroundColor: palette.surface,
  },
  logoText: {
    fontFamily: "monospace",
    fontSize: 32,
    fontWeight: "bold",
    color: palette.text,
    letterSpacing: 2,
  },
  title: {
    fontFamily: "monospace",
    fontSize: 24,
    fontWeight: "bold",
    color: palette.text,
    letterSpacing: 4,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
  },
  subtitle: {
    fontFamily: "monospace",
    fontSize: 10,
    color: palette.textMuted,
    letterSpacing: 2.5,
    textTransform: "uppercase",
  },
});
