import { Platform } from 'react-native';

export function webBoxShadow(color = 'rgba(0,0,0,0.08)', y = 6, blur = 12) {
    if (Platform.OS === 'web') {
        // small subtle shadow similar to Android/iOS default
        return `${color.replace('rgba(', '').replace(')', '')} 0px ${y}px ${blur}px`;
    }
    return undefined;
}
