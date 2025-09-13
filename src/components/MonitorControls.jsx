import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import { styles } from '../constants/styles';

const MonitorControls = ({ isMonitoring, toggleMonitoring, clearHistory, serverStatus }) => {
  console.log('MonitorControls - serverStatus:', serverStatus, 'isMonitoring:', isMonitoring);
  
  return (
    <View style={styles.buttonRow}>
      <TouchableOpacity
        style={[styles.monitorButton, isMonitoring ? styles.stopButton : styles.startButton]}
        onPress={toggleMonitoring}
        disabled={false}
      >
        <Text style={styles.monitorButtonText}>
          {isMonitoring ? 'Detener Monitoreo' : 'Iniciar Monitoreo'}
        </Text>
        {serverStatus !== 'Conectado' && (
          <Text style={styles.warningText}>
            (Servidor desconectado - Solo sensores locales)
          </Text>
        )}
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