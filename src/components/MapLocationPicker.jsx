import { useState, useEffect, useRef } from "react";
import L from "leaflet";
import { reverseGeocode } from "../services/weatherService";

// Fix Leaflet default marker icons if required
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom styled pin for crops
const createCropPin = (emoji = "🌱") => {
  return L.divIcon({
    className: "fsl-map-marker",
    html: `
      <div style="
        background: linear-gradient(135deg, #1a9c3e 0%, #157a30 100%);
        border: 2.5px solid #ffffff;
        box-shadow: 0 6px 16px rgba(0,0,0,0.35);
        width: 34px;
        height: 34px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="transform: rotate(45deg); font-size: 16px;">${emoji}</span>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -32],
  });
};

const PRESET_LOCATIONS = [
  { name: "Lwiro Agro Station, DR Congo", lat: -2.2472, lng: 28.8042 },
  { name: "Bukavu Basin, DR Congo", lat: -2.5083, lng: 28.8608 },
  { name: "Goma Volcanic Soil, DR Congo", lat: -1.6792, lng: 29.2228 },
  { name: "Kinshasa Valley, DR Congo", lat: -4.4419, lng: 15.2663 },
  { name: "Rift Valley Plains, Kenya", lat: -0.3031, lng: 36.0800 },
];

export default function MapLocationPicker({
  initialLocation,
  cropName = "Crop",
  cropEmoji = "🌱",
  onSave,
  onClose,
}) {
  const defaultLat = initialLocation?.lat ?? -2.2472;
  const defaultLng = initialLocation?.lng ?? 28.8042;
  const defaultName = initialLocation?.name ?? "Lwiro Field Alpha";

  const [lat, setLat] = useState(defaultLat);
  const [lng, setLng] = useState(defaultLng);
  const [locationName, setLocationName] = useState(defaultName);
  const [gpsStatus, setGpsStatus] = useState({ loading: false, msg: "", error: false });
  const [geocoding, setGeocoding] = useState(false);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: 14,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker([lat, lng], {
        draggable: true,
        icon: createCropPin(cropEmoji),
      }).addTo(map);

      marker.bindPopup(`<b>${cropName}</b><br/>${locationName}`).openPopup();

      // On map click: move marker
      map.on("click", async (e) => {
        const newLat = Number(e.latlng.lat.toFixed(5));
        const newLng = Number(e.latlng.lng.toFixed(5));
        setLat(newLat);
        setLng(newLng);
        marker.setLatLng([newLat, newLng]);

        setGeocoding(true);
        const autoName = await reverseGeocode(newLat, newLng);
        setLocationName(autoName);
        setGeocoding(false);
        marker.setPopupContent(`<b>${cropName}</b><br/>${autoName}`).openPopup();
      });

      // On marker drag
      marker.on("dragend", async (e) => {
        const position = marker.getLatLng();
        const newLat = Number(position.lat.toFixed(5));
        const newLng = Number(position.lng.toFixed(5));
        setLat(newLat);
        setLng(newLng);

        setGeocoding(true);
        const autoName = await reverseGeocode(newLat, newLng);
        setLocationName(autoName);
        setGeocoding(false);
        marker.setPopupContent(`<b>${cropName}</b><br/>${autoName}`).openPopup();
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;

      // Invalidate size after render to avoid tile display glitch in modal
      setTimeout(() => {
        map.invalidateSize();
      }, 250);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  // Update map and marker when lat/lng are set programmatically (e.g. GPS or preset)
  const updateMapPosition = (newLat, newLng, name) => {
    setLat(newLat);
    setLng(newLng);
    if (name) setLocationName(name);

    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.setView([newLat, newLng], 15);
      markerRef.current.setLatLng([newLat, newLng]);
      markerRef.current.setPopupContent(`<b>${cropName}</b><br/>${name || "Selected Location"}`).openPopup();
    }
  };

  // Browser Geolocation API
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus({ loading: false, msg: "Geolocation is not supported by your browser.", error: true });
      return;
    }

    setGpsStatus({ loading: true, msg: "Locating your field via GPS...", error: false });

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const newLat = Number(pos.coords.latitude.toFixed(5));
        const newLng = Number(pos.coords.longitude.toFixed(5));
        setGpsStatus({ loading: false, msg: `📍 GPS locked: ±${Math.round(pos.coords.accuracy)}m accuracy`, error: false });
        
        setGeocoding(true);
        const autoName = await reverseGeocode(newLat, newLng);
        setGeocoding(false);
        
        const finalName = autoName || `My Field (${newLat}, ${newLng})`;
        updateMapPosition(newLat, newLng, finalName);
      },
      (err) => {
        let msg = "Could not get current location.";
        if (err.code === 1) msg = "Location permission denied. Please allow GPS access in your browser.";
        if (err.code === 2) msg = "Position unavailable. Check your network or device GPS.";
        if (err.code === 3) msg = "Location request timed out.";
        setGpsStatus({ loading: false, msg, error: true });
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const handleSave = () => {
    onSave({
      lat: Number(lat),
      lng: Number(lng),
      name: locationName.trim() || `${Number(lat).toFixed(4)}°, ${Number(lng).toFixed(4)}°`,
    });
    onClose();
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(13, 36, 22, 0.65)",
      backdropFilter: "blur(4px)",
      zIndex: 1000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "16px",
    }}>
      <div style={{
        background: "white",
        borderRadius: "16px",
        width: "100%",
        maxWidth: "760px",
        maxHeight: "92vh",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
        overflow: "hidden",
        animation: "modalFadeIn 0.2s ease-out",
      }}>
        {/* Header */}
        <div style={{
          padding: "18px 24px",
          borderBottom: "1px solid var(--border, #e2ebe4)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "linear-gradient(to right, #f7f9f7, #ffffff)",
        }}>
          <div>
            <div style={{ fontWeight: "800", fontSize: "17px", color: "var(--text, #0d2416)", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>🗺️ Set Crop Location:</span>
              <span style={{ color: "var(--green, #1a9c3e)" }}>{cropName}</span>
            </div>
            <div style={{ fontSize: "12px", color: "var(--muted, #5a7a65)", marginTop: "2px" }}>
              Use your device's live GPS or click anywhere on the map to pinpoint this plot
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              fontSize: "20px",
              cursor: "pointer",
              color: "var(--muted, #5a7a65)",
              padding: "4px 8px",
              borderRadius: "8px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Action Bar (Current Location & Presets) */}
        <div style={{
          padding: "12px 24px",
          background: "#fafcfb",
          borderBottom: "1px solid #edf3ef",
          display: "flex",
          flexWrap: "wrap",
          gap: "10px",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={gpsStatus.loading}
            style={{
              background: "linear-gradient(135deg, #1d9cd3 0%, #1580ae 100%)",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "8px",
              fontWeight: "700",
              fontSize: "13px",
              cursor: gpsStatus.loading ? "wait" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 2px 6px rgba(29, 156, 211, 0.25)",
            }}
          >
            <span>{gpsStatus.loading ? "📡" : "📍"}</span>
            <span>{gpsStatus.loading ? "Getting GPS..." : "Use My Current Location"}</span>
          </button>

          {/* Quick preset selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "11px", fontWeight: "600", color: "var(--muted, #5a7a65)" }}>Jump to:</span>
            <select
              style={{
                padding: "6px 10px",
                borderRadius: "6px",
                border: "1px solid #cfded4",
                fontSize: "12px",
                background: "white",
                color: "#1a3824",
                cursor: "pointer",
              }}
              onChange={(e) => {
                const preset = PRESET_LOCATIONS.find(p => p.name === e.target.value);
                if (preset) updateMapPosition(preset.lat, preset.lng, preset.name);
              }}
              defaultValue=""
            >
              <option value="" disabled>Select farming region...</option>
              {PRESET_LOCATIONS.map(p => (
                <option key={p.name} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* GPS Status Notice if applicable */}
        {gpsStatus.msg && (
          <div style={{
            padding: "8px 24px",
            fontSize: "12px",
            background: gpsStatus.error ? "#fef0ec" : "#e8f7ed",
            color: gpsStatus.error ? "#e8471a" : "#157a30",
            borderBottom: "1px solid #edf3ef",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}>
            <span>{gpsStatus.error ? "⚠️" : "✅"}</span>
            <span>{gpsStatus.msg}</span>
          </div>
        )}

        {/* Interactive Leaflet Map Container */}
        <div style={{ position: "relative", flex: 1, minHeight: "340px", maxHeight: "420px" }}>
          <div
            ref={mapContainerRef}
            style={{ width: "100%", height: "100%", minHeight: "340px" }}
          />
          <div style={{
            position: "absolute",
            bottom: "12px",
            left: "12px",
            zIndex: 999,
            background: "rgba(255,255,255,0.92)",
            padding: "6px 12px",
            borderRadius: "8px",
            fontSize: "11px",
            fontWeight: "600",
            color: "#1a3824",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            backdropFilter: "blur(2px)",
          }}>
            👆 Click anywhere on the map or drag the pin to position your plot
          </div>
        </div>

        {/* Location Form Fields */}
        <div style={{ padding: "18px 24px", background: "white", borderTop: "1px solid #edf3ef" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "var(--muted, #5a7a65)", marginBottom: "4px" }}>
                Field / Location Label {geocoding && <span style={{ color: "var(--blue, #1d9cd3)" }}>(resolving...)</span>}
              </label>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g. North Plot - Sector 4"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cfded4",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "var(--muted, #5a7a65)", marginBottom: "4px" }}>
                Latitude
              </label>
              <input
                type="number"
                step="0.0001"
                value={lat}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setLat(val);
                  if (!isNaN(val) && mapInstanceRef.current && markerRef.current) {
                    mapInstanceRef.current.setView([val, lng]);
                    markerRef.current.setLatLng([val, lng]);
                  }
                }}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cfded4",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "var(--muted, #5a7a65)", marginBottom: "4px" }}>
                Longitude
              </label>
              <input
                type="number"
                step="0.0001"
                value={lng}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setLng(val);
                  if (!isNaN(val) && mapInstanceRef.current && markerRef.current) {
                    mapInstanceRef.current.setView([lat, val]);
                    markerRef.current.setLatLng([lat, val]);
                  }
                }}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cfded4",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
            </div>
          </div>

          {/* Footer Controls */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "16px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "transparent",
                border: "1px solid #cfded4",
                padding: "9px 18px",
                borderRadius: "8px",
                fontWeight: "600",
                fontSize: "13px",
                cursor: "pointer",
                color: "var(--muted, #5a7a65)",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              style={{
                background: "linear-gradient(135deg, #1a9c3e 0%, #157a30 100%)",
                color: "white",
                border: "none",
                padding: "9px 24px",
                borderRadius: "8px",
                fontWeight: "700",
                fontSize: "13px",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(26, 156, 62, 0.3)",
              }}
            >
              Confirm & Save Location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
