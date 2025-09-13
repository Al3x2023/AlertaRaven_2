// To enable background location and notifications, add to your app.json or app.config.js:
// 
// "expo": {
//   "plugins": [
//     ["expo-location"],
//     ["expo-notifications"]
//   ],
//   "ios": {
//     "infoPlist": {
//       "NSLocationWhenInUseUsageDescription": "Se requiere acceso a la ubicación para detectar accidentes.",
//       "NSLocationAlwaysAndWhenInUseUsageDescription": "Se requiere acceso a la ubicación en segundo plano para detectar accidentes incluso cuando la app está cerrada.",
//       "NSLocationAlwaysUsageDescription": "Se requiere acceso a la ubicación en segundo plano para detectar accidentes incluso cuando la app está cerrada.",
//       "UIBackgroundModes": ["location", "fetch"],
//       "NSMotionUsageDescription": "Se requiere acceso a los sensores de movimiento para detectar caídas y accidentes."
//     }
//   },
//   "android": {
//     "permissions": [
//       "android.permission.ACCESS_COARSE_LOCATION",
//       "android.permission.ACCESS_FINE_LOCATION",
//       "android.permission.ACCESS_BACKGROUND_LOCATION",
//       "android.permission.FOREGROUND_SERVICE"
//     ]
//   }
// }
//
// Asegúrate de reconstruir la app con EAS build si usas workflow managed.

import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, ScrollView, StatusBar, Alert, Text, Button, View, TextInput, FlatList, TouchableOpacity, Switch, Platform, Vibration } from 'react-native';
import * as SMS from 'expo-sms';
import * as Linking from 'expo-linking';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Device from 'expo-device';
import SensorDisplay from './src/components/SensorDisplay';
import ServerStatus from './src/components/ServerStatus';
import MonitorControls from './src/components/MonitorControls';
import ResultDisplay from './src/components/ResultDisplay';
import PendingEvents from './src/components/PendingEvents';
import HistoryList from './src/components/HistoryList';
import Instructions from './src/components/Instructions';
import { styles } from './src/constants/styles';
import { checkServerStatus, fetchPendingEvents, sendFeedback, marcarNotificado } from './src/utils/api';
import { configureSensors, subscribeSensors, unsubscribeSensors, processSensorData, classifyMovement } from './src/utils/sensorUtils';

// Definir el nombre de la tarea de background
const BACKGROUND_LOCATION_TASK = 'background-location-task';

// Definir la tarea de background para ubicación (para mantener la app activa en segundo plano y detectar accidentes vehiculares)
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Error en tarea de background:', error);
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
        const timeDiff = (currentTimestamp - pTime) / 1000; // en segundos
        
        // Detectar detención brusca (accidente vehicular posible)
        if (timeDiff < 5 && pSpeed > 10 && currentSpeed < 1) { // >36km/h a <3.6km/h
          handleEmergency('accidente vehicular'); // Llamar a handleEmergency directamente (necesita ser global o ajustado)
        }
      }
      
      await AsyncStorage.setItem('previousSpeed', currentSpeed.toString());
      await AsyncStorage.setItem('previousTimestamp', currentTimestamp.toString());
    } catch (e) {
      console.error('Error procesando ubicación en background:', e);
    }
  }
});

// Componente de configuración de emergencia
const EmergencyConfig = () => {
  const [contacts, setContacts] = useState([]);
  const [newContact, setNewContact] = useState({ name: '', phone: '' });
  const [medicalInfo, setMedicalInfo] = useState({
    bloodType: '',
    allergies: '',
    medications: '',
    medicalConditions: '',
    emergencyContact: '',
    insurance: '',
    doctor: '',
    height: '',
    weight: '',
    hasDiabetes: false,
    hasHypertension: false,
    hasHeartConditions: false,
    otherInfo: ''
  });

  useEffect(() => {
    loadEmergencyData();
  }, []);

  const loadEmergencyData = async () => {
    try {
      const storedContacts = await AsyncStorage.getItem('emergencyContacts');
      const storedMedical = await AsyncStorage.getItem('medicalRecord');
      
      if (storedContacts) setContacts(JSON.parse(storedContacts));
      if (storedMedical) setMedicalInfo(JSON.parse(storedMedical));
    } catch (e) {
      console.error('Error loading emergency data:', e);
    }
  };

  const saveContacts = async (updatedContacts) => {
    try {
      await AsyncStorage.setItem('emergencyContacts', JSON.stringify(updatedContacts));
      setContacts(updatedContacts);
      Alert.alert('Éxito', 'Contactos guardados correctamente');
    } catch (e) {
      Alert.alert('Error', 'No se pudieron guardar los contactos');
    }
  };

  const saveMedicalInfo = async () => {
    try {
      await AsyncStorage.setItem('medicalRecord', JSON.stringify(medicalInfo));
      Alert.alert('Éxito', 'Información médica guardada correctamente');
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar la información médica');
    }
  };

  const addContact = () => {
    if (!newContact.name.trim() || !newContact.phone.trim()) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    const updatedContacts = [...contacts, { ...newContact, id: Date.now().toString() }];
    saveContacts(updatedContacts);
    setNewContact({ name: '', phone: '' });
  };

  const removeContact = (id) => {
    const updatedContacts = contacts.filter(contact => contact.id !== id);
    saveContacts(updatedContacts);
  };

  const handleMedicalInfoChange = (field, value) => {
    setMedicalInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const toggleSwitch = (field) => {
    setMedicalInfo(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const formatMedicalInfo = () => {
    return `
Grupo sanguíneo: ${medicalInfo.bloodType || 'No especificado'}
Alergias: ${medicalInfo.allergies || 'Ninguna'}
Medicamentos: ${medicalInfo.medications || 'Ninguno'}
Condiciones médicas: ${medicalInfo.medicalConditions || 'Ninguna'}
Altura: ${medicalInfo.height || 'No especificada'} cm
Peso: ${medicalInfo.weight || 'No especificado'} kg
Médico: ${medicalInfo.doctor || 'No especificado'}
Seguro: ${medicalInfo.insurance || 'No especificado'}
Condiciones: ${[
  medicalInfo.hasDiabetes ? 'Diabetes' : '',
  medicalInfo.hasHypertension ? 'Hipertensión' : '',
  medicalInfo.hasHeartConditions ? 'Problemas cardíacos' : ''
].filter(Boolean).join(', ') || 'Ninguna'}
Info adicional: ${medicalInfo.otherInfo || 'Ninguna'}
    `.trim();
  };

  return (
    <View style={configStyles.configContainer}>
      <Text style={configStyles.sectionTitle}>Configuración de Emergencia</Text>
      
      <View style={configStyles.contactForm}>
        <Text style={configStyles.label}>Nombre del contacto:</Text>
        <TextInput
          style={configStyles.input}
          value={newContact.name}
          onChangeText={(text) => setNewContact({...newContact, name: text})}
          placeholder="Ej: María García"
        />
        
        <Text style={configStyles.label}>Teléfono:</Text>
        <TextInput
          style={configStyles.input}
          value={newContact.phone}
          onChangeText={(text) => setNewContact({...newContact, phone: text})}
          placeholder="Ej: +1234567890"
          keyboardType="phone-pad"
        />
        
        <Button title="Agregar Contacto" onPress={addContact} />
      </View>

      <Text style={configStyles.subtitle}>Contactos de Emergencia:</Text>
      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={configStyles.contactItem}>
            <View style={configStyles.contactInfo}>
              <Text style={configStyles.contactName}>{item.name}</Text>
              <Text style={configStyles.contactPhone}>{item.phone}</Text>
            </View>
            <TouchableOpacity onPress={() => removeContact(item.id)}>
              <Text style={configStyles.deleteButton}>Eliminar</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <Text style={configStyles.emptyText}>No hay contactos guardados</Text>
        }
      />

      <Text style={configStyles.sectionTitle}>Ficha Médica</Text>
      
      <View style={configStyles.formRow}>
        <View style={configStyles.formColumn}>
          <Text style={configStyles.label}>Grupo sanguíneo:</Text>
          <TextInput
            style={configStyles.input}
            value={medicalInfo.bloodType}
            onChangeText={(text) => handleMedicalInfoChange('bloodType', text)}
            placeholder="Ej: O+"
          />
        </View>
        <View style={configStyles.formColumn}>
          <Text style={configStyles.label}>Altura (cm):</Text>
          <TextInput
            style={configStyles.input}
            value={medicalInfo.height}
            onChangeText={(text) => handleMedicalInfoChange('height', text)}
            placeholder="Ej: 170"
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={configStyles.formRow}>
        <View style={configStyles.formColumn}>
          <Text style={configStyles.label}>Peso (kg):</Text>
          <TextInput
            style={configStyles.input}
            value={medicalInfo.weight}
            onChangeText={(text) => handleMedicalInfoChange('weight', text)}
            placeholder="Ej: 70"
            keyboardType="numeric"
          />
        </View>
      </View>

      <Text style={configStyles.label}>Alergias:</Text>
      <TextInput
        style={[configStyles.input, configStyles.textAreaSmall]}
        value={medicalInfo.allergies}
        onChangeText={(text) => handleMedicalInfoChange('allergies', text)}
        placeholder="Ej: Penicilina, Mariscos"
        multiline
      />

      <Text style={configStyles.label}>Medicamentos:</Text>
      <TextInput
        style={[configStyles.input, configStyles.textAreaSmall]}
        value={medicalInfo.medications}
        onChangeText={(text) => handleMedicalInfoChange('medications', text)}
        placeholder="Ej: Metformina 500mg, Losartán 50mg"
        multiline
      />

      <Text style={configStyles.label}>Condiciones médicas:</Text>
      <TextInput
        style={[configStyles.input, configStyles.textAreaSmall]}
        value={medicalInfo.medicalConditions}
        onChangeText={(text) => handleMedicalInfoChange('medicalConditions', text)}
        placeholder="Ej: Diabetes tipo 2, Hipertensión"
        multiline
      />

      <View style={configStyles.switchContainer}>
        <Text style={configStyles.label}>Condiciones preexistentes:</Text>
        <View style={configStyles.switchRow}>
          <Text style={configStyles.switchLabel}>Diabetes</Text>
          <Switch
            value={medicalInfo.hasDiabetes}
            onValueChange={() => toggleSwitch('hasDiabetes')}
          />
        </View>
        <View style={configStyles.switchRow}>
          <Text style={configStyles.switchLabel}>Hipertensión</Text>
          <Switch
            value={medicalInfo.hasHypertension}
            onValueChange={() => toggleSwitch('hasHypertension')}
          />
        </View>
        <View style={configStyles.switchRow}>
          <Text style={configStyles.switchLabel}>Problemas cardíacos</Text>
          <Switch
            value={medicalInfo.hasHeartConditions}
            onValueChange={() => toggleSwitch('hasHeartConditions')}
          />
        </View>
      </View>

      <Text style={configStyles.label}>Médico tratante:</Text>
      <TextInput
        style={configStyles.input}
        value={medicalInfo.doctor}
        onChangeText={(text) => handleMedicalInfoChange('doctor', text)}
        placeholder="Ej: Dr. Juan Pérez"
      />

      <Text style={configStyles.label}>Seguro médico:</Text>
      <TextInput
        style={configStyles.input}
        value={medicalInfo.insurance}
        onChangeText={(text) => handleMedicalInfoChange('insurance', text)}
        placeholder="Ej: Seguro Popular, GNP"
      />

      <Text style={configStyles.label}>Información adicional:</Text>
      <TextInput
        style={[configStyles.input, configStyles.textArea]}
        value={medicalInfo.otherInfo}
        onChangeText={(text) => handleMedicalInfoChange('otherInfo', text)}
        placeholder="Otra información médica relevante"
        multiline
        numberOfLines={4}
      />

      <Text style={configStyles.subtitle}>Vista previa de la ficha médica:</Text>
      <Text style={configStyles.medicalPreview}>{formatMedicalInfo()}</Text>
      
      <Button title="Guardar Información Médica" onPress={saveMedicalInfo} />
    </View>
  );
};

// Estilos para el componente de configuración
const configStyles = {
  configContainer: {
    padding: 16,
    marginBottom: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#2c3e50',
    textAlign: 'center',
  },
  contactForm: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    color: '#34495e',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
    backgroundColor: 'white',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  textAreaSmall: {
    height: 60,
    textAlignVertical: 'top',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#2c3e50',
  },
  contactItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: 'white',
    marginBottom: 8,
    borderRadius: 6,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontWeight: '600',
    fontSize: 14,
  },
  contactPhone: {
    color: '#666',
    fontSize: 12,
  },
  deleteButton: {
    color: '#e74c3c',
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
    marginVertical: 20,
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  formColumn: {
    flex: 1,
    marginRight: 8,
  },
  switchContainer: {
    marginBottom: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  switchLabel: {
    fontSize: 14,
    color: '#34495e',
  },
  medicalPreview: {
    fontSize: 14,
    color: '#34495e',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
};

// Componente principal App
const App = () => {
  const [accelerometerData, setAccelerometerData] = useState({ x: 0, y: 0, z: 0 });
  const [gyroscopeData, setGyroscopeData] = useState({ x: 0, y: 0, z: 0 });
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [subscriptionAcc, setSubscriptionAcc] = useState(null);
  const [subscriptionGyro, setSubscriptionGyro] = useState(null);
  const [dataHistory, setDataHistory] = useState([]);
  const [lastProcessedTime, setLastProcessedTime] = useState(0);
  const [serverStatus, setServerStatus] = useState('Desconocido');
  const [pendingEvents, setPendingEvents] = useState([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [medicalRecord, setMedicalRecord] = useState({});
  const [showConfig, setShowConfig] = useState(false);
  const [emergencyTimer, setEmergencyTimer] = useState(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        await checkServerStatus(setServerStatus);
        console.log('Server status updated:', serverStatus);
      } catch (error) {
        console.error('Error checking server status:', error);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 10000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (serverStatus === 'Conectado') {
      console.log('Fetching pending events...');
      fetchPendingEvents(setPendingEvents, serverStatus);
    }
  }, [serverStatus]);

  useEffect(() => {
    try {
      if (typeof configureSensors === 'function') {
        configureSensors();
        console.log('Sensors configured');
      } else {
        console.error('configureSensors is not a function');
      }

      const loadEmergencyData = async () => {
        try {
          const contacts = await AsyncStorage.getItem('emergencyContacts');
          const medical = await AsyncStorage.getItem('medicalRecord');
          if (contacts) setEmergencyContacts(JSON.parse(contacts));
          if (medical) setMedicalRecord(JSON.parse(medical));
        } catch (e) {
          console.error('Error loading emergency data:', e);
        }
      };
      loadEmergencyData();

   const checkPermissions = async () => {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permiso requerido', 'Se necesitan permisos para notificaciones.');
  }

  const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
  if (fgStatus !== 'granted') {
    Alert.alert('Error', 'Permiso para ubicación en primer plano denegado.');
    return;
  }

  const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
  if (bgStatus !== 'granted') {
    Alert.alert('Error', 'Permiso para ubicación en segundo plano denegado.');
    return;
  }
};
      checkPermissions();

      return () => {
        unsubscribeSensors(subscriptionAcc, subscriptionGyro, setSubscriptionAcc, setSubscriptionGyro);
        if (emergencyTimer) clearTimeout(emergencyTimer);
      };
    } catch (error) {
      console.error('Error in useEffect:', error);
    }
  }, []);

  useEffect(() => {
    const configureNotifications = async () => {
      if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') {
          Alert.alert('Error', 'No se concedieron permisos para notificaciones.');
          return;
        }
      }

      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      // Configurar categoría para acciones en la notificación
      await Notifications.setNotificationCategoryAsync('emergency', [
        {
          identifier: 'cancel',
          buttonTitle: 'Cancelar',
          options: {
            isDestructive: true,
            isAuthenticationRequired: false, // No requiere desbloqueo
          },
        },
      ]);
    };

    configureNotifications();
  }, []);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const action = response.actionIdentifier;
      if (action === 'cancel' && emergencyTimer) {
        clearTimeout(emergencyTimer);
        setEmergencyTimer(null);
        Vibration.cancel();
        console.log('Notificación de emergencia cancelada');
        Notifications.dismissAllNotificationsAsync();
      }
    });

    return () => subscription.remove();
  }, [emergencyTimer]);

  const formatMedicalInfo = (clasificacion) => {
    return `
Emergencia detectada: Se ha detectado ${clasificacion === 'caída de teléfono' ? 'una caída' : 'un accidente'}.
Información médica:
- Grupo sanguíneo: ${medicalRecord.bloodType || 'No especificado'}
- Alergias: ${medicalRecord.allergies || 'Ninguna'}
- Medicamentos: ${medicalRecord.medications || 'Ninguno'}
- Condiciones médicas: ${medicalRecord.medicalConditions || 'Ninguna'}
- Altura: ${medicalRecord.height || 'No especificada'} cm
- Peso: ${medicalRecord.weight || 'No especificado'} kg
- Médico: ${medicalRecord.doctor || 'No especificado'}
- Seguro: ${medicalRecord.insurance || 'No especificado'}
- Condiciones: ${[
  medicalRecord.hasDiabetes ? 'Diabetes' : '',
  medicalRecord.hasHypertension ? 'Hipertensión' : '',
  medicalRecord.hasHeartConditions ? 'Problemas cardíacos' : ''
].filter(Boolean).join(', ') || 'Ninguna'}
- Info adicional: ${medicalRecord.otherInfo || 'Ninguna'}
Por favor, contacte inmediatamente.
    `.trim();
  };

  const sendEmergencyNotifications = async (clasificacion) => {
    try {
      const isSMSSupported = await SMS.isAvailableAsync();
      if (!isSMSSupported) {
        Alert.alert('Error', 'El envío de SMS no está disponible en este dispositivo.');
        return;
      }

      if (emergencyContacts.length === 0) {
        Alert.alert('Error', 'No hay contactos de emergencia configurados.');
        return;
      }

      const message = formatMedicalInfo(clasificacion);
      const phoneNumbers = emergencyContacts.map(contact => contact.phone);

      if (phoneNumbers.length > 0) {
        if (Platform.OS === 'android') {
          const { result } = await SMS.sendSMSAsync(phoneNumbers, message);
          if (result === 'sent') {
            console.log('SMS enviados a:', phoneNumbers);
          } else {
            console.log('SMS no enviados, abriendo app de mensajes:', result);
            Alert.alert('Advertencia', 'No se pudieron enviar los SMS automáticamente. Abriendo app de mensajes.');
          }
        } else {
          Linking.openURL(`sms:${phoneNumbers.join(';')}&body=${encodeURIComponent(message)}`);
          console.log('Abriendo app de Mensajes para SMS a:', phoneNumbers);
          Alert.alert('Acción requerida', 'Por favor, confirma el envío de SMS en la app de Mensajes.');
        }
      }

      if (emergencyContacts.length > 0) {
        try {
          await Linking.openURL(`tel:${emergencyContacts[0].phone}`);
          console.log(`Iniciando llamada a ${emergencyContacts[0].name} en ${emergencyContacts[0].phone}`);
          if (Platform.OS === 'ios') {
            Alert.alert('Acción requerida', 'Por favor, confirma la llamada en el marcador telefónico.');
          }
        } catch (error) {
          console.error(`Error iniciando llamada a ${emergencyContacts[0].phone}:`, error);
          Alert.alert('Error', 'No se pudo iniciar la llamada automáticamente.');
        }
      }
    } catch (error) {
      console.error('Error en notificaciones de emergencia:', error);
      Alert.alert('Error', 'No se pudieron enviar las notificaciones de emergencia');
    }
  };

  const handleEmergency = async (clasificacion) => {
    if (emergencyContacts.length === 0) {
      Alert.alert('Error', 'No hay contactos de emergencia configurados.');
      return;
    }

    // Activar vibración y notificación háptica
    Vibration.vibrate([500, 500, 500, 500], true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    // Mostrar notificación superpuesta con ficha médica (aparece en pantalla bloqueada)
    const clasificacionText = clasificacion === 'caída de teléfono' ? 'una caída' : 'un accidente';
    const content = {
      title: '¡Emergencia detectada!',
      body: `Se ha detectado ${clasificacionText}. Tienes 5 segundos para cancelar.\n\n${formatMedicalInfo(clasificacion)}`,
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.MAX,
      categoryIdentifier: 'emergency',
      data: { clasificacion },
    };
    const trigger = null; // Inmediata
    const identifier = await Notifications.scheduleNotificationAsync({ content, trigger });

    // Timer para enviar notificaciones a contactos
    const timer = setTimeout(async () => {
      await sendEmergencyNotifications(clasificacion);
      Vibration.cancel();
      await Notifications.dismissNotificationAsync(identifier);
    }, 5000);

    setEmergencyTimer(timer);
  };

  const toggleMonitoringHandler = async () => {
    console.log('toggleMonitoringHandler called - isMonitoring:', isMonitoring);
    
    if (isMonitoring) {
      console.log('Stopping monitoring...');
      unsubscribeSensors(subscriptionAcc, subscriptionGyro, setSubscriptionAcc, setSubscriptionGyro);
      if (await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      }
      setIsMonitoring(false);
      if (emergencyTimer) {
        clearTimeout(emergencyTimer);
        Vibration.cancel();
      }
      setEmergencyTimer(null);
      await AsyncStorage.removeItem('previousSpeed');
      await AsyncStorage.removeItem('previousTimestamp');
      console.log('Monitoring stopped');
    } else {
      console.log('Starting monitoring...');
      // Solicitar permisos para ubicación
      try {
        const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
        if (fgStatus !== 'granted') {
          console.log('Foreground location permission denied, continuing with sensors only');
          Alert.alert('Advertencia', 'Permiso para ubicación denegado. Solo se usarán sensores de movimiento.');
        } else {
          const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
          if (bgStatus !== 'granted') {
            console.log('Background location permission denied, continuing with foreground only');
            Alert.alert('Advertencia', 'Permiso para ubicación en segundo plano denegado. Funcionalidad limitada.');
          } else {
            // Iniciar actualizaciones de ubicación en background solo si tenemos permisos
            await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
              accuracy: Location.Accuracy.Highest,
              timeInterval: 1000,
              distanceInterval: 0,
              deferredUpdatesInterval: 1000,
              activityType: Location.ActivityType.AutomotiveNavigation,
              showsBackgroundLocationIndicator: true,
              foregroundService: {
                notificationTitle: 'Detección activa',
                notificationBody: 'La app está monitoreando en segundo plano para detectar accidentes.',
                notificationColor: '#FF0000',
              },
            });
            console.log('Background location updates started');
          }
        }
      } catch (error) {
        console.error('Error requesting location permissions:', error);
        Alert.alert('Advertencia', 'Error con permisos de ubicación. Continuando solo con sensores.');
      }

      // Iniciar sensores (esto siempre debería funcionar)
      try {
        console.log('Starting sensor subscriptions...');
        subscribeSensors(
          setAccelerometerData,
          setGyroscopeData,
          accelerometerData,
          gyroscopeData,
          processSensorData,
          lastProcessedTime,
          setLastProcessedTime,
          (accData, gyroData, timestamp) => {
            const classificationResult = classifyMovement(
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
            );
            if (classificationResult?.clasificacion === 'caída de teléfono' || classificationResult?.clasificacion === 'accidente vehicular') {
              handleEmergency(classificationResult.clasificacion);
            }
            return classificationResult;
          },
          serverStatus,
          setLoading,
          setResult,
          setDataHistory,
          setSubscriptionAcc,
          setSubscriptionGyro
        );
        setIsMonitoring(true);
        setResult(null);
        console.log('Monitoring started successfully');
      } catch (error) {
        console.error('Error starting sensors:', error);
        Alert.alert('Error', 'No se pudieron iniciar los sensores: ' + error.message);
      }
    }
  };

  const clearHistoryHandler = () => {
    setDataHistory([]);
    setResult(null);
  };

  const sendFeedbackHandler = async (eventoId, correctTipo) => {
    console.log('Calling sendFeedback with:', { eventoId, correctTipo });
    try {
      await sendFeedback(eventoId, correctTipo, setFeedbackLoading, serverStatus, marcarNotificado, fetchPendingEvents, setPendingEvents);
      console.log('Feedback sent successfully');
    } catch (error) {
      console.error('Error in sendFeedbackHandler:', error);
    }
  };

  const saveEmergencyData = async () => {
    try {
      const testContacts = [
        { name: 'Contacto1', phone: '+123456789', id: '1' },
        { name: 'Contacto2', phone: '+987654321', id: '2' },
        { name: 'Contacto3', phone: '+112233445', id: '3' }
      ];
      const testMedical = {
        bloodType: 'O+',
        allergies: 'Ninguna',
        medications: 'Ninguno',
        medicalConditions: 'Ninguna',
        emergencyContact: '',
        insurance: '',
        doctor: '',
        height: '170',
        weight: '70',
        hasDiabetes: false,
        hasHypertension: false,
        hasHeartConditions: false,
        otherInfo: ''
      };
      await AsyncStorage.setItem('emergencyContacts', JSON.stringify(testContacts));
      await AsyncStorage.setItem('medicalRecord', JSON.stringify(testMedical));
      setEmergencyContacts(testContacts);
      setMedicalRecord(testMedical);
      Alert.alert('Datos de emergencia guardados');
    } catch (e) {
      console.error('Error saving emergency data:', e);
    }
  };

  const manualFetchPendingEvents = async () => {
    console.log('Manually fetching pending events...');
    await fetchPendingEvents(setPendingEvents, serverStatus);
    console.log('Pending events:', pendingEvents);
  };

  const testFeedback = async () => {
    console.log('Testing feedback...');
    await sendFeedbackHandler('test-id', 'normal');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Detección de Caídas y Accidentes</Text>
        <Text style={styles.subtitle}>Sistema de monitoreo en tiempo real</Text>
        
        <View style={{ marginBottom: 16 }}>
          <Button 
            title={showConfig ? "Ocultar Configuración" : "Configurar Contactos y Ficha Médica"} 
            onPress={() => setShowConfig(!showConfig)} 
          />
        </View>

        {showConfig && <EmergencyConfig />}

       {/*<Button title="Set Test Data" onPress={saveEmergencyData} />
        <Button title="Fetch Pending Events" onPress={manualFetchPendingEvents} />
        <Button title="Test Feedback" onPress={testFeedback} />*/}
        <ServerStatus serverStatus={serverStatus} />
        <SensorDisplay accelerometerData={accelerometerData} gyroscopeData={gyroscopeData} />
        <MonitorControls isMonitoring={isMonitoring} toggleMonitoring={toggleMonitoringHandler} clearHistory={clearHistoryHandler} serverStatus={serverStatus} />
        <ResultDisplay result={result} loading={loading} medicalRecord={medicalRecord} />
       {/* <PendingEvents
          pendingEvents={pendingEvents}
          feedbackLoading={feedbackLoading}
          sendFeedback={sendFeedbackHandler}
        />
        <HistoryList dataHistory={dataHistory} />
        <Instructions />*/}
      </ScrollView>
    </SafeAreaView>
  );
};

export default App;