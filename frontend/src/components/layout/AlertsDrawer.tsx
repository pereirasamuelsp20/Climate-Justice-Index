import { useAppStore } from '../../store/useAppStore';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet';
import { useWeatherAlerts } from '../../hooks/useWeatherAlerts';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { AlertTriangle, CloudRain, Flame, Wind, Waves, X } from 'lucide-react';

const getIcon = (type: string) => {
  switch (type) {
    case 'Rain': return <CloudRain className="h-5 w-5 text-blue-400" />;
    case 'Extreme Heat': return <Flame className="h-5 w-5 text-red-400" />;
    case 'Storm': return <Wind className="h-5 w-5 text-slate-400" />;
    case 'Flood': return <Waves className="h-5 w-5 text-cyan-400" />;
    default: return <AlertTriangle className="h-5 w-5 text-amber-400" />;
  }
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'Critical': return 'bg-red-500/10 text-red-400 border-red-500/20';
    case 'High': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
    case 'Medium': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    default: return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  }
};

export function AlertsDrawer() {
  const { alertsDrawerOpen, toggleAlertsDrawer, regionFilter, localAlerts, dismissedAlertIds, dismissAlert, removeLocalAlert } = useAppStore();
  const { data: alerts = [], isLoading } = useWeatherAlerts();
  
  const allAlerts = [...localAlerts, ...alerts].filter(a => !dismissedAlertIds.includes(a.id));

  const handleDismiss = (id: string) => {
    if (id.startsWith('local-alert-')) {
      removeLocalAlert(id);
    } else {
      dismissAlert(id);
    }
  };

  return (
    <Sheet open={alertsDrawerOpen} onOpenChange={toggleAlertsDrawer}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto bg-[#0c0e14]/95 backdrop-blur-2xl border-l border-white/6">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-xl font-semibold flex items-center gap-2 text-white">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            Active Alerts
            {regionFilter && <span className="text-slate-500 text-sm font-normal">— {regionFilter}</span>}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-40 bg-white/3 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : allAlerts.length === 0 ? (
            <div className="text-center py-12 text-slate-500 flex flex-col items-center">
              <CloudRain className="h-12 w-12 text-slate-700 mb-4" />
              <p className="text-sm">No active alerts{regionFilter ? ` in ${regionFilter}` : ''}.</p>
              <p className="text-xs text-slate-600 mt-1">Select a region to see localized alerts.</p>
            </div>
          ) : (
            allAlerts.map((alert) => (
              <Card key={alert.id} className="p-4 bg-[#161923] border-white/6 overflow-hidden relative">
                {/* Severity left indicator */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${getSeverityColor(alert.severity).split(' ')[0]}`} />
                
                <div className="absolute top-2 right-2">
                  <button 
                    onClick={() => handleDismiss(alert.id)}
                    className="p-1.5 text-slate-500 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="flex justify-between items-start mb-3 ml-2 pr-8">
                  <div className="flex items-center gap-2">
                    {getIcon(alert.alert_type)}
                    <span className="font-semibold text-white">{alert.alert_type}</span>
                  </div>
                  <Badge variant="outline" className={getSeverityColor(alert.severity)}>
                    {alert.severity}
                  </Badge>
                </div>

                {/* Source Array */}
                <div className="grid grid-cols-3 gap-2 mt-4 text-xs text-center border-t border-white/6 pt-3">
                  <div>
                    <div className="text-slate-500 mb-1">OpenWeather</div>
                    <div className="font-medium text-slate-300">{alert.source_data?.OpenWeatherMap || 'N/A'}</div>
                  </div>
                  <div className="border-l border-white/6 pl-2">
                    <div className="text-slate-500 mb-1">Tomorrow.io</div>
                    <div className="font-medium text-slate-300">{alert.source_data?.TomorrowIO || 'N/A'}</div>
                  </div>
                  <div className="border-l border-white/6 pl-2">
                    <div className="text-slate-500 mb-1">NOAA</div>
                    <div className="font-medium text-slate-300">{alert.source_data?.NOAA || 'N/A'}</div>
                  </div>
                </div>

                {/* Metadata */}
                <div className="flex justify-between items-center mt-4 text-xs text-slate-500 border-t border-white/6 pt-3">
                  <div>
                    {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600">Confidence:</span>
                    <div className="w-16 h-1.5 bg-white/6 rounded-full overflow-hidden flex">
                      <div 
                        className={`h-full rounded-full ${alert.confidence_score > 0.7 ? 'bg-blue-500' : 'bg-amber-500'}`}
                        style={{ width: `${Math.round(alert.confidence_score * 100)}%` }}
                      />
                    </div>
                    <span className="font-medium text-slate-300">{Math.round(alert.confidence_score * 100)}%</span>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
