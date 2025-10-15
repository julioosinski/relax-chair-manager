import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  QrCode, 
  Copy, 
  Download, 
  Loader2,
  Eye,
  EyeOff,
  Printer,
  Image as ImageIcon
} from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";

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
  const [qrCodeImage, setQrCodeImage] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Gerar imagem do QR Code quando o código PIX estiver disponível
  useEffect(() => {
    if (qrCodeData) {
      QRCode.toDataURL(qrCodeData, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
        .then(url => setQrCodeImage(url))
        .catch(err => console.error('Erro ao gerar QR Code:', err));
    }
  }, [qrCodeData]);

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

  const downloadQRCodeImage = () => {
    if (qrCodeImage) {
      const link = document.createElement('a');
      link.href = qrCodeImage;
      link.download = `qr-code-poltrona-${poltronaId}.png`;
      link.click();
      toast.success("Imagem do QR Code baixada!");
    }
  };

  const downloadQRCodeText = () => {
    if (qrCodeData) {
      const link = document.createElement('a');
      link.href = `data:text/plain;charset=utf-8,${encodeURIComponent(qrCodeData)}`;
      link.download = `codigo-pix-poltrona-${poltronaId}.txt`;
      link.click();
      toast.success("Código PIX baixado!");
    }
  };

  const printQRCode = () => {
    if (!qrCodeImage) return;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>QR Code - Poltrona ${poltronaId}</title>
            <style>
              body {
                margin: 0;
                padding: 40px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                font-family: Arial, sans-serif;
              }
              .container {
                text-align: center;
                max-width: 600px;
              }
              h1 {
                margin-bottom: 10px;
                font-size: 24px;
              }
              .info {
                margin: 20px 0;
                font-size: 18px;
              }
              .price {
                font-size: 32px;
                font-weight: bold;
                color: #16a34a;
                margin: 20px 0;
              }
              img {
                max-width: 400px;
                width: 100%;
                height: auto;
              }
              .instructions {
                margin-top: 30px;
                font-size: 14px;
                color: #666;
                text-align: left;
                padding: 20px;
                background: #f5f5f5;
                border-radius: 8px;
              }
              @media print {
                body {
                  padding: 20px;
                }
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>QR Code PIX - Poltrona ${poltronaId}</h1>
              <div class="price">R$ ${parseFloat(price.toString()).toFixed(2)}</div>
              <img src="${qrCodeImage}" alt="QR Code PIX" />
              <div class="instructions">
                <p><strong>Instruções:</strong></p>
                <ul>
                  <li>Escaneie o QR Code com o aplicativo do seu banco</li>
                  <li>Valor fixo: R$ ${parseFloat(price.toString()).toFixed(2)}</li>
                  <li>Após o pagamento, a poltrona será liberada automaticamente</li>
                </ul>
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 250);
      toast.success("Abrindo janela de impressão...");
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

            {qrCodeImage && (
              <div className="space-y-3">
                <div className="flex items-center justify-center p-4 bg-white rounded-lg border-2 border-border">
                  <img 
                    src={qrCodeImage} 
                    alt="QR Code PIX" 
                    className="w-64 h-64"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={printQRCode}
                    className="w-full"
                  >
                    <Printer className="mr-2 h-4 w-4" />
                    Imprimir
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadQRCodeImage}
                    className="w-full"
                  >
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Baixar PNG
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Código PIX</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowQR(!showQR)}
                    title={showQR ? "Ocultar código" : "Mostrar código"}
                  >
                    {showQR ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyQRCode}
                    title="Copiar código PIX"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadQRCodeText}
                    title="Baixar código como texto"
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