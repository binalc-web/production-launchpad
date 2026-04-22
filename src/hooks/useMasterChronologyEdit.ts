import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { saveMasterChronologyAugment } from '@/api/chronologies/details';
import {
  extractErrorMessage,
  validateEditedSummaries,
} from '@/utils/chronologyEditPayload';
import type { ChronologyEntry } from '@/pages/MasterChronology/types/MasterChronologyDetailsType';

export const getInitialSummary = (entry: ChronologyEntry): string => {
  return entry.combinedSummary ?? '';
};

interface UseMasterChronologyEditOptions {
  chronologyId: string;
  allEvents: Array<ChronologyEntry>;
  invalidationKeys: Array<Array<unknown>>;
  onSaveSuccess?: () => void;
}

interface UseMasterChronologyEditReturn {
  isEditMode: boolean;
  editedSummaries: Map<string, string>;
  isSaving: boolean;
  editError: string | null;
  hasUnsavedChanges: boolean;
  /** False when events lack `_id` fields required for tracking summary edits. */
  canEdit: boolean;
  handleEditToggle: () => void;
  handleCancelEdit: () => void;
  handleSummaryChange: (eventId: string, value: string) => void;
  handleSaveEdits: () => Promise<void>;
  clearEditError: () => void;
}

export const useMasterChronologyEdit = ({
  chronologyId,
  allEvents,
  invalidationKeys,
  onSaveSuccess,
}: UseMasterChronologyEditOptions): UseMasterChronologyEditReturn => {
  const queryClient = useQueryClient();

  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [editedSummaries, setEditedSummaries] = useState<Map<string, string>>(
    new Map()
  );
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

  const handleEditToggle = useCallback((): void => {
    setIsEditMode(true);
    setEditedSummaries(new Map());
    setEditError(null);
  }, []);

  const handleCancelEdit = useCallback((): void => {
    setIsEditMode(false);
    setEditedSummaries(new Map());
    setEditError(null);
  }, []);

  const clearEditError = useCallback((): void => {
    setEditError(null);
  }, []);

  const handleSummaryChange = useCallback(
    (eventId: string, value: string): void => {
      setEditedSummaries((previous) => {
        const next = new Map(previous);
        next.set(eventId, value);
        return next;
      });
    },
    []
  );

  const canEdit =
    allEvents.length > 0 && allEvents.every((event_) => Boolean(event_._id));

  const hasUnsavedChanges =
    isEditMode &&
    Array.from(editedSummaries.entries()).some(([eventId, editedText]) => {
      const original = allEvents.find((event_) => event_._id === eventId);
      return original && editedText !== getInitialSummary(original);
    });

  const handleSaveEdits = useCallback(async (): Promise<void> => {
    const validationError = validateEditedSummaries(editedSummaries);
    if (validationError) {
      setEditError(validationError);
      return;
    }

    const changedSummaries = new Map<string, string>();
    for (const [eventId, editedText] of editedSummaries) {
      const original = allEvents.find((event_) => event_._id === eventId);
      if (original && editedText !== getInitialSummary(original)) {
        changedSummaries.set(eventId, editedText);
      }
    }

    if (changedSummaries.size === 0) {
      handleCancelEdit();
      return;
    }

    const updates = Array.from(changedSummaries.entries()).map(
      ([eventId, summary]) => ({
        _id: eventId,
        combinedSummary: summary,
      })
    );

    try {
      setIsSaving(true);
      await saveMasterChronologyAugment({ chronologyId, updates });

      await Promise.all(
        invalidationKeys.map((key) =>
          queryClient.invalidateQueries({ queryKey: key })
        )
      );

      setIsEditMode(false);
      setEditedSummaries(new Map());
      setEditError(null);
      onSaveSuccess?.();
    } catch (saveError) {
      setEditError(
        extractErrorMessage(saveError, 'Failed to save master chronology edits')
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    editedSummaries,
    allEvents,
    chronologyId,
    invalidationKeys,
    queryClient,
    handleCancelEdit,
    onSaveSuccess,
  ]);

  return {
    isEditMode,
    editedSummaries,
    isSaving,
    editError,
    hasUnsavedChanges,
    canEdit,
    handleEditToggle,
    handleCancelEdit,
    handleSummaryChange,
    handleSaveEdits,
    clearEditError,
  };
};
