import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, SafeAreaView, TouchableOpacity, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

import pecesDatos from './src/data/peces.json';
import bichosDatos from './src/data/bichos.json';
import submarinaDatos from './src/data/submarina.json';

export default function App() {
  const [pestañaActual, setPestañaActual] = useState('peces');
  const [filtroSeleccionado, setFiltroSeleccionado] = useState('todos');
  const [hemisferio, setHemisferio] = useState('norte');
  const [peces, setPeces] = useState([]);
  const [bichos, setBichos] = useState([]);
  const [submarina, setSubmarina] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Cálculos de fecha para la lógica de prioridad
  const mesActual = new Date().getMonth() + 1;
  const mesSiguiente = mesActual === 12 ? 1 : mesActual + 1;

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const cPeces = await AsyncStorage.getItem('@tracker_peces');
        const cBichos = await AsyncStorage.getItem('@tracker_bichos');
        const cSub = await AsyncStorage.getItem('@tracker_submarina_v3');
        const cHemisferio = await AsyncStorage.getItem('@tracker_hemisferio');

        setPeces(cPeces ? JSON.parse(cPeces) : pecesDatos.map(p => ({ ...p, obtenido: false })));
        setBichos(cBichos ? JSON.parse(cBichos) : bichosDatos.map(b => ({ ...b, obtenido: false })));
        setSubmarina(cSub ? JSON.parse(cSub) : submarinaDatos.map(s => ({ ...s, obtenido: false })));
        if (cHemisferio) setHemisferio(cHemisferio);
      } catch (e) { console.error(e); } finally { setCargando(false); }
    };
    cargarDatos();
  }, []);

  useEffect(() => {
    if (!cargando) {
      AsyncStorage.setItem('@tracker_peces', JSON.stringify(peces));
      AsyncStorage.setItem('@tracker_bichos', JSON.stringify(bichos));
      AsyncStorage.setItem('@tracker_submarina_v3', JSON.stringify(submarina));
      AsyncStorage.setItem('@tracker_hemisferio', hemisferio);
    }
  }, [peces, bichos, submarina, hemisferio]);

  const toggleCaptura = (id) => {
    const setF = (prev) => prev.map(item => item.id === id ? { ...item, obtenido: !item.obtenido } : item);
    if (pestañaActual === 'peces') setPeces(setF);
    else if (pestañaActual === 'bichos') setBichos(setF);
    else setSubmarina(setF);
  };

  const listaActiva = pestañaActual === 'peces' ? peces : (pestañaActual === 'bichos' ? bichos : submarina);

  // 1. Calcular Progreso Dinámico
  const totalActivo = listaActiva.length;
  const capturadosActivo = listaActiva.filter(item => item.obtenido).length;
  const porcentaje = totalActivo === 0 ? 0 : Math.round((capturadosActivo / totalActivo) * 100);

  // 2. Procesar Datos: Identificar última oportunidad, Filtrar y Ordenar
  const datosProcesados = listaActiva.map(item => {
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

        <TouchableOpacity
          style={styles.hemisphereBtn}
          onPress={() => setHemisferio(hemisferio === 'norte' ? 'sur' : 'norte')}
        >
          <Text style={styles.hemisphereText}>
            {hemisferio === 'norte' ? '🌍 Hemisferio: Norte' : '🌍 Hemisferio: Sur'}
          </Text>
        </TouchableOpacity>

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
        {datosProcesados.map(item => (
          <TouchableOpacity key={item.id} style={styles.card} onPress={() => toggleCaptura(item.id)}>
            <View style={styles.info}>
              <View style={styles.titleRow}>
                <Text style={styles.name}>{item.nombre}</Text>
                {/* 3. Indicador condicional si la especie se va pronto y aún no la capturan */}
                {item.seVa && !item.obtenido && (
                  <Text style={styles.alertText}> ⚠️ ¡Se va este mes!</Text>
                )}
              </View>
              <Text style={styles.details}>{item.ubicacion} • {item.horario} • {item.sombra}</Text>
            </View>
            <View style={[styles.status, item.obtenido ? styles.collected : styles.missing]}>
              <Text style={styles.statusText}>{item.obtenido ? '✔' : '✖'}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerTab} onPress={() => setPestañaActual('peces')}><Text>🐟 Peces</Text></TouchableOpacity>
        <TouchableOpacity style={styles.footerTab} onPress={() => setPestañaActual('bichos')}><Text>🦋 Bichos</Text></TouchableOpacity>
        <TouchableOpacity style={styles.footerTab} onPress={() => setPestañaActual('submarina')}><Text>🤿 Buceo</Text></TouchableOpacity>
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
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 15, marginBottom: 10, flexDirection: 'row', alignItems: 'center', elevation: 3, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1 },
  info: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  name: { fontSize: 16, fontWeight: 'bold' },
  alertText: { fontSize: 12, color: '#D32F2F', fontWeight: 'bold', marginLeft: 5 },
  details: { fontSize: 13, color: '#555', marginTop: 3 },
  status: { padding: 10, borderRadius: 20 },
  collected: { backgroundColor: '#dfffb5' },
  missing: { backgroundColor: '#ffcdd2' },
  footer: { flexDirection: 'row', padding: 15, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#eee' },
  footerTab: { flex: 1, alignItems: 'center' }
});