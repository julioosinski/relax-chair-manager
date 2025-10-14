import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Log {
  id: number;
  poltrona_id: string;
  message: string;
  created_at: string;
}

const Logs = () => {
  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => {
    fetchLogs();

    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      console.error("Error fetching logs:", error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Logs do Sistema</h1>
        <p className="text-muted-foreground">
          Monitoramento em tempo real - atualiza a cada 10s
        </p>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Histórico de Eventos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum log encontrado
              </p>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className={`p-3 rounded-lg border ${
                    log.message.toLowerCase().includes("error")
                      ? "border-destructive bg-destructive/10"
                      : "border-border bg-background"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-medium">
                          {log.poltrona_id}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleString("pt-BR")}
                        </span>
                      </div>
                      <p
                        className={`text-sm ${
                          log.message.toLowerCase().includes("error")
                            ? "text-destructive"
                            : "text-foreground"
                        }`}
                      >
                        {log.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Logs;
