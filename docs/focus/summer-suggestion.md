# Summer suggestion — Focus doc

Mission

- Provide an immediate, low-effort creative prompt (suggestion) that seeds the user's input field and encourages a Generate action.

## Original Implementation

Ordered interaction steps (UI → client → store → optional network)

1. User clicks the `Summer suggestion` button.
2. UI: button shows pressed state immediately (visual feedback). If async lookup is expected, show a small spinner near the button.
3. Client: synchronous handler emits microlog `suggestion:button-pressed`.
4. Client: choose suggestion from local fixture or (if enabled) request `GET /suggest`.
5. App: populate prompt input with suggestion text, focus the input, update `promptStore`/`promptDraft` state.
6. UI: Enable `Generate` if the prompt passes validation; show transient toast "Suggestion applied".

Microlog events (emitted synchronously)

- `suggestion:button-pressed` — step: `button-pressed`
- `suggestion:applied` — step: `input-populated`, meta: { suggestionId }
- `suggestion:fallback-used` — step: `local-fallback` (if network fails)

## Enhanced Implementation (September 2025)

Additional UI feedback requirements:

1. Visual Button Feedback

   - Add transition animation: `transition: transform 0.1s ease-in-out`
   - Active state: `transform: scale(0.98)` for pressed appearance
   - Optional: subtle background color change on hover/focus

2. Toast Notifications

   - Show success toast with message "Summer suggestion applied!"
   - Toast should appear immediately after suggestion is set
   - Toast duration: ~2000ms (adjust based on UX testing)

3. Text Input Focus

   - Focus textarea immediately after suggestion applied
   - Place cursor at end of text for immediate typing
   - Optional: briefly highlight text to show change

4. Updated Event Sequence

   ```javascript
   // 1. Button pressed - visual + log
   console.debug("[DEV] PromptInput: suggestion:button-pressed");

   // 2. Set content + show toast
   promptStore.set(suggestion);
   uiStateStore.update((state) => ({
     ...state,
     status: "success",
     message: "Summer suggestion applied!",
   }));

   // 3. Focus and cursor placement
   const textarea = document.getElementById("prompt-textarea");
   if (textarea instanceof HTMLTextAreaElement) {
     textarea.focus();
     textarea.setSelectionRange(textarea.value.length, textarea.value.length);
   }

   // 4. Log completion
   console.debug("[DEV] PromptInput: suggestion:applied", {
     suggestionId: "summer-cicadas",
   });
   ```

## Actionables to validate (all implementations)

- Manual quick check: click button → within 150ms: input value changed, input is focused, `Generate` enabled, and console shows `suggestion:button-pressed` followed by `suggestion:applied`.
- Unit/component: assert handler calls `applySuggestion()` and that `promptStore` value updates.
- Integration: if networked, assert request (when enabled) is `GET /suggest` and client uses fallback fixture on 4xx/5xx.
- E2E behavioral: assert microlog sequence and DOM mutation of the input; fail if only `suggestion:button-pressed` appears.

## Edge cases & acceptance criteria

- Repeated clicks are debounced (e.g., 300ms). Acceptance: prompt is set and focused, no stuck spinner.
- Offline: local fixture used and `suggestion:fallback-used` logged.
- Toast stack management: if multiple suggestions clicked rapidly, toasts should stack or replace gracefully.
- Focus handling: if textarea not found, fail gracefully (log warning, no errors).

## Telemetry

- Emit `suggestion:applied` with suggestionId and short prompt length; do not log full prompt content.
- Consider tracking time between suggestion application and next user interaction.
- Optional: track suggestion effectiveness (% of suggested prompts that lead to generation).

---

Status: Document updated September 7, 2025 to include enhanced UI feedback requirements while preserving original implementation details.
