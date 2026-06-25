import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { palette, spacing } from "../theme";

interface Props {
  title?: string;
  children?: React.ReactNode;
}

/** Shared screen wrapper: safe-area, dark background, optional title. */
export function Screen({ title, children }: Props) {
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.inner}>
        <View style={styles.header}>
          <Text style={styles.brandTitle}>SNAP CHECK</Text>
          <Text style={styles.subTitle}>powered by flossin</Text>
        </View>
        {title ? (
          <View style={styles.titleContainer}>
            <Text style={styles.screenTitle}>[ {title.toUpperCase()} ]</Text>
          </View>
        ) : null}
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  inner: { flex: 1, padding: spacing.md },
  header: {
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    paddingBottom: spacing.sm,
  },
  brandTitle: {
    fontFamily: "monospace",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 2,
    color: palette.text,
  },
  subTitle: {
    fontFamily: "monospace",
    fontSize: 10,
    color: palette.textMuted,
    marginTop: 1,
  },
  titleContainer: {
    marginBottom: spacing.md,
  },
  screenTitle: {
    fontFamily: "monospace",
    fontSize: 13,
    fontWeight: "700",
    color: palette.text,
    letterSpacing: 1,
  },
});
