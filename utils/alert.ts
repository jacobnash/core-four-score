import { Alert, Platform } from 'react-native';

/** Cross-platform alert — React Native Alert is unreliable on web. */
export function showAlert(title: string, message?: string): void {
    if (Platform.OS === 'web') {
        window.alert(message ? `${title}\n\n${message}` : title);
        return;
    }
    Alert.alert(title, message);
}
