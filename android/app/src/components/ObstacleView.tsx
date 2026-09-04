// src/components/ObstacleBlock.tsx
import React, { useMemo, useRef, memo } from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Direction, Obstacle } from '../types';

type Props = {
  obstacle: Obstacle;
  cellSize: number;
  onDrop: (
    id: number,
    absoluteX: number,
    absoluteY: number,
  ) => void;
  onDragUpdate?: (id: number, absoluteX: number, absoluteY: number) => void;
  onDragEnd?: () => void;
  onPress?: () => void;
};

const faceSymbol: Record<Direction, string> = {
  NORTH: '↑',
  EAST: '→',
  SOUTH: '↓',
  WEST: '←',
};

export const ObstacleBlock = memo(({
  obstacle,
  cellSize,
  onDrop,
  onDragUpdate,
  onDragEnd,
  onPress,
}: Props) => {
  const drag = useRef(new Animated.ValueXY()).current;
  const isDragging = useRef(false);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 2 || Math.abs(gesture.dy) > 2,

        onPanResponderGrant: () => {
          isDragging.current = false;
        },

        onPanResponderMove: (_, gesture) => {
          isDragging.current = true;
          drag.setValue({ x: gesture.dx, y: gesture.dy });

          // Provide the finger position to the highlight logic.
          // Since the highlight and block are both driven by the same gesture,
          // they will now stay perfectly aligned without relative jitter.
          onDragUpdate?.(obstacle.id, gesture.moveX, gesture.moveY);
        },

        onPanResponderRelease: (_, gesture) => {
          if (!isDragging.current) {
            onPress?.(obstacle.id);
          } else {
            onDrop(obstacle.id, gesture.moveX, gesture.moveY);
          }

          onDragEnd?.();

          // Smooth exponential easing back to zero
          Animated.timing(drag, {
            toValue: { x: 0, y: 0 },
            duration: 50,
            easing: Easing.out(Easing.exp),
            useNativeDriver: true, // Use native driver for smoother transforms
          }).start();
        },

        onPanResponderTerminate: () => {
          onDragEnd?.();
          Animated.timing(drag, {
            toValue: { x: 0, y: 0 },
            duration: 50,
            useNativeDriver: true,
          }).start();
        },
      }),
    [drag, obstacle.id, onDrop, onDragUpdate, onDragEnd, onPress],
  );

  const hasTarget = !!obstacle.imageId;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.container,
        {
          width: cellSize,
          height: cellSize,
          left: obstacle.x * cellSize,
          top: obstacle.y * cellSize,
          transform: drag.getTranslateTransform(),
        },
      ]}
    >
      <View style={[styles.block, hasTarget && styles.targetBlock]}>
        {/* Orientation indicator for the 'face' */}
        <View
          style={[
            styles.faceIndicator,
            styles[`face${obstacle.face}` as keyof typeof styles],
            hasTarget && styles.targetFaceIndicator,
          ]}
        />

        {hasTarget ? (
          <Text style={[styles.targetId, { fontSize: cellSize * 0.5 }]}>
            {obstacle.imageId}
          </Text>
        ) : (
          <Text style={[styles.id, { fontSize: cellSize * 0.35 }]}>
            {obstacle.id}
          </Text>
        )}

        {obstacle.detectedFace && !hasTarget && (
          <Text style={[styles.face, { fontSize: cellSize * 0.22 }]}>
            {faceSymbol[obstacle.detectedFace]}
          </Text>
        )}
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 2,
    padding: 2,
  },
  block: {
    flex: 1,
    backgroundColor: '#ef6c00',
    borderColor: '#6d3100',
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetBlock: {
    backgroundColor: '#334155',
    borderColor: '#0f172a',
  },
  id: {
    color: 'white',
    fontWeight: '900',
  },
  targetId: {
    color: 'white',
    fontWeight: '900',
  },
  faceIndicator: {
    position: 'absolute',
    backgroundColor: '#ffd180',
  },
  targetFaceIndicator: {
    backgroundColor: '#3b82f6', // Distinguishing color for target face
    zIndex: 10,
  },
  faceNORTH: {
    top: 0,
    left: 0,
    right: 0,
    height: 10,
  },
  faceEAST: {
    top: 0,
    bottom: 0,
    right: 0,
    width: 10,
  },
  faceSOUTH: {
    bottom: 0,
    left: 0,
    right: 0,
    height: 10,
  },
  faceWEST: {
    top: 0,
    bottom: 0,
    left: 0,
    width: 10,
  },
  face: {
    position: 'absolute',
    right: 3,
    top: 2,
    color: '#fff',
    fontWeight: '900',
  },
});
