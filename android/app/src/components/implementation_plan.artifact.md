# Performance Optimization for Entry-Level Tablets

This plan aims to improve the performance of the BotCommander2 app, specifically the Arena Map feature, to ensure smooth operation on entry-level Android tablets (e.g., Samsung Galaxy Tab A7 Lite). The primary focus is reducing the component count and offloading animations to the native thread.

## User Review Required

> [!NOTE]
> The changes focus on internal performance optimizations and should not alter the app's functionality or visual design significantly, other than making interactions smoother.

## Proposed Changes

### UI Components

#### [MODIFY] [GridMap.tsx](file:///Users/macbook/BotCommander2/android/app/src/components/GridMap.tsx)
- Optimize `GridBackground` to use line-based rendering instead of cell-based rendering. This reduces the number of `View` components in the background from $N^2$ (400 for a 20x20 grid) to $2N$ (40).
- Ensure `memo` is used effectively for sub-components.

#### [MODIFY] [ObstacleView.tsx](file:///Users/macbook/BotCommander2/android/app/src/components/ObstacleView.tsx)
- Enable `useNativeDriver: true` for spring animations (release/terminate) to offload them to the UI thread.
- Optimize the component structure to minimize layout calculations during drags.

### Build Configuration

#### [MODIFY] [build.gradle](file:///Users/macbook/BotCommander2/android/app/build.gradle)
- Enable Proguard/R8 in release builds to improve runtime performance and reduce APK size.

## Verification Plan

### Automated Tests
- Run existing Jest tests to ensure logic preservation.
- `npm test`

### Manual Verification
- Deploy to an entry-level Android device or emulator with limited resources.
- Verify that dragging obstacles is smooth and without lag.
- Verify that the robot's movement updates correctly and smoothly.
- Ensure the grid looks identical to the original implementation.
