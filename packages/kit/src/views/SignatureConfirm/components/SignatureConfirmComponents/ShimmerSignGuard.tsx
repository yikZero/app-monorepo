import { useCallback, useEffect, useRef } from 'react';

import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { LinearGradient, Stack } from '@onekeyhq/components';

import SignGuardIcon from '../SimilarAddressDialog/SignGuardIcon';

const ICON_WIDTH = 80;
const SHIMMER_BAND = 24;

function ShimmerSignGuard({
  onAnimationComplete,
}: {
  onAnimationComplete?: () => void;
} = {}) {
  const reducedMotion = useReducedMotion();
  const translate = useSharedValue(-SHIMMER_BAND);
  const END = ICON_WIDTH + SHIMMER_BAND;
  const START = -SHIMMER_BAND;
  const FAST = 350;
  const SLOW = 1500;
  const hasNotifiedComplete = useRef(false);
  const onAnimationCompleteRef = useRef(onAnimationComplete);
  onAnimationCompleteRef.current = onAnimationComplete;

  const notifyComplete = useCallback(() => {
    if (hasNotifiedComplete.current) {
      return;
    }
    hasNotifiedComplete.current = true;
    onAnimationCompleteRef.current?.();
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      return;
    }
    const easing = Easing.inOut(Easing.sin);
    translate.value = withDelay(
      1200,
      withSequence(
        withTiming(END, { duration: FAST, easing }),
        withTiming(START, { duration: 0 }),
        withTiming(END, { duration: FAST, easing }),
        withTiming(START, { duration: 0 }),
        withDelay(
          200,
          withTiming(END, { duration: SLOW, easing }, (finished) => {
            'worklet';
            if (finished) {
              runOnJS(notifyComplete)();
            }
          }),
        ),
      ),
    );
  }, [translate, END, START, FAST, SLOW, reducedMotion, notifyComplete]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translate.value }],
  }));

  return (
    <Stack style={{ width: ICON_WIDTH, height: 14, overflow: 'hidden' }}>
      <SignGuardIcon width={ICON_WIDTH} height={14} />
      {reducedMotion ? null : (
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 0,
              bottom: 0,
              width: SHIMMER_BAND,
            },
            shimmerStyle,
          ]}
          pointerEvents="none"
        >
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.25)', 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ flex: 1 }}
          />
        </Animated.View>
      )}
    </Stack>
  );
}

export { ShimmerSignGuard };
