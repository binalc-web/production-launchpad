import React from "react";
import { FileArchive, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export const ZipMethodPanel = ({
  zipFile,
  isDragActive,
  onZipChange,
  onDragOver,
  onDragLeave,
  onDrop,
}) => (
  <div className="space-y-2">
    <Label>Upload ZIP bundle</Label>
    <input
      id="onboarding-zip-upload"
      type="file"
      accept=".zip,application/zip"
      className="sr-only"
      onChange={(e) => onZipChange(e.target.files?.[0] || null)}
    />
    <label
      htmlFor="onboarding-zip-upload"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "relative flex min-h-[220px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 transition-all duration-200",
        isDragActive && "border-primary bg-primary/5",
        zipFile && "border-primary/40 bg-primary/5",
        !isDragActive &&
          !zipFile &&
          "border-border bg-muted/20 hover:border-primary/40",
      )}
    >
      {zipFile ? (
        <>
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <FileArchive className="size-6" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">{zipFile.name}</p>
            <p className="text-xs text-muted-foreground">
              {(zipFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Drop another ZIP to replace it
          </p>
        </>
      ) : (
        <>
          <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Upload className="size-6" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              {isDragActive
                ? "Drop your ZIP file here"
                : "Drop your ZIP file here or click to browse"}
            </p>
            <p className="text-xs text-muted-foreground">Supports .zip files</p>
          </div>
        </>
      )}
    </label>
  </div>
);
