import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  CHAT_ATTACH_MAX_FILES,
  chatAttachFileError,
  classifyChatAttachFile,
  revokeBlobPreviewUrl,
} from "@/lib/chatAttachments";

/**
 * Stage chat attachments via an upload function that returns a public record.
 * @param {{
 *   upload: (file: File) => Promise<object>,
 *   max?: number,
 * }} opts
 */
export function useChatAttachments({ upload, max = CHAT_ATTACH_MAX_FILES } = {}) {
  const [items, setItems] = useState([]);
  const [uploading, setUploading] = useState(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(
    () => () => {
      itemsRef.current.forEach((row) => revokeBlobPreviewUrl(row?.previewUrl));
    },
    [],
  );

  const remove = useCallback((item) => {
    const key = item?.localId || item?.id;
    const target = itemsRef.current.find((row) => (row.localId || row.id) === key) || item;
    revokeBlobPreviewUrl(target?.previewUrl);
    setItems((prev) => prev.filter((row) => (row.localId || row.id) !== key));
  }, []);

  const clear = useCallback(() => {
    itemsRef.current.forEach((row) => revokeBlobPreviewUrl(row?.previewUrl));
    setItems([]);
  }, []);

  const addFiles = useCallback(
    async (fileList) => {
      if (typeof upload !== "function") return;
      const files = Array.from(fileList || []).filter(Boolean);
      if (!files.length) return;

      const current = itemsRef.current;
      let remaining = Math.max(0, max - current.length);
      if (remaining <= 0) {
        toast.error(`At most ${max} attachments per message.`);
        return;
      }

      setUploading(true);
      try {
        for (const file of files) {
          if (remaining <= 0) {
            toast.error(`At most ${max} attachments per message.`);
            break;
          }
          const err = chatAttachFileError(file);
          if (err) {
            toast.error(err);
            continue;
          }
          const kind = classifyChatAttachFile(file);
          const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          const previewUrl = kind === "image" ? URL.createObjectURL(file) : null;
          const placeholder = {
            localId,
            status: "uploading",
            kind,
            fileName: file.name,
            mimeType: file.type,
            size: file.size,
            previewUrl,
          };
          setItems((prev) => [...prev, placeholder]);
          remaining -= 1;
          try {
            const record = await upload(file);
            const hasServerUrl = Boolean(record?.url);
            setItems((prev) =>
              prev.map((row) =>
                row.localId === localId
                  ? {
                      ...row,
                      ...record,
                      localId,
                      status: "ready",
                      kind: record.kind || kind,
                      previewUrl: hasServerUrl ? record.url : previewUrl || null,
                    }
                  : row,
              ),
            );
            // Blob is only released after the persisted server URL replaces it.
            if (hasServerUrl) revokeBlobPreviewUrl(previewUrl);
          } catch (uploadErr) {
            toast.error(uploadErr?.error || uploadErr?.message || `Could not attach "${file.name}".`);
            setItems((prev) => prev.filter((row) => row.localId !== localId));
            revokeBlobPreviewUrl(previewUrl);
          }
        }
      } finally {
        setUploading(false);
      }
    },
    [max, upload],
  );

  const readyItems = items.filter((item) => item.status === "ready" && item.id);
  const ids = readyItems.map((item) => item.id);

  return {
    items,
    readyItems,
    ids,
    uploading,
    addFiles,
    remove,
    clear,
  };
}
