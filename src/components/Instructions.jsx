import React from 'react';
import { View, Text } from 'react-native';
import { styles } from '../constants/styles';

const Instructions = () => {
  return (
    <View style={styles.infoContainer}>
      <Text style={styles.infoTitle}>Instrucciones de Uso:</Text>
      <Text style={styles.infoText}>• Asegúrate que el servidor esté conectado</Text>
      <Text style={styles.infoText}>• Presiona "Iniciar Monitoreo" para comenzar</Text>
      <Text style={styles.infoText}>• Mueve el teléfono para simular diferentes movimientos</Text>
      <Text style={styles.infoText}>• Para probar caídas: agita bruscamente el teléfono</Text>
      <Text style={styles.infoText}>• Los datos se envían a la IA para clasificación</Text>
      <Text style={styles.infoText}>• Proporciona feedback para mejorar la precisión de la IA</Text>
    </View>
  );
};

export default Instructions;