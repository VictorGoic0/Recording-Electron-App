import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useMediaStore } from "../store/mediaStore";

export function useImport(showToast) {
  const addMultipleMedia = useMediaStore((s) => s.addMultipleMedia);
  const [isProcessing, setIsProcessing] = useState(false);

  const processImportedFiles = async (filePaths) => {
    if (filePaths.length === 0) return;

    setIsProcessing(true);
    const newClips = [];
    const errors = [];
    const unsupportedFiles = [];

    for (const filePath of filePaths) {
      try {
        const ext = filePath.toLowerCase().split(".").pop();
        if (!["mp4", "mov", "webm"].includes(ext)) {
          unsupportedFiles.push(filePath);
          continue;
        }

        const result = await window.electron.fileSystem.processVideoFile(filePath);

        if (result.success) {
          newClips.push({ id: uuidv4(), ...result.data });
        } else {
          const errorMsg =
            result.error.includes("Invalid data") || result.error.includes("moov atom not found")
              ? "File appears to be corrupted or incomplete"
              : result.error;
          errors.push({ filePath, error: errorMsg });
        }
      } catch (error) {
        errors.push({ filePath, error: error.message });
      }
    }

    if (newClips.length > 0) {
      addMultipleMedia(newClips);
      showToast(
        `Successfully imported ${newClips.length} video${newClips.length > 1 ? "s" : ""}`,
        "success"
      );
    }

    if (unsupportedFiles.length > 0) {
      showToast(
        `${unsupportedFiles.length} file(s) skipped. Unsupported format. Please use MP4, MOV, or WebM`,
        "warning"
      );
    }

    if (errors.length > 0) {
      const errorMessage =
        errors.length === 1
          ? `Failed to import "${errors[0].filePath.split(/[\\/]/).pop()}": ${errors[0].error}`
          : `Failed to import ${errors.length} file(s). Check console for details.`;
      showToast(errorMessage, "error");
    }

    setIsProcessing(false);
  };

  const handleImport = async (files) => {
    if (!files) {
      const result = await window.electron.fileSystem.showOpenDialog();
      if (result.success && result.filePaths) {
        await processImportedFiles(result.filePaths);
      } else if (result.error) {
        showToast("Failed to open file dialog", "error");
      }
      return;
    }

    const filePaths = files
      .map((file) => {
        try {
          return window.electron.utils.getPathForFile(file);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    if (filePaths.length > 0) {
      await processImportedFiles(filePaths);
    } else {
      showToast("No valid video files found", "warning");
    }
  };

  return { handleImport, processImportedFiles, isProcessing };
}
