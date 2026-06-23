import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { palette, spacing, typography } from "../theme";

interface Props {
  title?: string;
  children?: React.ReactNode;
}

/** Shared screen wrapper: safe-area, dark background, optional title. */
export function Screen({ title, children }: Props) {
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.inner}>
        {title ? <Text style={styles.title}>{title}</Text> : null}
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  inner: { flex: 1, padding: spacing.md },
  title: { ...typography.title, color: palette.text, marginBottom: spacing.md },
});
