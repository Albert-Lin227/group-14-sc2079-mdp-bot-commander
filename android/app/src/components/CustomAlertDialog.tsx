import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Easing
} from 'react-native';

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  onConfirm?: () => void;
}

export const CustomAlertDialog = ({
  visible,
  title,
  message,
  onClose,
  onConfirm
}: CustomAlertProps) => {
  const [localVisible, setLocalVisible] = useState(visible);
  const [isReady, setIsReady] = useState(false);
  const animationValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setLocalVisible(true);
      // Fix flicker by deferring rendering until the Modal has settled
      requestAnimationFrame(() => {
        setIsReady(true);
        Animated.timing(animationValue, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.exp),
          useNativeDriver: true,
        }).start();
      });
    } else {
      Animated.timing(animationValue, {
        toValue: 0,
        duration: 200,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }).start(() => {
        setIsReady(false);
        setLocalVisible(false);
      });
    }
  }, [visible, animationValue]);

  if (!localVisible && !visible) return null;

  const backdropOpacity = animationValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.6],
  });

  const dialogScale = animationValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1],
  });

  return (
    <Modal
      transparent
      visible={localVisible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.backdrop,
            { opacity: backdropOpacity },
            !isReady && { opacity: 0 } // Point 2: Force initial hidden style
          ]}
        />

        <Animated.View
          style={[
            styles.alertBox,
            {
              opacity: animationValue,
              transform: [{ scale: dialogScale }]
            },
            !isReady && { opacity: 0 } // Point 2: Force initial hidden style
          ]}
        >
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose}>
              <Text style={styles.cancelText}>{onConfirm ? 'Cancel' : 'Close'}</Text>
            </TouchableOpacity>

            {onConfirm && (
              <TouchableOpacity
                style={[styles.button, styles.confirmButton]}
                onPress={() => {
                  onConfirm();
                  onClose();
                }}
              >
                <Text style={styles.confirmText}>Confirm</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    opacity: 0,
  },
  alertBox: {
    width: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    opacity: 0, // Point 2: Force initial hidden state in style
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  confirmButton: {
    backgroundColor: '#2563eb',
  },
  cancelText: {
    color: '#4B5563',
    fontWeight: '600',
  },
  confirmText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
