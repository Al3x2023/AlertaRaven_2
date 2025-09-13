import { Platform, Alert, PermissionsAndroid } from 'react-native';
import * as SMS from 'expo-sms';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Función para solicitar permisos críticos en Android
export const requestCriticalPermissions = async () => {
  if (Platform.OS !== 'android') return true;

  try {
    const permissions = [
      PermissionsAndroid.PERMISSIONS.CALL_PHONE,
      PermissionsAndroid.PERMISSIONS.SEND_SMS,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
      PermissionsAndroid.PERMISSIONS.FOREGROUND_SERVICE,
    ];

    const granted = await PermissionsAndroid.requestMultiple(permissions);
    
    const allGranted = Object.values(granted).every(
      permission => permission === PermissionsAndroid.RESULTS.GRANTED
    );

    if (!allGranted) {
      Alert.alert(
        'Permisos Requeridos',
        'La app necesita permisos para funcionar correctamente en emergencias. Por favor, concede todos los permisos.',
        [{ text: 'OK' }]
      );
    }

    return allGranted;
  } catch (error) {
    console.error('Error requesting permissions:', error);
    return false;
  }
};

// Función para enviar SMS automáticamente (Android nativo)
export const sendAutomaticSMS = async (phoneNumbers, message) => {
  if (Platform.OS !== 'android') {
    // En iOS, solo podemos abrir la app de mensajes
    const url = `sms:${phoneNumbers.join(';')}&body=${encodeURIComponent(message)}`;
    await Linking.openURL(url);
    return false;
  }

  try {
    // Verificar permisos
    const hasPermission = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.SEND_SMS
    );

    if (!hasPermission) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.SEND_SMS
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        throw new Error('Permiso SMS denegado');
      }
    }

    // Usar módulo nativo para envío automático
    const { NativeModules } = require('react-native');
    
    if (NativeModules.AutoSMSModule) {
      for (const phoneNumber of phoneNumbers) {
        await NativeModules.AutoSMSModule.sendSMS(phoneNumber, message);
      }
      return true;
    } else {
      // Fallback: usar expo-sms
      const result = await SMS.sendSMSAsync(phoneNumbers, message);
      return result.result === 'sent';
    }
  } catch (error) {
    console.error('Error sending automatic SMS:', error);
    return false;
  }
};

// Función para hacer llamada automática
export const makeAutomaticCall = async (phoneNumber) => {
  try {
    if (Platform.OS === 'android') {
      // Verificar permisos
      const hasPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.CALL_PHONE
      );

      if (!hasPermission) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CALL_PHONE
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          throw new Error('Permiso de llamada denegado');
        }
      }

      // Usar módulo nativo para llamada automática
      const { NativeModules } = require('react-native');
      
      if (NativeModules.AutoCallModule) {
        await NativeModules.AutoCallModule.makeCall(phoneNumber);
        return true;
      }
    }

    // Fallback: abrir marcador
    await Linking.openURL(`tel:${phoneNumber}`);
    return false;
  } catch (error) {
    console.error('Error making automatic call:', error);
    return false;
  }
};

// Función principal de emergencia
export const handleEmergencyAutomatic = async (clasificacion) => {
  try {
    // Cargar contactos de emergencia
    const contactsJson = await AsyncStorage.getItem('emergencyContacts');
    const contacts = contactsJson ? JSON.parse(contactsJson) : [];
    
    if (contacts.length === 0) {
      console.log('No hay contactos de emergencia configurados');
      return;
    }

    // Cargar información médica
    const medicalJson = await AsyncStorage.getItem('medicalRecord');
    const medical = medicalJson ? JSON.parse(medicalJson) : {};

    // Crear mensaje de emergencia
    const message = createEmergencyMessage(clasificacion, medical);
    
    // Obtener números de teléfono
    const phoneNumbers = contacts.slice(0, 3).map(contact => contact.phone);
    
    console.log('Enviando emergencia automática:', { clasificacion, phoneNumbers });

    // Enviar SMS automáticamente
    const smsSuccess = await sendAutomaticSMS(phoneNumbers, message);
    console.log('SMS enviados automáticamente:', smsSuccess);

    // Hacer llamada automática al primer contacto
    if (phoneNumbers.length > 0) {
      const callSuccess = await makeAutomaticCall(phoneNumbers[0]);
      console.log('Llamada automática iniciada:', callSuccess);
    }

    return { smsSuccess, callSuccess: phoneNumbers.length > 0 };
  } catch (error) {
    console.error('Error en emergencia automática:', error);
    return { smsSuccess: false, callSuccess: false };
  }
};

// Función para crear mensaje de emergencia
const createEmergencyMessage = (clasificacion, medical) => {
  const eventType = clasificacion === 'caída de teléfono' ? 'CAÍDA' : 'ACCIDENTE';
  
  return `🚨 EMERGENCIA DETECTADA 🚨
Tipo: ${eventType}
Hora: ${new Date().toLocaleString()}

INFORMACIÓN MÉDICA:
- Sangre: ${medical.bloodType || 'No especificado'}
- Alergias: ${medical.allergies || 'Ninguna'}
- Medicamentos: ${medical.medications || 'Ninguno'}
- Condiciones: ${medical.medicalConditions || 'Ninguna'}
- Altura: ${medical.height || 'N/A'} cm
- Peso: ${medical.weight || 'N/A'} kg
- Médico: ${medical.doctor || 'No especificado'}
- Seguro: ${medical.insurance || 'No especificado'}

¡CONTACTAR INMEDIATAMENTE!`;
};

// Función para solicitar exclusión de optimización de batería
export const requestBatteryOptimizationExemption = async () => {
  if (Platform.OS !== 'android') return;

  try {
    const { NativeModules } = require('react-native');
    
    if (NativeModules.BatteryOptimizationModule) {
      await NativeModules.BatteryOptimizationModule.requestExemption();
    }
  } catch (error) {
    console.error('Error requesting battery optimization exemption:', error);
  }
};