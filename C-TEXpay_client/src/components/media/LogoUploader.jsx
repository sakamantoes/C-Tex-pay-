import { useCallback, useEffect, useRef, useState } from "react";
import { Image as ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "react-toastify";
import { uploadImage, CloudinaryError } from "../../service/cloudinary.service";

/**
 * Reusable logo uploader.
 *
 * Props:
 *   value       — current logo URL (or "")
 *   onChange    — called with (url) on upload, and ("") on removal
 *   disabled    — disables controls
 *   size        — "sm" | "md" | "lg"
 *   label       — text label
 */
export default function LogoUploader({
  value = "",
  onChange,
  disabled = false,
  size = "md",
  label = "Business logo",
}) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(value || "");
  const inputRef = useRef(null);

  useEffect(() => {
    setPreview(value || "");
  }, [value]);

  const pickFile = useCallback(() => {
    if (disabled || uploading) return;
    inputRef.current?.click();
  }, [disabled, uploading]);

  const handleFile = useCallback(
    async (event) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;

      setUploading(true);

      // Instant local preview while upload is in flight
      const localUrl = URL.createObjectURL(file);
      setPreview(localUrl);

      try {
        const result = await uploadImage(file, "ctexpay/business-logos");
        setPreview(result.url);
        onChange?.(result.url, result);
        toast.success("Logo uploaded.");
      } catch (error) {
        URL.revokeObjectURL(localUrl);
        setPreview(value || "");
        const msg =
          error instanceof CloudinaryError
            ? error.message
            : "Upload failed. Please try again.";
        toast.error(msg);
      } finally {
        setUploading(false);
      }
    },
    [onChange, value]
  );

  const handleRemove = useCallback(
    (event) => {
      event.stopPropagation();
      if (disabled || uploading) return;
      setPreview("");
      onChange?.("");
      toast.info("Logo removed. Save to apply.");
    },
    [disabled, uploading, onChange]
  );

  const dims = {
    sm: "h-12 w-12",
    md: "h-20 w-20",
    lg: "h-28 w-28",
  }[size];

  return (
    <div>
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ctex-text-muted">
        {label}
      </span>

      <div className="flex items-center gap-4">
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          onClick={pickFile}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              pickFile();
            }
          }}
          aria-label="Choose logo"
          className={[
            dims,
            "relative flex flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-ctex-border bg-ctex-elevated/60",
            disabled || uploading
              ? "cursor-not-allowed opacity-70"
              : "cursor-pointer hover:border-ctex-blue",
          ].join(" ")}
        >
          {preview ? (
            <img
              src={preview}
              alt="Logo preview"
              className="h-full w-full object-cover"
              onError={() => setPreview("")}
            />
          ) : (
            <ImageIcon
              className="h-5 w-5 text-ctex-text-muted"
              aria-hidden="true"
            />
          )}

          {uploading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <Loader2
                className="h-4 w-4 animate-spin text-white"
                aria-hidden="true"
              />
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={pickFile}
            disabled={disabled || uploading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-ctex-border bg-ctex-surface px-3 py-1.5 text-xs font-medium text-ctex-text transition hover:bg-ctex-elevated disabled:opacity-50"
          >
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            {uploading ? "Uploading…" : preview ? "Replace" : "Upload logo"}
          </button>

          {preview ? (
            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled || uploading}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-500/10 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Remove
            </button>
          ) : null}

          <p className="text-[11px] text-ctex-text-muted">
            PNG, JPG, WEBP · up to 2 MB
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}