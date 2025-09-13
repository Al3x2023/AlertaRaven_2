import React from 'react';
import { View, Text } from 'react-native';
import { styles } from '../constants/styles';

const HistoryList = ({ dataHistory }) => {
  return (
    <View style={styles.historySection}>
      <View style={styles.historyHeader}>
        <Text style={styles.sectionTitle}>Historial de Movimientos</Text>
        <Text style={styles.historyCount}>{dataHistory.length} registros</Text>
      </View>
      {dataHistory.slice().reverse().map((data, index) => (
        <View key={index} style={styles.historyItem}>
          <Text style={styles.historyTime}>{data.time}</Text>
          <Text style={styles.historyText}>
            Aceleración: {data.accelerometer_data.map(v => v.toFixed(2)).join(', ')}
          </Text>
          <Text style={styles.historyText}>
            Total: {data.totalAcc.toFixed(2)}g
          </Text>
        </View>
      ))}
    </View>
  );
};

export default HistoryList;