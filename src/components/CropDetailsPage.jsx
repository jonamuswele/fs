import { useState, useEffect, useRef } from "react";
import L from "leaflet";
import { fetchWeatherForecast } from "../services/weatherService";
import MapLocationPicker from "./MapLocationPicker";

const CROP_EMOJIS = {
  Maize: "🌽",
  Wheat: "🌾",
  Rice: "🍚",
  Tomato: "🍅",
  Cassava: "🌿",
  Yam: "🥔",
  Pepper: "🌶️",
  Groundnut: "🥜",
  Sorghum: "🌾",
  Soybean: "🌱",
  Okra: "🥗",
  Spinach: "🥬",
  Cabbage: "🥬",
  Onion: "🧅",
  Garlic: "🧄",
  Other: "🌱",
};

export default function CropDetailsPage({
  node,
  cropData,
  growthAnalysis,
  nodeColor = "#1a9c3e",
  onBack,
  onUpdateCrop,
}) {
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedNotes, setEditedNotes] = useState(cropData?.notes || "");
  const [editedPlanted, setEditedPlanted] = useState(cropData?.planted || "");

  const miniMapRef = useRef(null);
  const miniMapInstance = useRef(null);
  const markerRef = useRef(null);

  const cropName = cropData?.crop || "Crop";
  const emoji = CROP_EMOJIS[cropName] || "🌱";
  const location = cropData?.location || {
    lat: -2.2472,
    lng: 28.8042,
    name: "Lwiro Agro Station, DR Congo",
  };

  // Fetch hyper-local weather for this crop's coordinates
  useEffect(() => {
    let active = true;
    setWeatherLoading(true);

    fetchWeatherForecast(location.lat, location.lng)
      .then((data) => {
        if (active) {
          setWeather(data);
          setWeatherLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load crop weather:", err);
        if (active) setWeatherLoading(false);
      });

    return () => {
      active = false;
    };
  }, [location.lat, location.lng]);

  // Mini Leaflet Map initialization
  useEffect(() => {
    if (!miniMapRef.current) return;

    if (!miniMapInstance.current) {
      const map = L.map(miniMapRef.current, {
        center: [location.lat, location.lng],
        zoom: 14,
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
      }).addTo(map);

      const pinIcon = L.divIcon({
        className: "mini-pin",
        html: `
          <div style="
            background: ${nodeColor};
            border: 2px solid white;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            width: 30px;
            height: 30px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <span style="transform: rotate(45deg); font-size: 14px;">${emoji}</span>
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 30],
      });

      const marker = L.marker([location.lat, location.lng], { icon: pinIcon }).addTo(map);
      markerRef.current = marker;
      miniMapInstance.current = map;

      setTimeout(() => {
        map.invalidateSize();
      }, 200);
    } else {
      miniMapInstance.current.setView([location.lat, location.lng], 14);
      if (markerRef.current) {
        markerRef.current.setLatLng([location.lat, location.lng]);
      }
    }

    return () => {
      if (miniMapInstance.current) {
        miniMapInstance.current.remove();
        miniMapInstance.current = null;
        markerRef.current = null;
      }
    };
  }, [location.lat, location.lng]);

  const handleSaveLocation = (newLoc) => {
    if (onUpdateCrop) {
      onUpdateCrop({
        ...cropData,
        location: newLoc,
      });
    }
  };

  const handleSaveDetails = () => {
    if (onUpdateCrop) {
      onUpdateCrop({
        ...cropData,
        notes: editedNotes,
        planted: editedPlanted,
      });
    }
    setIsEditingNotes(false);
  };

  const plantingFormatted = cropData?.planted
    ? new Date(cropData.planted).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "N/A";

  const humidity = node.sensor_json?.humidity;
  const tempC = node.sensor_json?.temp_c;
  const ec = node.sensor_json?.ec;

  return (
    <div style={{ animation: "fadeIn 0.25s ease-out" }}>
      {/* Top Breadcrumbs & Back Navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <button
          onClick={onBack}
          style={{
            background: "white",
            border: "1px solid var(--border)",
            color: "var(--text)",
            padding: "8px 16px",
            borderRadius: "8px",
            fontWeight: "700",
            fontSize: "13px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          }}
        >
          <span>←</span> Back to All Crops
        </button>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => setShowLocationModal(true)}
            style={{
              background: "var(--blue-pale)",
              color: "var(--blue-dark)",
              border: "1px solid var(--blue-mid)",
              padding: "8px 16px",
              borderRadius: "8px",
              fontWeight: "700",
              fontSize: "13px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>📍</span> Change Field Location
          </button>
          <button
            onClick={() => setIsEditingNotes(!isEditingNotes)}
            style={{
              background: "white",
              color: "var(--green-dark)",
              border: "1px solid var(--green-mid)",
              padding: "8px 16px",
              borderRadius: "8px",
              fontWeight: "700",
              fontSize: "13px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>✏️</span> {isEditingNotes ? "Cancel Edit" : "Edit Crop Info"}
          </button>
        </div>
      </div>

      {/* Main Hero Card */}
      <div style={{
        background: "white",
        borderRadius: "16px",
        border: "1px solid var(--border)",
        overflow: "hidden",
        boxShadow: "0 4px 16px rgba(0,0,0,0.05)",
        marginBottom: "24px",
      }}>
        <div style={{ height: "6px", background: nodeColor }} />
        
        <div style={{ padding: "28px 32px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
            <div style={{ display: "flex", gap: "18px", alignItems: "center" }}>
              <div style={{
                width: "64px",
                height: "64px",
                borderRadius: "16px",
                background: "var(--green-pale)",
                border: "2px solid var(--green-mid)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "34px",
              }}>
                {emoji}
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <h1 style={{ fontSize: "26px", fontWeight: "800", color: "var(--text)", margin: 0 }}>
                    {cropName}
                  </h1>
                  <span style={{
                    fontSize: "11px",
                    fontWeight: "800",
                    background: node.active ? "var(--green-pale)" : "var(--red-pale)",
                    color: node.active ? "var(--green-dark)" : "var(--red)",
                    padding: "3px 10px",
                    borderRadius: "12px",
                    border: `1px solid ${node.active ? "var(--green-mid)" : "#f8b4a0"}`,
                  }}>
                    {node.active ? "● SENSOR ACTIVE" : "○ OFFLINE"}
                  </span>
                  <span style={{
                    fontSize: "11px",
                    fontWeight: "700",
                    background: "var(--bg)",
                    color: "var(--muted)",
                    padding: "3px 8px",
                    borderRadius: "6px",
                  }}>
                    Node: {node.node_id}
                  </span>
                </div>
                <div style={{ fontSize: "14px", color: "var(--muted)", marginTop: "4px", display: "flex", alignItems: "center", gap: "16px" }}>
                  <span>📍 {location.name}</span>
                  <span>•</span>
                  <span>Planted: {plantingFormatted} ({growthAnalysis?.daysSincePlanting ?? 0} days ago)</span>
                </div>
              </div>
            </div>

            {/* Harvest Status Pill */}
            <div style={{
              background: growthAnalysis?.daysUntilHarvest < 14 ? "var(--yellow-pale)" : "var(--green-pale)",
              border: `1px solid ${growthAnalysis?.daysUntilHarvest < 14 ? "var(--yellow-mid)" : "var(--green-mid)"}`,
              padding: "12px 20px",
              borderRadius: "12px",
              textAlign: "right",
            }}>
              <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--muted)", textTransform: "uppercase" }}>
                Harvest Outlook
              </div>
              <div style={{
                fontSize: "20px",
                fontWeight: "800",
                color: growthAnalysis?.daysUntilHarvest < 14 ? "#a37a00" : "var(--green-dark)",
                marginTop: "2px",
              }}>
                {growthAnalysis?.daysUntilHarvest === 0
                  ? "🌾 Harvest Today!"
                  : growthAnalysis?.isOverdue
                  ? "⚠️ Overdue Harvest!"
                  : `⏰ ${growthAnalysis?.daysUntilHarvest} days left`}
              </div>
              <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
                Expected: {growthAnalysis?.harvestDate ? growthAnalysis.harvestDate.toLocaleDateString() : "TBD"}
              </div>
            </div>
          </div>

          {/* Edit form inline if enabled */}
          {isEditingNotes && (
            <div style={{
              marginTop: "20px",
              padding: "16px",
              background: "var(--bg)",
              borderRadius: "10px",
              border: "1px dashed var(--border)",
            }}>
              <div style={{ fontWeight: "700", fontSize: "13px", marginBottom: "10px" }}>Edit Crop Information</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "12px", marginBottom: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "var(--muted)" }}>Planting Date</label>
                  <input
                    type="date"
                    value={editedPlanted}
                    onChange={(e) => setEditedPlanted(e.target.value)}
                    style={{ width: "100%", padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--border)", fontSize: "12px" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "var(--muted)" }}>Notes & Variety</label>
                  <input
                    type="text"
                    value={editedNotes}
                    onChange={(e) => setEditedNotes(e.target.value)}
                    placeholder="Field notes, variety, fertilizer history..."
                    style={{ width: "100%", padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--border)", fontSize: "12px" }}
                  />
                </div>
              </div>
              <button
                onClick={handleSaveDetails}
                style={{
                  background: "var(--green)",
                  color: "white",
                  border: "none",
                  padding: "6px 16px",
                  borderRadius: "6px",
                  fontWeight: "700",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                Save Details
              </button>
            </div>
          )}

          {/* Quick Stats Grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "16px",
            marginTop: "24px",
            paddingTop: "20px",
            borderTop: "1px solid var(--divider)",
          }}>
            <div style={{ background: "var(--bg)", padding: "14px", borderRadius: "10px" }}>
              <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: "600" }}>Soil Moisture</div>
              <div style={{ fontSize: "22px", fontWeight: "800", color: "var(--green-dark)", marginTop: "4px" }}>
                {humidity !== undefined && humidity !== null ? `${humidity.toFixed(1)}%` : "--"}
              </div>
              <div style={{ fontSize: "11px", color: humidity < 35 ? "var(--red)" : "var(--green)", fontWeight: "600", marginTop: "2px" }}>
                {humidity < 35 ? "⚠️ Low moisture" : humidity > 80 ? "🌊 High moisture" : "✅ Optimal range"}
              </div>
            </div>

            <div style={{ background: "var(--bg)", padding: "14px", borderRadius: "10px" }}>
              <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: "600" }}>Soil Temperature</div>
              <div style={{ fontSize: "22px", fontWeight: "800", color: "var(--blue-dark)", marginTop: "4px" }}>
                {tempC !== undefined && tempC !== null ? `${tempC.toFixed(1)}°C` : "--"}
              </div>
              <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
                Sensor node reading
              </div>
            </div>

            <div style={{ background: "var(--bg)", padding: "14px", borderRadius: "10px" }}>
              <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: "600" }}>Soil EC (Nutrients)</div>
              <div style={{ fontSize: "22px", fontWeight: "800", color: "var(--text)", marginTop: "4px" }}>
                {ec !== undefined && ec !== null ? `${ec.toFixed(2)} mS/cm` : "--"}
              </div>
              <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
                {ec > 3.0 ? "⚠️ High salinity" : ec < 0.8 ? "⚡ Low fertility" : "✅ Well balanced"}
              </div>
            </div>

            <div style={{ background: "var(--bg)", padding: "14px", borderRadius: "10px" }}>
              <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: "600" }}>Growth Progress</div>
              <div style={{ fontSize: "22px", fontWeight: "800", color: "var(--green)", marginTop: "4px" }}>
                {growthAnalysis?.progressPercent ?? 0}%
              </div>
              <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
                {growthAnalysis?.currentStage?.name || "Growing"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Left Column = Location & Weather, Right Column = Growth & Recommendations */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
        {/* LEFT: Location & Map Card */}
        <div style={{
          background: "white",
          borderRadius: "16px",
          border: "1px solid var(--border)",
          overflow: "hidden",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          display: "flex",
          flexDirection: "column",
        }}>
          <div style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <div>
              <div style={{ fontWeight: "800", fontSize: "15px", color: "var(--text)" }}>
                📍 Field Plot Location
              </div>
              <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                GPS coordinates used for hyper-local meteorological forecasts
              </div>
            </div>
            <button
              onClick={() => setShowLocationModal(true)}
              style={{
                background: "var(--green-pale)",
                color: "var(--green-dark)",
                border: "1px solid var(--green-mid)",
                padding: "6px 12px",
                borderRadius: "6px",
                fontWeight: "700",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              Update Pin
            </button>
          </div>

          <div style={{ height: "220px", position: "relative" }}>
            <div ref={miniMapRef} style={{ width: "100%", height: "100%" }} />
            <div style={{
              position: "absolute",
              bottom: "8px",
              left: "8px",
              zIndex: 400,
              background: "rgba(255,255,255,0.92)",
              padding: "4px 8px",
              borderRadius: "6px",
              fontSize: "10px",
              fontWeight: "700",
              color: "var(--text)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
            }}>
              {location.lat.toFixed(4)}°, {location.lng.toFixed(4)}°
            </div>
          </div>

          <div style={{ padding: "16px 20px", background: "#fcfdfc", borderTop: "1px solid var(--border)" }}>
            <div style={{ fontSize: "13px", fontWeight: "700", color: "var(--text)" }}>{location.name}</div>
            <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>
              Latitude: {location.lat.toFixed(5)} • Longitude: {location.lng.toFixed(5)}
            </div>
          </div>
        </div>

        {/* RIGHT: Real-time Hyper-Local Weather for Crop */}
        <div style={{
          background: "white",
          borderRadius: "16px",
          border: "1px solid var(--border)",
          overflow: "hidden",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          display: "flex",
          flexDirection: "column",
        }}>
          <div style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <div>
              <div style={{ fontWeight: "800", fontSize: "15px", color: "var(--text)" }}>
                ⛅ Live Weather Outlook
              </div>
              <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                Live Open-Meteo forecast for this crop's location
              </div>
            </div>
            {weather && (
              <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--blue-dark)", background: "var(--blue-pale)", padding: "3px 8px", borderRadius: "6px" }}>
                Live GPS Weather
              </span>
            )}
          </div>

          <div style={{ padding: "20px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            {weatherLoading ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)", fontSize: "13px" }}>
                📡 Fetching live meteorological forecast for {location.name}...
              </div>
            ) : weather ? (
              <>
                {/* Current condition hero */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "linear-gradient(135deg, var(--blue-pale) 0%, #f0f9fd 100%)",
                  padding: "16px 20px",
                  borderRadius: "12px",
                  border: "1px solid var(--blue-mid)",
                  marginBottom: "16px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div style={{ fontSize: "40px" }}>{weather.current.icon}</div>
                    <div>
                      <div style={{ fontSize: "28px", fontWeight: "800", color: "var(--blue-dark)" }}>
                        {weather.current.temp}°C
                      </div>
                      <div style={{ fontSize: "12px", fontWeight: "600", color: "var(--muted)" }}>
                        {weather.current.condition} • Feels like {weather.current.apparentTemp}°C
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: "right", fontSize: "12px", color: "var(--text)" }}>
                    <div>💧 Humidity: <strong>{weather.current.humidity}%</strong></div>
                    <div style={{ marginTop: "4px" }}>💨 Wind: <strong>{weather.current.wind} km/h</strong></div>
                    <div style={{ marginTop: "4px" }}>🌧️ Rain: <strong>{weather.current.precipitation} mm</strong></div>
                  </div>
                </div>

                {/* Irrigation Advisory from Real Forecast */}
                <div style={{
                  padding: "12px 16px",
                  borderRadius: "10px",
                  background: weather.irrigationAdvice.type === "rain" ? "var(--blue-pale)" : "var(--yellow-pale)",
                  border: `1px solid ${weather.irrigationAdvice.type === "rain" ? "var(--blue-mid)" : "var(--yellow-mid)"}`,
                  fontSize: "12px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                }}>
                  <span style={{ fontSize: "20px" }}>{weather.irrigationAdvice.icon}</span>
                  <div>
                    <strong style={{ color: "var(--text)" }}>{weather.irrigationAdvice.title}</strong>
                    <div style={{ color: "var(--muted)", marginTop: "2px" }}>{weather.irrigationAdvice.desc}</div>
                  </div>
                </div>

                {/* Mini 7-day strip */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  gap: "6px",
                  marginTop: "16px",
                }}>
                  {weather.daily.slice(0, 7).map((d, i) => (
                    <div key={d.date} style={{
                      background: i === 0 ? "var(--green-pale)" : "var(--bg)",
                      border: i === 0 ? "1px solid var(--green-mid)" : "1px solid var(--border)",
                      padding: "8px 4px",
                      borderRadius: "8px",
                      textAlign: "center",
                    }}>
                      <div style={{ fontSize: "10px", fontWeight: "700", color: "var(--muted)" }}>{d.day}</div>
                      <div style={{ fontSize: "18px", margin: "4px 0" }}>{d.icon}</div>
                      <div style={{ fontSize: "11px", fontWeight: "800", color: "var(--text)" }}>{d.high}°</div>
                      <div style={{ fontSize: "10px", color: "var(--muted)" }}>{d.low}°</div>
                      <div style={{ fontSize: "9px", color: d.rain > 30 ? "var(--blue)" : "var(--muted)", fontWeight: "600", marginTop: "2px" }}>
                        {d.rain > 0 ? `${d.rain}%` : "-"}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Full Growth Lifecycle & Observations Section */}
      <div style={{
        background: "white",
        borderRadius: "16px",
        border: "1px solid var(--border)",
        padding: "24px 28px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        marginBottom: "24px",
      }}>
        <div style={{ fontWeight: "800", fontSize: "17px", color: "var(--text)", marginBottom: "4px" }}>
          🌱 Growth Stage & Development Timeline
        </div>
        <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "20px" }}>
          Track crop development stages against field age and sensory conditions
        </div>

        {/* Growth Progress Bar */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: "700", marginBottom: "6px" }}>
            <span>Stage: {growthAnalysis?.currentStage?.name || "Growing"}</span>
            <span>{growthAnalysis?.progressPercent ?? 0}% Complete</span>
          </div>
          <div style={{ height: "10px", background: "var(--bg)", borderRadius: "5px", overflow: "hidden", border: "1px solid var(--border)" }}>
            <div style={{
              height: "100%",
              width: `${growthAnalysis?.progressPercent ?? 0}%`,
              background: "linear-gradient(to right, #1a9c3e, #1d9cd3)",
              transition: "width 0.5s ease",
            }} />
          </div>
        </div>

        {/* Observations & Agronomic Recommendations */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <div style={{ background: "var(--blue-pale)", padding: "18px", borderRadius: "12px", border: "1px solid var(--blue-mid)" }}>
            <div style={{ fontSize: "13px", fontWeight: "800", color: "var(--blue-dark)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
              <span>🔍</span> What You Should Be Seeing In The Field:
            </div>
            {growthAnalysis?.expectedObservations && growthAnalysis.expectedObservations.length > 0 ? (
              <ul style={{ paddingLeft: "20px", fontSize: "13px", color: "var(--text)", lineHeight: "1.6" }}>
                {growthAnalysis.expectedObservations.map((obs, idx) => (
                  <li key={idx}>{obs}</li>
                ))}
              </ul>
            ) : (
              <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                Routine foliage growth and root development. Check canopy expansion.
              </div>
            )}
          </div>

          <div style={{ background: "var(--green-pale)", padding: "18px", borderRadius: "12px", border: "1px solid var(--green-mid)" }}>
            <div style={{ fontSize: "13px", fontWeight: "800", color: "var(--green-dark)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
              <span>⚡</span> Recommended Agronomic Actions:
            </div>
            {growthAnalysis?.currentStage?.actions && growthAnalysis.currentStage.actions.length > 0 ? (
              <ul style={{ paddingLeft: "20px", fontSize: "13px", color: "var(--text)", lineHeight: "1.6" }}>
                {growthAnalysis.currentStage.actions.map((act, idx) => (
                  <li key={idx}>{act}</li>
                ))}
              </ul>
            ) : (
              <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                Maintain steady watering and monitor weed emergence.
              </div>
            )}
          </div>
        </div>

        {/* Sensor-based environmental recommendations */}
        {growthAnalysis?.envRecommendations && growthAnalysis.envRecommendations.length > 0 && (
          <div style={{ marginTop: "16px", padding: "14px 18px", background: "var(--bg)", borderRadius: "10px", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: "12px", fontWeight: "800", color: "var(--green-dark)", marginBottom: "6px" }}>
              💡 Sensor Environmental Guidance:
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {growthAnalysis.envRecommendations.map((rec, idx) => (
                <span key={idx} style={{
                  background: "white",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "var(--text)",
                  border: "1px solid var(--border)",
                }}>
                  {rec}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Location Modal if triggered */}
      {showLocationModal && (
        <MapLocationPicker
          initialLocation={location}
          cropName={cropName}
          cropEmoji={emoji}
          onSave={handleSaveLocation}
          onClose={() => setShowLocationModal(false)}
        />
      )}
    </div>
  );
}
