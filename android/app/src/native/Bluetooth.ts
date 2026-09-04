// src/native/Bluetooth.ts
import { DeviceEventEmitter, NativeModules } from 'react-native';

const { RobotBluetooth } = NativeModules;

export const Bluetooth = {
  pairedDevices: () => RobotBluetooth.getPairedDevices(),
  connect: (address: string) => RobotBluetooth.connect(address),
  send: (command: string) => RobotBluetooth.send(command),
  disconnect: () => RobotBluetooth.disconnect(),

  onMessage: (callback: (message: string) => void) =>
    DeviceEventEmitter.addListener('robotMessage', callback),

  onStatus: (callback: (status: string) => void) =>
    DeviceEventEmitter.addListener('bluetoothStatus', callback),
};