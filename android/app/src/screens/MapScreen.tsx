// src/screens/MapScreen.tsx
import React, { useEffect, useMemo, useState, useCallback, memo } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { GridMap } from '../components/GridMap';
import { CustomAlertDialog } from '../components/CustomAlertDialog';
import { CoordinateInputDialog } from '../components/CoordinateInputDialog';
import { Bluetooth } from '../native/Bluetooth';
import { Direction, Obstacle, Robot } from '../types';

const GRID_SIZE = 20;

const initialRobot: Robot = {
  x: 1,
  y: 18,
  direction: 'NORTH',
};

const initialObstacles: Obstacle[] = [];

function toFullDirection(dir: string): Direction | null {
  const map: Record<string, Direction> = {
    N: 'NORTH',
    S: 'SOUTH',
    E: 'EAST',
    W: 'WEST',
    NORTH: 'NORTH',
    SOUTH: 'SOUTH',
    EAST: 'EAST',
    WEST: 'WEST',
  };
  return map[dir.toUpperCase()] || null;
}

const TimerDisplay = memo(({ active, onReset }: { active: boolean, onReset: () => void }) => {
  const [time, setTime] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (active) {
      interval = setInterval(() => {
        setTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [active]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.timerCard}>
      <View>
        <Text style={styles.timerLabel}>Mission Time</Text>
        <Text style={styles.timerValue}>{formatTime(time)}</Text>
      </View>
      <Pressable
        style={styles.resetTimerButton}
        onPress={() => {
          setTime(0);
          onReset();
        }}
      >
        <Text style={styles.resetTimerText}>Reset</Text>
      </Pressable>
    </View>
  );
});

export function MapScreen() {
  const [robot, setRobot] = useState<Robot>(initialRobot);
  const [obstacles, setObstacles] = useState<Obstacle[]>(initialObstacles);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [selectedFace, setSelectedFace] = useState<Direction>('NORTH');
  const [manualDialogVisible, setManualDialogVisible] = useState(false);

  // Connection Statuses
  const [algoConnected, setAlgoConnected] = useState(false);
  const [rpiConnected, setRpiConnected] = useState(false);

  // Timer state (only active status, time is handled in component)
  const [timerActive, setTimerActive] = useState(false);

  // Chat/Messages
  const [chatMessages, setChatMessages] = useState<string[]>([]);
  const [chatInput, setChatInput] = useState('');

  const [alert, setAlert] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({ visible: false, title: '', message: '' });

  const showAlert = useCallback((title: string, message: string, onConfirm?: () => void) => {
    setAlert({ visible: true, title, message, onConfirm });
  }, []);

  const hideAlert = useCallback(() => {
    setAlert(prev => ({ ...prev, visible: false }));
  }, []);

  const nextObstacleId = useMemo(
    () => Math.max(0, ...obstacles.map(obstacle => obstacle.id)) + 1,
    [obstacles],
  );

  useEffect(() => {
    const statusSubscription = Bluetooth.onStatus((status) => {
      setConnectionStatus(status);
      if (status.includes('Connected')) {
        setRpiConnected(true);
      } else {
        setRpiConnected(false);
        setAlgoConnected(false);
      }
    });

    const messageSubscription = Bluetooth.onMessage(message => {
      handleRobotMessage(message);
    });

    return () => {
      statusSubscription.remove();
      messageSubscription.remove();
    };
  }, []);

  const handleRobotMessage = useCallback((message: string) => {
    /*
      Expected robot message examples:
      ROBOT, 2, 15, E
      TARGET, 2, A
      STATUS, ALGO, CONNECTED
      MESSAGE, Hello from RPi
    */
    const lines = message.split(/[\r\n]+/);

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      const parts = trimmed.includes(',') ? trimmed.split(',').map(s => s.trim()) : trimmed.split(':');
      if (parts.length === 0) return;

      let handled = false;

      if (parts[0] === 'ROBOT' && parts.length >= 4) {
        const x = Number(parts[1]);
        const y = Number(parts[2]);
        const direction = toFullDirection(parts[3]);

        if (
          Number.isInteger(x) &&
          Number.isInteger(y) &&
          x >= 0 &&
          x < GRID_SIZE &&
          y >= 0 &&
          y < GRID_SIZE &&
          direction
        ) {
          setRobot({ x, y, direction });
          handled = true;
        }
      }

      if (parts[0] === 'STATUS' && parts.length >= 3) {
        const component = parts[1].toUpperCase();
        const status = parts[2].toUpperCase();
        const isConnected = status === 'CONNECTED';

        if (component === 'ALGO') setAlgoConnected(isConnected);
        if (component === 'RPI') setRpiConnected(isConnected);

        setChatMessages(prev => [
          `[SYS] ${component} is now ${isConnected ? 'ONLINE' : 'OFFLINE'}`,
          ...prev
        ]);
        handled = true;
      }

      if (parts[0] === 'MESSAGE' && parts.length >= 2) {
        setChatMessages(prev => [parts.slice(1).join(','), ...prev]);
        handled = true;
      }

      if (parts[0] === 'START_TIMER') {
        setTimerActive(true);
        handled = true;
      }
      if (parts[0] === 'STOP_TIMER') {
        setTimerActive(false);
        handled = true;
      }

      if (parts[0] === 'TARGET' && parts.length >= 3) {
        const obstacleId = Number(parts[1]);
        const imageId = parts[2];

        if (Number.isInteger(obstacleId)) {
          setObstacles(current =>
            current.map(obstacle =>
              obstacle.id === obstacleId
                ? { ...obstacle, imageId }
                : obstacle,
            ),
          );
          handled = true;
        }
      }

      // Legacy support for OBSTACLE:id:IMAGE_ID:val:FACE:dir
      if (parts[0] === 'OBSTACLE' && parts.length >= 6) {
        const obstacleId = Number(parts[1]);
        const imageId = parts[3];
        const detectedFace = toFullDirection(parts[5]);

        if (Number.isInteger(obstacleId) && detectedFace) {
          setObstacles(current =>
            current.map(obstacle =>
              obstacle.id === obstacleId
                ? { ...obstacle, imageId, detectedFace }
                : obstacle,
            ),
          );
          handled = true;
        }
      }

      // If not handled by protocol, log as raw message for verification
      if (!handled) {
        setChatMessages(prev => [`[RAW] ${trimmed}`, ...prev]);
      }
    });
  }, []);

  const addObstacle = () => {
    const availablePosition = findAvailableCell(obstacles, robot);

    if (!availablePosition) {
      showAlert('Map is full', 'Remove an obstacle before adding another one.');
      return;
    }

    const newObstacle: Obstacle = {
      id: nextObstacleId,
      ...availablePosition,
      face: selectedFace,
    };

    setObstacles(current => [...current, newObstacle]);
    Bluetooth.send(`ADD_OBSTACLE, ${newObstacle.id}, ${newObstacle.x}, ${newObstacle.y}, ${newObstacle.face}`);
  };

  const handleManualAdd = (x: number, y: number) => {
    setObstacles(current => {
      const occupiedByRobot = robot.x === x && robot.y === y;
      const occupiedByObstacle = current.some(obs => obs.x === x && obs.y === y);

      if (occupiedByRobot || occupiedByObstacle) {
        showAlert('Position occupied', `Cell (${x}, ${y}) is already occupied by the robot or another obstacle.`);
        return current;
      }

      const newObstacle: Obstacle = {
        id: nextObstacleId,
        x,
        y,
        face: selectedFace,
      };

      Bluetooth.send(`ADD_OBSTACLE, ${newObstacle.id}, ${newObstacle.x}, ${newObstacle.y}, ${newObstacle.face}`);
      return [...current, newObstacle];
    });
  };

  const clearObstacles = () => {
    showAlert(
      'Clear map?',
      'This removes all obstacles from the current map.',
      () => setObstacles([])
    );
  };

  const resetMap = () => {
    setRobot(initialRobot);
    setObstacles(initialObstacles);
  };

  const sendMapToRobot = () => {
    if (!connectionStatus.startsWith('Connected')) {
      showAlert('Robot not connected', 'Connect to the robot before sending the map.');
      return;
    }

    /*
      Example payload:
      MAP:1,5,4,SOUTH;2,10,8,WEST
    */
    const payload = obstacles
      .map(obstacle => `${obstacle.id},${obstacle.x},${obstacle.y},${obstacle.face}`)
      .join(';');

    Bluetooth.send(`MAP:${payload}`);
    Bluetooth.send('START_AUTO');
    setTimerActive(true);
  };

  const sendChatMessage = () => {
    if (chatInput.trim()) {
      Bluetooth.send(chatInput);
      setChatMessages(prev => [`TX: ${chatInput}`, ...prev]);
      setChatInput('');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const onObstacleMove = useCallback((id: number, x: number, y: number) => {
    setObstacles(current => {
      const updated = current.map(obs => (obs.id === id ? { ...obs, x, y } : obs));
      Bluetooth.send(`MOVE_OBSTACLE, ${id}, ${x}, ${y}`);
      return updated;
    });
  }, []);

  const onObstacleRemove = useCallback((id: number) => {
    setObstacles(current => {
      const updated = current.filter(obs => obs.id !== id);
      Bluetooth.send(`REMOVE_OBSTACLE, ${id}`);
      return updated;
    });
  }, []);

  const onCellTap = useCallback((x: number, y: number) => {
    setObstacles(current => {
      const occupiedByRobot = robot.x === x && robot.y === y;
      const occupiedByObstacle = current.some(obs => obs.x === x && obs.y === y);

      if (occupiedByRobot || occupiedByObstacle) return current;

      const newObstacle: Obstacle = {
        id: nextObstacleId,
        x,
        y,
        face: selectedFace,
      };

      Bluetooth.send(`ADD_OBSTACLE, ${newObstacle.id}, ${newObstacle.x}, ${newObstacle.y}, ${newObstacle.face}`);
      return [...current, newObstacle];
    });
  }, [nextObstacleId, robot.x, robot.y, selectedFace]);

  const onObstacleAnnotate = useCallback((id: number, face: Direction) => {
    setObstacles(current => {
      const obs = current.find(o => o.id === id);
      const updated = current.map(o => (o.id === id ? { ...o, face } : o));
      if (obs) {
        Bluetooth.send(`ANNOTATE_OBSTACLE, ${id}, ${face}, ${obs.x}, ${obs.y}`);
      }
      return updated;
    });
  }, []);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Arena map</Text>
          <Text style={styles.subtitle}>
            Greetings, Trailblazer! Tap "Auto place" or "Manual Place" to place obstacles. Drag to move or remove. Tap an obstacle to rotate its face.
          </Text>
        </View>

        <View style={styles.statusGroup}>
          <View style={[styles.statusItem, algoConnected ? styles.bgSuccess : styles.bgError]}>
            <Text style={styles.statusText}>
              ALGO {algoConnected ? '●' : '○'}
            </Text>
          </View>
          <View style={[styles.statusItem, rpiConnected ? styles.bgSuccess : styles.bgError]}>
            <Text style={styles.statusText}>
              RPi {rpiConnected ? '●' : '○'}
            </Text>
          </View>
        </View>
      </View>

      <TimerDisplay
        active={timerActive}
        onReset={() => setTimerActive(false)}
      />

      <GridMap
        robot={robot}
        obstacles={obstacles}
        gridSize={GRID_SIZE}
        onObstacleMove={onObstacleMove}
        onObstacleRemove={onObstacleRemove}
        onObstacleAnnotate={onObstacleAnnotate}
      />

      {obstacles.length === 0 && (
        <View style={styles.hintBox}>
          <Text style={styles.hintTitle}>Map is empty</Text>
          <Text style={styles.hintText}>
            Use "Auto place" or "Manual place" buttons below to add obstacles to the arena.
          </Text>
        </View>
      )}

      <View style={styles.robotCard}>
        <Text style={styles.cardTitle}>Robot position</Text>

        <View style={styles.robotDetails}>
          <Text style={styles.robotValue}>
            X: {robot.x}, Y: {robot.y}
          </Text>

          <Text style={styles.robotValue}>Facing: {robot.direction}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.secondaryButton} onPress={addObstacle}>
          <Text style={styles.secondaryButtonText}>Auto place</Text>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={() => setManualDialogVisible(true)}>
          <Text style={styles.secondaryButtonText}>Manual place</Text>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={clearObstacles}>
          <Text style={styles.secondaryButtonText}>Clear all</Text>
        </Pressable>
      </View>

      <View style={styles.robotCard}>
        <Text style={styles.cardTitle}>New obstacle orientation</Text>
        <View style={styles.orientationContainer}>
          {(['NORTH', 'EAST', 'SOUTH', 'WEST'] as Direction[]).map(dir => (
            <Pressable
              key={dir}
              style={[
                styles.orientationButton,
                selectedFace === dir && styles.selectedOrientation,
              ]}
              onPress={() => setSelectedFace(dir)}
            >
              <Text
                style={[
                  styles.orientationText,
                  selectedFace === dir && styles.selectedOrientationText,
                ]}
              >
                {dir}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.secondaryButton} onPress={resetMap}>
          <Text style={styles.secondaryButtonText}>Reset map</Text>
        </Pressable>

        <Pressable style={styles.primaryButton} onPress={sendMapToRobot}>
          <Text style={styles.primaryButtonText}>Send map & start</Text>
        </Pressable>
      </View>

      <View style={styles.chatCard}>
        <Text style={styles.cardTitle}>Comms</Text>
        <View style={styles.chatContainer}>
          <ScrollView
            style={styles.chatList}
            contentContainerStyle={styles.chatListContent}
            nestedScrollEnabled={true}
          >
            {chatMessages.slice(0, 50).map((msg, index) => (
              <Text key={index} style={styles.chatMessage}>
                {msg}
              </Text>
            ))}
          </ScrollView>
        </View>
        <View style={styles.chatInputRow}>
          <TextInput
            style={styles.chatInput}
            value={chatInput}
            onChangeText={setChatInput}
            placeholder="Send command..."
          />
          <Pressable style={styles.chatSendButton} onPress={sendChatMessage}>
            <Text style={styles.chatSendText}>Send</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.legendCard}>
        <Text style={styles.cardTitle}>Legend</Text>

        <View style={styles.legendRow}>
          <View style={styles.robotLegend} />
          <Text style={styles.legendText}>Robot and current facing direction</Text>
        </View>

        <View style={styles.legendRow}>
          <View style={styles.obstacleLegend}>
            <View style={[styles.obstacleLegendFace, { top: 0, left: 0, right: 0, height: 3, backgroundColor: '#ffd180', position: 'absolute' }]} />
            <Text style={styles.obstacleLegendText}>1</Text>
          </View>
          <Text style={styles.legendText}>
            Obstacle with orientation indicator (top edge), image ID, and target face
          </Text>
        </View>
      </View>

      <CustomAlertDialog
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        onClose={hideAlert}
        onConfirm={alert.onConfirm}
      />

      <CoordinateInputDialog
        visible={manualDialogVisible}
        onClose={() => setManualDialogVisible(false)}
        onSubmit={handleManualAdd}
      />
    </ScrollView>
  );
}

function isDirection(value: string): value is Direction {
  return ['NORTH', 'EAST', 'SOUTH', 'WEST'].includes(value);
}

function findAvailableCell(
  obstacles: Obstacle[],
  robot: Robot,
): { x: number; y: number } | undefined {
  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      const occupiedByRobot = x === robot.x && y === robot.y;
      const occupiedByObstacle = obstacles.some(
        obstacle => obstacle.x === x && obstacle.y === y,
      );

      if (!occupiedByRobot && !occupiedByObstacle) {
        return { x, y };
      }
    }
  }

  return undefined;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  title: {
    fontSize: 23,
    fontWeight: '900',
    color: '#0f172a',
  },
  subtitle: {
    maxWidth: '78%',
    marginTop: 4,
    color: '#64748b',
    lineHeight: 19,
  },
  connectionPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  statusItem: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
  },
  bgSuccess: { backgroundColor: '#22c55e' },
  bgError: { backgroundColor: '#ef4444' },
  timerCard: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    marginBottom: 16,
  },
  timerLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '700',
  },
  timerValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
  },
  resetTimerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  resetTimerText: {
    color: '#475569',
    fontWeight: '700',
  },
  chatCard: {
    width: '100%',
    marginTop: 18,
    padding: 15,
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  chatContainer: {
    height: 120,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginVertical: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chatList: {
    flex: 1,
  },
  chatListContent: {
    paddingVertical: 4,
  },
  chatMessage: {
    fontSize: 13,
    color: '#334155',
    marginBottom: 4,
  },
  chatInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chatInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  chatSendButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
  },
  chatSendText: {
    color: '#fff',
    fontWeight: '700',
  },
  connected: {
    backgroundColor: '#dcfce7',
  },
  disconnected: {
    backgroundColor: '#fee2e2',
  },
  connectionText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  robotCard: {
    width: '100%',
    marginTop: 18,
    padding: 15,
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  robotDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 9,
  },
  orientationContainer: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 8,
  },
  orientationButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  selectedOrientation: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  orientationText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  selectedOrientationText: {
    color: '#2563eb',
  },
  robotValue: {
    color: '#475569',
    fontWeight: '700',
  },
  actions: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  primaryButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: '#2563eb',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  secondaryButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
  },
  secondaryButtonText: {
    color: '#334155',
    fontWeight: '800',
  },
  legendCard: {
    width: '100%',
    marginTop: 18,
    padding: 15,
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 13,
    gap: 10,
  },
  legendText: {
    flex: 1,
    color: '#475569',
  },
  robotLegend: {
    width: 24,
    height: 24,
    borderTopWidth: 20,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderTopColor: '#1565c0',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  obstacleLegend: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: 4,
    borderColor: '#6d3100',
    backgroundColor: '#ef6c00',
  },
  obstacleLegendText: {
    color: '#ffffff',
    fontWeight: '900',
  },
  hintBox: {
    marginTop: 20,
    padding: 20,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#bfdbfe',
    borderStyle: 'dashed',
    alignItems: 'center',
    width: '90%',
  },
  hintTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e40af',
    marginBottom: 6,
  },
  hintText: {
    fontSize: 14,
    color: '#3b82f6',
    textAlign: 'center',
    lineHeight: 20,
  },
});
