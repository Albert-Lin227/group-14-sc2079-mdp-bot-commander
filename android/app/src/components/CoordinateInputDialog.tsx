import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Easing,
  TextInput,
} from 'react-native';

interface CoordinateInputDialogProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (x: number, y: number) => void;
}

export const CoordinateInputDialog = ({
  visible,
  onClose,
  onSubmit,
}: CoordinateInputDialogProps) => {
  const [localVisible, setLocalVisible] = useState(visible);
  const [isReady, setIsReady] = useState(false);
  const animationValue = useRef(new Animated.Value(0)).current;

  const [xValue, setXValue] = useState('');
  const [yValue, setYValue] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      setLocalVisible(true);
      setXValue('');
      setYValue('');
      setError('');
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

  const handleConfirm = () => {
    const x = parseInt(xValue, 10);
    const y = parseInt(yValue, 10);

    if (isNaN(x) || isNaN(y)) {
      setError('Please enter valid numbers for both X and Y.');
      return;
    }

    if (x < 0 || x > 19 || y < 0 || y > 19) {
      setError('Coordinates must be between 0 and 19.');
      return;
    }

    setError('');
    onSubmit(x, y);
    onClose();
  };

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
            !isReady && { opacity: 0 } // Explicitly hide on first frame
          ]}
        />

        <Animated.View
          style={[
            styles.alertBox,
            {
              opacity: animationValue,
              transform: [{ scale: dialogScale }]
            },
            !isReady && { opacity: 0 } // Explicitly hide on first frame
          ]}
        >
          <Text style={styles.title}>Add Obstacle Manually</Text>
          <Text style={styles.message}>Enter coordinates (Range: 0 to 19)</Text>

          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>X Coordinate</Text>
              <TextInput
                style={styles.input}
                placeholder="0 - 19"
                keyboardType="numeric"
                value={xValue}
                onChangeText={(text) => {
                  setXValue(text);
                  setError('');
                }}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Y Coordinate</Text>
              <TextInput
                style={styles.input}
                placeholder="0 - 19"
                keyboardType="numeric"
                value={yValue}
                onChangeText={(text) => {
                  setYValue(text);
                  setError('');
                }}
              />
            </View>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.confirmButton]}
              onPress={handleConfirm}
            >
              <Text style={styles.confirmText}>Add</Text>
            </TouchableOpacity>
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
    opacity: 0, // Force initial hidden state in style
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 20,
  },
  inputContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 15,
  },
  inputWrapper: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: '#1F2937',
    textAlign: 'center',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginBottom: 15,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 10,
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
