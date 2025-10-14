import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
  const [stats, setStats] = useState<PoltronaStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data: payments, error } = await supabase
        .from("payments")
        .select("poltrona_id, amount")
        .eq("status", "approved");

      if (error) throw error;

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

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Relatórios</h1>
        <p className="text-muted-foreground">
          Análises e estatísticas detalhadas
        </p>
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
