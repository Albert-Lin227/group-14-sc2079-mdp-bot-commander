// src/components/RobotView.tsx
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Direction } from '../types';

type Props = {
  direction: Direction;
  cellSize: number;
};

const rotationFor = (direction: Direction) => {
  switch (direction) {
    case 'NORTH': return '0deg';
    case 'EAST': return '90deg';
    case 'SOUTH': return '180deg';
    case 'WEST': return '270deg';
  }
};

export const RobotView = memo(({ direction, cellSize }: Props) => {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.robot,
        {
          width: cellSize,
          height: cellSize,
          transform: [{ rotate: rotationFor(direction) }],
        },
      ]}
    >
      <Text style={[styles.arrow, { fontSize: cellSize * 0.72 }]}>▲</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  robot: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  arrow: {
    color: '#1565c0',
    fontWeight: '900',
  },
});