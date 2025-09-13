import React from 'react';
import { View, Text } from 'react-native';
import { styles } from '../constants/styles';

const SensorDisplay = ({ accelerometerData, gyroscopeData }) => {
  const totalAcceleration = Math.sqrt(
    accelerometerData.x * accelerometerData.x +
    accelerometerData.y * accelerometerData.y +
    accelerometerData.z * accelerometerData.z
  );

  return (
    <View style={styles.sensorSection}>
      <Text style={styles.sectionTitle}>Datos del Sensor en Tiempo Real</Text>
      <View style={styles.sensorRow}>
        <View style={styles.sensorData}>
          <Text style={styles.sensorLabel}>Acelerómetro</Text>
          <Text>X: {accelerometerData.x.toFixed(2)}</Text>
          <Text>Y: {accelerometerData.y.toFixed(2)}</Text>
          <Text>Z: {accelerometerData.z.toFixed(2)}</Text>
          <Text style={styles.totalText}>
            Total: {totalAcceleration.toFixed(2)}g
          </Text>
        </View>
        <View style={styles.sensorData}>
          <Text style={styles.sensorLabel}>Giroscopio</Text>
          <Text>X: {gyroscopeData.x.toFixed(2)}</Text>
          <Text>Y: {gyroscopeData.y.toFixed(2)}</Text>
          <Text>Z: {gyroscopeData.z.toFixed(2)}</Text>
        </View>
      </View>
    </View>
  );
};

export default SensorDisplay;