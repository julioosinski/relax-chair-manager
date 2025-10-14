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
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p className="text-muted-foreground text-lg">
          Visão geral do sistema de poltronas de massagem
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <Card
            key={index}
            className="card-hover border-border bg-card/50 backdrop-blur-sm"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                {stat.title}
              </CardTitle>
              <div className={`p-3 rounded-xl ${stat.gradient} shadow-lg`}>
                <stat.icon className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" />
            Últimas Transações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentPayments.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground text-lg">
                  Nenhuma transação encontrada
                </p>
                <p className="text-muted-foreground/70 text-sm mt-2">
                  As transações aparecerão aqui quando houver pagamentos
                </p>
              </div>
            ) : (
              recentPayments.map((payment) => (
                <div
                  key={payment.payment_id}
                  className="flex items-center justify-between p-5 rounded-xl bg-background/50 border border-border hover:border-primary/50 hover:shadow-lg transition-all duration-300 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center shadow-lg">
                      <DollarSign className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg">Poltrona {payment.poltrona_id}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(payment.created_at).toLocaleDateString("pt-BR")} às{" "}
                        {new Date(payment.created_at).toLocaleTimeString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-2xl text-accent">
                      R$ {payment.amount.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize bg-accent/10 px-2 py-1 rounded-full">
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
