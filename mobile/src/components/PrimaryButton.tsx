import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from "react-native";
import { palette, radius, spacing, typography } from "../theme";

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
        <ActivityIndicator color={isSecondary ? palette.text : palette.onPrimary} />
      ) : (
        <Text style={[styles.label, isSecondary && styles.secondaryLabel]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  primary: { backgroundColor: palette.primary },
  secondary: { backgroundColor: "transparent", borderWidth: 1, borderColor: palette.border },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.85 },
  label: { ...typography.heading, color: palette.onPrimary },
  secondaryLabel: { color: palette.text },
});
