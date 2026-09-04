// src/screens/ControlScreen.tsx
import React, { useEffect, useState, memo, useCallback } from 'react';
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { CustomAlertDialog } from '../components/CustomAlertDialog';
import { Bluetooth } from '../native/Bluetooth';

type Command = 'MOVE_FORWARD' | 'MOVE_BACKWARD' | 'TURN_LEFT' | 'TURN_RIGHT' | 'STOP';

export function ControlScreen() {
  const [connected, setConnected] = useState(false);
  const [autonomousMode, setAutonomousMode] = useState(false);

  const [alert, setAlert] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({ visible: false, title: '', message: '' });

  const showAlert = (title: string, message: string) => {
    setAlert({ visible: true, title, message });
  };

  const hideAlert = () => {
    setAlert(prev => ({ ...prev, visible: false }));
  };

  useEffect(() => {
    const subscription = Bluetooth.onStatus(status => {
      setConnected(status.startsWith('Connected'));
    });

    return () => subscription.remove();
  }, []);

  const send = (command: Command) => {
    if (!connected) {
      showAlert('Robot not connected', 'Connect to your robot on the Bluetooth tab.');
      return;
    }

    Bluetooth.send(command);
  };

  const changeAutonomousMode = (enabled: boolean) => {
    if (!connected) {
      showAlert('Robot not connected', 'Connect to your robot first.');
      return;
    }

    setAutonomousMode(enabled);
    Bluetooth.send(enabled ? 'START_AUTO' : 'STOP_AUTO');
  };

  return (
    <View style={styles.screen}>
      <View style={styles.statusCard}>
        <View style={[styles.statusDot, connected ? styles.online : styles.offline]} />
        <Text style={styles.statusText}>
          {connected ? 'Robot connected' : 'Robot disconnected'}
        </Text>
      </View>

      <View style={styles.modeCard}>
        <View>
          <Text style={styles.modeTitle}>Autonomous mode</Text>
          <Text style={styles.modeDescription}>
            Let the robot follow its planned route.
          </Text>
        </View>

        <Switch
          value={autonomousMode}
          onValueChange={changeAutonomousMode}
          trackColor={{ false: '#94a3b8', true: '#2563eb' }}
        />
      </View>

      <View style={[styles.controller, autonomousMode && styles.disabled]}>
        <ControlButton label="▲" title="Forward" onPress={() => send('MOVE_FORWARD')} />

        <View style={styles.middleRow}>
          <ControlButton label="◀" title="Left" onPress={() => send('TURN_LEFT')} />
          <ControlButton label="■" title="Stop" danger onPress={() => send('STOP')} />
          <ControlButton label="▶" title="Right" onPress={() => send('TURN_RIGHT')} />
        </View>

        <ControlButton label="▼" title="Reverse" onPress={() => send('MOVE_BACKWARD')} />
      </View>

      <Text style={styles.hint}>
        Manual controls are disabled while autonomous mode is active.
      </Text>

      <CustomAlertDialog
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        onClose={hideAlert}
      />
    </View>
  );
}

function ControlButtonComponent({
  label,
  title,
  danger = false,
  onPress,
}: {
  label: string;
  title: string;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.controlButton,
        danger && styles.stopButton,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.controlLabel}>{label}</Text>
      <Text style={styles.controlTitle}>{title}</Text>
    </Pressable>
  );
}

const ControlButton = memo(ControlButtonComponent);

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8fafc',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    marginBottom: 14,
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  online: { backgroundColor: '#22c55e' },
  offline: { backgroundColor: '#ef4444' },
  statusText: { fontWeight: '700', color: '#1e293b' },
  modeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  modeTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  modeDescription: { marginTop: 3, color: '#64748b' },
  controller: {
    alignItems: 'center',
    gap: 14,
    marginTop: 38,
  },
  middleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  controlButton: {
    width: 92,
    height: 78,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
  },
  stopButton: { backgroundColor: '#dc2626' },
  controlLabel: { fontSize: 28, color: '#fff', fontWeight: '900' },
  controlTitle: { marginTop: 2, fontSize: 12, color: '#fff', fontWeight: '700' },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.38 },
  hint: {
    marginTop: 30,
    textAlign: 'center',
    color: '#64748b',
  },
});