import * as Sensors from 'expo-sensors';
import { Platform, Alert, Vibration } from 'react-native';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, TIMEOUT } from '../constants/apiConfig';
import { sendFeedback, checkServerStatus, fetchPendingEvents, marcarNotificado } from './api';

export const configureSensors = () => {
  console.log('Configuring sensors...');
  Sensors.Accelerometer.setUpdateInterval(500);
  Sensors.Gyroscope.setUpdateInterval(500);
};

export const subscribeSensors = (
  setAccelerometerData,
  setGyroscopeData,
  accelerometerData,
  gyroscopeData,
  processSensorData,
  lastProcessedTime,
  setLastProcessedTime,
  classifyMovement,
  serverStatus,
  setLoading,
  setResult,
  setDataHistory,
  setSubscriptionAcc,
  setSubscriptionGyro
) => {
  const accSubscription = Sensors.Accelerometer.addListener((accelerometerData) => {
    setAccelerometerData(accelerometerData);
    processSensorData(
      accelerometerData,
      gyroscopeData,
      lastProcessedTime,
      setLastProcessedTime,
      classifyMovement,
      serverStatus,
      setLoading,
      setResult,
      setDataHistory
    );
  });

  const gyroSubscription = Sensors.Gyroscope.addListener((gyroscopeData) => {
    setGyroscopeData(gyroscopeData);
  });

  setSubscriptionAcc(accSubscription);
  setSubscriptionGyro(gyroSubscription);
};

export const unsubscribeSensors = (subscriptionAcc, subscriptionGyro, setSubscriptionAcc, setSubscriptionGyro) => {
  if (subscriptionAcc) {
    subscriptionAcc.remove();
    setSubscriptionAcc(null);
  }
  if (subscriptionGyro) {
    subscriptionGyro.remove();
    setSubscriptionGyro(null);
  }
};

export const processSensorData = (
  accData,
  gyroData,
  lastProcessedTime,
  setLastProcessedTime,
  classifyMovement,
  serverStatus,
  setLoading,
  setResult,
  setDataHistory
) => {
  const currentTime = Date.now();

  if (currentTime - lastProcessedTime < 1000) {
    return;
  }

  const totalAcceleration = Math.sqrt(
    accData.x * accData.x +
    accData.y * accData.y +
    accData.z * accData.z
  );

  if (totalAcceleration > 1.2 || totalAcceleration < 0.8) {
    setLastProcessedTime(currentTime);
    classifyMovement(accData, gyroData, currentTime, serverStatus, setLoading, setResult, setDataHistory);
  }
};

export const classifyMovement = async (
  accData,
  gyroData,
  timestamp,
  serverStatus,
  setLoading,
  setResult,
  setDataHistory,
  setFeedbackLoading,
  marcarNotificado,
  fetchPendingEvents,
  setPendingEvents
) => {
  let currentServerStatus = serverStatus;

  // Fallback: Check server status if not connected
  if (currentServerStatus !== 'Conectado') {
    try {
      const response = await fetch(`${API_URL}/estadisticas`, {
        method: 'GET',
        timeout: TIMEOUT,
      });
      currentServerStatus = response.ok ? 'Conectado' : 'Desconectado';
      console.log('Server status check in classifyMovement:', currentServerStatus);
    } catch (error) {
      console.error('Error checking server status in classifyMovement:', error);
      Alert.alert('Error', 'El servidor no está disponible. Verifica la conexión.');
      return;
    }
  }

  if (currentServerStatus !== 'Conectado') {
    Alert.alert('Error', 'El servidor no está disponible. Verifica la conexión.');
    return;
  }

  setLoading(true);

  try {
    const movimientoData = {
      accelerometer_data: [accData.x, accData.y, accData.z],
      gyroscope_data: [gyroData.x, gyroData.y, gyroData.z],
      timestamp: timestamp,
      device_id: Platform.OS + ' ' + Platform.Version
    };

    setDataHistory((prev) => [...prev.slice(-9), {
      ...movimientoData,
      time: new Date().toLocaleTimeString(),
      totalAcc: Math.sqrt(accData.x * accData.x + accData.y * accData.y + accData.z * accData.z)
    }]);

    const response = await fetch(`${API_URL}/clasificar_movimiento`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(movimientoData),
      timeout: TIMEOUT
    });

    if (!response.ok) {
      throw new Error(`Error del servidor: ${response.status}`);
    }

    const data = await response.json();
    setResult(data);

    if (data.clasificacion !== 'normal') {
      showEventAlert(
        data.clasificacion,
        data.magnitud_aceleracion,
        data.event_id,
        currentServerStatus,
        setFeedbackLoading,
        marcarNotificado,
        fetchPendingEvents,
        setPendingEvents
      );
    }
  } catch (error) {
    console.error('Error al clasificar:', error);
    Alert.alert('Error', `No se pudo conectar con el servidor: ${error.message}`);
  } finally {
    setLoading(false);
  }
};

const showEventAlert = async (
  eventType,
  magnitude,
  eventId,
  serverStatus,
  setFeedbackLoading,
  marcarNotificado,
  fetchPendingEvents,
  setPendingEvents
) => {
  Vibration.vibrate([0, 500, 200, 500]);

  let title = 'Evento Detectado';
  if (eventType === 'caída de teléfono') {
    title = '¡Caída Detectada!';
  } else if (eventType === 'accidente vehicular') {
    title = '¡Accidente Detectado!';
  }

  let timer;
  let canceled = false;

  const triggerEmergency = async () => {
    if (canceled) return;

    // Cargar datos de emergencia
    const contactsJson = await AsyncStorage.getItem('emergencyContacts');
    const contacts = contactsJson ? JSON.parse(contactsJson) : [];
    const medical = await AsyncStorage.getItem('medicalRecord') || 'No hay ficha médica configurada';

    // Mostrar ficha médica en una alerta
    Alert.alert('Ficha Médica', medical);

    // Enviar mensajes y hacer llamadas (hasta 3 contactos)
    for (const contact of contacts.slice(0, 3)) {
      try {
        // Mensaje SMS (abre app de SMS con texto prellenado)
        await Linking.openURL(`sms:${contact.phone}?body=Emergencia detectada: ${title}. Magnitud: ${magnitude.toFixed(2)}g. Por favor, contacta conmigo.`);
        // Llamada (inicia el marcado)
        await Linking.openURL(`tel:${contact.phone}`);
      } catch (error) {
        console.error('Error triggering emergency action:', error);
      }
    }
  };

  // Iniciar temporizador de 15 segundos
  timer = setTimeout(triggerEmergency, 15000);

  // Fallback: Check server status before sending feedback
  let currentServerStatus = serverStatus;
  if (currentServerStatus !== 'Conectado') {
    try {
      const response = await fetch(`${API_URL}/estadisticas`, {
        method: 'GET',
        timeout: TIMEOUT,
      });
      currentServerStatus = response.ok ? 'Conectado' : 'Desconectado';
      console.log('Server status check in showEventAlert:', currentServerStatus);
    } catch (error) {
      console.error('Error checking server status in showEventAlert:', error);
    }
  }

  // Mostrar alerta con opción de cancelar
  Alert.alert(
    title,
    `Magnitud: ${magnitude.toFixed(2)}g\n\nLa alerta se activará en 15 segundos a menos que canceles.\n\nPor favor, confirma el tipo de evento para feedback:`,
    [
      {
        text: 'Normal',
        onPress: async () => {
          canceled = true;
          clearTimeout(timer);
          console.log('Sending feedback: Normal, eventId:', eventId);
          try {
            await sendFeedback(eventId, 'normal', setFeedbackLoading, currentServerStatus, marcarNotificado, fetchPendingEvents, setPendingEvents);
            console.log('Feedback sent: Normal');
          } catch (error) {
            console.error('Error sending Normal feedback:', error);
            Alert.alert('Error', `No se pudo enviar el feedback: ${error.message}`);
          }
        },
      },
      {
        text: 'Caída de Teléfono',
        onPress: async () => {
          canceled = true;
          clearTimeout(timer);
          console.log('Sending feedback: Caída de Teléfono, eventId:', eventId);
          try {
            await sendFeedback(eventId, 'caída de teléfono', setFeedbackLoading, currentServerStatus, marcarNotificado, fetchPendingEvents, setPendingEvents);
            console.log('Feedback sent: Caída de Teléfono');
          } catch (error) {
            console.error('Error sending Caída feedback:', error);
            Alert.alert('Error', `No se pudo enviar el feedback: ${error.message}`);
          }
        },
      },
      {
        text: 'Accidente Vehicular',
        onPress: async () => {
          canceled = true;
          clearTimeout(timer);
          console.log('Sending feedback: Accidente Vehicular, eventId:', eventId);
          try {
            await sendFeedback(eventId, 'accidente vehicular', setFeedbackLoading, currentServerStatus, marcarNotificado, fetchPendingEvents, setPendingEvents);
            console.log('Feedback sent: Accidente Vehicular');
          } catch (error) {
            console.error('Error sending Accidente feedback:', error);
            Alert.alert('Error', `No se pudo enviar el feedback: ${error.message}`);
          }
        },
      },
      {
        text: 'Cancelar Alerta',
        style: 'cancel',
        onPress: () => {
          canceled = true;
          clearTimeout(timer);
          console.log('Alerta cancelada');
        },
      },
    ],
    { cancelable: false } // No se cierra sin presionar botón
  );
};