// src/components/GridMap.tsx
import React, { useCallback, useEffect, useRef, useState, memo, useMemo } from 'react';
import {
  LayoutChangeEvent,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  Animated,
} from 'react-native';
import { Direction, Obstacle, Robot } from '../types';
import { ObstacleBlock } from './ObstacleView';
import { RobotView } from './RobotView';

type Props = {
  robot: Robot;
  obstacles: Obstacle[];
  gridSize?: number;
  onObstacleMove: (id: number, x: number, y: number) => void;
  onObstacleRemove: (id: number) => void;
  onObstacleAnnotate: (id: number, face: Direction) => void;
};

type GridBounds = {
  pageX: number;
  pageY: number;
  width: number;
  height: number;
};

const GridBackground = memo(({ gridSize, cellSize }: { gridSize: number, cellSize: number }) => {
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#f8fafc' }]}>
      {/* Horizontal lines */}
      {Array.from({ length: gridSize + 1 }).map((_, i) => (
        <View
          key={`h-${i}`}
          style={{
            position: 'absolute',
            top: i * cellSize,
            left: 0,
            right: 0,
            height: 1,
            backgroundColor: '#cbd5e1',
          }}
        />
      ))}
      {/* Vertical lines */}
      {Array.from({ length: gridSize + 1 }).map((_, i) => (
        <View
          key={`v-${i}`}
          style={{
            position: 'absolute',
            left: i * cellSize,
            top: 0,
            bottom: 0,
            width: 1,
            backgroundColor: '#cbd5e1',
          }}
        />
      ))}
    </View>
  );
});

const AxisLabels = memo(({ gridSize, cellSize, type, highlightCoord, highlightVisible }: { gridSize: number, cellSize: number, type: 'x' | 'y', highlightCoord: Animated.Value, highlightVisible: Animated.Value }) => {
  const isX = type === 'x';
  return (
    <View style={isX ? styles.xAxis : styles.yAxis}>
      <Animated.View
        style={[
          isX ? { width: cellSize, height: '100%' } : { height: cellSize, width: '100%' },
          styles.activeAxisLabel,
          {
            position: 'absolute',
            opacity: highlightVisible,
            transform: [
              isX ? { translateX: Animated.multiply(highlightCoord, cellSize) } : { translateY: Animated.multiply(highlightCoord, cellSize) }
            ]
          }
        ]}
      />
      {Array.from({ length: gridSize }).map((_, i) => (
        <View
          key={i}
          style={[
            isX ? { width: cellSize } : { height: cellSize },
            styles.axisLabelContainer,
          ]}
        >
          <Text style={styles.axisLabel}>{i}</Text>
        </View>
      ))}
    </View>
  );
});

const HighlightLines = memo(({ cellSize, x, y, visible }: { cellSize: number, x: Animated.Value, y: Animated.Value, visible: Animated.Value }) => {
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: visible }]} pointerEvents="none">
      {/* Vertical highlight */}
      <Animated.View
        style={[
          styles.highlightLine,
          {
            left: Animated.multiply(x, cellSize),
            width: cellSize,
            height: '100%',
          },
        ]}
      />
      {/* Horizontal highlight */}
      <Animated.View
        style={[
          styles.highlightLine,
          {
            top: Animated.multiply(y, cellSize),
            height: cellSize,
            width: '100%',
          },
        ]}
      />
    </Animated.View>
  );
});

export const GridMap = memo(({
  robot,
  obstacles,
  gridSize = 20,
  onObstacleMove,
  onObstacleRemove,
  onObstacleAnnotate,
}: Props) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const rawTargetWidth = Math.min(screenWidth - 32, screenHeight * 0.8, 900);
  const cellSize = Math.floor(rawTargetWidth / gridSize);
  const mapWidth = cellSize * gridSize;

  const gridRef = useRef<View>(null);
  const bounds = useRef<GridBounds | null>(null);

  // Animated values for drag highlight
  const dragX = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const dragVisible = useRef(new Animated.Value(0)).current;

  // Selection highlight (persistent)
  const [selection, setSelection] = useState<{ x: number, y: number } | null>(null);
  const selectX = useRef(new Animated.Value(0)).current;
  const selectY = useRef(new Animated.Value(0)).current;
  const selectVisible = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (selection) {
      selectX.setValue(selection.x);
      selectY.setValue(selection.y);
      selectVisible.setValue(1);
    } else {
      selectVisible.setValue(0);
    }
  }, [selection, selectX, selectY, selectVisible]);

  const updateBounds = useCallback(() => {
    gridRef.current?.measureInWindow((pageX, pageY, width, height) => {
      bounds.current = { pageX, pageY, width, height };
    });
  }, []);

  useEffect(() => {
    updateBounds();
  }, [mapWidth, updateBounds]);

  const onLayout = (_event: LayoutChangeEvent) => {
    updateBounds();
  };

  const lastCoords = useRef({ x: -1, y: -1 });

  const handleDragUpdate = useCallback((id: number, moveX: number, moveY: number) => {
    if (!bounds.current) return;
    const relativeX = moveX - bounds.current.pageX;
    const relativeY = moveY - bounds.current.pageY;
    const x = Math.floor(relativeX / cellSize);
    const y = Math.floor(relativeY / cellSize);

    if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
      if (x !== lastCoords.current.x || y !== lastCoords.current.y) {
        lastCoords.current = { x, y };
        dragX.setValue(x);
        dragY.setValue(y);
        dragVisible.setValue(1);
        // Temporarily hide selection while dragging
        selectVisible.setValue(0);
      }
    } else {
      dragVisible.setValue(0);
    }
  }, [cellSize, gridSize, dragVisible, dragX, dragY, selectVisible]);

  const handleDragEnd = useCallback(() => {
    const { x, y } = lastCoords.current;
    if (x >= 0) {
      setSelection({ x, y });
    }
    dragVisible.setValue(0);
  }, [dragVisible]);

  const moveObstacle = useCallback(
    (id: number, dropX: number, dropY: number) => {
      if (!bounds.current) return;

      const relativeX = dropX - bounds.current.pageX;
      const relativeY = dropY - bounds.current.pageY;

      const isOutsideGrid =
        relativeX < 0 ||
        relativeY < 0 ||
        relativeX >= bounds.current.width ||
        relativeY >= bounds.current.height;

      if (isOutsideGrid) {
        onObstacleRemove(id);
        return;
      }

      const x = Math.floor(relativeX / cellSize);
      const y = Math.floor(relativeY / cellSize);

      const occupiedByOtherObstacle = obstacles.some(
        item => item.id !== id && item.x === x && item.y === y,
      );

      const robotOccupiesCell = robot.x === x && robot.y === y;

      if (occupiedByOtherObstacle || robotOccupiesCell) return;

      onObstacleMove(id, x, y);
    },
    [cellSize, obstacles, onObstacleMove, onObstacleRemove, robot.x, robot.y],
  );

  const cycleObstacleFace = useCallback((id: number) => {
    const obstacle = obstacles.find(o => o.id === id);
    if (!obstacle) return;

    const faces: Direction[] = ['NORTH', 'EAST', 'SOUTH', 'WEST'];
    const currentIndex = faces.indexOf(obstacle.face);
    const nextFace = faces[(currentIndex + 1) % faces.length];

    onObstacleAnnotate(id, nextFace);
  }, [obstacles, onObstacleAnnotate]);

  const onObstaclePress = useCallback((id: number) => {
    cycleObstacleFace(id);
  }, [cycleObstacleFace]);

  return (
    <View style={styles.container}>
      <View style={styles.mapWithYAxis}>
        <AxisLabels
          gridSize={gridSize}
          cellSize={cellSize}
          type="y"
          highlightCoord={selection ? selectY : dragY}
          highlightVisible={selection ? selectVisible : dragVisible}
        />

        <View
          ref={gridRef}
          onLayout={onLayout}
          style={[
            styles.grid,
            {
              width: mapWidth,
              height: mapWidth,
            },
          ]}
        >
          <GridBackground gridSize={gridSize} cellSize={cellSize} />

          <HighlightLines
            cellSize={cellSize}
            x={selectX}
            y={selectY}
            visible={selectVisible}
          />

          <HighlightLines
            cellSize={cellSize}
            x={dragX}
            y={dragY}
            visible={dragVisible}
          />

          <View
            pointerEvents="none"
            style={[
              styles.robotPosition,
              {
                left: robot.x * cellSize,
                top: robot.y * cellSize,
                width: cellSize,
                height: cellSize,
              },
            ]}
          >
            <RobotView direction={robot.direction} cellSize={cellSize} />
          </View>

          {obstacles.map(obstacle => (
            <ObstacleBlock
              key={obstacle.id}
              obstacle={obstacle}
              cellSize={cellSize}
              onDrop={moveObstacle}
              onDragUpdate={handleDragUpdate}
              onDragEnd={handleDragEnd}
              onPress={onObstaclePress}
            />
          ))}
        </View>
      </View>

      <AxisLabels
        gridSize={gridSize}
        cellSize={cellSize}
        type="x"
        highlightCoord={selection ? selectX : dragX}
        highlightVisible={selection ? selectVisible : dragVisible}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center', // Center the grid and labels
    marginBottom: 16,
  },
  mapWithYAxis: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  grid: {
    position: 'relative',
    backgroundColor: '#f7f9fc',
    borderColor: '#1e293b',
    borderWidth: 2,
    overflow: 'visible',
  },
  robotPosition: {
    position: 'absolute',
    zIndex: 1,
  },
  xAxis: {
    flexDirection: 'row',
    marginLeft: 32, // Match yAxis width
  },
  yAxis: {
    width: 32,
    justifyContent: 'flex-start',
  },
  axisLabelContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  axisLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '700',
  },
  activeAxisLabel: {
    backgroundColor: '#dbeafe',
    borderRadius: 4,
  },
  activeAxisLabelText: {
    color: '#2563eb',
    fontWeight: '900',
  },
  highlightLine: {
    position: 'absolute',
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
  },
});
