import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  QrCode, 
  Copy, 
  Download, 
  RefreshCw, 
  CheckCircle, 
  XCircle,
  ExternalLink
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

  const handleGenerateQR = async () => {
    if (!onGenerateQR) return;
    
    setIsGenerating(true);
    try {
      await onGenerateQR();
      toast.success("QR Code gerado com sucesso!");
    } catch (error) {
      toast.error("Erro ao gerar QR Code");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyQRCode = () => {
    if (qrCodeData) {
      navigator.clipboard.writeText(qrCodeData);
      toast.success("QR Code copiado para a área de transferência!");
    }
  };

  const downloadQRCode = () => {
    if (qrCodeData) {
      // Criar um link para download do QR code
      const link = document.createElement('a');
      link.href = `data:text/plain;charset=utf-8,${encodeURIComponent(qrCodeData)}`;
      link.download = `qr-code-poltrona-${poltronaId}.txt`;
      link.click();
    }
  };

  const getStatusBadge = () => {
    if (loading || isGenerating) {
      return (
        <Badge variant="secondary" className="animate-pulse">
          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
          Processando
        </Badge>
      );
    }
    
    if (qrCodeData && paymentId) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Ativo
        </Badge>
      );
    }
    
    return (
      <Badge variant="destructive">
        <XCircle className="h-3 w-3 mr-1" />
        Inativo
      </Badge>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            QR Code PIX
          </span>
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {qrCodeData ? (
          <div className="space-y-3">
            <div className="text-center">
              <div className="inline-block p-4 bg-white rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-xs text-gray-500 mb-2">QR Code PIX</div>
                <div className="text-xs font-mono break-all max-w-xs">
                  {qrCodeData.substring(0, 50)}...
                </div>
              </div>
            </div>
            
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor:</span>
                <span className="font-bold text-green-600">R$ {price.toFixed(2)}</span>
              </div>
              {paymentId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment ID:</span>
                  <span className="font-mono text-xs">{paymentId}</span>
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1">
                    <QrCode className="h-3 w-3 mr-1" />
                    Ver QR
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>QR Code PIX - Poltrona {poltronaId}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="inline-block p-6 bg-white rounded-lg border">
                        <div className="text-sm text-gray-600 mb-2">Escaneie com seu app PIX</div>
                        <div className="text-xs font-mono break-all bg-gray-100 p-2 rounded">
                          {qrCodeData}
                        </div>
                      </div>
                    </div>
                    <div className="text-center text-sm text-muted-foreground">
                      Valor: <span className="font-bold text-green-600">R$ {price.toFixed(2)}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={copyQRCode}
                        className="flex-1"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copiar
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={downloadQRCode}
                        className="flex-1"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Baixar
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={copyQRCode}
                className="flex-1"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copiar
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-3">
            <div className="text-muted-foreground text-sm">
              QR Code não gerado
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleGenerateQR}
              disabled={loading || isGenerating}
              className="w-full"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${(loading || isGenerating) ? 'animate-spin' : ''}`} />
              {loading || isGenerating ? 'Gerando...' : 'Gerar QR Code'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QRCodeDisplay;
