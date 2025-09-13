import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { styles } from '../constants/styles';

const MonitorControls = ({ isMonitoring, toggleMonitoring, clearHistory, serverStatus }) => {
  return (
    <View style={styles.buttonRow}>
      <TouchableOpacity
        style={[styles.monitorButton, isMonitoring ? styles.stopButton : styles.startButton]}
        onPress={toggleMonitoring}
        disabled={serverStatus !== 'Conectado'}
      >
        <Text style={styles.monitorButtonText}>
          {isMonitoring ? 'Detener Monitoreo' : 'Iniciar Monitoreo'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.monitorButton, styles.clearButton]}
        onPress={clearHistory}
      >
        <Text style={styles.monitorButtonText}>Limpiar</Text>
      </TouchableOpacity>
    </View>
  );
};

export default MonitorControls;