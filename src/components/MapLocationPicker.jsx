import { useState, useEffect, useRef } from "react";
import L from "leaflet";
import { reverseGeocode } from "../services/weatherService";

// Fix Leaflet default marker icons
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
        width: 36px;
        height: 36px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="transform: rotate(45deg); font-size: 18px;">${emoji}</span>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -34],
  });
};

const PRESET_LOCATIONS = [
  { name: "Lwiro Agro Station, DR Congo", lat: -2.2472, lng: 28.8042 },
  { name: "Bukavu Basin, DR Congo", lat: -2.5083, lng: 28.8608 },
  { name: "Goma Volcanic Soil, DR Congo", lat: -1.6792, lng: 29.2228 },
  { name: "Uvira Plains, DR Congo", lat: -3.3967, lng: 29.1378 },
  { name: "Kinshasa Valley, DR Congo", lat: -4.4419, lng: 15.2663 },
  { name: "Lubumbashi Plateau, DR Congo", lat: -11.6609, lng: 27.4794 },
  { name: "Kigali, Rwanda", lat: -1.9441, lng: 30.0619 },
  { name: "Kampala, Uganda", lat: 0.3476, lng: 32.5825 },
  { name: "Nairobi, Kenya", lat: -1.2921, lng: 36.8219 },
  { name: "Rift Valley, Kenya", lat: -0.3031, lng: 36.0800 },
  { name: "Abuja, Nigeria", lat: 9.0765, lng: 7.3986 },
  { name: "Lagos, Nigeria", lat: 6.5244, lng: 3.3792 },
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
  const defaultName = initialLocation?.name ?? "Field Location";

  const [lat, setLat] = useState(defaultLat);
  const [lng, setLng] = useState(defaultLng);
  const [locationName, setLocationName] = useState(defaultName);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [gpsStatus, setGpsStatus] = useState({ loading: false, msg: "", error: false });
  const [geocoding, setGeocoding] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

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
      marker.on("dragend", async () => {
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

  // Update map and marker programmatically
  const updateMapPosition = (newLat, newLng, name) => {
    setLat(newLat);
    setLng(newLng);
    if (name) setLocationName(name);

    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.setView([newLat, newLng], 14);
      markerRef.current.setLatLng([newLat, newLng]);
      markerRef.current.setPopupContent(`<b>${cropName}</b><br/>${name || "Selected Location"}`).openPopup();
    }
  };

  // Search for any city, village, or address worldwide via OpenStreetMap Nominatim
  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setGpsStatus({ loading: false, msg: "", error: false });

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery.trim())}&limit=1`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const match = data[0];
        const newLat = Number(parseFloat(match.lat).toFixed(5));
        const newLng = Number(parseFloat(match.lon).toFixed(5));
        const shortName = match.display_name.split(",").slice(0, 3).join(",").trim();
        updateMapPosition(newLat, newLng, shortName);
        setGpsStatus({ loading: false, msg: `📍 Centered on "${shortName}"`, error: false });
      } else {
        setGpsStatus({ loading: false, msg: `Could not find "${searchQuery}". Try a major city or click on the map.`, error: true });
      }
    } catch {
      setGpsStatus({ loading: false, msg: "Search network error. Please try again or click the map.", error: true });
    } finally {
      setSearching(false);
    }
  };

  // Browser Geolocation API with accuracy & ISP explanation
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus({ loading: false, msg: "Geolocation is not supported by your browser.", error: true });
      return;
    }

    setGpsStatus({ loading: true, msg: "Requesting device location...", error: false });

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const newLat = Number(pos.coords.latitude.toFixed(5));
        const newLng = Number(pos.coords.longitude.toFixed(5));
        const accuracy = Math.round(pos.coords.accuracy || 0);

        setGeocoding(true);
        const autoName = await reverseGeocode(newLat, newLng);
        setGeocoding(false);

        const isAbuja = autoName && autoName.toLowerCase().includes("abuja");
        const isLowAcc = accuracy > 2000;

        let statusText = `📍 Position locked (±${accuracy}m accuracy)`;
        if (isAbuja || isLowAcc) {
          statusText = `⚠️ Detected ${autoName} (±${accuracy}m via ISP network). If this is not your farm, please use the Search bar above or click on your field directly!`;
        }

        setGpsStatus({ loading: false, msg: statusText, error: false });
        const finalName = autoName || `My Field (${newLat}, ${newLng})`;
        updateMapPosition(newLat, newLng, finalName);
      },
      (err) => {
        let msg = "Could not get current location.";
        if (err.code === 1) msg = "Permission denied. Allow location in your browser or search your city above.";
        if (err.code === 2) msg = "Position unavailable. Please search for your city or click on the map.";
        if (err.code === 3) msg = "Location request timed out. Please search for your city or click on the map.";
        setGpsStatus({ loading: false, msg, error: true });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSave = () => {
    const finalLocation = {
      lat: Number(lat),
      lng: Number(lng),
      name: locationName.trim() || `${Number(lat).toFixed(4)}°, ${Number(lng).toFixed(4)}°`,
    };

    setSaveSuccess(true);
    if (onSave) {
      onSave(finalLocation);
    }
    setTimeout(() => {
      onClose();
    }, 300);
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
        maxWidth: "800px",
        maxHeight: "94vh",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 24px",
          borderBottom: "1px solid #e2ebe4",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "linear-gradient(to right, #f7f9f7, #ffffff)",
        }}>
          <div>
            <div style={{ fontWeight: "800", fontSize: "17px", color: "var(--text, #0d2416)", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>🗺️ Set Field Location:</span>
              <span style={{ color: "#1a9c3e" }}>{cropName}</span>
            </div>
            <div style={{ fontSize: "12px", color: "#5a7a65", marginTop: "2px" }}>
              Search your city, use device GPS, or click anywhere on the map to pinpoint your plot
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              fontSize: "20px",
              cursor: "pointer",
              color: "#5a7a65",
              padding: "4px 8px",
              borderRadius: "8px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Search & Location Controls Bar */}
        <div style={{
          padding: "12px 20px",
          background: "#f9fbfa",
          borderBottom: "1px solid #edf3ef",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}>
          {/* Row 1: City Search Form */}
          <form onSubmit={handleSearch} style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Search city, town, or region (e.g. Bukavu, Goma, Kigali, Kinshasa, Nairobi...)"
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1.5px solid #cfded4",
                fontSize: "13px",
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={searching}
              style={{
                background: "#1a9c3e",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: "8px",
                fontWeight: "700",
                fontSize: "13px",
                cursor: searching ? "wait" : "pointer",
              }}
            >
              {searching ? "Searching..." : "Go to City"}
            </button>
          </form>

          {/* Row 2: GPS button & Preset Dropdown */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "space-between", alignItems: "center" }}>
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={gpsStatus.loading}
              style={{
                background: "linear-gradient(135deg, #1d9cd3 0%, #1580ae 100%)",
                color: "white",
                border: "none",
                padding: "7px 14px",
                borderRadius: "8px",
                fontWeight: "700",
                fontSize: "12px",
                cursor: gpsStatus.loading ? "wait" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 2px 6px rgba(29, 156, 211, 0.2)",
              }}
            >
              <span>{gpsStatus.loading ? "📡" : "📍"}</span>
              <span>{gpsStatus.loading ? "Acquiring GPS..." : "Use My Current Device Location"}</span>
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#5a7a65" }}>Or Select Region:</span>
              <select
                style={{
                  padding: "6px 10px",
                  borderRadius: "6px",
                  border: "1px solid #cfded4",
                  fontSize: "12px",
                  background: "white",
                  color: "#1a3824",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
                onChange={(e) => {
                  const preset = PRESET_LOCATIONS.find(p => p.name === e.target.value);
                  if (preset) {
                    updateMapPosition(preset.lat, preset.lng, preset.name);
                    setGpsStatus({ loading: false, msg: `📍 Jumped to ${preset.name}`, error: false });
                  }
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
        </div>

        {/* Status / Alert Banner */}
        {gpsStatus.msg && (
          <div style={{
            padding: "8px 20px",
            fontSize: "12px",
            background: gpsStatus.error ? "#fef0ec" : (gpsStatus.msg.includes("⚠️") ? "#fff9e6" : "#e8f7ed"),
            color: gpsStatus.error ? "#e8471a" : (gpsStatus.msg.includes("⚠️") ? "#9a7a00" : "#157a30"),
            borderBottom: "1px solid #edf3ef",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            lineHeight: "1.4",
          }}>
            <span>{gpsStatus.error ? "⚠️" : (gpsStatus.msg.includes("⚠️") ? "ℹ️" : "✅")}</span>
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
            background: "rgba(255,255,255,0.94)",
            padding: "6px 12px",
            borderRadius: "8px",
            fontSize: "11px",
            fontWeight: "700",
            color: "#1a3824",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            backdropFilter: "blur(2px)",
          }}>
            👆 Click anywhere on the map or drag the pin to pinpoint field
          </div>
        </div>

        {/* Location Form Fields & Save Action */}
        <div style={{ padding: "16px 20px", background: "white", borderTop: "1px solid #edf3ef" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr", gap: "10px", marginBottom: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#5a7a65", marginBottom: "4px" }}>
                Location / Field Name {geocoding && <span style={{ color: "#1d9cd3" }}>(resolving...)</span>}
              </label>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g. Bukavu Field Plot A"
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid #cfded4",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#5a7a65", marginBottom: "4px" }}>
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
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid #cfded4",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#5a7a65", marginBottom: "4px" }}>
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
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid #cfded4",
                  fontSize: "13px",
                  outline: "none",
                }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: "12px", color: "#5a7a65" }}>
              Active Pin: <strong style={{ color: "#0d2416" }}>{locationName}</strong> ({Number(lat).toFixed(4)}°, {Number(lng).toFixed(4)}°)
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: "transparent",
                  border: "1px solid #cfded4",
                  padding: "9px 18px",
                  borderRadius: "8px",
                  fontWeight: "700",
                  fontSize: "13px",
                  cursor: "pointer",
                  color: "#5a7a65",
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSave}
                style={{
                  background: saveSuccess ? "#157a30" : "linear-gradient(135deg, #1a9c3e 0%, #157a30 100%)",
                  color: "white",
                  border: "none",
                  padding: "9px 24px",
                  borderRadius: "8px",
                  fontWeight: "800",
                  fontSize: "13px",
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(26,156,62,0.3)",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>{saveSuccess ? "✓" : "💾"}</span>
                <span>{saveSuccess ? "Saved!" : "Save Field Location"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
