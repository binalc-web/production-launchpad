import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { saveChronologyEdits } from '@/api/chronologies/details';
import type { ChronologyCategory } from '@/api/chronologies/constants';
import {
  buildChronologyEditPayload,
  validateEditedSummaries,
  extractErrorMessage,
} from '@/utils/chronologyEditPayload';

/**
 * Encapsulates all edit-mode state and handlers for chronology summary editing.
 *
 * This hook is **category-agnostic** — it works for both medical and billing
 * chronology views. The calling component provides the `category`,
 * `chronologyId`, `allEvents`, and query-invalidation keys.
 *
 * Follows the **Single Responsibility Principle**: the parent component owns
 * data fetching and rendering; this hook owns edit lifecycle only.
 */

interface UseChronologyEditOptions {
  chronologyId: string;
  category: ChronologyCategory;
  /** All currently loaded events — used to diff changed vs. unchanged summaries. */
  allEvents: Array<{ _id: string; translated_summary: string }>;
  /** TanStack Query keys to invalidate after a successful save. */
  invalidationKeys: Array<Array<unknown>>;
  /** Called after a successful save (e.g. to reset events list). */
  onSaveSuccess?: () => void;
}

interface UseChronologyEditReturn {
  isEditMode: boolean;
  editedSummaries: Map<string, string>;
  isSaving: boolean;
  /** Validation error or save error message, null if none. */
  editError: string | null;
  /** True if any edited summary fails validation (below min or above max). */
  hasValidationErrors: boolean;
  /** False when events lack `_id` fields required for tracking summary edits. */
  canEdit: boolean;
  handleEditToggle: () => void;
  handleCancelEdit: () => void;
  handleSummaryChange: (eventId: string, value: string) => void;
  handleSaveEdits: () => Promise<void>;
  clearEditError: () => void;
  /** True if the user has made actual text changes in edit mode. */
  hasUnsavedChanges: boolean;
}

export const useChronologyEdit = (
  options: UseChronologyEditOptions
): UseChronologyEditReturn => {
  const { chronologyId, category, allEvents, invalidationKeys, onSaveSuccess } =
    options;

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

  const handleSaveEdits = useCallback(async (): Promise<void> => {
    // Validate minimum length for all edited summaries
    const validationError = validateEditedSummaries(editedSummaries);
    if (validationError) {
      setEditError(validationError);
      return;
    }

    // Only send entries that were actually changed
    const changedSummaries = new Map<string, string>();
    for (const [eventId, editedText] of editedSummaries) {
      const original = allEvents.find((event_) => event_._id === eventId);
      if (original && editedText !== original.translated_summary) {
        changedSummaries.set(eventId, editedText);
      }
    }

    if (changedSummaries.size === 0) {
      // Nothing changed, just exit edit mode
      handleCancelEdit();
      return;
    }

    const payload = buildChronologyEditPayload(
      chronologyId,
      category,
      changedSummaries
    );

    try {
      setIsSaving(true);
      await saveChronologyEdits(payload);

      // Invalidate all provided query keys so fresh data loads
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
        extractErrorMessage(saveError, 'Failed to save chronology edits')
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    editedSummaries,
    allEvents,
    chronologyId,
    category,
    invalidationKeys,
    queryClient,
    handleCancelEdit,
    onSaveSuccess,
  ]);

  const canEdit =
    allEvents.length > 0 && allEvents.every((event_) => Boolean(event_._id));

  const hasValidationErrors =
    validateEditedSummaries(editedSummaries) !== null;

  const hasUnsavedChanges =
    isEditMode &&
    Array.from(editedSummaries.entries()).some(([eventId, editedText]) => {
      const original = allEvents.find((event_) => event_._id === eventId);
      return original && editedText !== original.translated_summary;
    });

  return {
    isEditMode,
    editedSummaries,
    isSaving,
    editError,
    hasValidationErrors,
    canEdit,
    hasUnsavedChanges,
    handleEditToggle,
    handleCancelEdit,
    handleSummaryChange,
    handleSaveEdits,
    clearEditError,
  };
};
