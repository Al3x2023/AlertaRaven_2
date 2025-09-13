import React from 'react';
import { View, Text } from 'react-native';
import { styles } from '../constants/styles';

const ServerStatus = ({ serverStatus }) => {
  const getServerStatusColor = () => {
    return serverStatus === 'Conectado' ? '#28a745' : '#dc3545';
  };

  return (
    <View style={styles.serverStatus}>
      <Text style={styles.serverStatusText}>Estado del servidor: </Text>
      <Text style={[styles.serverStatusValue, { color: getServerStatusColor('red') }]}>
        {serverStatus}
      </Text>
    </View>
  );
};

export default ServerStatus;    