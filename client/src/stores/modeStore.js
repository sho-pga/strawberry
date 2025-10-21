import { writable } from "svelte/store";

const createModeStore = () => {
  const { subscribe, set, update } = writable({
    current: "default",
    timestamp: Date.now(),
    params: {
      promptType: "basic",
      outputType: "book",
      validation: "standard",
    },
  });

  return {
    subscribe,
    setMode: (mode, params) =>
      update((state) => ({
        ...state,
        previousMode: state.current,
        current: mode,
        timestamp: Date.now(),
        params,
      })),
    revertToDefault: () =>
      update((state) => ({
        current: "default",
        timestamp: Date.now(),
        params: {
          promptType: "basic",
          outputType: "book",
          validation: "standard",
        },
      })),
  };
};

export const modeStore = createModeStore();
