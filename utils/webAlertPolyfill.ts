import { Alert, AlertButton, Platform } from 'react-native';

/**
 * react-native-web ships Alert.alert as a literal no-op (`static alert() {}`),
 * so every Alert.alert call in the app — confirmations, error messages,
 * validation prompts — silently does nothing on web. Patching the one entry
 * point here fixes all existing and future call sites, rather than routing
 * every caller through a separate cross-platform helper.
 *
 * Runs once at app startup (imported for its side effect from app/_layout.tsx).
 */
export function installWebAlertPolyfill(): void {
    if (Platform.OS !== 'web') return;

    Alert.alert = (title: string, message?: string, buttons?: AlertButton[]) => {
        const text = message ? `${title}\n\n${message}` : title;
        const actionButtons = (buttons ?? []).filter(b => b.style !== 'cancel');
        const cancelButton = (buttons ?? []).find(b => b.style === 'cancel');

        if (!cancelButton) {
            // No cancel — informational alert, optionally with a single "OK"-style button.
            window.alert(text);
            actionButtons[0]?.onPress?.();
            return;
        }

        // Cancel + action button(s) — the last non-cancel button is the "do it" choice.
        if (window.confirm(text)) {
            actionButtons[actionButtons.length - 1]?.onPress?.();
        } else {
            cancelButton.onPress?.();
        }
    };
}
