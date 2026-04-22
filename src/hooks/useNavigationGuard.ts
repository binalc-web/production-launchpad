import { useBlocker } from '@tanstack/react-router';

/**
 * Options for configuring the navigation guard behavior
 * @interface UseNavigationGuardOptions
 * @property {boolean} shouldBlock - Whether navigation should be blocked
 * @property {boolean} [enableBeforeUnload] - Whether to show the native browser
 *   "Changes you made may not be saved" dialog on reload/tab close. Defaults to true.
 */
type UseNavigationGuardOptions = {
  shouldBlock: boolean;
  enableBeforeUnload?: boolean;
};

/**
 * Return value from the useNavigationGuard hook
 * @interface UseNavigationGuardReturn
 * @property {'idle' | 'blocked'} status - Current blocker state
 * @property {() => void} proceed - Allow the blocked navigation to continue
 * @property {() => void} reset - Cancel the blocked navigation and stay on the page
 */
type UseNavigationGuardReturn = {
  status: 'idle' | 'blocked';
  proceed: () => void;
  reset: () => void;
};

/**
 * Reusable hook that prevents accidental navigation away from pages with unsaved changes.
 * Intercepts both client-side route changes (sidebar links, programmatic navigation)
 * and browser-level actions (reload, tab close, window close).
 *
 * @description Use this hook on any page/form where the user may lose unsaved data.
 * When navigation is blocked, the returned `status` becomes `'blocked'` and you
 * can render a custom confirmation dialog using `proceed` and `reset`.
 *
 * @param {UseNavigationGuardOptions} options - Configuration options
 * @returns {UseNavigationGuardReturn} Blocker state and control functions
 *
 * @example
 * ```tsx
 * const { status, proceed, reset } = useNavigationGuard({
 *   shouldBlock: formState.isDirty,
 * });
 *
 * {status === 'blocked' && (
 *   <PopUp
 *     type="CANCELCASE"
 *     title="You have unsaved changes"
 *     description="Are you sure you want to leave?"
 *     buttonText="Leave Page"
 *     isOpen={status === 'blocked'}
 *     onClick={proceed}
 *     onCancel={reset}
 *     cancelText="Stay on Page"
 *   />
 * )}
 * ```
 */
export const useNavigationGuard = (
  options: UseNavigationGuardOptions
): UseNavigationGuardReturn => {
  const { shouldBlock, enableBeforeUnload = true } = options;

  const {
    proceed: blockerProceed,
    reset: blockerReset,
    status,
  } = useBlocker({
    shouldBlockFn: (): boolean => shouldBlock,
    withResolver: true,
    enableBeforeUnload: enableBeforeUnload ? (): boolean => shouldBlock : false,
  });

  /**
   * Allow the blocked navigation to continue
   * @description No-op when status is 'idle'
   */
  const proceed = (): void => {
    if (status === 'blocked' && blockerProceed) {
      blockerProceed();
    }
  };

  /**
   * Cancel the blocked navigation and stay on the current page
   * @description No-op when status is 'idle'
   */
  const reset = (): void => {
    if (status === 'blocked' && blockerReset) {
      blockerReset();
    }
  };

  return {
    status: status === 'blocked' ? 'blocked' : 'idle',
    proceed,
    reset,
  };
};
