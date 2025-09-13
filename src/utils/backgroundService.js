import { Platform } from 'react-native';
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { handleEmergencyAutomatic } from './emergencyService';

const BACKGROUND_MONITORING_TASK = 'background-monitoring-task';
const BACKGROUND_LOCATION_TASK = 'background-location-task';

// Configurar el manejador de tareas en segundo plano
TaskManager.defineTask(BACKGROUND_MONITORING_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Error en tarea de monitoreo:', error);
    return;
  }

  try {
    // Simular lectura de sensores (en una implementación real, 
    // necesitarías un módulo nativo para leer sensores en background)
    const sensorData = await getSensorDataFromNative();
    
    if (sensorData && isEmergencyDetected(sensorData)) {
      const clasificacion = classifyEmergency(sensorData);
      
      // Mostrar notificación de emergencia
      await showEmergencyNotification(clasificacion);
      
      // Activar emergencia automática después de 10 segundos
      setTimeout(async () => {
        await handleEmergencyAutomatic(clasificacion);
      }, 10000);
    }
  } catch (error) {
    console.error('Error en tarea de monitoreo en segundo plano:', error);
  }
});

// Configurar el manejador de ubicación en segundo plano
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Error en tarea de ubicación:', error);
    return;
  }

  if (data) {
    const { locations } = data;
    try {
      const previousSpeed = await AsyncStorage.getItem('previousSpeed');
      const previousTimestamp = await AsyncStorage.getItem('previousTimestamp');
      const currentSpeed = locations[0].coords.speed || 0;
      const currentTimestamp = locations[0].timestamp;
      
      if (previousSpeed && previousTimestamp) {
        const pSpeed = parseFloat(previousSpeed);
        const pTime = parseInt(previousTimestamp);
        const timeDiff = (currentTimestamp - pTime) / 1000;
        
        // Detectar detención brusca (posible accidente vehicular)
        if (timeDiff < 5 && pSpeed > 10 && currentSpeed < 1) {
          await showEmergencyNotification('accidente vehicular');
          
          setTimeout(async () => {
            await handleEmergencyAutomatic('accidente vehicular');
          }, 10000);
        }
      }
      
      await AsyncStorage.setItem('previousSpeed', currentSpeed.toString());
      await AsyncStorage.setItem('previousTimestamp', currentTimestamp.toString());
    } catch (e) {
      console.error('Error procesando ubicación en background:', e);
    }
  }
});

// Función para iniciar el servicio en segundo plano
export const startBackgroundService = async () => {
  try {
    // Solicitar permisos de ubicación en segundo plano
    const { status } = await Location.requestBackgroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('Permiso de ubicación en segundo plano denegado');
      return false;
    }

    // Iniciar monitoreo de ubicación
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.High,
      timeInterval: 2000,
      distanceInterval: 0,
      foregroundService: {
        notificationTitle: 'AlertaRaven - Monitoreo Activo',
        notificationBody: 'Detectando emergencias en segundo plano',
        notificationColor: '#FF0000',
      },
    });

    // Iniciar tarea de monitoreo general
    if (Platform.OS === 'android') {
      // En Android, necesitarías un módulo nativo para sensores en background
      console.log('Servicio en segundo plano iniciado');
    }

    return true;
  } catch (error) {
    console.error('Error iniciando servicio en segundo plano:', error);
    return false;
  }
};

// Función para detener el servicio en segundo plano
export const stopBackgroundService = async () => {
  try {
    if (await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }
    
    if (await TaskManager.isTaskRegisteredAsync(BACKGROUND_MONITORING_TASK)) {
      await TaskManager.unregisterTaskAsync(BACKGROUND_MONITORING_TASK);
    }
    
    console.log('Servicio en segundo plano detenido');
    return true;
  } catch (error) {
    console.error('Error deteniendo servicio en segundo plano:', error);
    return false;
  }
};

// Función para mostrar notificación de emergencia
const showEmergencyNotification = async (clasificacion) => {
  const title = clasificacion === 'caída de teléfono' ? '🚨 CAÍDA DETECTADA' : '🚨 ACCIDENTE DETECTADO';
  
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body: 'Emergencia detectada. Se activará la alerta automática en 10 segundos. Toca para cancelar.',
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.MAX,
      categoryIdentifier: 'emergency',
      data: { clasificacion, timestamp: Date.now() },
    },
    trigger: null,
  });
};

// Funciones auxiliares (necesitarían implementación nativa real)
const getSensorDataFromNative = async () => {
  // Esta función necesitaría un módulo nativo para leer sensores en background
  // Por ahora retorna null
  return null;
};

const isEmergencyDetected = (sensorData) => {
  if (!sensorData) return false;
  
  const { accelerometer } = sensorData;
  const magnitude = Math.sqrt(
    accelerometer.x ** 2 + accelerometer.y ** 2 + accelerometer.z ** 2
  );
  
  return magnitude > 2.5; // Umbral de emergencia
};

const classifyEmergency = (sensorData) => {
  const { accelerometer, gyroscope } = sensorData;
  const accMagnitude = Math.sqrt(
    accelerometer.x ** 2 + accelerometer.y ** 2 + accelerometer.z ** 2
  );
  const gyroMagnitude = Math.sqrt(
    gyroscope.x ** 2 + gyroscope.y ** 2 + gyroscope.z ** 2
  );
  
  if (accMagnitude > 4.0 && gyroMagnitude > 3.0) {
    return 'accidente vehicular';
  } else if (accMagnitude > 2.5) {
    return 'caída de teléfono';
  }
  
  return 'normal';
};