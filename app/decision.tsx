import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, ScrollView, View, Pressable, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { generateContent } from '@/lib/gemini';
import { Asset } from 'expo-asset';

export default function DecisionScreen() {
  const params = useLocalSearchParams<{
    problem?: string;
    options?: string; // JSON stringified array
  }>();
  const background = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [debugParts, setDebugParts] = useState<string | null>(null);
  const [guidelines, setGuidelines] = useState<string | null>(null);

  // Load comic prompt from assets/comic-prompt.txt
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const asset = Asset.fromModule(require('../assets/comic-prompt.txt'));
        // Ensure the asset is available locally (web/native)
        if (!asset.downloaded) {
          await asset.downloadAsync();
        }
        const uri = asset.localUri || asset.uri;
        const text = await fetch(uri).then((r) => r.text());
        if (!cancelled) setGuidelines(text.trim());
      } catch (e) {
        // Fallback: if asset read fails, keep guidelines null and let request still run with minimal prompt
        if (!cancelled) setGuidelines('');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const summarizedContext = useMemo(() => {
    const opts = safeParseOptions(params.options);
    const list = opts.length ? `\n\nOptions:\n- ${opts.join('\n- ')}` : '';
    const prob = params.problem ? `Problem: ${params.problem}` : '';
    return [prob, list].filter(Boolean).join('\n');
  }, [params.problem, params.options]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      setResult(null);
      setDebugParts(null);
      try {
        // Build final prompt: provide guidelines, then ask for output only (no echoing)
        const baseInstruction =
          'Follow the guidelines below to produce the final, tailored comic panel prompts. Respond with ONLY the final comic text. Do not repeat the guidelines or the user input.';
        const promptBody = (guidelines ?? '').trim();
        const finalPrompt = summarizedContext
          ? `${baseInstruction}\n\nGuidelines:\n${promptBody}\n\nUser scenario to tailor for:\n${summarizedContext}`
          : `${baseInstruction}\n\nGuidelines:\n${promptBody}`;
        const gen = await generateContent({ prompt: finalPrompt });
        const cleaned = sanitizeGemini(gen.text);
        if (!cancelled) {
          setResult(cleaned);
          setDebugParts(gen.debugParts || null);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to generate content');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    // Wait until guidelines have been loaded before running
    if (guidelines !== null) {
      run();
    }
    return () => {
      cancelled = true;
    };
  }, [summarizedContext, guidelines]);

  function sanitizeGemini(text: string) {
    // Try to drop any echoed instruction blocks
    let out = text;
    out = out.replace(/\bGuidelines:\b[\s\S]*?(?=\n\n|$)/i, '').trim();
    out = out.replace(/\bUser scenario to tailor for:\b[\s\S]*?(?=\n\n|$)/i, '').trim();
    out = out.replace(/Follow the guidelines[^\n]*\n?/i, '').trim();
    return out.trim();
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Decision Flow',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: background },
          headerTintColor: textColor,
        }}
      />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedView style={styles.container}>
            <View style={{ alignItems: 'flex-end' }}>
              <PressButton label="Comic" onPress={() => router.push('/comic')} variant="primary" />
            </View>
            {!result && (
              <View style={{ alignItems: 'center' }}>
                <ThemedText type="title">Decision Flow</ThemedText>
                <ThemedText style={{ marginTop: 8 }}>
                  Generating via Gemini…
                </ThemedText>
              </View>
            )}

            {loading && (
              <ThemedView style={{ marginTop: 16, padding: 16, borderRadius: 10, alignItems: 'center' }}>
                <ActivityIndicator />
                <ThemedText style={{ marginTop: 8 }}>Thinking…</ThemedText>
              </ThemedView>
            )}

            {error && (
              <ThemedView style={{ marginTop: 16 }}>
                <ThemedText style={{ color: '#cc3333' }}>Error: {error}</ThemedText>
              </ThemedView>
            )}

            {result && (
              <ThemedView style={styles.outputBox}>
                <ThemedText style={styles.mono}>{result}</ThemedText>
              </ThemedView>
            )}

            {debugParts && (
              <ThemedView style={[styles.outputBox, { opacity: 0.8 }]}> 
                <ThemedText style={[styles.mono, { fontSize: 12 }]}>DEBUG parts: {debugParts}</ThemedText>
              </ThemedView>
            )}
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function safeParseOptions(s?: string) {
  try {
    const arr = JSON.parse(s || '[]');
    if (Array.isArray(arr)) return arr as string[];
    return [];
  } catch {
    return [];
  }
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
  },
  container: {
    flex: 1,
    gap: 16,
  },
  outputBox: {
    marginTop: 16,
    width: '100%',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: 12,
  },
  mono: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 14,
    lineHeight: 20,
  },
});

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
    paddingVertical: 10,
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
    return (
      <Pressable android_ripple={{ color: '#00000022' }} onPress={onPress} disabled={disabled} style={style}>
        {children}
      </Pressable>
    );
  }
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} disabled={disabled} style={style}>
      {children}
    </TouchableOpacity>
  );
}
