import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  QrCode, 
  Copy, 
  Download, 
  Loader2,
  Eye,
  EyeOff
} from "lucide-react";
import { toast } from "sonner";

interface QRCodeDisplayProps {
  poltronaId: string;
  qrCodeData?: string;
  paymentId?: string;
  price: number;
  onGenerateQR?: () => Promise<void>;
  loading?: boolean;
}

const QRCodeDisplay = ({ 
  poltronaId, 
  qrCodeData, 
  paymentId, 
  price, 
  onGenerateQR,
  loading = false 
}: QRCodeDisplayProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const handleGenerateQR = async () => {
    if (!onGenerateQR) return;
    
    setIsGenerating(true);
    try {
      await onGenerateQR();
    } catch (error) {
      toast.error("Erro ao gerar QR Code");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyQRCode = () => {
    if (qrCodeData) {
      navigator.clipboard.writeText(qrCodeData);
      toast.success("Código PIX copiado!");
    }
  };

  const downloadQRCode = () => {
    if (qrCodeData) {
      const link = document.createElement('a');
      link.href = `data:text/plain;charset=utf-8,${encodeURIComponent(qrCodeData)}`;
      link.download = `qr-code-poltrona-${poltronaId}.txt`;
      link.click();
      toast.success("QR Code baixado!");
    }
  };

  const getStatusBadge = () => {
    if (loading || isGenerating) {
      return <Badge variant="secondary">Gerando QR Code...</Badge>;
    }
    if (qrCodeData && paymentId) {
      return <Badge variant="default" className="bg-success">QR Code Fixo Ativo</Badge>;
    }
    return <Badge variant="outline">Sem QR Code</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            QR Code PIX
          </span>
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {qrCodeData ? (
          <>
            <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
              <p className="text-sm font-medium text-success mb-2">✓ QR Code Fixo Configurado</p>
              <p className="text-xs text-muted-foreground">
                Este QR Code só aceita pagamentos de exatamente R$ {parseFloat(price.toString()).toFixed(2)}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Código PIX</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowQR(!showQR)}
                  >
                    {showQR ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyQRCode}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadQRCode}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {showQR && (
                <div className="p-3 bg-muted rounded-md">
                  <code className="text-xs break-all">{qrCodeData}</code>
                </div>
              )}
            </div>

            {paymentId && (
              <div className="text-xs text-muted-foreground space-y-1">
                <div>Payment ID: {paymentId}</div>
                <div className="text-xs text-success">Valor Fixo: R$ {parseFloat(price.toString()).toFixed(2)}</div>
              </div>
            )}

            <Button
              onClick={handleGenerateQR}
              variant="outline"
              className="w-full"
              disabled={loading || isGenerating}
            >
              <QrCode className="mr-2 h-4 w-4" />
              Regenerar QR Code
            </Button>
          </>
        ) : (
          <div className="space-y-3">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Gere um QR Code fixo que só aceita o valor exato de R$ {parseFloat(price.toString()).toFixed(2)}
              </p>
            </div>
            <Button
              onClick={handleGenerateQR}
              disabled={loading || isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando QR Code Fixo...
                </>
              ) : (
                <>
                  <QrCode className="mr-2 h-4 w-4" />
                  Gerar QR Code Fixo
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QRCodeDisplay;