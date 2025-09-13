// src/utils/api.js
import { Alert } from 'react-native';
import { API_URL, TIMEOUT } from '../constants/apiConfig';

// Función independiente para verificar estado del servidor
export const checkServerStatusDirect = async () => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
    
    const response = await fetch(`${API_URL}/estadisticas`, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.log('Servidor no disponible:', error);
    return false;
  }
};

export const checkServerStatus = async (setServerStatus) => {
  const isConnected = await checkServerStatusDirect();
  setServerStatus(isConnected ? 'Conectado' : 'Desconectado');
  return isConnected;
};

export const fetchPendingEvents = async (setPendingEvents, serverStatus) => {
  if (serverStatus !== 'Conectado') {
    console.log('Servidor no conectado, no se pueden obtener eventos');
    setPendingEvents([]);
    return [];
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
    
    const response = await fetch(`${API_URL}/eventos_pendientes`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Error del servidor: ${response.status}`);
    }

    const events = await response.json();
    console.log('Eventos pendientes recibidos:', events.length);
    setPendingEvents(events);
    return events;
  } catch (error) {
    console.error('Error al obtener eventos pendientes:', error);
    setPendingEvents([]);
    return [];
  }
};

export const marcarNotificado = async (eventoId) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
    
    const response = await fetch(`${API_URL}/marcar_notificado/${eventoId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Error del servidor: ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error al marcar como notificado:', error);
    return false;
  }
};

export const sendFeedback = async (
  eventoId, 
  correctTipo, 
  setFeedbackLoading, 
  serverStatus, 
  marcarNotificado, 
  fetchPendingEvents, 
  setPendingEvents
) => {
  // Verificar estado del servidor primero
  const isConnected = await checkServerStatusDirect();
  
  if (!isConnected) {
    Alert.alert('Error', 'El servidor no está disponible. Verifica la conexión.');
    return false;
  }

  if (!eventoId || eventoId === 'test-id') {
    Alert.alert('Error', 'ID de evento no válido.');
    return false;
  }

  setFeedbackLoading(true);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
    
    const response = await fetch(`${API_URL}/feedback/${eventoId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ correct_tipo: correctTipo }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error del servidor: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    Alert.alert('Éxito', 'Feedback enviado correctamente');
    
    // Marcar como notificado
    await marcarNotificado(eventoId);
    
    // Actualizar la lista de eventos pendientes
    await fetchPendingEvents(setPendingEvents, 'Conectado');
    
    return true;
  } catch (error) {
    console.error('Error al enviar feedback:', error);
    Alert.alert('Error', `No se pudo enviar el feedback: ${error.message}`);
    return false;
  } finally {
    setFeedbackLoading(false);
  }
};