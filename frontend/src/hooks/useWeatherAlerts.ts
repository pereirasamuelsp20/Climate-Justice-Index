import { useQuery } from '@tanstack/react-query';
import { fetchWeatherAlerts } from '../api';
import type { WeatherAlert } from '../api';
import { useAppStore } from '../store/useAppStore';

export const useWeatherAlerts = () => {
  const regionFilter = useAppStore((state) => state.regionFilter);

  return useQuery<WeatherAlert[]>({
    queryKey: ['weatherAlerts', regionFilter],
    queryFn: () => fetchWeatherAlerts(regionFilter),
    staleTime: 10_000,            // 10-second buffer before refetch
    refetchInterval: 2 * 60_000,  // Auto-poll every 2 minutes for live alerts
  });
};
