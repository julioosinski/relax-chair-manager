import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Settings, 
  Wifi, 
  Database, 
  CreditCard, 
  Smartphone, 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Save,
  TestTube,
  RefreshCw,
  Copy,
  ExternalLink
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SystemConfig {
  // Supabase
  supabaseUrl: string;
  supabaseKey: string;
  
  // Mercado Pago
  mercadopagoToken: string;
  mercadopagoPublicKey: string;
  webhookUrl: string;
  
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
  const [config, setConfig] = useState<SystemConfig>({
    supabaseUrl: "",
    supabaseKey: "",
    mercadopagoToken: "",
    mercadopagoPublicKey: "",
    webhookUrl: "",
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
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      // Carregar configurações do localStorage ou do Supabase
      const savedConfig = localStorage.getItem('systemConfig');
      if (savedConfig) {
        setConfig(JSON.parse(savedConfig));
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const saveConfig = async () => {
    setLoading(true);
    try {
      // Salvar no localStorage
      localStorage.setItem('systemConfig', JSON.stringify(config));
      
      // Aqui você pode salvar no Supabase também se necessário
      toast.success("✅ Configurações salvas com sucesso!");
    } catch (error) {
      toast.error("❌ Erro ao salvar configurações");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async (service: string) => {
    setTesting(service);
    
    try {
      let result: TestResult;
      
      switch (service) {
        case 'supabase':
          result = await testSupabaseConnection();
          break;
        case 'mercadopago':
          result = await testMercadoPagoConnection();
          break;
        case 'webhook':
          result = await testWebhookConnection();
          break;
        default:
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
      const { data, error } = await supabase
        .from('poltronas')
        .select('count')
        .limit(1);
      
      if (error) throw error;
      
      return {
        service: 'supabase',
        status: 'success',
        message: 'Conexão com Supabase estabelecida',
        details: `URL: ${config.supabaseUrl}`
      };
    } catch (error: any) {
      return {
        service: 'supabase',
        status: 'error',
        message: 'Falha na conexão com Supabase',
        details: error.message
      };
    }
  };

  const testMercadoPagoConnection = async (): Promise<TestResult> => {
    try {
      const response = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.mercadopagoToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        return {
          service: 'mercadopago',
          status: 'success',
          message: 'Conexão com Mercado Pago estabelecida',
          details: 'Token válido e API acessível'
        };
      } else {
        return {
          service: 'mercadopago',
          status: 'error',
          message: 'Falha na conexão com Mercado Pago',
          details: `Status: ${response.status} - ${response.statusText}`
        };
      }
    } catch (error: any) {
      return {
        service: 'mercadopago',
        status: 'error',
        message: 'Erro ao conectar com Mercado Pago',
        details: error.message
      };
    }
  };

  const testWebhookConnection = async (): Promise<TestResult> => {
    try {
      const response = await fetch(config.webhookUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        return {
          service: 'webhook',
          status: 'success',
          message: 'Webhook acessível',
          details: `URL: ${config.webhookUrl}`
        };
      } else {
        return {
          service: 'webhook',
          status: 'warning',
          message: 'Webhook retornou status inesperado',
          details: `Status: ${response.status} - ${response.statusText}`
        };
      }
    } catch (error: any) {
      return {
        service: 'webhook',
        status: 'error',
        message: 'Webhook não acessível',
        details: error.message
      };
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado para a área de transferência!");
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Configurações</h1>
          <p className="text-muted-foreground">
            Configure todas as integrações e parâmetros do sistema
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Recarregar
          </Button>
          <Button
            onClick={saveConfig}
            disabled={loading}
            className="bg-gradient-primary"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="database" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
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
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Segurança
          </TabsTrigger>
        </TabsList>

        {/* Banco de Dados */}
        <TabsContent value="database" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Configurações do Supabase
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supabaseUrl">URL do Supabase</Label>
                  <div className="flex gap-2">
                    <Input
                      id="supabaseUrl"
                      value={config.supabaseUrl}
                      onChange={(e) => setConfig({...config, supabaseUrl: e.target.value})}
                      placeholder="https://seu-projeto.supabase.co"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(config.supabaseUrl)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supabaseKey">Chave Anônima</Label>
                  <div className="flex gap-2">
                    <Input
                      id="supabaseKey"
                      type="password"
                      value={config.supabaseKey}
                      onChange={(e) => setConfig({...config, supabaseKey: e.target.value})}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(config.supabaseKey)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              
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
                Configurações do Mercado Pago
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mercadopagoToken">Access Token</Label>
                  <div className="flex gap-2">
                    <Input
                      id="mercadopagoToken"
                      type="password"
                      value={config.mercadopagoToken}
                      onChange={(e) => setConfig({...config, mercadopagoToken: e.target.value})}
                      placeholder="TEST-1234567890-abcdef..."
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(config.mercadopagoToken)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mercadopagoPublicKey">Chave Pública</Label>
                  <div className="flex gap-2">
                    <Input
                      id="mercadopagoPublicKey"
                      value={config.mercadopagoPublicKey}
                      onChange={(e) => setConfig({...config, mercadopagoPublicKey: e.target.value})}
                      placeholder="TEST-12345678-1234-1234-1234-123456789012"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(config.mercadopagoPublicKey)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="webhookUrl">URL do Webhook</Label>
                <div className="flex gap-2">
                  <Input
                    id="webhookUrl"
                    value={config.webhookUrl}
                    onChange={(e) => setConfig({...config, webhookUrl: e.target.value})}
                    placeholder="https://seu-dominio.com/api/webhook/mercadopago"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(config.webhookUrl, '_blank')}
                    disabled={!config.webhookUrl}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
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
              
              <Separator />
              
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
              
              <Separator />
              
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
              
              <Separator />
              
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
