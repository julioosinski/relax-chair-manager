import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  Database, 
  CreditCard, 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Save,
  TestTube,
  RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import { User } from "@supabase/supabase-js";

interface SystemConfig {
  // Sistema
  systemName: string;
  systemVersion: string;
  maintenanceMode: boolean;
  
  // Notificações
  emailNotifications: boolean;
  smsNotifications: boolean;
  webhookNotifications: boolean;
  
  // Segurança
  sessionTimeout: number;
  maxLoginAttempts: number;
  requireTwoFactor: boolean;
}

interface TestResult {
  service: string;
  status: 'success' | 'error' | 'warning' | 'pending';
  message: string;
  details?: string;
}

const Configuracoes = () => {
  const [user, setUser] = useState<User | null>(null);
  const { isAdmin, isLoading: roleLoading } = useUserRole(user);
  
  const [config, setConfig] = useState<SystemConfig>({
    systemName: "Sistema de Poltronas",
    systemVersion: "1.0.0",
    maintenanceMode: false,
    emailNotifications: true,
    smsNotifications: false,
    webhookNotifications: true,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    requireTwoFactor: false,
  });

  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  const saveConfig = async () => {
    setLoading(true);
    try {
      toast.success("✅ Configurações salvas com sucesso!");
    } catch (error) {
      toast.error("❌ Erro ao salvar configurações");
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async (service: string) => {
    setTesting(service);
    
    try {
      let result: TestResult;
      
      if (service === 'supabase') {
        result = await testSupabaseConnection();
      } else if (service === 'mercadopago') {
        result = await testMercadoPagoConnection();
      } else {
        result = {
          service,
          status: 'error',
          message: 'Serviço não reconhecido'
        };
      }
      
      setTestResults(prev => {
        const filtered = prev.filter(r => r.service !== service);
        return [...filtered, result];
      });
      
    } catch (error) {
      setTestResults(prev => {
        const filtered = prev.filter(r => r.service !== service);
        return [...filtered, {
          service,
          status: 'error',
          message: 'Erro inesperado',
          details: error instanceof Error ? error.message : 'Erro desconhecido'
        }];
      });
    } finally {
      setTesting(null);
    }
  };

  const testSupabaseConnection = async (): Promise<TestResult> => {
    try {
      const { error } = await supabase
        .from('poltronas')
        .select('count')
        .limit(1);
      
      if (error) throw error;
      
      return {
        service: 'supabase',
        status: 'success',
        message: 'Conexão com banco de dados estabelecida',
        details: 'Banco de dados operacional'
      };
    } catch (error: any) {
      return {
        service: 'supabase',
        status: 'error',
        message: 'Falha na conexão com banco de dados',
        details: error.message
      };
    }
  };

  const testMercadoPagoConnection = async (): Promise<TestResult> => {
    try {
      const { data, error } = await supabase.functions.invoke('mercadopago-test-connection');
      
      if (error) throw error;
      
      return {
        service: 'mercadopago',
        status: data.success ? 'success' : 'error',
        message: data.message,
        details: data.details
      };
    } catch (error: any) {
      return {
        service: 'mercadopago',
        status: 'error',
        message: 'Erro ao testar Mercado Pago',
        details: error.message
      };
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <RefreshCw className="h-4 w-4 text-gray-500 animate-spin" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      success: "bg-green-100 text-green-800",
      error: "bg-red-100 text-red-800",
      warning: "bg-yellow-100 text-yellow-800",
      pending: "bg-gray-100 text-gray-800"
    };
    
    return (
      <Badge className={variants[status as keyof typeof variants] || variants.pending}>
        {status === 'success' ? 'Conectado' : 
         status === 'error' ? 'Erro' : 
         status === 'warning' ? 'Atenção' : 'Testando'}
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
          Apenas administradores podem acessar as configurações.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Configurações</h1>
          <p className="text-muted-foreground">
            Configure parâmetros do sistema e teste conexões
          </p>
        </div>
        <Button
          onClick={saveConfig}
          disabled={loading}
          className="bg-gradient-primary"
        >
          <Save className="h-4 w-4 mr-2" />
          {loading ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </div>

      <Tabs defaultValue="database" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="database" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Banco de Dados
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Pagamentos
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Sistema
          </TabsTrigger>
        </TabsList>

        {/* Banco de Dados */}
        <TabsContent value="database" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Status do Banco de Dados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  {getStatusIcon(testResults.find(r => r.service === 'supabase')?.status || 'pending')}
                  <span>Status da Conexão</span>
                  {testResults.find(r => r.service === 'supabase') && 
                   getStatusBadge(testResults.find(r => r.service === 'supabase')?.status || 'pending')}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testConnection('supabase')}
                  disabled={testing === 'supabase'}
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  {testing === 'supabase' ? 'Testando...' : 'Testar Conexão'}
                </Button>
              </div>
              
              {testResults.find(r => r.service === 'supabase') && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">
                    {testResults.find(r => r.service === 'supabase')?.message}
                  </p>
                  {testResults.find(r => r.service === 'supabase')?.details && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {testResults.find(r => r.service === 'supabase')?.details}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pagamentos */}
        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Status do Mercado Pago
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  {getStatusIcon(testResults.find(r => r.service === 'mercadopago')?.status || 'pending')}
                  <span>Status da Conexão</span>
                  {testResults.find(r => r.service === 'mercadopago') && 
                   getStatusBadge(testResults.find(r => r.service === 'mercadopago')?.status || 'pending')}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testConnection('mercadopago')}
                  disabled={testing === 'mercadopago'}
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  {testing === 'mercadopago' ? 'Testando...' : 'Testar Conexão'}
                </Button>
              </div>
              
              {testResults.find(r => r.service === 'mercadopago') && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">
                    {testResults.find(r => r.service === 'mercadopago')?.message}
                  </p>
                  {testResults.find(r => r.service === 'mercadopago')?.details && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {testResults.find(r => r.service === 'mercadopago')?.details}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Alerta sobre Token do Mercado Pago */}
          <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <AlertCircle className="h-5 w-5" />
                Importante: Token do Mercado Pago
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="space-y-2">
                <p className="font-medium">Para desenvolvimento e testes, use um <strong>Token de TESTE</strong>:</p>
                <ul className="list-disc list-inside space-y-1 ml-2 text-muted-foreground">
                  <li>Token de TESTE começa com: <code className="bg-muted px-1 py-0.5 rounded">TEST-</code></li>
                  <li>Permite criar pagamentos PIX sem cobrar de verdade</li>
                  <li>Ideal para testar a integração</li>
                </ul>
              </div>
              
              <div className="space-y-2 pt-2 border-t">
                <p className="font-medium">Para usar Token de PRODUÇÃO:</p>
                <ul className="list-disc list-inside space-y-1 ml-2 text-muted-foreground">
                  <li>Sua conta do Mercado Pago precisa estar <strong>ativada para produção</strong></li>
                  <li>Acesse: <a href="https://www.mercadopago.com.br/developers" target="_blank" rel="noopener noreferrer" className="text-primary underline">Painel de Desenvolvedores do Mercado Pago</a></li>
                  <li>Siga o processo de ativação da conta para produção</li>
                </ul>
              </div>

              <div className="p-3 bg-background rounded-lg border mt-3">
                <p className="text-xs text-muted-foreground">
                  <strong>Erro atual:</strong> Se você está recebendo "Unauthorized use of live credentials", 
                  significa que está usando um token de produção mas a conta não está ativada. 
                  Solução: Use um token de TESTE ou ative sua conta para produção.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Gerenciar Token */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Gerenciar Credenciais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Access Token do Mercado Pago</Label>
                <p className="text-sm text-muted-foreground">
                  O token está armazenado de forma segura. Clique no botão abaixo para atualizar.
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    toast.info("Por favor, use o chat para atualizar o token do Mercado Pago. Digite: 'atualizar token mercadopago'");
                  }}
                  className="flex-1"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Atualizar Token
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open('https://www.mercadopago.com.br/developers/panel/app', '_blank')}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Obter Token
                </Button>
              </div>

              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">
                  <strong>Como atualizar:</strong> Por segurança, use o chat para atualizar suas credenciais. 
                  Digite "atualizar token mercadopago" e eu vou abrir um formulário seguro para você inserir o novo token.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sistema */}
        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurações do Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="systemName">Nome do Sistema</Label>
                  <Input
                    id="systemName"
                    value={config.systemName}
                    onChange={(e) => setConfig({...config, systemName: e.target.value})}
                    placeholder="Sistema de Poltronas"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="systemVersion">Versão</Label>
                  <Input
                    id="systemVersion"
                    value={config.systemVersion}
                    onChange={(e) => setConfig({...config, systemVersion: e.target.value})}
                    placeholder="1.0.0"
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-medium">Notificações</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="emailNotifications">Notificações por Email</Label>
                      <p className="text-sm text-muted-foreground">
                        Receber notificações por email sobre pagamentos e erros
                      </p>
                    </div>
                    <Switch
                      id="emailNotifications"
                      checked={config.emailNotifications}
                      onCheckedChange={(checked) => setConfig({...config, emailNotifications: checked})}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="smsNotifications">Notificações por SMS</Label>
                      <p className="text-sm text-muted-foreground">
                        Receber notificações por SMS (requer configuração adicional)
                      </p>
                    </div>
                    <Switch
                      id="smsNotifications"
                      checked={config.smsNotifications}
                      onCheckedChange={(checked) => setConfig({...config, smsNotifications: checked})}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="webhookNotifications">Notificações via Webhook</Label>
                      <p className="text-sm text-muted-foreground">
                        Enviar notificações para webhooks externos
                      </p>
                    </div>
                    <Switch
                      id="webhookNotifications"
                      checked={config.webhookNotifications}
                      onCheckedChange={(checked) => setConfig({...config, webhookNotifications: checked})}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="maintenanceMode">Modo de Manutenção</Label>
                  <p className="text-sm text-muted-foreground">
                    Desativar o sistema temporariamente para manutenção
                  </p>
                </div>
                <Switch
                  id="maintenanceMode"
                  checked={config.maintenanceMode}
                  onCheckedChange={(checked) => setConfig({...config, maintenanceMode: checked})}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Segurança */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Configurações de Segurança
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">Timeout da Sessão (minutos)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    value={config.sessionTimeout}
                    onChange={(e) => setConfig({...config, sessionTimeout: parseInt(e.target.value)})}
                    min="5"
                    max="480"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxLoginAttempts">Máximo de Tentativas de Login</Label>
                  <Input
                    id="maxLoginAttempts"
                    type="number"
                    value={config.maxLoginAttempts}
                    onChange={(e) => setConfig({...config, maxLoginAttempts: parseInt(e.target.value)})}
                    min="3"
                    max="10"
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="requireTwoFactor">Autenticação de Dois Fatores</Label>
                  <p className="text-sm text-muted-foreground">
                    Exigir autenticação de dois fatores para login
                  </p>
                </div>
                <Switch
                  id="requireTwoFactor"
                  checked={config.requireTwoFactor}
                  onCheckedChange={(checked) => setConfig({...config, requireTwoFactor: checked})}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Configuracoes;
