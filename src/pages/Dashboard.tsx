import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Activity, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Stats {
  faturamentoHoje: number;
  faturamento7Dias: number;
  totalAtivacoes: number;
  valorMedio: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<Stats>({
    faturamentoHoje: 0,
    faturamento7Dias: 0,
    totalAtivacoes: 0,
    valorMedio: 0,
  });

  const [recentPayments, setRecentPayments] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
    fetchRecentPayments();

    // Poll for new payments every 10 seconds
    const interval = setInterval(() => {
      checkNewPayments();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const { data: payments, error } = await supabase
        .from("payments")
        .select("*")
        .eq("status", "approved");

      if (error) throw error;

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      const todayPayments = payments?.filter(
        (p) => new Date(p.approved_at) >= today
      ) || [];
      const last7DaysPayments = payments?.filter(
        (p) => new Date(p.approved_at) >= sevenDaysAgo
      ) || [];

      const faturamentoHoje = todayPayments.reduce((sum, p) => sum + p.amount, 0);
      const faturamento7Dias = last7DaysPayments.reduce((sum, p) => sum + p.amount, 0);
      const totalAtivacoes = payments?.length || 0;
      const valorMedio = totalAtivacoes > 0 ? faturamento7Dias / totalAtivacoes : 0;

      setStats({
        faturamentoHoje,
        faturamento7Dias,
        totalAtivacoes,
        valorMedio,
      });
    } catch (error: any) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchRecentPayments = async () => {
    try {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentPayments(data || []);
    } catch (error: any) {
      console.error("Error fetching recent payments:", error);
    }
  };

  const checkNewPayments = async () => {
    try {
      const lastPayment = recentPayments[0];
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("status", "approved")
        .order("approved_at", { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0 && lastPayment) {
        const newPayment = data[0];
        if (newPayment.payment_id !== lastPayment.payment_id) {
          toast.success(
            `💰 Pagamento aprovado - Poltrona ${newPayment.poltrona_id} liberada`,
            {
              duration: 5000,
            }
          );
          fetchStats();
          fetchRecentPayments();
        }
      }
    } catch (error: any) {
      console.error("Error checking new payments:", error);
    }
  };

  const statCards = [
    {
      title: "Faturamento Hoje",
      value: `R$ ${stats.faturamentoHoje.toFixed(2)}`,
      icon: DollarSign,
      gradient: "bg-gradient-primary",
    },
    {
      title: "Últimos 7 Dias",
      value: `R$ ${stats.faturamento7Dias.toFixed(2)}`,
      icon: TrendingUp,
      gradient: "bg-gradient-accent",
    },
    {
      title: "Total de Ativações",
      value: stats.totalAtivacoes.toString(),
      icon: Activity,
      gradient: "bg-gradient-card",
    },
    {
      title: "Valor Médio",
      value: `R$ ${stats.valorMedio.toFixed(2)}`,
      icon: Clock,
      gradient: "bg-gradient-card",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral do sistema de poltronas
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card
            key={index}
            className="border-border bg-card hover:shadow-glow transition-all duration-300"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.gradient}`}>
                <stat.icon className="h-4 w-4 text-primary-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Últimas Transações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentPayments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma transação encontrada
              </p>
            ) : (
              recentPayments.map((payment) => (
                <div
                  key={payment.payment_id}
                  className="flex items-center justify-between p-4 rounded-lg bg-background border border-border hover:border-primary transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Poltrona {payment.poltrona_id}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(payment.created_at).toLocaleDateString("pt-BR")} às{" "}
                        {new Date(payment.created_at).toLocaleTimeString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-accent">
                      R$ {payment.amount.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {payment.status}
                    </p>
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

export default Dashboard;
