import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RefreshCw, Shield, CalendarIcon, FileText } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { User } from "@supabase/supabase-js";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PoltronaStats {
  poltrona_id: string;
  total: number;
  ativacoes: number;
}

const Relatorios = () => {
  const [user, setUser] = useState<User | null>(null);
  const { isAdmin, isLoading: roleLoading } = useUserRole(user);
  const [stats, setStats] = useState<PoltronaStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  useEffect(() => {
    if (isAdmin && !dateFrom && !dateTo) {
      fetchStats();
    }
  }, [isAdmin]);

  const fetchStats = async () => {
    try {
      let query = supabase
        .from("payments")
        .select("poltrona_id, amount, created_at")
        .eq("status", "approved");

      // Aplicar filtro de data se definido
      if (dateFrom) {
        query = query.gte("created_at", format(dateFrom, "yyyy-MM-dd"));
      }
      if (dateTo) {
        // Adiciona um dia e usa 'lt' para incluir todo o dia final
        const nextDay = new Date(dateTo);
        nextDay.setDate(nextDay.getDate() + 1);
        query = query.lt("created_at", format(nextDay, "yyyy-MM-dd"));
      }

      const { data: payments, error } = await query;

      if (error) {
        if (error.code === '42501') {
          setLoading(false);
          return;
        }
        throw error;
      }

      // Agrupar por poltrona
      const grouped = payments?.reduce((acc: Record<string, PoltronaStats>, p) => {
        if (!acc[p.poltrona_id]) {
          acc[p.poltrona_id] = {
            poltrona_id: p.poltrona_id,
            total: 0,
            ativacoes: 0,
          };
        }
        acc[p.poltrona_id].total += p.amount;
        acc[p.poltrona_id].ativacoes += 1;
        return acc;
      }, {}) || {};

      setStats(Object.values(grouped).sort((a, b) => b.total - a.total));
    } catch (error: any) {
      toast.error("Erro ao carregar estatísticas");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const totalGeral = stats.reduce((sum, s) => sum + s.total, 0);
  const totalAtivacoes = stats.reduce((sum, s) => sum + s.ativacoes, 0);

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
          Apenas administradores podem acessar os relatórios.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Relatórios</h1>
          <p className="text-muted-foreground">
            Análises e estatísticas detalhadas
          </p>
        </div>

        {/* Filtros de Data */}
        <div className="flex flex-wrap gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal",
                  !dateFrom && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateFrom ? format(dateFrom, "dd/MM/yyyy", { locale: ptBR }) : "Data inicial"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={dateFrom}
                onSelect={setDateFrom}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal",
                  !dateTo && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateTo ? format(dateTo, "dd/MM/yyyy", { locale: ptBR }) : "Data final"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={dateTo}
                onSelect={setDateTo}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Button 
            onClick={() => fetchStats()}
            disabled={loading || (!dateFrom && !dateTo)}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            Gerar Relatório
          </Button>

          {(dateFrom || dateTo) && (
            <Button
              variant="ghost"
              onClick={() => {
                setDateFrom(undefined);
                setDateTo(undefined);
                fetchStats();
              }}
            >
              Limpar Filtros
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Faturamento Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              R$ {totalGeral.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Ativações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAtivacoes}</div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ticket Médio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R${" "}
              {totalAtivacoes > 0
                ? (totalGeral / totalAtivacoes).toFixed(2)
                : "0.00"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Faturamento por Poltrona</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">
              Carregando...
            </p>
          ) : stats.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum dado disponível ainda
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Poltrona</TableHead>
                  <TableHead className="text-right">Ativações</TableHead>
                  <TableHead className="text-right">Faturamento Total</TableHead>
                  <TableHead className="text-right">Média por Uso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map((stat) => (
                  <TableRow key={stat.poltrona_id}>
                    <TableCell className="font-medium">
                      {stat.poltrona_id}
                    </TableCell>
                    <TableCell className="text-right">
                      {stat.ativacoes}
                    </TableCell>
                    <TableCell className="text-right font-bold text-accent">
                      R$ {stat.total.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      R$ {(stat.total / stat.ativacoes).toFixed(2)}
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

export default Relatorios;
