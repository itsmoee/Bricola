import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapViewNative, { Callout, Marker, Region } from 'react-native-maps';
import { Language, ServiceRequest } from '../types';

interface MapViewProps {
  requests: ServiceRequest[];
  onSelectRequest: (request: ServiceRequest) => void;
  lang: Language;
  center?: { lat: number; lng: number };
}

export const MapView: React.FC<MapViewProps> = ({ requests, onSelectRequest, lang, center }) => {
  const initialRegion: Region = {
    latitude: center?.lat ?? 32.9297,
    longitude: center?.lng ?? 10.4518,
    latitudeDelta: 0.25,
    longitudeDelta: 0.25
  };

  const geoRequests = requests.filter(r => r.coordinates?.lat && r.coordinates?.lng);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{lang === 'AR' ? 'خريطة الطلبات' : 'Requests Map'}</Text>
      {geoRequests.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.body}>{lang === 'AR' ? 'لا توجد طلبات بإحداثيات' : 'No requests with coordinates'}</Text>
        </View>
      ) : (
        <MapViewNative style={styles.map} initialRegion={initialRegion}>
          {geoRequests.map(req => {
            if (!req.coordinates) {
              return null;
            }
            return (
              <Marker
                key={req.id}
                coordinate={{ latitude: req.coordinates.lat, longitude: req.coordinates.lng }}
                pinColor={req.urgency === 'HIGH' ? '#DC2626' : '#2563EB'}
              >
                <Callout onPress={() => onSelectRequest(req)}>
                  <View style={styles.callout}>
                    <Text style={styles.calloutTitle}>{req.serviceType}</Text>
                    <Text style={styles.calloutMeta}>📍 {req.location}</Text>
                    <Text style={styles.calloutMeta}>⚡ {req.urgency || 'MEDIUM'}</Text>
                    <Text style={styles.calloutBtn}>{lang === 'AR' ? 'عرض التفاصيل' : 'Open Details'}</Text>
                  </View>
                </Callout>
              </Marker>
            );
          })}
        </MapViewNative>
      )}

      <Text style={styles.note}>⚠️ NEEDS NATIVE MODULE: react-native-maps requires native build (not plain Expo Go).</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 250,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    backgroundColor: '#F8FAFC'
  },
  title: { fontSize: 16, fontWeight: '900', color: '#0F172A', marginBottom: 8 },
  body: { fontSize: 12, color: '#475569', marginBottom: 6 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 180 },
  map: { width: '100%', height: 220, borderRadius: 12 },
  callout: { minWidth: 120, maxWidth: 200, gap: 2 },
  calloutTitle: { fontWeight: '900', color: '#0F172A' },
  calloutMeta: { color: '#475569', fontSize: 11 },
  calloutBtn: { color: '#2563EB', fontWeight: '800', fontSize: 11 },
  note: { marginTop: 8, fontSize: 10, color: '#64748B', fontWeight: '600' }
});
