import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ZipMethodPanel } from "@/pages/Project/CreateProject/components/ZipMethodPanel";
import { ScratchMethodPanel } from "@/pages/Project/CreateProject/components/ScratchMethodPanel";
import { FigmaMethodPanel } from "@/pages/Project/CreateProject/components/FigmaMethodPanel";
import { FeedbackMethodPanel } from "@/pages/Project/CreateProject/components/FeedbackMethodPanel";
import {
  BRAND_TONE_OPTIONS,
  FONT_STYLE_GOOGLE_FAMILY,
  FONT_STYLE_OPTIONS,
  INDUSTRY_OPTIONS,
  MAX_BRAND_COLORS,
} from "@/pages/Project/CreateProject/constants/constants";

function normalizeHexColorValue(raw) {
  const v = String(raw || "")
    .trim()
    .toUpperCase();
  if (!v) return "";
  const prefixed = v.startsWith("#") ? v : `#${v}`;
  if (!/^#[0-9A-F]{6}$/.test(prefixed)) return "";
  return prefixed;
}

function loadGoogleFontFamily(family) {
  if (typeof document === "undefined") return;
  const trimmed = String(family || "").trim();
  if (!trimmed) return;
  const id = `font-${trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${trimmed.replace(/\s+/g, "+")}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

function getFontPreviewStyle(option) {
  const cfg = FONT_STYLE_GOOGLE_FAMILY[option];
  if (!cfg?.family) return undefined;
  return { fontFamily: `"${cfg.family}", ${cfg.fallback || "sans-serif"}` };
}

export const MethodSetupPanel = ({
  method,
  zipFile,
  isDragActive,
  onZipChange,
  onDragOver,
  onDragLeave,
  onDrop,
  scratchPrompt,
  setScratchPrompt,
  websiteUrl,
  setWebsiteUrl,
  brandColors = [],
  setBrandColors,
  fontStyle = "",
  setFontStyle,
  brandTones = [],
  setBrandTones,
  industry = "",
  setIndustry,
  migrateIntegrationCard,
  feedbackIntegrationCard,
  enhanceLoading = false,
  enhanceState = "idle",
  onEnhancePrompt,
  onAcceptEnhancement,
  onUndoEnhancement,
  starterChips,
  selectedStarterChipId,
  onStarterChipSelect,
  promptError,
  promptTextareaRef,
  extraContext,
  templateGallery,
}) => {
  const [showScratchDetails, setShowScratchDetails] = React.useState(false);
  const [scratchReferenceImages, setScratchReferenceImages] = React.useState([]);
  const [editablePresetColors, setEditablePresetColors] = React.useState([]);
  const [customBrandColorPicker, setCustomBrandColorPicker] = React.useState("#4F46E5");
  const [colorPickerTarget, setColorPickerTarget] = React.useState({
    type: "add",
    index: -1,
    color: "",
  });
  const [pickerSessionColor, setPickerSessionColor] = React.useState("");
  const scratchImageInputRef = React.useRef(null);
  const brandColorPickerInputRef = React.useRef(null);
  const scratchImagesRef = React.useRef([]);
  const isEnhancementPending = enhanceState === "pending";
  const canEnhancePrompt =
    scratchPrompt.trim().length > 0 && !enhanceLoading && !isEnhancementPending;
  const addBrandColor = React.useCallback(
    (rawColor) => {
      const normalized = normalizeHexColorValue(rawColor);
      if (!normalized) return;
      setBrandColors((prev) => {
        if (prev.includes(normalized) || prev.length >= MAX_BRAND_COLORS) return prev;
        return [...prev, normalized];
      });
      setCustomBrandColorPicker(normalized);
    },
    [setBrandColors],
  );
  const replaceBrandColor = React.useCallback(
    (previousColor, nextColor) => {
      if (!previousColor || !nextColor || previousColor === nextColor) return;
      setBrandColors((prev) => {
        const replaced = prev.map((item) => (item === previousColor ? nextColor : item));
        return Array.from(new Set(replaced));
      });
    },
    [setBrandColors],
  );
  const openBrandColorPicker = React.useCallback((target) => {
    setColorPickerTarget(target);
    setPickerSessionColor("");
    requestAnimationFrame(() => {
      brandColorPickerInputRef.current?.click();
    });
  }, []);
  const activePickerColor = React.useMemo(() => {
    if (colorPickerTarget?.type === "preset" && colorPickerTarget.index >= 0) {
      return editablePresetColors[colorPickerTarget.index] || customBrandColorPicker;
    }
    if (colorPickerTarget?.type === "custom" && colorPickerTarget.color) {
      return colorPickerTarget.color;
    }
    return customBrandColorPicker;
  }, [colorPickerTarget, customBrandColorPicker, editablePresetColors]);
  const presetColorSet = React.useMemo(
    () => new Set(editablePresetColors.map((color) => String(color || "").toUpperCase())),
    [editablePresetColors],
  );
  const customBrandColors = React.useMemo(
    () => brandColors.filter((color) => !presetColorSet.has(String(color || "").toUpperCase())),
    [brandColors, presetColorSet],
  );

  React.useEffect(() => {
    FONT_STYLE_OPTIONS.forEach((item) => {
      const family = FONT_STYLE_GOOGLE_FAMILY[item]?.family;
      if (family) loadGoogleFontFamily(family);
    });
  }, []);

  React.useEffect(() => {
    scratchImagesRef.current = scratchReferenceImages;
  }, [scratchReferenceImages]);

  React.useEffect(
    () => () => {
      scratchImagesRef.current.forEach((item) => {
        if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    },
    [],
  );
  if (method === "zip") {
    return (
      <ZipMethodPanel
        zipFile={zipFile}
        isDragActive={isDragActive}
        onZipChange={onZipChange}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      />
    );
  }

  if (method === "scratch") {
    return (
      <ScratchMethodPanel
        scratchImageInputRef={scratchImageInputRef}
        scratchReferenceImages={scratchReferenceImages}
        setScratchReferenceImages={setScratchReferenceImages}
        scratchPrompt={scratchPrompt}
        setScratchPrompt={setScratchPrompt}
        isEnhancementPending={isEnhancementPending}
        enhanceLoading={enhanceLoading}
        canEnhancePrompt={canEnhancePrompt}
        onAcceptEnhancement={onAcceptEnhancement}
        onUndoEnhancement={onUndoEnhancement}
        onEnhancePrompt={onEnhancePrompt}
        showScratchDetails={showScratchDetails}
        setShowScratchDetails={setShowScratchDetails}
        editablePresetColors={editablePresetColors}
        colorPickerTarget={colorPickerTarget}
        openBrandColorPicker={openBrandColorPicker}
        customBrandColors={customBrandColors}
        setBrandColors={setBrandColors}
        brandColors={brandColors}
        MAX_BRAND_COLORS={MAX_BRAND_COLORS}
        brandColorPickerInputRef={brandColorPickerInputRef}
        activePickerColor={activePickerColor}
        normalizeHexColorValue={normalizeHexColorValue}
        setEditablePresetColors={setEditablePresetColors}
        replaceBrandColor={replaceBrandColor}
        setColorPickerTarget={setColorPickerTarget}
        setCustomBrandColorPicker={setCustomBrandColorPicker}
        pickerSessionColor={pickerSessionColor}
        setPickerSessionColor={setPickerSessionColor}
        addBrandColor={addBrandColor}
        websiteUrl={websiteUrl}
        setWebsiteUrl={setWebsiteUrl}
        fontStyle={fontStyle}
        setFontStyle={setFontStyle}
        FONT_STYLE_OPTIONS={FONT_STYLE_OPTIONS}
        getFontPreviewStyle={getFontPreviewStyle}
        brandTones={brandTones}
        setBrandTones={setBrandTones}
        BRAND_TONE_OPTIONS={BRAND_TONE_OPTIONS}
        industry={industry}
        setIndustry={setIndustry}
        INDUSTRY_OPTIONS={INDUSTRY_OPTIONS}
        starterChips={starterChips}
        selectedStarterChipId={selectedStarterChipId}
        onStarterChipSelect={onStarterChipSelect}
        promptError={promptError}
        promptTextareaRef={promptTextareaRef}
        extraContext={extraContext}
        templateGallery={templateGallery}
      />
    );
  }

  if (method === "figma") {
    return <FigmaMethodPanel />;
  }

  if (method === "feedback") {
    return <FeedbackMethodPanel feedbackIntegrationCard={feedbackIntegrationCard} />;
  }

  return <div className="space-y-4">{migrateIntegrationCard}</div>;
};
