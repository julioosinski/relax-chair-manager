import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, RefreshCw, Plus, Wrench, Calendar } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { User } from "@supabase/supabase-js";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuditLog } from "@/hooks/useAuditLog";

interface Maintenance {
  id: string;
  poltrona_id: string;
  maintenance_type: string;
  description: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

const Manutencao = () => {
  const [user, setUser] = useState<User | null>(null);
  const { isAdmin, isLoading: roleLoading } = useUserRole(user);
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [poltronas, setPoltronas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { logAction } = useAuditLog();

  const [formData, setFormData] = useState({
    poltrona_id: "",
    maintenance_type: "",
    description: "",
    scheduled_at: "",
    status: "scheduled",
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchMaintenances();
      fetchPoltronas();
    }
  }, [isAdmin]);

  const fetchMaintenances = async () => {
    try {
      const { data, error } = await supabase
        .from("poltrona_maintenance")
        .select("*")
        .order("scheduled_at", { ascending: false });

      if (error) throw error;
      setMaintenances(data || []);
    } catch (error: any) {
      console.error("Error fetching maintenances:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPoltronas = async () => {
    const { data } = await supabase.from("poltronas").select("poltrona_id, location");
    setPoltronas(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase.from("poltrona_maintenance").insert({
        ...formData,
        performed_by: user?.id,
      });

      if (error) throw error;

      await logAction({
        action: "CREATE",
        entity_type: "maintenance",
        new_values: formData,
      });

      toast.success("✅ Manutenção agendada com sucesso");
      setDialogOpen(false);
      fetchMaintenances();
      setFormData({
        poltrona_id: "",
        maintenance_type: "",
        description: "",
        scheduled_at: "",
        status: "scheduled",
      });
    } catch (error: any) {
      toast.error("Erro ao agendar manutenção");
    }
  };

  const markAsCompleted = async (id: string) => {
    try {
      const { error } = await supabase
        .from("poltrona_maintenance")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      await logAction({
        action: "UPDATE",
        entity_type: "maintenance",
        entity_id: id,
        new_values: { status: "completed" },
      });

      toast.success("✅ Manutenção marcada como concluída");
      fetchMaintenances();
    } catch (error: any) {
      toast.error("Erro ao atualizar manutenção");
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      scheduled: "bg-blue-100 text-blue-800",
      in_progress: "bg-yellow-100 text-yellow-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };

    const labels: Record<string, string> = {
      scheduled: "Agendado",
      in_progress: "Em Progresso",
      completed: "Concluído",
      cancelled: "Cancelado",
    };

    return (
      <Badge className={colors[status] || "bg-gray-100 text-gray-800"}>
        {labels[status] || status}
      </Badge>
    );
  };

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <Shield className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Acesso Restrito</h1>
        <p className="text-muted-foreground">
          Apenas administradores podem acessar a manutenção.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Manutenção de Poltronas</h1>
          <p className="text-muted-foreground">
            Gerencie e agende manutenções preventivas e corretivas
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Manutenção
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agendar Manutenção</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Poltrona</Label>
                <Select
                  value={formData.poltrona_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, poltrona_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma poltrona" />
                  </SelectTrigger>
                  <SelectContent>
                    {poltronas.map((p) => (
                      <SelectItem key={p.poltrona_id} value={p.poltrona_id}>
                        {p.poltrona_id} - {p.location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Manutenção</Label>
                <Select
                  value={formData.maintenance_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, maintenance_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preventiva">Preventiva</SelectItem>
                    <SelectItem value="corretiva">Corretiva</SelectItem>
                    <SelectItem value="limpeza">Limpeza</SelectItem>
                    <SelectItem value="calibracao">Calibração</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data/Hora Agendada</Label>
                <Input
                  type="datetime-local"
                  value={formData.scheduled_at}
                  onChange={(e) =>
                    setFormData({ ...formData, scheduled_at: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Descreva o que precisa ser feito..."
                />
              </div>

              <Button type="submit" className="w-full">
                Agendar Manutenção
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Manutenções Programadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">
              Carregando...
            </p>
          ) : maintenances.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma manutenção agendada
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Poltrona</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Data Agendada</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {maintenances.map((maintenance) => (
                  <TableRow key={maintenance.id}>
                    <TableCell className="font-medium">
                      {maintenance.poltrona_id}
                    </TableCell>
                    <TableCell className="capitalize">
                      {maintenance.maintenance_type}
                    </TableCell>
                    <TableCell>
                      {maintenance.scheduled_at
                        ? new Date(maintenance.scheduled_at).toLocaleString(
                            "pt-BR"
                          )
                        : "-"}
                    </TableCell>
                    <TableCell>{getStatusBadge(maintenance.status)}</TableCell>
                    <TableCell>
                      {maintenance.status === "scheduled" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => markAsCompleted(maintenance.id)}
                        >
                          Concluir
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Manutencao;
