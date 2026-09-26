import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, TouchableOpacity, StatusBar, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

import pecesDatos from './src/data/peces.json';
import bichosDatos from './src/data/bichos.json';
import submarinaDatos from './src/data/submarina.json';
import arteDatos from './src/data/arte.json';

export default function App() {
  const [pestañaActual, setPestañaActual] = useState('peces');
  const [filtroSeleccionado, setFiltroSeleccionado] = useState('todos');
  const [hemisferio, setHemisferio] = useState('norte');
  const [peces, setPeces] = useState([]);
  const [bichos, setBichos] = useState([]);
  const [submarina, setSubmarina] = useState([]);
  const [arte, setArte] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [idExpandido, setIdExpandido] = useState(null);

  // Cálculos de fecha para la lógica de prioridad
  const mesActual = new Date().getMonth() + 1;
  const mesSiguiente = mesActual === 12 ? 1 : mesActual + 1;

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        // 1. Actualizamos los nombres de las llaves aquí
        const cPeces = await AsyncStorage.getItem('@tracker_peces_v4');
        const cBichos = await AsyncStorage.getItem('@tracker_bichos_v4');
        const cSub = await AsyncStorage.getItem('@tracker_submarina_v6');
        const cArte = await AsyncStorage.getItem('@tracker_arte_v1');
        const cHemisferio = await AsyncStorage.getItem('@tracker_hemisferio');

        setPeces(cPeces ? JSON.parse(cPeces) : pecesDatos.map(p => ({ ...p, obtenido: false })));
        setBichos(cBichos ? JSON.parse(cBichos) : bichosDatos.map(b => ({ ...b, obtenido: false })));
        setSubmarina(cSub ? JSON.parse(cSub) : submarinaDatos.map(s => ({ ...s, obtenido: false })));
        setArte(cArte ? JSON.parse(cArte) : arteDatos.map(a => ({ ...a, obtenido: false })));
        if (cHemisferio) setHemisferio(cHemisferio);
      } catch (e) { console.error(e); } finally { setCargando(false); }
    };
    cargarDatos();
  }, []);

  useEffect(() => {
    if (!cargando) {
      AsyncStorage.setItem('@tracker_peces_v4', JSON.stringify(peces));
      AsyncStorage.setItem('@tracker_bichos_v4', JSON.stringify(bichos));
      AsyncStorage.setItem('@tracker_submarina_v6', JSON.stringify(submarina));
      AsyncStorage.setItem('@tracker_arte_v1', JSON.stringify(arte));
      AsyncStorage.setItem('@tracker_hemisferio', hemisferio);
    }
  }, [peces, bichos, submarina, arte, hemisferio]);

  const toggleCaptura = (id) => {
    const setF = (prev) => prev.map(item => item.id === id ? { ...item, obtenido: !item.obtenido } : item);
    if (pestañaActual === 'peces') setPeces(setF);
    else if (pestañaActual === 'bichos') setBichos(setF);
    else if (pestañaActual === 'submarina') setSubmarina(setF);
    else setArte(setF);
  };

  const listaActiva = pestañaActual === 'peces'
    ? peces
    : pestañaActual === 'bichos'
      ? bichos
      : pestañaActual === 'submarina'
        ? submarina
        : arte;

  // 1. Calcular Progreso Dinámico
  const totalActivo = listaActiva.length;
  const capturadosActivo = listaActiva.filter(item => item.obtenido).length;
  const porcentaje = totalActivo === 0 ? 0 : Math.round((capturadosActivo / totalActivo) * 100);

  // 2. Procesar Datos: Identificar última oportunidad, Filtrar y Ordenar
  const datosProcesados = listaActiva.map(item => {
    if (pestañaActual === 'arte') {
      return { ...item, enTemporada: true, seVa: false };
    }

    const mesesDisponibles = hemisferio === 'norte' ? item.meses_norte : item.meses_sur;
    const enTemporada = mesesDisponibles.includes(mesActual);
    const seVa = enTemporada && !mesesDisponibles.includes(mesSiguiente);

    return { ...item, enTemporada, seVa };
  }).filter(item => {
    if (filtroSeleccionado === 'disponibles') return !item.obtenido && item.enTemporada;
    if (filtroSeleccionado === 'faltantes') return !item.obtenido;
    if (filtroSeleccionado === 'obtenidos') return item.obtenido;
    return true;
  }).sort((a, b) => {
    // Si 'a' se va y 'b' no, 'a' va primero
    if (a.seVa && !b.seVa) return -1;
    // Si 'b' se va y 'a' no, 'b' va primero
    if (!a.seVa && b.seVa) return 1;
    // En cualquier otro caso, mantienen el orden original
    return 0;
  });

  if (cargando) return <SafeAreaView style={styles.container}><Text>Cargando...</Text></SafeAreaView>;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header modificado con selector y barra de progreso */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ACNH Tracker</Text>

        {pestañaActual !== 'arte' && (
          <TouchableOpacity
            style={styles.hemisphereBtn}
            onPress={() => setHemisferio(hemisferio === 'norte' ? 'sur' : 'norte')}
          >
            <Text style={styles.hemisphereText}>
              {hemisferio === 'norte' ? '🌍 Hemisferio: Norte' : '🌍 Hemisferio: Sur'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Indicador de progreso del museo */}
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            Completado: {capturadosActivo} / {totalActivo} ({porcentaje}%)
          </Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${porcentaje}%` }]} />
          </View>
        </View>
      </View>

      <View style={styles.filterWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContainer}>
          {['todos', 'disponibles', 'faltantes', 'obtenidos'].map((f) => (
            <TouchableOpacity key={f} style={[styles.filterButton, filtroSeleccionado === f && styles.filterActive]} onPress={() => setFiltroSeleccionado(f)}>
              <Text style={filtroSeleccionado === f ? styles.textActive : styles.textInactive}>{f.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.contentContainer}>
        {datosProcesados.map(item => {
          const estaExpandido = idExpandido === item.id;

          return (
            <View key={item.id} style={styles.tarjeta}>
              {/* 1. Fila Principal (Siempre visible) */}
              <View style={styles.filaPrincipal}>

                {/* Nombre tocable para abrir/cerrar */}
                <TouchableOpacity
                  style={styles.areaNombre}
                  onPress={() => setIdExpandido(estaExpandido ? null : item.id)}
                >
                  <View style={styles.titleRow}>
                    <Text style={styles.textoNombre}>
                      {item.nombre}
                    </Text>
                    {item.seVa && !item.obtenido && (
                      <Text style={styles.alertText}> ⚠️ ¡Se va este mes!</Text>
                    )}
                  </View>
                </TouchableOpacity>

                {/* Botón de captura (tu diseño original) */}
                <TouchableOpacity
                  style={[styles.status, item.obtenido ? styles.collected : styles.missing]}
                  onPress={() => toggleCaptura(item.id)}
                >
                  <Text style={styles.statusText}>{item.obtenido ? '✔' : '✖'}</Text>
                </TouchableOpacity>
              </View>

              {/* 2. Zona Desplegable (Solo visible si le diste clic) */}
              {estaExpandido && (
                <View style={styles.detalles}>
                  {item.imagen ? (
                    <Image
                      source={{ uri: item.imagen }}
                      style={styles.imagenTarjeta}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.cajaGris}>
                      <Text style={styles.emojiCamara}>📷</Text>
                    </View>
                  )}

                  {pestañaActual === 'arte' ? (
                    <Text style={styles.textoInfo}>
                      🏛️ {item.obra_real} • {item.autor} ({item.tipo})
                    </Text>
                  ) : (
                    <Text style={styles.textoInfo}>
                      📍 {item.ubicacion} • {item.horario} • {item.sombra}
                    </Text>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerTab} onPress={() => setPestañaActual('peces')}><Text>🐟 Peces</Text></TouchableOpacity>
        <TouchableOpacity style={styles.footerTab} onPress={() => setPestañaActual('bichos')}><Text>🦋 Bichos</Text></TouchableOpacity>
        <TouchableOpacity style={styles.footerTab} onPress={() => setPestañaActual('submarina')}><Text>🤿 Buceo</Text></TouchableOpacity>
        <TouchableOpacity style={styles.footerTab} onPress={() => setPestañaActual('arte')}><Text>🏛️ Arte</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffefd2', paddingTop: Constants.statusBarHeight },
  header: { padding: 20, backgroundColor: '#ffb2a6', alignItems: 'center', borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#444', marginBottom: 10 },
  hemisphereBtn: { backgroundColor: '#fff', paddingHorizontal: 15, paddingVertical: 6, borderRadius: 15, marginBottom: 15, elevation: 2 },
  hemisphereText: { fontSize: 13, fontWeight: 'bold', color: '#555' },
  progressContainer: { width: '100%', alignItems: 'center' },
  progressText: { fontSize: 12, color: '#444', marginBottom: 5, fontWeight: 'bold' },
  progressBarBg: { width: '100%', height: 10, backgroundColor: '#fff', borderRadius: 5, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#4CAF50' },
  filterWrapper: { height: 60, justifyContent: 'center' },
  filterContainer: { paddingHorizontal: 10, alignItems: 'center' },
  filterButton: { paddingHorizontal: 15, paddingVertical: 8, backgroundColor: '#fff', borderRadius: 20, marginHorizontal: 5, borderWidth: 1, borderColor: '#FABFB6' },
  filterActive: { backgroundColor: '#B6F1FA' },
  textActive: { color: '#000', fontWeight: 'bold' },
  textInactive: { color: '#666' },
  contentContainer: { padding: 15 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  alertText: { fontSize: 12, color: '#D32F2F', fontWeight: 'bold', marginLeft: 5 },
  status: { padding: 10, borderRadius: 20 },
  collected: { backgroundColor: '#dfffb5' },
  missing: { backgroundColor: '#ffcdd2' },
  footer: { flexDirection: 'row', padding: 15, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#eee' },

  // 👇 AQUÍ ESTABA EL ERROR: Faltaba la coma al final de esta línea
  footerTab: { flex: 1, alignItems: 'center' },

  tarjeta: {
    backgroundColor: '#fff',
    borderRadius: 15,
    marginBottom: 10,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    overflow: 'hidden'
  },
  filaPrincipal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
  },
  areaNombre: {
    flex: 1,
    paddingRight: 10,
  },
  textoNombre: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#444',
  },
  detalles: {
    borderTopWidth: 1,
    borderColor: '#eee',
    padding: 15,
    alignItems: 'center',
    backgroundColor: '#fafafa'
  },
  imagenTarjeta: {
    width: '100%',
    height: 250, // Más alto para que luzcan las fotos que subiste
    marginBottom: 10,
  },
  cajaGris: {
    width: '100%',
    height: 200,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginBottom: 10,
  },
  emojiCamara: {
    fontSize: 40,
  },
  textoInfo: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    fontWeight: '500'
  }
});