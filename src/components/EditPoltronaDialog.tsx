import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { poltronaSchema, type PoltronaFormData } from "@/lib/validations";

interface Poltrona {
  poltrona_id: string;
  ip: string;
  pix_key: string;
  price: number;
  duration: number;
  location: string;
  active: boolean;
}

interface EditPoltronaDialogProps {
  poltrona: Poltrona;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditPoltronaDialog({
  poltrona,
  open,
  onOpenChange,
  onSuccess,
}: EditPoltronaDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Poltrona>(poltrona);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validatedData = poltronaSchema.parse(formData);
      
      const { error } = await supabase
        .from("poltronas")
        .update({
          ip: validatedData.ip,
          pix_key: validatedData.pix_key,
          price: validatedData.price,
          duration: validatedData.duration,
          location: validatedData.location,
          active: validatedData.active,
        })
        .eq("poltrona_id", poltrona.poltrona_id);

      if (error) throw error;

      toast.success("✅ Poltrona atualizada com sucesso");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      if (error.errors) {
        error.errors.forEach((err: any) => {
          toast.error(err.message);
        });
      } else {
        toast.error("Erro ao atualizar poltrona");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Poltrona {poltrona.poltrona_id}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ip">IP do ESP32</Label>
            <Input
              id="ip"
              value={formData.ip}
              onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
              placeholder="192.168.0.100"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pix_key">Chave PIX</Label>
            <Input
              id="pix_key"
              value={formData.pix_key}
              onChange={(e) =>
                setFormData({ ...formData, pix_key: e.target.value })
              }
              placeholder="chavepix@email.com"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Valor (R$)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
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
                min="1"
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
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
              placeholder="Shopping A - Piso 2"
              required
            />
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
            {loading ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
