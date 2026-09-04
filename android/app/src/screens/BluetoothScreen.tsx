// src/screens/BluetoothScreen.tsx
import React, { useEffect, useState, memo, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  PermissionsAndroid,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CustomAlertDialog } from '../components/CustomAlertDialog';
import { Bluetooth } from '../native/Bluetooth';

type Device = {
  name: string;
  address: string;
};

const DeviceItem = memo(({
  item,
  isSelected,
  connected,
  onPress
}: {
  item: Device;
  isSelected: boolean;
  connected: boolean;
  onPress: (device: Device) => void;
}) => {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.device,
        isSelected && styles.selectedDevice,
        pressed && styles.pressed,
      ]}
      onPress={() => onPress(item)}
      android_ripple={{ color: '#e2e8f0' }}
    >
      <View style={styles.deviceIcon}>
        <Text>ᛒ</Text>
      </View>

      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName}>{item.name}</Text>
        <Text style={styles.deviceAddress}>{item.address}</Text>
      </View>

      <Text style={styles.connectText}>
        {isSelected && connected ? 'Connected' : 'Connect'}
      </Text>
    </Pressable>
  );
});

async function requestPermissions() {
  if (Platform.OS !== 'android') return true;

  if (Platform.Version >= 31) {
    const result = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ]);

    return (
      result['android.permission.BLUETOOTH_CONNECT'] ===
        PermissionsAndroid.RESULTS.GRANTED &&
      result['android.permission.BLUETOOTH_SCAN'] ===
        PermissionsAndroid.RESULTS.GRANTED
    );
  }

  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export function BluetoothScreen() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [status, setStatus] = useState('Disconnected');
  const [loading, setLoading] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<string>();

  const [alert, setAlert] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({ visible: false, title: '', message: '' });

  const showAlert = useCallback((title: string, message: string) => {
    setAlert({ visible: true, title, message });
  }, []);

  const hideAlert = useCallback(() => {
    setAlert(prev => ({ ...prev, visible: false }));
  }, []);

  useEffect(() => {
    const subscription = Bluetooth.onStatus(setStatus);
    loadDevices();

    return () => subscription.remove();
  }, []);

  const loadDevices = async () => {
    setLoading(true);

    try {
      const granted = await requestPermissions();
      if (!granted) {
        showAlert('Permission denied', 'Bluetooth and location permissions are required to scan for devices.');
        setStatus('Permission denied');
        return;
      }

      // Returns Android devices already paired in system Bluetooth settings.
      const paired = await Bluetooth.pairedDevices();
      setDevices(paired);
    } catch (e) {
      console.error(e);
      showAlert('Error', 'Failed to load paired devices. Make sure Bluetooth is enabled.');
      setStatus('Failed to load devices');
    } finally {
      setLoading(false);
    }
  };

  const connect = useCallback((device: Device) => {
    setSelectedAddress(device.address);
    Bluetooth.connect(device.address);
  }, []);

  const renderItem = useCallback(({ item }: { item: Device }) => (
    <DeviceItem
      item={item}
      isSelected={selectedAddress === item.address}
      connected={status.startsWith('Connected')}
      onPress={connect}
    />
  ), [selectedAddress, status, connect]);

  const connected = status.startsWith('Connected');

  return (
    <View style={styles.screen}>
      <View style={styles.connectionCard}>
        <Text style={styles.cardLabel}>Bluetooth status</Text>
        <Text style={[styles.status, connected ? styles.connected : styles.disconnected]}>
          {status}
        </Text>

        {connected && (
          <Pressable
            style={styles.disconnectButton}
            onPress={Bluetooth.disconnect}
            android_ripple={{ color: '#fca5a5' }}
          >
            <Text style={styles.disconnectText}>Disconnect</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Paired devices</Text>
          <Text style={styles.subtitle}>
            Select the robot Bluetooth module to connect.
          </Text>
        </View>

        <Pressable
          style={styles.refreshButton}
          onPress={loadDevices}
          android_ripple={{ color: '#bfdbfe' }}
        >
          <Text style={styles.refreshText}>Refresh</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={styles.loader} />
      ) : (
        <FlatList
          data={devices}
          keyExtractor={item => item.address}
          renderItem={renderItem}
          initialNumToRender={8}
          contentContainerStyle={devices.length === 0 ? styles.emptyList : undefined}
          ListEmptyComponent={
            <Text style={styles.empty}>
              No paired devices found. Pair the robot in Android Bluetooth settings,
              then return here and refresh.
            </Text>
          }
        />
      )}

      <CustomAlertDialog
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        onClose={hideAlert}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
  connectionCard: {
    padding: 18,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    marginBottom: 24,
  },
  cardLabel: { fontSize: 13, color: '#64748b', fontWeight: '700' },
  status: { marginTop: 4, fontSize: 18, fontWeight: '800' },
  connected: { color: '#15803d' },
  disconnected: { color: '#b91c1c' },
  disconnectButton: {
    alignSelf: 'flex-start',
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
  },
  disconnectText: { color: '#b91c1c', fontWeight: '800' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: { fontSize: 20, fontWeight: '900', color: '#0f172a' },
  subtitle: { marginTop: 3, color: '#64748b', maxWidth: '82%' },
  refreshButton: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#dbeafe',
  },
  refreshText: { color: '#1d4ed8', fontWeight: '800' },
  device: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  selectedDevice: { borderColor: '#2563eb', borderWidth: 2 },
  deviceIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dbeafe',
  },
  deviceInfo: { flex: 1, marginLeft: 12 },
  deviceName: { fontWeight: '800', color: '#1e293b' },
  deviceAddress: { marginTop: 3, fontSize: 12, color: '#64748b' },
  connectText: { color: '#2563eb', fontWeight: '800' },
  loader: { marginTop: 48 },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
  empty: { textAlign: 'center', color: '#64748b', lineHeight: 21 },
  pressed: { opacity: 0.7 },
});