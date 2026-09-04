// src/screens/MessagesScreen.tsx
import React, { useEffect, useRef, useState, memo, useCallback } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CustomAlertDialog } from '../components/CustomAlertDialog';
import { Bluetooth } from '../native/Bluetooth';

type RobotMessage = {
  id: string;
  text: string;
  timestamp: Date;
};

const MessageItem = memo(({ item }: { item: RobotMessage }) => (
  <View style={styles.messageCard}>
    <Text style={styles.messageText}>{item.text}</Text>
    <Text style={styles.timestamp}>
      {item.timestamp.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })}
    </Text>
  </View>
));

export function MessagesScreen() {
  const [messages, setMessages] = useState<RobotMessage[]>([]);
  const listRef = useRef<FlatList<RobotMessage>>(null);

  const [alert, setAlert] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({ visible: false, title: '', message: '' });

  const showAlert = (title: string, message: string, onConfirm?: () => void) => {
    setAlert({ visible: true, title, message, onConfirm });
  };

  const hideAlert = () => {
    setAlert(prev => ({ ...prev, visible: false }));
  };

  useEffect(() => {
    const subscription = Bluetooth.onMessage(text => {
      const trimmed = text.trim();
      const isProtocol = [
        'ROBOT',
        'TARGET',
        'OBSTACLE',
        'ADD_OBSTACLE',
        'MOVE_OBSTACLE',
        'REMOVE_OBSTACLE',
        'ANNOTATE_OBSTACLE',
        'MAP',
        'START_AUTO',
        'STOP_AUTO',
      ].some(prefix => trimmed.startsWith(prefix));

      if (isProtocol) return;

      setMessages(current => [
        {
          id: `${Date.now()}-${Math.random()}`,
          text: trimmed,
          timestamp: new Date(),
        },
        ...current,
      ]);
    });

    return () => subscription.remove();
  }, []);

  const renderItem = useCallback(({ item }: { item: RobotMessage }) => (
    <MessageItem item={item} />
  ), []);

  const keyExtractor = useCallback((item: RobotMessage) => item.id, []);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Robot messages</Text>
          <Text style={styles.subtitle}>
            Live telemetry, detections, and robot status updates.
          </Text>
        </View>

        <Pressable
          style={styles.clearButton}
          onPress={() =>
            showAlert(
              'Clear messages?',
              'This will permanently delete all received messages.',
              () => setMessages([])
            )
          }
        >
          <Text style={styles.clearText}>Clear</Text>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        inverted
        keyExtractor={keyExtractor}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        contentContainerStyle={messages.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>▤</Text>
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptyDescription}>
              Messages sent by the robot car will appear here.
            </Text>
          </View>
        }
        renderItem={renderItem}
      />

      <CustomAlertDialog
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        onClose={hideAlert}
        onConfirm={alert.onConfirm}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: '900', color: '#0f172a' },
  subtitle: { marginTop: 4, maxWidth: '84%', color: '#64748b' },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
  },
  clearText: { color: '#334155', fontWeight: '800' },
  list: { gap: 10, paddingBottom: 16 },
  messageCard: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderLeftColor: '#2563eb',
    borderLeftWidth: 4,
  },
  messageText: { color: '#1e293b', fontSize: 15, lineHeight: 21 },
  timestamp: { marginTop: 8, fontSize: 12, color: '#94a3b8' },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
  emptyState: { alignItems: 'center', paddingHorizontal: 40 },
  emptyIcon: { fontSize: 38, color: '#94a3b8' },
  emptyTitle: {
    marginTop: 14,
    fontSize: 18,
    fontWeight: '800',
    color: '#334155',
  },
  emptyDescription: {
    marginTop: 7,
    textAlign: 'center',
    color: '#64748b',
    lineHeight: 20,
  },
});