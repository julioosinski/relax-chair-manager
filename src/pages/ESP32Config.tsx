import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, Settings, TestTube, RefreshCw } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ESP32StatusCard } from "@/components/ESP32StatusCard";

export default function ESP32Config() {
  const queryClient = useQueryClient();
  const [testingId, setTestingId] = useState<string | null>(null);

  const { data: poltronas, isLoading } = useQuery({
    queryKey: ["poltronas-with-status"],
    queryFn: async () => {
      const { data: poltronasData, error: poltronasError } = await supabase
        .from("poltronas")
        .select("*")
        .order("poltrona_id");

      if (poltronasError) throw poltronasError;

      const { data: statusData, error: statusError } = await supabase
        .from("poltrona_status")
        .select("*");

      if (statusError) throw statusError;

      return poltronasData.map(poltrona => ({
        ...poltrona,
        status: statusData.find(s => s.poltrona_id === poltrona.poltrona_id)
      }));
    },
    refetchInterval: 10000 // Atualiza a cada 10 segundos
  });

  const testMutation = useMutation({
    mutationFn: async (poltronaId: string) => {
      const { data, error } = await supabase.functions.invoke('test-esp32-relay', {
        body: { poltrona_id: poltronaId }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Teste enviado! Verifique os relés da poltrona.");
      setTestingId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao testar poltrona");
      setTestingId(null);
    }
  });

  const handleTest = (poltronaId: string) => {
    setTestingId(poltronaId);
    testMutation.mutate(poltronaId);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["poltronas-with-status"] });
    toast.success("Status atualizado");
  };

  const getOnlineStatus = (status: any) => {
    if (!status) return false;
    const lastPing = new Date(status.last_ping);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastPing.getTime()) / 1000 / 60;
    return status.is_online && diffMinutes < 2; // Online se último ping foi há menos de 2 minutos
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Configuração ESP32</h1>
            <p className="text-muted-foreground mt-2">
              Configure e monitore os dispositivos ESP32 das poltronas
            </p>
          </div>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
        </div>

        {/* Wizard de Configuração */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Como Configurar um Novo ESP32
            </CardTitle>
            <CardDescription>
              Siga os passos abaixo para configurar um dispositivo ESP32
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  1
                </div>
                <div>
                  <h3 className="font-semibold">Conecte o ESP32 à alimentação</h3>
                  <p className="text-sm text-muted-foreground">
                    Use uma fonte 5V através da porta USB ou pino VIN
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  2
                </div>
                <div>
                  <h3 className="font-semibold">Conecte-se à rede WiFi do ESP32</h3>
                  <p className="text-sm text-muted-foreground">
                    Procure uma rede chamada "Poltrona-Massagem-XXXXXX" no seu smartphone ou computador
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    <strong>Senha:</strong> 12345678
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  3
                </div>
                <div>
                  <h3 className="font-semibold">Acesse o portal de configuração</h3>
                  <p className="text-sm text-muted-foreground">
                    Abra o navegador e vá para: <code className="bg-muted px-2 py-1 rounded">http://192.168.4.1</code>
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  4
                </div>
                <div>
                  <h3 className="font-semibold">Preencha as configurações</h3>
                  <div className="space-y-2 mt-2 text-sm text-muted-foreground">
                    <p><strong>WiFi SSID:</strong> Nome da sua rede WiFi</p>
                    <p><strong>WiFi Senha:</strong> Senha da sua rede WiFi</p>
                    <p><strong>Supabase URL:</strong> (já preenchido automaticamente)</p>
                    <p><strong>Supabase Key:</strong> (já preenchido automaticamente)</p>
                    <p><strong>Poltrona ID:</strong> Selecione da lista de poltronas cadastradas</p>
                    <p><strong>Duração:</strong> Tempo de massagem em segundos (padrão: 900)</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  5
                </div>
                <div>
                  <h3 className="font-semibold">Salve e aguarde</h3>
                  <p className="text-sm text-muted-foreground">
                    O ESP32 irá reiniciar e conectar à sua rede WiFi. Após alguns segundos, 
                    ele aparecerá como "Online" na lista abaixo.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de ESP32s */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Dispositivos Cadastrados</h2>
          
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando dispositivos...
            </div>
          ) : poltronas && poltronas.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {poltronas.map((poltrona) => {
                const isOnline = getOnlineStatus(poltrona.status);
                
                return (
                  <ESP32StatusCard
                    key={poltrona.id}
                    poltrona={poltrona}
                    isOnline={isOnline}
                    onTest={handleTest}
                    isTesting={testingId === poltrona.poltrona_id}
                  />
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhuma poltrona cadastrada. Cadastre uma poltrona primeiro na página "Poltronas".
              </CardContent>
            </Card>
          )}
        </div>

        {/* Informações Técnicas */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Técnicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Pinout dos Relés</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="bg-muted p-3 rounded">
                  <p className="font-semibold">Relé 1</p>
                  <p className="text-muted-foreground">GPIO 2</p>
                </div>
                <div className="bg-muted p-3 rounded">
                  <p className="font-semibold">Relé 2</p>
                  <p className="text-muted-foreground">GPIO 4</p>
                </div>
                <div className="bg-muted p-3 rounded">
                  <p className="font-semibold">Relé 3</p>
                  <p className="text-muted-foreground">GPIO 5</p>
                </div>
                <div className="bg-muted p-3 rounded">
                  <p className="font-semibold">Relé 4</p>
                  <p className="text-muted-foreground">GPIO 18</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Endpoints HTTP do ESP32</h3>
              <div className="space-y-2 text-sm">
                <p><code className="bg-muted px-2 py-1 rounded">GET /</code> - Página inicial com informações</p>
                <p><code className="bg-muted px-2 py-1 rounded">GET /status</code> - Status em JSON</p>
                <p><code className="bg-muted px-2 py-1 rounded">POST /payment-approved</code> - Recebe notificação de pagamento</p>
                <p><code className="bg-muted px-2 py-1 rounded">POST /test</code> - Teste de relés (10 segundos)</p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Heartbeat</h3>
              <p className="text-sm text-muted-foreground">
                O ESP32 envia um heartbeat a cada 60 segundos para atualizar o status de 
                conexão. Se não houver heartbeat por mais de 2 minutos, o dispositivo é 
                marcado como offline.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
