import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { styles } from '../constants/styles';

const PendingEvents = ({ pendingEvents, feedbackLoading, sendFeedback }) => {
  const handleFeedback = (eventoId) => {
    Alert.alert(
      'Proporcionar Feedback',
      'Selecciona el tipo correcto del evento:',
      [
        {
          text: 'Normal',
          onPress: () => sendFeedback(eventoId, 'normal'),
        },
        {
          text: 'Caída de Teléfono',
          onPress: () => sendFeedback(eventoId, 'caída de teléfono'),
        },
        {
          text: 'Accidente Vehicular',
          onPress: () => sendFeedback(eventoId, 'accidente vehicular'),
        },
        {
          text: 'Cancelar',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={styles.feedbackSection}>
      <View style={styles.historyHeader}>
        <Text style={styles.sectionTitle}>Eventos Pendientes de Feedback</Text>
        <Text style={styles.historyCount}>{pendingEvents.length} eventos</Text>
      </View>
      {feedbackLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#3498db" />
          <Text style={styles.loadingText}>Enviando feedback...</Text>
        </View>
      )}
      {pendingEvents.length === 0 ? (
        <Text style={styles.noEventsText}>No hay eventos pendientes de feedback</Text>
      ) : (
        pendingEvents.map((event, index) => (
          <View key={index} style={styles.eventItem}>
            <Text style={styles.eventTime}>
              {new Date(event.fecha_registro).toLocaleString()}
            </Text>
            <Text style={styles.eventText}>
              Clasificación: {event.tipo_evento}
            </Text>
            <Text style={styles.eventText}>
              Magnitud: {event.datos.magnitud_aceleracion.toFixed(2)}g
            </Text>
            <TouchableOpacity
              style={styles.feedbackButton}
              onPress={() => handleFeedback(event.id)}
              disabled={feedbackLoading}
            >
              <Text style={styles.feedbackButtonText}>Proporcionar Feedback</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );
};

export default PendingEvents;