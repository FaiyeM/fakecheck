import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from "react-native";
import { palette, spacing } from "../theme";

interface Props {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

/** Shared CTA button. WCAG AA contrast; label always present (spec §12). */
export function PrimaryButton({
  title,
  onPress,
  variant = "primary",
  disabled,
  loading,
  style,
}: Props) {
  const isSecondary = variant === "secondary";
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        isSecondary ? styles.secondary : styles.primary,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} />
      ) : (
        <Text style={[styles.label, isSecondary && styles.secondaryLabel]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    borderRadius: 0,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
    backgroundColor: "transparent",
  },
  primary: {
    borderColor: palette.border,
  },
  secondary: {
    borderColor: palette.border,
    opacity: 0.6,
  },
  disabled: { opacity: 0.35 },
  pressed: { backgroundColor: "rgba(17,17,17,0.08)" },
  label: {
    fontFamily: "monospace",
    fontSize: 14,
    fontWeight: "700",
    color: palette.text,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  secondaryLabel: {
    color: palette.text,
  },
});
