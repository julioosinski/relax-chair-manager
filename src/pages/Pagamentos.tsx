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
import { Badge } from "@/components/ui/badge";

interface Payment {
  payment_id: number;
  poltrona_id: string;
  amount: number;
  status: string;
  created_at: string;
  approved_at: string;
}

const Pagamentos = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar pagamentos");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      approved: "default",
      pending: "secondary",
      rejected: "destructive",
    };

    return (
      <Badge variant={variants[status] || "secondary"} className="capitalize">
        {status === "approved" ? "Aprovado" : status === "pending" ? "Pendente" : "Rejeitado"}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Pagamentos</h1>
        <p className="text-muted-foreground">
          Histórico completo de transações
        </p>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Todas as Transações</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">
              Carregando...
            </p>
          ) : payments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum pagamento encontrado
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Poltrona</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead>Aprovado em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.payment_id}>
                      <TableCell className="font-mono text-sm">
                        #{payment.payment_id}
                      </TableCell>
                      <TableCell className="font-medium">
                        {payment.poltrona_id}
                      </TableCell>
                      <TableCell className="text-accent font-bold">
                        R$ {payment.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(payment.created_at).toLocaleDateString("pt-BR")}{" "}
                        {new Date(payment.created_at).toLocaleTimeString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {payment.approved_at
                          ? `${new Date(payment.approved_at).toLocaleDateString(
                              "pt-BR"
                            )} ${new Date(payment.approved_at).toLocaleTimeString(
                              "pt-BR"
                            )}`
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Pagamentos;
