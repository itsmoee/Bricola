import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { ServiceRequest, Language, UserRole } from '../types';

// Fix for Leaflet default icon issues in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapViewProps {
  requests: ServiceRequest[];
  onSelectRequest: (request: ServiceRequest) => void;
  lang: Language;
  center?: { lat: number; lng: number };
}

const SetMapCenter: React.FC<{ center: { lat: number; lng: number } }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng]);
  }, [center, map]);
  return null;
};

export const MapView: React.FC<MapViewProps> = ({ requests, onSelectRequest, lang, center }) => {
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(center || { lat: 32.9297, lng: 10.4518 }); // Default to Tataouine, Tunisia

  return (
    <div className="w-full h-full relative rounded-3xl overflow-hidden shadow-inner border border-gray-100">
      <MapContainer 
        center={[mapCenter.lat, mapCenter.lng]} 
        zoom={11} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {center && <SetMapCenter center={center} />}
        {requests.map(req => {
           if (!req.coordinates) return null;
           return (
             <Marker 
               key={req.id} 
               position={[req.coordinates.lat, req.coordinates.lng]}
               eventHandlers={{
                 click: () => onSelectRequest(req)
               }}
             >
               <Popup>
                 <div className="p-2 space-y-1 text-right">
                    <h4 className="font-bold text-gray-800">{req.serviceType}</h4>
                    <p className="text-[10px] text-gray-400 font-bold mb-1">📍 {req.location}</p>
                    <p className={`text-[8px] font-black uppercase ${
                      req.urgency === 'HIGH' ? 'text-red-500' : 'text-blue-500'
                    }`}>
                       {req.urgency || 'NORMAL'}
                    </p>
                    <button 
                      onClick={() => onSelectRequest(req)}
                      className="w-full mt-2 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-black"
                    >
                      {lang === 'AR' ? 'عرض التفاصيل' : 'Details'}
                    </button>
                 </div>
               </Popup>
             </Marker>
           );
        })}
      </MapContainer>
    </div>
  );
};
