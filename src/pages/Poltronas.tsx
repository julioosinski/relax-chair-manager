import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Play, Edit, FileText, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { EditPoltronaDialog } from "@/components/EditPoltronaDialog";
import QRCodeDisplay from "@/components/QRCodeDisplay";
import { generateCompleteQRCode } from "@/api/mercadopago";
import { useUserRole } from "@/hooks/useUserRole";
import { poltronaSchema, type PoltronaFormData } from "@/lib/validations";
import { z } from "zod";
import { User } from "@supabase/supabase-js";

interface Poltrona {
  poltrona_id: string;
  ip: string;
  pix_key: string;
  price: number;
  duration: number;
  location: string;
  active: boolean;
  qr_code_data?: string;
  payment_id?: string;
  mercadopago_token?: string;
}

const Poltronas = () => {
  const [poltronas, setPoltronas] = useState<Poltrona[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPoltrona, setEditingPoltrona] = useState<Poltrona | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof PoltronaFormData, string>>>({});
  const { isAdmin, isLoading: roleLoading } = useUserRole(user);
  
  const [formData, setFormData] = useState<Poltrona>({
    poltrona_id: "",
    ip: "",
    pix_key: "",
    price: 10,
    duration: 900,
    location: "",
    active: true,
  });

  useEffect(() => {
    // Get current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
    
    fetchPoltronas();
  }, []);

  const fetchPoltronas = async () => {
    try {
      const { data, error } = await supabase
        .from("poltronas")
        .select("*")
        .order("poltrona_id");

      if (error) throw error;
      setPoltronas(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar poltronas");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    
    if (!isAdmin) {
      toast.error("Apenas administradores podem cadastrar poltronas");
      return;
    }
    
    // Validação com Zod
    try {
      poltronaSchema.parse(formData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Partial<Record<keyof PoltronaFormData, string>> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0] as keyof PoltronaFormData] = err.message;
          }
        });
        setFormErrors(errors);
        toast.error("Por favor, corrija os erros no formulário");
        return;
      }
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("poltronas").insert([formData]);

      if (error) {
        if (error.code === "23505") {
          toast.error("Já existe uma poltrona com este ID");
        } else if (error.code === "42501") {
          toast.error("Você não tem permissão para cadastrar poltronas");
        } else {
          toast.error("Erro ao cadastrar poltrona");
        }
        return;
      }

      toast.success("✅ Poltrona cadastrada com sucesso");
      setDialogOpen(false);
      fetchPoltronas();
      setFormData({
        poltrona_id: "",
        ip: "",
        pix_key: "",
        price: 10,
        duration: 900,
        location: "",
        active: true,
      });
    } catch (error: any) {
      toast.error("Erro ao cadastrar poltrona");
    } finally {
      setLoading(false);
    }
  };

  const handleTestStart = async (poltronaId: string) => {
    toast.info(`Testando poltrona ${poltronaId}...`);
    // API call would go here
    setTimeout(() => {
      toast.success(`✅ Poltrona ${poltronaId} acionada para teste`);
    }, 1000);
  };

  const handleGenerateQR = async (poltronaId: string) => {
    try {
      const poltrona = poltronas.find(p => p.poltrona_id === poltronaId);
      if (!poltrona) {
        toast.error("Poltrona não encontrada");
        return;
      }

      toast.info(`Gerando QR Code para poltrona ${poltronaId}...`);
      
      // Não precisa mais de configurações do localStorage
      // O token fica seguro no servidor (edge function)
      const result = await generateCompleteQRCode(
        {}, // Config vazio - token vem do servidor
        poltronaId,
        poltrona.price,
        poltrona.location
      );

      if (result.success && result.paymentId && result.qrCode) {
        setPoltronas(prev => prev.map(p => 
          p.poltrona_id === poltronaId 
            ? { 
                ...p, 
                qr_code_data: result.qrCode,
                payment_id: result.paymentId
              }
            : p
        ));
        
        toast.success(`✅ QR Code gerado para poltrona ${poltronaId}`);
      } else {
        toast.error(`❌ ${result.message}`);
      }
    } catch (error) {
      toast.error(`❌ Erro ao gerar QR Code para poltrona ${poltronaId}`);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Poltronas</h1>
          <p className="text-muted-foreground">
            Gerencie suas poltronas cadastradas
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="bg-gradient-primary"
              disabled={!isAdmin || roleLoading}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nova Poltrona
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Cadastrar Nova Poltrona</DialogTitle>
            </DialogHeader>
            {!isAdmin ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ShieldAlert className="h-12 w-12 text-amber-500 mb-4" />
                <p className="text-lg font-semibold mb-2">Acesso Restrito</p>
                <p className="text-sm text-muted-foreground">
                  Apenas administradores podem cadastrar poltronas
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="poltrona_id">ID da Poltrona</Label>
                <Input
                  id="poltrona_id"
                  value={formData.poltrona_id}
                  onChange={(e) => {
                    setFormData({ ...formData, poltrona_id: e.target.value });
                    setFormErrors({ ...formErrors, poltrona_id: undefined });
                  }}
                  placeholder="p1"
                  className={formErrors.poltrona_id ? 'border-red-500' : ''}
                />
                {formErrors.poltrona_id && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.poltrona_id}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="ip">IP do ESP32</Label>
                <Input
                  id="ip"
                  value={formData.ip}
                  onChange={(e) => {
                    setFormData({ ...formData, ip: e.target.value });
                    setFormErrors({ ...formErrors, ip: undefined });
                  }}
                  placeholder="192.168.0.100"
                  className={formErrors.ip ? 'border-red-500' : ''}
                />
                {formErrors.ip && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.ip}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="pix_key">Chave PIX</Label>
                <Input
                  id="pix_key"
                  value={formData.pix_key}
                  onChange={(e) => {
                    setFormData({ ...formData, pix_key: e.target.value });
                    setFormErrors({ ...formErrors, pix_key: undefined });
                  }}
                  placeholder="chavepix@email.com"
                  className={formErrors.pix_key ? 'border-red-500' : ''}
                />
                {formErrors.pix_key && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.pix_key}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Valor (R$)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        price: parseFloat(e.target.value),
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duração (seg)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        duration: parseInt(e.target.value),
                      })
                    }
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Localização</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => {
                    setFormData({ ...formData, location: e.target.value });
                    setFormErrors({ ...formErrors, location: undefined });
                  }}
                  placeholder="Shopping A - Piso 2"
                  className={formErrors.location ? 'border-red-500' : ''}
                />
                {formErrors.location && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.location}</p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, active: checked })
                  }
                />
                <Label htmlFor="active">Poltrona ativa</Label>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Cadastrando..." : "Cadastrar Poltrona"}
              </Button>
            </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {poltronas.map((poltrona) => (
          <div key={poltrona.poltrona_id} className="space-y-4">
            {/* Card Principal da Poltrona */}
            <Card className="border-border bg-card hover:border-primary transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Poltrona {poltrona.poltrona_id}</span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      poltrona.active
                        ? "bg-accent/20 text-accent"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {poltrona.active ? "Ativa" : "Inativa"}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">IP:</span>
                    <span className="font-mono">{poltrona.ip}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor:</span>
                    <span className="font-bold text-accent">
                      R$ {poltrona.price.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duração:</span>
                    <span>{poltrona.duration}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Local:</span>
                    <span className="text-right">{poltrona.location}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleTestStart(poltrona.poltrona_id)}
                  >
                    <Play className="h-3 w-3 mr-1" />
                    Teste
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setEditingPoltrona(poltrona)}
                    disabled={!isAdmin}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <FileText className="h-3 w-3 mr-1" />
                    Ficha
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Card do QR Code */}
            <QRCodeDisplay
              poltronaId={poltrona.poltrona_id}
              qrCodeData={poltrona.qr_code_data}
              paymentId={poltrona.payment_id}
              price={poltrona.price}
              onGenerateQR={() => handleGenerateQR(poltrona.poltrona_id)}
            />
          </div>
        ))}
      </div>

      {poltronas.length === 0 && (
        <Card className="border-border bg-card">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Nenhuma poltrona cadastrada ainda
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Clique em "Nova Poltrona" para começar
            </p>
          </CardContent>
        </Card>
      )}

      {editingPoltrona && (
        <EditPoltronaDialog
          poltrona={editingPoltrona}
          open={!!editingPoltrona}
          onOpenChange={(open) => !open && setEditingPoltrona(null)}
          onSuccess={fetchPoltronas}
        />
      )}
    </div>
  );
};

export default Poltronas;
