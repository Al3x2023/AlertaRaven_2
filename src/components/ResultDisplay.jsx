import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { styles } from '../constants/styles';

const ResultDisplay = ({ result, loading, medicalRecord }) => {
  const getResultStyle = () => {
    if (!result || !result.clasificacion) return {};
    switch (result.clasificacion) {
      case 'normal':
        return { backgroundColor: '#d4edda', borderColor: '#c3e6cb' };
      case 'caída de teléfono':
        return { backgroundColor: '#fff3cd', borderColor: '#ffeeba' };
      case 'accidente vehicular':
        return { backgroundColor: '#f8d7da', borderColor: '#f5c6cb' };
      default:
        return {};
    }
  };

  const getResultText = () => {
    if (!result || !result.clasificacion) return 'No se ha detectado ningún evento';
    switch (result.clasificacion) {
      case 'normal':
        return 'Movimiento Normal';
      case 'caída de teléfono':
        return '¡Caída Detectada!';
      case 'accidente vehicular':
        return '¡Accidente Detectado!';
      default:
        return result.clasificacion;
    }
  };

  const getResultDescription = () => {
    if (!result || !result.clasificacion) return 'Esperando datos del sensor...';
    switch (result.clasificacion) {
      case 'normal':
        return 'No se detectaron incidentes. Movimiento normal.';
      case 'caída de teléfono':
        return 'La inteligencia artificial ha detectado una posible caída del dispositivo.';
      case 'accidente vehicular':
        return 'La inteligencia artificial ha detectado un impacto severo.';
      default:
        return 'Evento desconocido detectado.';
    }
  };

  const formatMedicalInfo = () => {
    if (!medicalRecord) return 'No hay información médica disponible';
    return `
Grupo sanguíneo: ${medicalRecord.bloodType || 'No especificado'}
Alergias: ${medicalRecord.allergies || 'Ninguna'}
Medicamentos: ${medicalRecord.medications || 'Ninguno'}
Condiciones médicas: ${medicalRecord.medicalConditions || 'Ninguna'}
Altura: ${medicalRecord.height || 'No especificada'} cm
Peso: ${medicalRecord.weight || 'No especificado'} kg
Médico: ${medicalRecord.doctor || 'No especificado'}
Seguro: ${medicalRecord.insurance || 'No especificado'}
Condiciones: ${[
  medicalRecord.hasDiabetes ? 'Diabetes' : '',
  medicalRecord.hasHypertension ? 'Hipertensión' : '',
  medicalRecord.hasHeartConditions ? 'Problemas cardíacos' : ''
].filter(Boolean).join(', ') || 'Ninguna'}
Info adicional: ${medicalRecord.otherInfo || 'Ninguna'}
    `.trim();
  };

  return (
    <>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Analizando movimiento con IA...</Text>
        </View>
      )}
      <View style={[styles.resultContainer, getResultStyle()]}>
        <Text style={styles.resultTitle}>Resultado del Análisis:</Text>
        <Text style={styles.resultText}>{getResultText()}</Text>
        <Text style={styles.resultDescription}>
          Magnitud: {result?.magnitud_aceleracion ? result.magnitud_aceleracion.toFixed(2) + 'g' : 'N/A'}
        </Text>
        <Text style={styles.resultDescription}>{getResultDescription()}</Text>
        {result?.deteccion_rapida && (
          <Text style={styles.detectionNote}>(Detección rápida activada)</Text>
        )}
        {(result?.clasificacion === 'caída de teléfono' || result?.clasificacion === 'accidente vehicular') && (
          <Text style={styles.medicalText}>{formatMedicalInfo()}</Text>
        )}
      </View>
    </>
  );
};

export default ResultDisplay;