import React from "react";
import { Check, ChevronDown, ImagePlus, Loader2, Plus, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PlatformPromptBox } from "@/components/chat/PlatformPromptBox";
import { cn } from "@/lib/utils";

export const ScratchMethodPanel = ({
  scratchImageInputRef,
  scratchReferenceImages,
  setScratchReferenceImages,
  scratchPrompt,
  setScratchPrompt,
  isEnhancementPending,
  enhanceLoading,
  canEnhancePrompt,
  onAcceptEnhancement,
  onUndoEnhancement,
  onEnhancePrompt,
  showScratchDetails,
  setShowScratchDetails,
  editablePresetColors,
  colorPickerTarget,
  openBrandColorPicker,
  customBrandColors,
  setBrandColors,
  brandColors,
  MAX_BRAND_COLORS,
  brandColorPickerInputRef,
  activePickerColor,
  normalizeHexColorValue,
  setEditablePresetColors,
  replaceBrandColor,
  setColorPickerTarget,
  setCustomBrandColorPicker,
  pickerSessionColor,
  setPickerSessionColor,
  addBrandColor,
  websiteUrl,
  setWebsiteUrl,
  fontStyle,
  setFontStyle,
  FONT_STYLE_OPTIONS,
  getFontPreviewStyle,
  brandTones,
  setBrandTones,
  BRAND_TONE_OPTIONS,
  industry,
  setIndustry,
  INDUSTRY_OPTIONS,
  starterChips = [],
  selectedStarterChipId = null,
  onStarterChipSelect,
  promptError = "",
  promptTextareaRef,
  extraContext = null,
  templateGallery = null,
}) => {
  return (
    <div className="space-y-5">
      <div className="space-y-4">
        <div className="space-y-2">
          <PlatformPromptBox
            className={promptError ? "border-destructive/60" : undefined}
            toolbarLeft={
              <p className="text-xs text-muted-foreground">
                Be specific: pages, features, and visual style.
              </p>
            }
            toolbarRight={
              <div className="flex flex-wrap items-center gap-2">
                {isEnhancementPending ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="default"
                      className="h-8 gap-1.5 px-3 text-white"
                      onClick={onAcceptEnhancement}
                    >
                      <Check className="h-3.5 w-3.5" aria-hidden />
                      Accept
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 px-3"
                      onClick={onUndoEnhancement}
                    >
                      Undo
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 px-3"
                    disabled={!canEnhancePrompt}
                    onClick={onEnhancePrompt}
                  >
                    {enhanceLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" aria-hidden />
                    )}
                    Enhance prompt
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 px-3"
                  disabled={scratchReferenceImages.length >= 6}
                  onClick={() => scratchImageInputRef.current?.click()}
                >
                  <ImagePlus className="h-3.5 w-3.5" aria-hidden />
                  {scratchReferenceImages.length > 0
                    ? `Add image (${scratchReferenceImages.length})`
                    : "Add image"}
                </Button>
              </div>
            }
          >
            <input
              ref={scratchImageInputRef}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                if (!files.length) return;
                setScratchReferenceImages((prev) => {
                  const remainingSlots = Math.max(0, 6 - prev.length);
                  const selected = files.slice(0, remainingSlots).map((file) => ({
                    id: `${Date.now()}-${Math.random()}`,
                    file,
                    previewUrl: URL.createObjectURL(file),
                  }));
                  return [...prev, ...selected];
                });
                e.target.value = "";
              }}
            />
            <div className="flex flex-col gap-2.5 px-4 pb-1 pt-4">
              {scratchReferenceImages.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {scratchReferenceImages.map((item) => (
                    <div
                      key={item.id}
                      className="group relative h-16 w-16 overflow-hidden rounded-xl border border-primary/25 bg-muted/30"
                    >
                      <img
                        src={item.previewUrl}
                        alt={item.file?.name || "Reference image"}
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-background/95 text-muted-foreground shadow-sm transition hover:text-foreground"
                        aria-label="Remove reference image"
                        onClick={() => {
                          URL.revokeObjectURL(item.previewUrl);
                          setScratchReferenceImages((prev) =>
                            prev.filter((img) => img.id !== item.id),
                          );
                        }}
                      >
                        <X className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
              <Textarea
                ref={promptTextareaRef}
                value={scratchPrompt}
                onChange={(e) => setScratchPrompt(e.target.value)}
                disabled={isEnhancementPending}
                aria-label="Describe your idea"
                aria-invalid={Boolean(promptError)}
                placeholder="A dashboard where managers track weekly team updates"
                className={cn(
                  "min-h-[140px] resize-y border-0 bg-transparent px-0 text-base leading-relaxed text-foreground placeholder:text-muted-foreground shadow-none focus-visible:border-0 focus-visible:ring-0",
                  isEnhancementPending &&
                    "bg-size-[200%_100%] bg-[linear-gradient(110deg,var(--color-muted),42%,var(--color-accent),58%,var(--color-muted))] motion-safe:animate-[client-link-text-shimmer_2.5s_linear_infinite]",
                )}
              />
            </div>
          </PlatformPromptBox>
          {promptError ? (
            <p className="text-sm font-medium text-destructive" role="alert">
              {promptError}
            </p>
          ) : null}
        </div>

        {starterChips.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Need a starting point?</p>
            <div className="flex flex-wrap gap-2">
              {starterChips.map((chip) => {
                const selected = selectedStarterChipId === chip.id;
                return (
                  <Button
                    key={chip.id}
                    type="button"
                    size="sm"
                    variant="outline"
                    aria-pressed={selected}
                    disabled={isEnhancementPending}
                    className={cn(
                      "h-8 rounded-lg px-3",
                      selected && "border-primary bg-primary/10 text-foreground",
                    )}
                    onClick={() => onStarterChipSelect?.(chip)}
                  >
                    {selected ? <Check className="size-3.5" aria-hidden /> : null}
                    {chip.label}
                  </Button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      {templateGallery}

      <Collapsible
        open={showScratchDetails}
        onOpenChange={setShowScratchDetails}
        className="overflow-hidden rounded-xl border border-border bg-background text-foreground"
      >
        <CollapsibleTrigger className="flex w-full cursor-pointer items-center justify-between gap-3 px-5 py-4 text-left">
          <p className="text-sm font-semibold text-foreground">
            Add more context <span className="font-normal text-muted-foreground">(optional)</span>
          </p>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
              showScratchDetails && "rotate-180",
            )}
            aria-hidden
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-6 border-t border-border px-5 pb-5 md:px-6 md:pb-6">
          <div className="grid gap-5 pt-5 md:grid-cols-2 md:items-start">
            <div className="space-y-5">
              <div className="space-y-2.5 rounded-2xl border border-primary/20 bg-primary/5 p-4 shadow-md shadow-primary/10">
                <Label className="text-foreground">Brand Colors (optional)</Label>
                <div className="flex flex-wrap items-center gap-3">
                  {editablePresetColors.map((color, index) => (
                    <button
                      key={`${color}-${index}`}
                      type="button"
                      onClick={() => openBrandColorPicker({ type: "preset", index })}
                      className={cn(
                        "h-10 w-10 rounded-lg border border-border bg-background shadow-inner transition-all duration-200 hover:scale-[1.04] hover:border-primary/70",
                        colorPickerTarget?.type === "preset" && colorPickerTarget?.index === index
                          ? "ring-2 ring-primary/60 ring-offset-2 ring-offset-background"
                          : "",
                      )}
                      aria-label={`Edit ${color}`}
                      title={`Edit ${color}`}
                      style={{ backgroundColor: color }}
                    >
                      <span className="sr-only">{color}</span>
                    </button>
                  ))}
                  {customBrandColors.map((color) => (
                    <button
                      key={`custom-${color}`}
                      type="button"
                      onClick={() => openBrandColorPicker({ type: "custom", index: -1, color })}
                      className="group relative h-10 w-10 rounded-lg border border-border bg-background shadow-inner transition-all duration-200 hover:scale-[1.04] hover:border-primary/70"
                      title={color}
                      style={{ backgroundColor: color }}
                      aria-label={`Custom color ${color}`}
                    >
                      <span className="sr-only">{color}</span>
                      <span className="pointer-events-none absolute -top-1.5 -right-1.5 hidden h-5 w-5 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm group-hover:flex">
                        <X
                          className="h-3 w-3 pointer-events-auto"
                          aria-hidden
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setBrandColors((prev) => prev.filter((item) => item !== color));
                          }}
                        />
                      </span>
                    </button>
                  ))}
                  {brandColors.length < MAX_BRAND_COLORS ? (
                    <button
                      type="button"
                      onClick={() => openBrandColorPicker({ type: "add", index: -1 })}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background text-foreground/80 transition-colors hover:border-primary/60 hover:bg-primary/10 hover:text-foreground"
                      title="Pick custom color"
                    >
                      <Plus className="h-5 w-5" aria-hidden />
                      <span className="sr-only">Pick color</span>
                    </button>
                  ) : null}
                  <input
                    ref={brandColorPickerInputRef}
                    id="custom-brand-color-picker"
                    type="color"
                    value={activePickerColor}
                    className="sr-only"
                    onChange={(e) => {
                      const normalized = normalizeHexColorValue(e.target.value);
                      if (!normalized) return;
                      if (colorPickerTarget?.type === "preset" && colorPickerTarget.index >= 0) {
                        const idx = colorPickerTarget.index;
                        const previous = editablePresetColors[idx];
                        setEditablePresetColors((prev) => {
                          const next = [...prev];
                          next[idx] = normalized;
                          return next;
                        });
                        setBrandColors((prev) =>
                          prev.map((item) => (item === previous ? normalized : item)),
                        );
                        return;
                      }
                      if (colorPickerTarget?.type === "custom" && colorPickerTarget.color) {
                        replaceBrandColor(colorPickerTarget.color, normalized);
                        setColorPickerTarget((prev) => ({ ...prev, color: normalized }));
                        return;
                      }
                      setCustomBrandColorPicker(normalized);
                      if (pickerSessionColor) {
                        setBrandColors((prev) =>
                          prev.map((item) => (item === pickerSessionColor ? normalized : item)),
                        );
                        setPickerSessionColor(normalized);
                        return;
                      }
                      addBrandColor(normalized);
                      setPickerSessionColor(normalized);
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2.5 rounded-2xl border border-primary/15 bg-primary/5 p-4">
                <Label className="text-foreground">Preferred Font Style (optional)</Label>
                <Select
                  value={fontStyle}
                  onValueChange={(value) => {
                    setFontStyle(value);
                  }}
                >
                  <SelectTrigger className="h-10 w-full rounded-xl border-primary/20 bg-background">
                    <SelectValue placeholder="Select font style">
                      {fontStyle && (
                        <span className="truncate" style={getFontPreviewStyle(fontStyle)}>
                          {fontStyle}
                        </span>
                      )}
                    </SelectValue>
                  </SelectTrigger>

                  <SelectContent
                    position="popper"
                    className="border-primary/20 bg-popover text-popover-foreground"
                  >
                    {FONT_STYLE_OPTIONS.map((item) => (
                      <SelectItem
                        key={item}
                        value={item}
                        className="focus:bg-primary/10 focus:text-foreground"
                      >
                        <span style={getFontPreviewStyle(item)}>{item}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2.5 rounded-2xl border border-primary/15 bg-primary/5 p-4">
                <Label className="text-foreground">Brand Tone (optional)</Label>
                <div className="flex flex-wrap gap-2">
                  {BRAND_TONE_OPTIONS.map((tone) => {
                    const selected = brandTones.includes(tone);
                    return (
                      <Button
                        key={tone}
                        type="button"
                        size="sm"
                        variant="outline"
                        className={cn(
                          "h-8 rounded-full border-primary/25 bg-background px-3 text-foreground hover:bg-primary/5",
                          selected &&
                            "border-primary/80 bg-primary/15 text-foreground shadow-md shadow-primary/15",
                        )}
                        onClick={() =>
                          setBrandTones((prev) =>
                            prev.includes(tone)
                              ? prev.filter((item) => item !== tone)
                              : [...prev, tone],
                          )
                        }
                      >
                        {tone}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2.5 rounded-2xl border border-primary/15 bg-primary/5 p-4">
                <Label className="text-foreground">Industry (optional)</Label>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger className="h-10 w-full rounded-xl border-primary/20 bg-background">
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent className="border-primary/20 bg-popover text-popover-foreground">
                    {INDUSTRY_OPTIONS.map((item) => (
                      <SelectItem
                        key={item}
                        value={item}
                        className="focus:bg-primary/10 focus:text-foreground"
                      >
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-2.5 rounded-2xl border border-primary/15 bg-primary/5 p-4">
                <Label className="text-foreground">Reference Website URL (optional)</Label>
                <Input
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="h-10 rounded-xl border-primary/20 bg-background"
                />
              </div>
            </div>
          </div>
          {extraContext ? (
            <div className="space-y-3 border-t border-border pt-5">
              <div>
                <p className="text-sm font-semibold text-foreground">Skills &amp; rules</p>
                <p className="text-xs text-muted-foreground">
                  Frontend prompt and skill/rule packs the agent should follow.
                </p>
              </div>
              {extraContext}
            </div>
          ) : null}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
