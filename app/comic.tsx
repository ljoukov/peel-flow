import React, { useMemo, useEffect, useRef } from 'react';
import { Stack, useRouter } from 'expo-router';
import { FlatList, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { ThemedText } from '@/components/ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Audio } from 'expo-av';

export default function ComicScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const pageHeight = Math.max(1, height - insets.top - insets.bottom);
  const router = useRouter();

  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          interruptionModeAndroid: 1,
          interruptionModeIOS: 1,
        });
        const { sound } = await Audio.Sound.createAsync(
          require('../assets/sound_effect.mp3'),
          { isLooping: true, shouldPlay: true, volume: 0.4 }
        );
        if (cancelled) return;
        soundRef.current = sound;
        await sound.playAsync();
      } catch (e) {
        console.warn('Failed to start audio', e);
      }
    })();
    return () => {
      cancelled = true;
      const s = soundRef.current;
      soundRef.current = null;
      if (s) {
        s.unloadAsync().catch(() => {});
      }
    };
  }, []);

  const images = useMemo(
    () => [
      require('../assets/images/comic-1.png'),
      require('../assets/images/comic-2.png'),
      require('../assets/images/comic-3.png'),
      require('../assets/images/comic-4.png'),
      require('../assets/images/comic-5.png'),
      require('../assets/images/comic-6.png'),
    ],
    []
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <FlatList
          data={images}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => (
            <View style={{ width, height: pageHeight }}>
              <Image
                source={item}
                style={{ width: '100%', height: '100%', backgroundColor: '#000' }}
                contentFit="contain"
                cachePolicy="memory-disk"
              />
            </View>
          )}
          ListFooterComponent={() => (
            <View style={{ width, height: pageHeight, alignItems: 'center', justifyContent: 'center' }}>
              <PressButton label="Awesome" variant="primary" onPress={() => router.replace('/')} />
            </View>
          )}
          pagingEnabled
          decelerationRate="fast"
          snapToInterval={pageHeight}
          snapToAlignment="start"
          showsVerticalScrollIndicator={false}
          bounces={false}
          getItemLayout={(_, index) => ({ length: pageHeight, offset: pageHeight * index, index })}
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          windowSize={3}
          removeClippedSubviews
        />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
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
    paddingHorizontal: 16,
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
      <PressableNative onPress={onPress} disabled={disabled} style={style}>
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
  if (Platform.OS === 'android') {
    const { Pressable } = require('react-native');
    return (
      <Pressable android_ripple={{ color: '#FFFFFF22' }} onPress={onPress} disabled={disabled} style={style}>
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
