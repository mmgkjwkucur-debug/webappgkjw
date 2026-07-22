"use client";

import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { divIcon } from "leaflet";
import "leaflet/dist/leaflet.css";

type JemaatPoint = {
  id: string;
  nama: string;
  lat: number;
  lng: number;
  nik?: string;
  alamat?: string;
  nomorHp?: string;
  email?: string;
  jenisKelamin?: string;
  kategoriUsia?: string;
  statusPerkawinan?: string;
};

type JemaatMapProps = {
  points: JemaatPoint[];
};

function FitBounds({ points }: { points: JemaatPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return;

    const bounds: [number, number][] = points.map((point) => [point.lat, point.lng]);

    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 13);
      return;
    }

    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
  }, [map, points]);

  return null;
}

export default function JemaatMap({ points }: JemaatMapProps) {
  const markerIcon = divIcon({
    html: `
      <div style="display:flex;align-items:center;justify-content:center;">
        <svg width="34" height="42" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M17 0C7.61 0 0 7.61 0 17c0 13.2 17 25 17 25s17-11.8 17-25C34 7.61 26.39 0 17 0Z" fill="#1f6f5b" />
          <circle cx="17" cy="17" r="8" fill="#fff" />
        </svg>
      </div>
    `,
    className: "",
    iconSize: [34, 42],
    iconAnchor: [17, 42],
  });

  return (
    <MapContainer center={[-6.2, 106.8]} zoom={10} scrollWheelZoom={false} style={{ height: "320px", width: "100%" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds points={points} />
      {points.map((point) => (
        <Marker key={point.id} position={[point.lat, point.lng]} icon={markerIcon}>
          <Popup>
            <div style={{ minWidth: 220, display: "grid", gap: 6 }}>
              <strong style={{ fontSize: "0.95rem" }}>{point.nama}</strong>
              <div><strong>NIK:</strong> {point.nik ?? "-"}</div>
              <div><strong>Kategori:</strong> {point.kategoriUsia ?? "-"}</div>
              <div><strong>Jenis kelamin:</strong> {point.jenisKelamin ?? "-"}</div>
              <div><strong>Alamat:</strong> {point.alamat ?? "-"}</div>
              <div><strong>HP:</strong> {point.nomorHp ?? "-"}</div>
              <div><strong>Email:</strong> {point.email ?? "-"}</div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
