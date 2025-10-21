import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Edit, FileText, QrCode, CheckCircle, Copy } from "lucide-react";
import { useSessionTimer, formatTimeRemaining } from "@/hooks/useSessionTimer";
import { toast } from "sonner";

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
  session_active?: boolean;
  session_ends_at?: string;
  current_payment_id?: string;
  public_payment_url?: string;
}

interface PoltronaCardProps {
  poltrona: Poltrona;
  isAdmin: boolean;
  onTestStart: (poltronaId: string) => void;
  onEdit: (poltrona: Poltrona) => void;
  onGeneratePrintableQR?: () => void;
  isGeneratingPrintable?: boolean;
}

export const PoltronaCard = ({ 
  poltrona, 
  isAdmin, 
  onTestStart, 
  onEdit,
  onGeneratePrintableQR,
  isGeneratingPrintable 
}: PoltronaCardProps) => {
  // Hook sempre chamado no nível superior do componente
  const timeRemaining = useSessionTimer(poltrona.session_ends_at || null);
  const isInUse = poltrona.session_active && timeRemaining > 0;

  const handleCopyUrl = () => {
    if (poltrona.public_payment_url) {
      navigator.clipboard.writeText(poltrona.public_payment_url);
      toast.success('URL copiada!');
    }
  };

  return (
    <Card className="border-border bg-card hover:border-primary transition-colors">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Poltrona {poltrona.poltrona_id}</span>
          <div className="flex gap-2">
            <span
              className={`text-xs px-2 py-1 rounded-full ${
                poltrona.active
                  ? "bg-accent/20 text-accent"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {poltrona.active ? "Ativa" : "Inativa"}
            </span>
            {isInUse && (
              <span className="text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-500 font-medium">
                Em Uso
              </span>
            )}
            {!isInUse && poltrona.active && (
              <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-500 font-medium">
                Disponível
              </span>
            )}
          </div>
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
          {poltrona.public_payment_url && (
            <div className="pt-2 border-t border-border">
              <Badge variant="outline" className="text-green-600 border-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                QR Code Impresso Gerado
              </Badge>
            </div>
          )}
          {isInUse && (
            <div className="pt-2 border-t border-border">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Liberação em:</span>
                <span className="font-mono text-lg font-bold text-red-500">
                  {formatTimeRemaining(timeRemaining)}
                </span>
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          {isAdmin && onGeneratePrintableQR && (
            <Button
              variant="default"
              size="sm"
              className="w-full bg-gradient-primary"
              onClick={onGeneratePrintableQR}
              disabled={isGeneratingPrintable}
            >
              <QrCode className="h-4 w-4 mr-2" />
              {isGeneratingPrintable ? 'Gerando...' : 'Gerar QR para Impressão'}
            </Button>
          )}
          {poltrona.public_payment_url && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleCopyUrl}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copiar URL Pública
            </Button>
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onTestStart(poltrona.poltrona_id)}
            >
              <Play className="h-3 w-3 mr-1" />
              Teste
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onEdit(poltrona)}
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
        </div>
      </CardContent>
    </Card>
  );
};
