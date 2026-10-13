import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, space } from './theme';

export function Button({ title, onPress, variant = 'primary', disabled, loading, style }) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'danger' && styles.dangerBtn,
        variant === 'ghost' && styles.ghost,
        pressed && !isDisabled && { opacity: 0.8 },
        isDisabled && { opacity: 0.45 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <Text
          style={[
            styles.buttonText,
            variant === 'ghost' && { color: colors.muted },
            variant === 'danger' && { color: colors.danger },
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function Field({ label, error, style, ...inputProps }) {
  return (
    <View style={[{ marginBottom: space(4) }, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        style={[styles.input, inputProps.multiline && styles.multiline, error && { borderColor: colors.danger }]}
        {...inputProps}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Notice({ tone = 'warning', children }) {
  const color = tone === 'danger' ? colors.danger : tone === 'info' ? colors.primary : colors.warning;
  return (
    <View style={[styles.notice, { borderColor: color }]}>
      <Text style={[styles.noticeText, { color }]}>{children}</Text>
    </View>
  );
}

export function Title({ children, sub }) {
  return (
    <View style={{ marginBottom: space(5) }}>
      <Text style={styles.title}>{children}</Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
    </View>
  );
}

export function shortAddress(address, chars = 4) {
  return `${address.slice(0, chars)}…${address.slice(-chars)}`;
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: radius.md,
    paddingHorizontal: space(5),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space(3),
  },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  dangerBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.danger },
  ghost: { backgroundColor: 'transparent', minHeight: 44 },
  buttonText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  label: { color: colors.muted, fontSize: 13, marginBottom: space(2), fontWeight: '500' },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: space(4),
    paddingVertical: space(3),
    minHeight: 52,
  },
  multiline: { minHeight: 120, textAlignVertical: 'top' },
  error: { color: colors.danger, fontSize: 13, marginTop: space(2) },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space(5),
    marginBottom: space(4),
  },
  notice: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space(4),
    marginBottom: space(4),
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  noticeText: { fontSize: 14, lineHeight: 20 },
  title: { color: colors.text, fontSize: 26, fontWeight: '700' },
  sub: { color: colors.muted, fontSize: 15, marginTop: space(2), lineHeight: 22 },
});
