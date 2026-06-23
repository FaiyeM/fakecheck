import React, { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { palette, radius, spacing, typography } from "../theme";
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
          FakeCheck needs camera access to scan your item.
        </Text>
        <PrimaryButton title="Grant camera access" onPress={requestPermission} />
      </View>
    );
  }

  const takePhoto = async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      if (photo?.uri) onCapture(photo.uri);
    } finally {
      setCapturing(false);
    }
  };

  const pickFromGallery = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
    });
    if (!res.canceled && res.assets[0]?.uri) onCapture(res.assets[0].uri);
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
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.7)",
    borderRadius: radius.lg,
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
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  iconText: { ...typography.caption, color: "#fff", fontWeight: "600" },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterBusy: { opacity: 0.5 },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: "#fff" },
});
