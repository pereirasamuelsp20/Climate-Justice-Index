import { useQuery } from '@tanstack/react-query';
import { fetchClimateData } from '../api';
import type { ClimateData } from '../api';

// Normalised fallback data (matches the snake_case API interface)
// Vulnerability scores sourced from ND-GAIN Country Index (2023)
const FALLBACK_DATA: ClimateData[] = [
  { id:'1', name:'Chad',          iso2:'TD', region:'Africa',        emissions_per_capita:0.1,  vulnerability_score:0.64, population:16000000,    gdp_per_capita:700,   gdp_quartile:1, emissions_share_pct:0.05, injustice_score:17.0,  composite_score:0.8120 },
  { id:'2', name:'United States', iso2:'US', region:'North America', emissions_per_capita:14.7, vulnerability_score:0.31, population:331000000,   gdp_per_capita:63000, gdp_quartile:4, emissions_share_pct:14.5, injustice_score:0.02,  composite_score:0.3180 },
  { id:'3', name:'India',         iso2:'IN', region:'Asia',          emissions_per_capita:1.8,  vulnerability_score:0.48, population:1380000000,  gdp_per_capita:2100,  gdp_quartile:2, emissions_share_pct:7.0,  injustice_score:0.09,  composite_score:0.4650 },
  { id:'4', name:'Germany',       iso2:'DE', region:'Europe',        emissions_per_capita:8.5,  vulnerability_score:0.30, population:83000000,    gdp_per_capita:48000, gdp_quartile:4, emissions_share_pct:2.1,  injustice_score:0.07,  composite_score:0.2230 },
  { id:'5', name:'Brazil',        iso2:'BR', region:'Latin America', emissions_per_capita:2.3,  vulnerability_score:0.37, population:212000000,   gdp_per_capita:8700,  gdp_quartile:3, emissions_share_pct:1.5,  injustice_score:0.30,  composite_score:0.3940 },
  { id:'6', name:'Australia',     iso2:'AU', region:'Oceania',       emissions_per_capita:15.1, vulnerability_score:0.32, population:25000000,    gdp_per_capita:55000, gdp_quartile:4, emissions_share_pct:1.2,  injustice_score:0.21,  composite_score:0.3160 },
  { id:'7', name:'China',         iso2:'CN', region:'Asia',          emissions_per_capita:7.4,  vulnerability_score:0.38, population:1400000000,  gdp_per_capita:10500, gdp_quartile:3, emissions_share_pct:28.0, injustice_score:0.01,  composite_score:0.2950 },
  { id:'8', name:'Somalia',       iso2:'SO', region:'Africa',        emissions_per_capita:0.05, vulnerability_score:0.61, population:15000000,    gdp_per_capita:300,   gdp_quartile:1, emissions_share_pct:0.02, injustice_score:44.0,  composite_score:0.9220 },
  { id:'9', name:'Norway',        iso2:'NO', region:'Europe',        emissions_per_capita:7.2,  vulnerability_score:0.26, population:5300000,     gdp_per_capita:75000, gdp_quartile:4, emissions_share_pct:0.1,  injustice_score:1.20,  composite_score:0.1580 },
];

export const useClimateData = () => {
  return useQuery<ClimateData[]>({
    queryKey: ['climateData'],
    queryFn: fetchClimateData,
    staleTime: 5 * 60_000,        // 5-minute buffer before refetch
    refetchInterval: 5 * 60_000,  // Auto-poll every 5 minutes (data updates infrequently)
    retry: 2,
    placeholderData: FALLBACK_DATA, // show fallback while loading / on error
  });
};
