import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';

interface Props {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline' | 'ghost';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({ title, onPress, loading, disabled, variant = 'primary', style, textStyle }: Props) {
  const isDisabled = disabled || loading;
  return (
    <TouchableOpacity
      style={[styles.base, styles[variant], isDisabled && styles.disabled, style]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : '#0EA5E9'} />
      ) : (
        <Text style={[styles.text, styles[`${variant}Text`], textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: '#0EA5E9' },
  outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#0EA5E9' },
  ghost: { backgroundColor: 'transparent' },
  disabled: { opacity: 0.5 },
  text: { fontSize: 16, fontWeight: '600' },
  primaryText: { color: '#fff' },
  outlineText: { color: '#0EA5E9' },
  ghostText: { color: '#0EA5E9' },
});
