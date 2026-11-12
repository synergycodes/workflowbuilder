import { create } from 'zustand';

// Welcome greets the first open; Select a template replaces what the canvas holds, so it warns.
export type TemplatePickerVariant = 'welcome' | 'select';

type TemplatePickerState = {
  open: boolean;
  variant: TemplatePickerVariant;
};

// The variant outlives `open`, so the closing dialog keeps its content while it fades out.
export const useTemplatePickerStore = create<TemplatePickerState>(() => ({ open: false, variant: 'welcome' }));

export function openTemplatePicker(variant: TemplatePickerVariant) {
  useTemplatePickerStore.setState({ open: true, variant });
}

export function closeTemplatePicker() {
  useTemplatePickerStore.setState({ open: false });
}

const SEEN_KEY = 'ai-studio:welcome-seen-v1';

export function hasSeenWelcome(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markWelcomeSeen() {
  try {
    localStorage.setItem(SEEN_KEY, 'true');
  } catch {
    // storage unavailable
  }
}
