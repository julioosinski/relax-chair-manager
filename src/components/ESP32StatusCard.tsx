import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, TestTube, Clock, Signal } from "lucide-react";

interface ESP32StatusCardProps {
  poltrona: any;
  isOnline: boolean;
  onTest: (poltronaId: string) => void;
  isTesting: boolean;
}

export function ESP32StatusCard({ poltrona, isOnline, onTest, isTesting }: ESP32StatusCardProps) {
  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatLastPing = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffSeconds < 60) return `${diffSeconds}s atrás`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m atrás`;
    return `${Math.floor(diffSeconds / 3600)}h atrás`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{poltrona.poltrona_id}</CardTitle>
          <Badge variant={isOnline ? "default" : "destructive"}>
            {isOnline ? (
              <>
                <Wifi className="mr-1 h-3 w-3" />
                Online
              </>
            ) : (
              <>
                <WifiOff className="mr-1 h-3 w-3" />
                Offline
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">IP:</span>
            <span className="font-mono">{poltrona.ip || "N/A"}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Localização:</span>
            <span>{poltrona.location}</span>
          </div>

          {poltrona.status && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Firmware:</span>
                <span className="font-mono">{poltrona.status.firmware_version || "N/A"}</span>
              </div>

              {poltrona.status.last_ping && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Último Ping:
                  </span>
                  <span>{formatLastPing(poltrona.status.last_ping)}</span>
                </div>
              )}

              {poltrona.status.wifi_signal && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Signal className="h-3 w-3" />
                    Sinal WiFi:
                  </span>
                  <span>{poltrona.status.wifi_signal} dBm</span>
                </div>
              )}

              {poltrona.status.uptime_seconds && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Uptime:</span>
                  <span>{formatUptime(poltrona.status.uptime_seconds)}</span>
                </div>
              )}
            </>
          )}
        </div>

        <Button
          onClick={() => onTest(poltrona.poltrona_id)}
          disabled={!isOnline || isTesting}
          variant="outline"
          className="w-full"
        >
          <TestTube className="mr-2 h-4 w-4" />
          {isTesting ? "Testando..." : "Testar Massagem (10s)"}
        </Button>

        {poltrona.status?.error_message && (
          <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
            {poltrona.status.error_message}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
