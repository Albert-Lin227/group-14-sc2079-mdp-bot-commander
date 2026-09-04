// src/types.ts
export type Direction = 'NORTH' | 'EAST' | 'SOUTH' | 'WEST';

export type Robot = {
  x: number;
  y: number;
  direction: Direction;
};

export type Obstacle = {
  id: number;
  x: number;
  y: number;
  face: Direction;
  imageId?: string;
  detectedFace?: Direction;
};
