import React, { useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { assessCapture } from "../api/imagePipeline";
import { palette, spacing, typography } from "../theme";
import { PrimaryButton } from "./PrimaryButton";

interface Props {
  /** Called with the local file uri once a photo is captured or picked. */
  onCapture: (uri: string) => void;
  /** Optional framing/instruction overlay rendered above the viewfinder. */
  overlay?: React.ReactNode;
  busy?: boolean;
}

type Flash = "off" | "on";

/** Full-screen camera viewfinder with capture, flash toggle, and gallery import (spec §4.1). */
export function CameraCapture({ onCapture, overlay, busy }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState<Flash>("off");
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  if (!permission) {
    return <View style={styles.fill} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.fill, styles.centered]}>
        <Text style={styles.permtext}>
          Snap Check needs camera access to scan your item.
        </Text>
        <PrimaryButton title="Grant camera access" onPress={requestPermission} />
      </View>
    );
  }

  // Prompt a retake on a blurry or non-camera (screenshot/stripped) image (spec §13).
  const acceptOrPrompt = async (uri: string, exif?: Record<string, unknown> | null) => {
    let warning: string | null = null;
    try {
      const { isLikelyBlurry, hasCameraExif } = await assessCapture(uri, exif);
      if (isLikelyBlurry) {
        warning = "This photo looks blurry. A sharper shot gives a more reliable result.";
      } else if (!hasCameraExif) {
        warning =
          "This looks like a screenshot or saved image. Use a photo you took of the real item for the best result.";
      }
    } catch {
      // Assessment is best-effort; never block a capture on it.
    }
    if (!warning) {
      onCapture(uri);
      return;
    }
    Alert.alert("Check your photo", warning, [
      { text: "Retake", style: "cancel" },
      { text: "Use anyway", onPress: () => onCapture(uri) },
    ]);
  };

  const takePhoto = async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9, exif: true });
      if (photo?.uri) await acceptOrPrompt(photo.uri, photo.exif);
    } finally {
      setCapturing(false);
    }
  };

  const pickFromGallery = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
      exif: true,
    });
    if (!res.canceled && res.assets[0]?.uri) {
      await acceptOrPrompt(res.assets[0].uri, res.assets[0].exif);
    }
  };

  return (
    <View style={styles.fill}>
      <CameraView ref={cameraRef} style={styles.fill} facing="back" flash={flash} />

      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topBar} pointerEvents="box-none">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Flash ${flash}`}
            onPress={() => setFlash((f) => (f === "off" ? "on" : "off"))}
            style={styles.iconBtn}
          >
            <Text style={styles.iconText}>{flash === "on" ? "⚡ On" : "⚡ Off"}</Text>
          </Pressable>
        </View>

        {overlay ? <View style={styles.overlayBody}>{overlay}</View> : <View style={styles.frame} />}

        <View style={styles.controls} pointerEvents="box-none">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Import from gallery"
            onPress={pickFromGallery}
            style={styles.sideBtn}
          >
            <Text style={styles.iconText}>Gallery</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Capture photo"
            onPress={takePhoto}
            disabled={capturing || busy}
            style={[styles.shutter, (capturing || busy) && styles.shutterBusy]}
          >
            <View style={styles.shutterInner} />
          </Pressable>

          <View style={styles.sideBtn} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: "#000" },
  centered: { alignItems: "center", justifyContent: "center", padding: spacing.lg },
  permtext: { ...typography.body, color: palette.text, textAlign: "center", marginBottom: spacing.md },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "space-between",
  },
  topBar: { flexDirection: "row", justifyContent: "flex-end", padding: spacing.md },
  overlayBody: { flex: 1, justifyContent: "center", padding: spacing.lg },
  frame: {
    flex: 1,
    margin: spacing.xl,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    borderRadius: 0,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  sideBtn: { width: 72, alignItems: "center" },
  iconBtn: {
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: "#FFFFFF",
    borderRadius: 0,
  },
  iconText: { ...typography.caption, color: "#fff", fontWeight: "700", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 1 },
  shutter: {
    width: 70,
    height: 70,
    borderRadius: 0,
    borderWidth: 1.5,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  shutterBusy: { opacity: 0.5 },
  shutterInner: { width: 54, height: 54, borderRadius: 0, backgroundColor: "#fff" },
});
