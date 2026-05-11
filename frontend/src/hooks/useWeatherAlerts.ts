import { useQuery } from '@tanstack/react-query';
import { fetchWeatherAlerts } from '../api';
import type { WeatherAlert } from '../api';
import { useAppStore } from '../store/useAppStore';

export const useWeatherAlerts = () => {
  const regionFilter = useAppStore((state) => state.regionFilter);

  return useQuery<WeatherAlert[]>({
    queryKey: ['weatherAlerts', regionFilter],
    queryFn: () => fetchWeatherAlerts(regionFilter),
    staleTime: 5 * 60_000,        // 5-minute buffer before refetch
    refetchInterval: 5 * 60_000,  // Auto-poll every 5 minutes (alerts aggregated by cron)
  });
};
