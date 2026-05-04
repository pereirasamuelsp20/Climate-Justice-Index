import { useQuery } from '@tanstack/react-query';
import { fetchClimateData } from '../api';
import type { ClimateData } from '../api';

// Normalised fallback data (matches the snake_case API interface)
const FALLBACK_DATA: ClimateData[] = [
  { id:'1', name:'Chad',          iso2:'TD', region:'Africa',        emissions_per_capita:0.1,  vulnerability_score:0.85, population:16000000,    gdp_per_capita:700,   gdp_quartile:1, emissions_share_pct:0.05, injustice_score:17.0 },
  { id:'2', name:'United States', iso2:'US', region:'North America', emissions_per_capita:14.7, vulnerability_score:0.28, population:331000000,   gdp_per_capita:63000, gdp_quartile:4, emissions_share_pct:14.5, injustice_score:0.02 },
  { id:'3', name:'India',         iso2:'IN', region:'Asia',          emissions_per_capita:1.8,  vulnerability_score:0.65, population:1380000000,  gdp_per_capita:2100,  gdp_quartile:2, emissions_share_pct:7.0,  injustice_score:0.09 },
  { id:'4', name:'Germany',       iso2:'DE', region:'Europe',        emissions_per_capita:8.5,  vulnerability_score:0.15, population:83000000,    gdp_per_capita:48000, gdp_quartile:4, emissions_share_pct:2.1,  injustice_score:0.07 },
  { id:'5', name:'Brazil',        iso2:'BR', region:'Latin America', emissions_per_capita:2.3,  vulnerability_score:0.45, population:212000000,   gdp_per_capita:8700,  gdp_quartile:3, emissions_share_pct:1.5,  injustice_score:0.30 },
  { id:'6', name:'Australia',     iso2:'AU', region:'Oceania',       emissions_per_capita:15.1, vulnerability_score:0.25, population:25000000,    gdp_per_capita:55000, gdp_quartile:4, emissions_share_pct:1.2,  injustice_score:0.21 },
  { id:'7', name:'China',         iso2:'CN', region:'Asia',          emissions_per_capita:7.4,  vulnerability_score:0.40, population:1400000000,  gdp_per_capita:10500, gdp_quartile:3, emissions_share_pct:28.0, injustice_score:0.01 },
  { id:'8', name:'Somalia',       iso2:'SO', region:'Africa',        emissions_per_capita:0.05, vulnerability_score:0.88, population:15000000,    gdp_per_capita:300,   gdp_quartile:1, emissions_share_pct:0.02, injustice_score:44.0 },
  { id:'9', name:'Norway',        iso2:'NO', region:'Europe',        emissions_per_capita:7.2,  vulnerability_score:0.12, population:5300000,     gdp_per_capita:75000, gdp_quartile:4, emissions_share_pct:0.1,  injustice_score:1.20 },
];

export const useClimateData = () => {
  return useQuery<ClimateData[]>({
    queryKey: ['climateData'],
    queryFn: fetchClimateData,
    staleTime: 10_000,            // 10-second buffer before refetch
    refetchInterval: 2 * 60_000,  // Auto-poll every 2 minutes for live data
    retry: 2,
    placeholderData: FALLBACK_DATA, // show fallback while loading / on error
  });
};
