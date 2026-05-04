import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMap, ZoomControl, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useQuery } from '@tanstack/react-query';
import { fetchAqiData, fetchClimateData, fetchCountryRegions } from '../../api';
// No longer using turf for voronoi as we use actual administrative regions
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Loader2, Info, ArrowLeft } from 'lucide-react';
import { Card } from '../ui/card';

// Fix for default marker icons in React Leaflet
import L from 'leaflet';
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapEffects() {
  const map = useMap();
  useEffect(() => {
    // Disable zooming via scroll to prevent getting stuck while scrolling the page
    map.scrollWheelZoom.disable();
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  }, [map]);
  return null;
}

function RegionMapUpdater({ regionsGeoJson }: { regionsGeoJson: any }) {
  const map = useMap();
  useEffect(() => {
    if (regionsGeoJson && regionsGeoJson.features && regionsGeoJson.features.length > 0) {
      // Calculate a simple bounding box
      let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
      let hasValidCoords = false;
      
      regionsGeoJson.features.forEach((f: any) => {
        // Fallback or rough bounds calculation for regions
        // In a real scenario we'd use a robust bounds generator, but this ensures map flies properly
        if (f.geometry && f.geometry.coordinates) {
          hasValidCoords = true;
          // Simple heuristic: just look at the first few points to get a rough idea
          // Actually, we can just use the provided latitude/longitude if they exist in properties
          if (f.properties?.latitude !== undefined) {
             const lat = f.properties.latitude;
             const lon = f.properties.longitude;
             if (lat < minLat) minLat = lat;
             if (lat > maxLat) maxLat = lat;
             if (lon < minLon) minLon = lon;
             if (lon > maxLon) maxLon = lon;
          }
        }
      });
      
      if (hasValidCoords && minLat !== 90) {
        map.fitBounds([
          [minLat, minLon],
          [maxLat, maxLon]
        ], { padding: [50, 50] });
      }
    }
  }, [regionsGeoJson, map]);
  return null;
}

export default function HotspotMapScreen() {
  const [showLegend, setShowLegend] = useState(false);
  const [geoJsonData, setGeoJsonData] = useState<any>(null);
  const [selectedCountry, setSelectedCountry] = useState<{iso2: string, name: string} | null>(null);

  useEffect(() => {
    fetch('/countries_simplified.geojson')
      .then(res => res.json())
      .then(data => setGeoJsonData(data))
      .catch(err => console.error('Failed to load GeoJSON:', err));
  }, []);

  const { data: aqiData = [], isLoading: isLoadingAqi } = useQuery({
    queryKey: ['aqiData'],
    queryFn: fetchAqiData,
    staleTime: 5 * 60 * 1000,
  });

  const { data: climateData = [], isLoading: isLoadingClimate } = useQuery({
    queryKey: ['climateData'],
    queryFn: fetchClimateData,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = isLoadingAqi || isLoadingClimate || !geoJsonData;

  // Merge AQI data with climate data (vulnerability)
  const mapMarkers = aqiData.map(aqi => {
    const countryData = climateData.find(c => c.iso2 === aqi.iso2);
    return {
      ...aqi,
      vulnerability: countryData?.vulnerability_score || 0,
      emissions: countryData?.emissions_per_capita || 0,
    };
  });

  const getAqiColor = (aqi: number) => {
    switch (aqi) {
      case 1: return '#10b981'; // Good - Emerald
      case 2: return '#eab308'; // Fair - Yellow
      case 3: return '#f97316'; // Moderate - Orange
      case 4: return '#ef4444'; // Poor - Red
      case 5: return '#9333ea'; // Very Poor - Purple
      default: return '#64748b'; // Unknown
    }
  };

  const styleGeoJSON = (feature: any) => {
    const iso2 = feature.properties['ISO3166-1-Alpha-2'];
    const marker = mapMarkers.find(m => m.iso2 === iso2);
    
    if (marker) {
      return {
        fillColor: getAqiColor(marker.aqi),
        weight: 1,
        opacity: 0.8,
        color: 'rgba(255,255,255,0.2)',
        fillOpacity: 0.15 // Light fill
      };
    }
    
    return {
      fillColor: 'transparent',
      weight: 0.5,
      opacity: 0.3,
      color: 'rgba(255,255,255,0.1)',
      fillOpacity: 0
    };
  };

  const handleCountrySelect = (iso2: string, name: string) => {
    setSelectedCountry({ iso2, name });
  };

  const onEachFeature = (feature: any, layer: any) => {
    const iso2 = feature.properties['ISO3166-1-Alpha-2'];
    const marker = mapMarkers.find(m => m.iso2 === iso2);

    if (marker) {
      const color = getAqiColor(marker.aqi);
      const countryName = feature.properties.name; // Get actual country name from GeoJSON
      
      const tooltipContent = `
        <div style="
          background-color: ${color}D9; 
          border: 1.5px solid rgba(255,255,255,0.8); 
          padding: 4px 10px;
          border-radius: 20px; 
          color: white; 
          font-family: system-ui, sans-serif;
          font-weight: 600; 
          font-size: 11px;
          box-shadow: 0 6px 16px rgba(0,0,0,0.6);
          white-space: nowrap;
          backdrop-filter: blur(4px);
          display: flex;
          gap: 6px;
          align-items: center;
        ">
          <span style="opacity:0.9">${countryName}</span>
          <span style="background:rgba(0,0,0,0.25); padding:1px 6px; border-radius:10px; font-weight:700;">${marker.aqi}</span>
        </div>
      `;
      
      layer.bindTooltip(tooltipContent, {
        direction: 'auto',
        sticky: true,
        className: 'custom-tooltip-transparent bg-transparent border-none shadow-none p-0!'
      });
      
      // Highlight region heavily on hover
      layer.on({
        mouseover: (e: any) => {
          const l = e.target;
          l.setStyle({ fillOpacity: 0.4, weight: 2 });
          l.bringToFront();
        },
        mouseout: (e: any) => {
          geoJsonData && e.target.setStyle(styleGeoJSON(feature));
        },
        click: () => {
          handleCountrySelect(iso2, countryName);
        }
      });
    } else {
      layer.on({
        click: () => {
          handleCountrySelect(iso2, feature.properties.name);
        }
      });
    }
  };

  const { data: countryRegionsData, isLoading: isLoadingCountryRegions } = useQuery({
    queryKey: ['countryRegions', selectedCountry?.iso2],
    queryFn: () => fetchCountryRegions(selectedCountry?.iso2 as string),
    enabled: !!selectedCountry,
    staleTime: 5 * 60 * 1000,
  });



  const countryInfillStyle = (feature: any) => ({
    fillColor: getAqiColor(feature.properties?.aqi || 2),
    weight: 1,
    opacity: 0.5,
    color: 'rgba(255,255,255,0.2)',
    fillOpacity: 0.65
  });

  const onEachInfillFeature = (feature: any, layer: any) => {
    const cityProps = feature.properties;
    if (!cityProps || !cityProps.city) return;

    const color = getAqiColor(cityProps.aqi);
    
    // The tooltip (name of city when hovered)
    const tooltipContent = `
      <div style="
        background-color: ${color}E6; 
        border: 1px solid rgba(255,255,255,0.4); 
        padding: 4px 10px;
        border-radius: 12px; 
        color: white; 
        font-family: system-ui, sans-serif;
        font-weight: 500; 
        font-size: 11px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        backdrop-filter: blur(4px);
      ">
        ${cityProps.city}
      </div>
    `;
    
    layer.bindTooltip(tooltipContent, {
      direction: 'auto',
      sticky: true,
      className: 'custom-tooltip-transparent bg-transparent border-none shadow-none p-0!'
    });

    // The popup (when clicked)
    const popupContent = `
      <div style="background: rgba(22, 25, 35, 0.95); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 12px; color: white; width: 160px;">
        <h3 style="font-weight: 700; margin-bottom: 4px; font-size: 14px;">${cityProps.city}</h3>
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px; margin-bottom: 8px;">
          <span style="font-size: 11px; color: #94a3b8;">AQI</span>
          <span style="font-weight: 700; font-size: 14px; color: ${color};">${cityProps.aqi}</span>
        </div>
        <div style="font-size: 11px; color: #94a3b8;">
          Dominant Pollutant: <span style="font-weight: 600; color: #e2e8f0;">${cityProps.dominant_pollutant || 'N/A'}</span>
        </div>
      </div>
    `;

    layer.bindPopup(popupContent, {
      className: 'custom-popup bg-transparent border-none shadow-none'
    });

    layer.on({
      mouseover: (e: any) => {
        const l = e.target;
        l.setStyle({ fillOpacity: 0.85, weight: 1.5, color: 'rgba(255,255,255,0.6)' });
        l.bringToFront();
      },
      mouseout: (e: any) => {
        e.target.setStyle(countryInfillStyle(feature));
      }
    });
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            {selectedCountry ? (
              <button 
                onClick={() => setSelectedCountry(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 hover:bg-slate-700 transition-colors mr-1 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-slate-300" />
              </button>
            ) : (
              <MapPin className="w-6 h-6 text-red-400" />
            )}
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">
                {selectedCountry ? `Live AQI: ${selectedCountry.name}` : 'Live Hot Spot Map'}
              </h1>
              {selectedCountry && (
                <span 
                  className="px-3 py-1 rounded-full text-xs font-bold text-white border border-white/20 shadow-lg"
                  style={{ backgroundColor: getAqiColor(mapMarkers.find(m => m.iso2 === selectedCountry.iso2)?.aqi || 0) }}
                >
                  Avg AQI: {mapMarkers.find(m => m.iso2 === selectedCountry.iso2)?.aqi || 'N/A'}
                </span>
              )}
            </div>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {selectedCountry 
              ? `Displaying real-time Air Quality Index for tracked regions in ${selectedCountry.name}.`
              : 'Real-time Air Quality Index (AQI) overlaid with climate vulnerability scores.'}
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex-1 min-h-[600px] relative rounded-2xl overflow-hidden border border-white/6 shadow-xl"
      >
        {isLoading && (
          <div className="absolute inset-0 z-20 bg-[#0c0e14]/80 backdrop-blur-sm flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-sm text-slate-400">Loading geospatial data...</p>
            </div>
          </div>
        )}

        {/* Floating Legend Toggle */}
        <div className="absolute top-4 right-4 z-30 flex flex-col items-end">
          <button
            onClick={() => setShowLegend(!showLegend)}
            className="w-10 h-10 rounded-full bg-[#161923]/90 backdrop-blur-md shadow-2xl border border-white/10 flex items-center justify-center hover:bg-[#1f2333] transition-colors cursor-pointer mb-2"
          >
            <Info className="w-5 h-5 text-slate-300" />
          </button>
          
          <AnimatePresence>
            {showLegend && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="bg-[#161923]/90 backdrop-blur-md border-white/10 shadow-2xl p-4 w-56">
                  <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">AQI Legend</h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500" /> <span className="text-slate-300">Good (1)</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-yellow-500" /> <span className="text-slate-300">Fair (2)</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-500" /> <span className="text-slate-300">Moderate (3)</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500" /> <span className="text-slate-300">Poor (4)</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-600" /> <span className="text-slate-300">Very Poor (5)</span></div>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-white/10">
                    <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">City Highlights</h3>
                    <p className="text-xs text-slate-500 leading-tight">Displaying real-time average Air Quality Index for tracked cities globally. Regions are shaded by corresponding AQI. Click on any city pill to view detailed vulnerability scores.</p>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* View Switching */}
        <AnimatePresence mode="wait">
          {!selectedCountry ? (
            <motion.div
              key="global-map"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-0 bg-[#0c0e14]"
            >
              <MapContainer
                center={[20, 0]}
                zoom={2}
                minZoom={2}
                maxBounds={[[-90, -180], [90, 180]]}
                maxBoundsViscosity={1.0}
                className="w-full h-full"
                worldCopyJump={false}
                zoomControl={false}
              >
                <style>{`
                  .leaflet-interactive { outline: none !important; }
                  .leaflet-container { outline: none !important; }
                `}</style>
                <ZoomControl position="bottomright" />
                <MapEffects />
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />

                {geoJsonData && (
                  <GeoJSON 
                    key={mapMarkers.length}
                    data={geoJsonData} 
                    style={styleGeoJSON}
                    onEachFeature={onEachFeature}
                  />
                )}
              </MapContainer>
            </motion.div>
          ) : (
            <motion.div
              key="country-map"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="absolute inset-0 z-0 bg-[#0c0e14]"
            >
              {isLoadingCountryRegions ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-[#0c0e14] z-10">
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    <p className="text-sm text-slate-400">Loading comprehensive administrative regions for {selectedCountry.name}...</p>
                  </div>
                </div>
              ) : countryRegionsData && countryRegionsData.features?.length > 0 ? (
                <MapContainer
                  center={[20, 0]}
                  zoom={4}
                  className="w-full h-full"
                  zoomControl={false}
                >
                  <style>{`
                    .leaflet-interactive { outline: none !important; }
                    .leaflet-container { outline: none !important; background: transparent !important; }
                  `}</style>
                  <ZoomControl position="bottomright" />
                  <RegionMapUpdater regionsGeoJson={countryRegionsData} />
                  
                  {countryRegionsData && (
                    <GeoJSON 
                      key={selectedCountry.iso2 + '_regions'} 
                      data={countryRegionsData as any} 
                      style={countryInfillStyle} 
                      onEachFeature={onEachInfillFeature}
                    />
                  )}
                </MapContainer>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-[#0c0e14] z-10">
                  <div className="w-20 h-20 rounded-full bg-slate-800/50 flex items-center justify-center mb-6 border border-slate-700 shadow-2xl">
                    <MapPin className="w-10 h-10 text-slate-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">No Data Available</h3>
                  <p className="text-base text-slate-400 max-w-md mx-auto">
                    We currently don't have real-time tracking sensors active in {selectedCountry.name}. 
                    <br/><br/>
                    Please return to the global map and select another region to view detailed AQI data.
                  </p>
                  <button 
                    onClick={() => setSelectedCountry(null)}
                    className="mt-8 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg shadow-lg hover:shadow-blue-500/25 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Global Map
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
