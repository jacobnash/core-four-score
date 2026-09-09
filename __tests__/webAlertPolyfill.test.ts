import { Alert, Platform } from 'react-native';
import { installWebAlertPolyfill } from '../utils/webAlertPolyfill';

describe('installWebAlertPolyfill', () => {
    const originalOS = Platform.OS;
    const originalAlertFn = Alert.alert;

    beforeEach(() => {
        (Platform as { OS: string }).OS = 'web';
        window.alert = jest.fn();
        window.confirm = jest.fn();
    });

    afterEach(() => {
        (Platform as { OS: string }).OS = originalOS;
        Alert.alert = originalAlertFn;
    });

    it('does nothing on native platforms', () => {
        (Platform as { OS: string }).OS = 'ios';
        const before = Alert.alert;
        installWebAlertPolyfill();
        expect(Alert.alert).toBe(before);
    });

    it('shows a plain window.alert for a message-only call', () => {
        installWebAlertPolyfill();
        Alert.alert('Save failed', 'Could not save that game.');
        expect(window.alert).toHaveBeenCalledWith('Save failed\n\nCould not save that game.');
    });

    it('shows the alert then fires the single button (no cancel) — e.g. "OK"', () => {
        installWebAlertPolyfill();
        const onPress = jest.fn();
        Alert.alert('Welcome!', 'You joined the tournament.', [{ text: 'OK', onPress }]);
        expect(window.alert).toHaveBeenCalled();
        expect(onPress).toHaveBeenCalled();
    });

    it('confirming a Cancel/action pair fires the action button, not the cancel', () => {
        installWebAlertPolyfill();
        (window.confirm as jest.Mock).mockReturnValue(true);
        const onCancel = jest.fn();
        const onConfirm = jest.fn();
        Alert.alert('End match?', 'You can start a new match anytime.', [
            { text: 'Cancel', style: 'cancel', onPress: onCancel },
            { text: 'End match', style: 'destructive', onPress: onConfirm },
        ]);
        expect(window.confirm).toHaveBeenCalledWith('End match?\n\nYou can start a new match anytime.');
        expect(onConfirm).toHaveBeenCalled();
        expect(onCancel).not.toHaveBeenCalled();
    });

    it('declining a Cancel/action pair fires the cancel button, not the action', () => {
        installWebAlertPolyfill();
        (window.confirm as jest.Mock).mockReturnValue(false);
        const onCancel = jest.fn();
        const onConfirm = jest.fn();
        Alert.alert('Undo last presentation?', undefined, [
            { text: 'Cancel', style: 'cancel', onPress: onCancel },
            { text: 'Undo', style: 'destructive', onPress: onConfirm },
        ]);
        expect(onCancel).toHaveBeenCalled();
        expect(onConfirm).not.toHaveBeenCalled();
    });
});
