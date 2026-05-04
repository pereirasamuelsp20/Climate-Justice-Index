import { useQuery } from '@tanstack/react-query';
import { fetchWeatherAlerts } from '../api';
import type { WeatherAlert } from '../api';
import { useAppStore } from '../store/useAppStore';

export const useWeatherAlerts = () => {
  const regionFilter = useAppStore((state) => state.regionFilter);

  return useQuery<WeatherAlert[]>({
    queryKey: ['weatherAlerts', regionFilter],
    queryFn: () => fetchWeatherAlerts(regionFilter),
    staleTime: 10 * 60 * 1000, // 10 minutes stale time as requested
  });
};
