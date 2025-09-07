import React, { useMemo, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';

export default function HomeScreen() {
  const router = useRouter();
  const background = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tint = useThemeColor({}, 'tint');
  const heroBg = withAlpha(tint, '1A'); // ~10% tint overlay
  const cardBg = withAlpha(tint, '0D'); // ~5% tint overlay

  const [problem, setProblem] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);

  const canAdd = options.length < 5;
  const canRemove = options.length > 2;
  const canGo = useMemo(() => {
    const hasProblem = problem.trim().length > 0;
    const nonEmpty = options.map((o) => o.trim()).filter(Boolean);
    return hasProblem && nonEmpty.length >= 2;
  }, [problem, options]);

  const updateOption = (index: number, value: string) => {
    setOptions((prev) => prev.map((v, i) => (i === index ? value : v)));
  };

  const addOption = () => {
    if (!canAdd) return;
    setOptions((prev) => [...prev, '']);
  };

  const removeOption = (index: number) => {
    if (!canRemove) return;
    setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const onGo = () => {
    if (!canGo) return;
    const cleaned = options.map((o) => o.trim()).filter(Boolean).slice(0, 5);
    router.push({
      pathname: '/decision',
      params: {
        problem: problem.trim(),
        options: JSON.stringify(cleaned),
      },
    });
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: background }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.select({ ios: 'padding', android: undefined })}
          keyboardVerticalOffset={Platform.select({ ios: 80, android: 0 })}
        >
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            {/* Hero */}
            <ThemedView
              style={[
                styles.hero,
                { borderColor: tint, backgroundColor: heroBg },
              ]}
            >
              <ThemedText style={styles.emoji} accessibilityLabel="Decision icons">
                🤔 ➡️ ✅
              </ThemedText>
              <ThemedText type="title" style={{ textAlign: 'center' }}>
                Decide with confidence
              </ThemedText>
              <ThemedText style={{ textAlign: 'center', opacity: 0.9, marginTop: 6 }}>
                Compare options, get AI guidance, and visualize your choice.
              </ThemedText>
              <View style={styles.pillsRow}>
                <FeaturePill label="Find clarity fast" />
                <FeaturePill label="See trade‑offs clearly" />
                <FeaturePill label="Decide with confidence" />
              </View>
            </ThemedView>
            <ThemedView style={[styles.section, { borderColor: tint, backgroundColor: cardBg }] }>
              <ThemedText type="title" style={{ marginBottom: 8 }}>
                Make a decision
              </ThemedText>
              <ThemedText style={{ marginBottom: 8 }}>
                Describe your problem, then list 2–5 options to compare.
              </ThemedText>

              <ThemedText type="subtitle" style={{ marginTop: 8 }}>
                Problem
              </ThemedText>
              <TextInput
                value={problem}
                onChangeText={setProblem}
                placeholder="What decision are you making?"
                placeholderTextColor={textColor + '80'}
                multiline
                numberOfLines={3}
                style={[styles.input, styles.multiline, { color: textColor, borderColor: tint }]}
              />
            </ThemedView>

            <ThemedView style={[styles.section, { borderColor: tint, backgroundColor: cardBg }] }>
              <ThemedText type="subtitle" style={{ marginBottom: 8 }}>
                Options
              </ThemedText>

              {options.map((value, index) => (
                <View key={index} style={styles.optionRow}>
                  <TextInput
                    value={value}
                    onChangeText={(t) => updateOption(index, t)}
                    placeholder={`Option ${index + 1}`}
                    placeholderTextColor={textColor + '80'}
                    style={[styles.input, { flex: 1, color: textColor, borderColor: tint }]}
                  />
                  {canRemove && (
                    <View style={{ marginLeft: 8 }}>
                      <PressButton
                        label="Remove"
                        variant="ghost"
                        onPress={() => removeOption(index)}
                      />
                    </View>
                  )}
                </View>
              ))}

              {canAdd && (
                <PressButton label="Add option" onPress={addOption} />
              )}
            </ThemedView>

            <View style={{ height: 8 }} />
            <PressButton label="Go" onPress={onGo} disabled={!canGo} variant="primary" />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

function withAlpha(hex: string, alphaHex: string) {
  // Convert #RGB or #RRGGBB to #RRGGBBAA
  if (!hex || typeof hex !== 'string') return '#00000000';
  let h = hex.replace('#', '').trim();
  if (h.length === 3) {
    h = h.split('').map((c) => c + c).join('');
  }
  if (h.length !== 6) {
    return '#00000000';
  }
  return `#${h}${alphaHex}`;
}

function PressButton({
  label,
  onPress,
  disabled,
  variant = 'default',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'default' | 'primary' | 'ghost';
}) {
  const tint = useThemeColor({}, 'tint');
  const background = useThemeColor({}, 'background');

  const base = {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  const style = [
    base,
    variant === 'primary' && { backgroundColor: tint },
    variant === 'default' && { borderWidth: StyleSheet.hairlineWidth, borderColor: tint },
    variant === 'ghost' && { backgroundColor: 'transparent' },
    disabled && { opacity: 0.5 },
  ];

  const labelColor = variant === 'primary' ? background : tint;

  return (
    <View style={{ overflow: 'hidden', borderRadius: 10 }}>
      <PressableNative
        onPress={onPress}
        disabled={disabled}
        style={style}
      >
        <ThemedText style={{ color: labelColor, fontWeight: '600' }}>{label}</ThemedText>
      </PressableNative>
    </View>
  );
}

function PressableNative({
  children,
  style,
  onPress,
  disabled,
}: {
  children: React.ReactNode;
  style?: any;
  onPress?: () => void;
  disabled?: boolean;
}) {
  // Use platform-native feedback where available.
  if (Platform.OS === 'android') {
    const { Pressable } = require('react-native');
    return (
      <Pressable android_ripple={{ color: '#00000022' }} onPress={onPress} disabled={disabled} style={style}>
        {children}
      </Pressable>
    );
  }
  const { TouchableOpacity } = require('react-native');
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} disabled={disabled} style={style}>
      {children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },
  hero: {
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    gap: 8,
  },
  section: {
    borderRadius: 12,
    padding: 12,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  multiline: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  emoji: {
    fontSize: 48,
    lineHeight: 56,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
    justifyContent: 'center',
  },
});

function FeaturePill({ label }: { label: string }) {
  const tint = useThemeColor({}, 'tint');
  const bg = withAlpha(tint, '14');
  const text = useThemeColor({}, 'text');
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: tint,
        backgroundColor: bg,
      }}
    >
      <ThemedText style={{ fontSize: 12, color: text, opacity: 0.9 }}>{label}</ThemedText>
    </View>
  );
}
