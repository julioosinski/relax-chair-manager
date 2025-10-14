import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Relatorios = () => {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Relatórios</h1>
        <p className="text-muted-foreground">
          Análises e estatísticas detalhadas
        </p>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Relatórios em Desenvolvimento</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Gráficos e relatórios detalhados serão adicionados em breve
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Relatorios;
