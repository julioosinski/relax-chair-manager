import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, QrCode, CheckCircle, Copy, Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import QRCode from "qrcode";

interface PoltronaInfo {
  poltrona_id: string;
  price: number;
  location: string;
  duration: number;
  active: boolean;
}

interface PaymentData {
  paymentId: string;
  qrCode: string;
  amount: number;
  expiresAt?: string;
}

const PublicPayment = () => {
  const { poltronaId } = useParams<{ poltronaId: string }>();
  const [poltrona, setPoltrona] = useState<PoltronaInfo | null>(null);
  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [qrCodeImage, setQrCodeImage] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [checkingPayment, setCheckingPayment] = useState(false);

  useEffect(() => {
    if (poltronaId) {
      loadPoltronaInfo();
    }
  }, [poltronaId]);

  useEffect(() => {
    if (payment?.qrCode) {
      generateQRCodeImage(payment.qrCode);
      startPaymentPolling(payment.paymentId);
    }
  }, [payment]);

  const loadPoltronaInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('poltronas')
        .select('poltrona_id, price, location, duration, active')
        .eq('poltrona_id', poltronaId)
        .single();

      if (error) throw error;

      if (!data.active) {
        toast.error("Esta poltrona está desativada");
        return;
      }

      setPoltrona(data);
      await generateDynamicQRCode(data.poltrona_id);
    } catch (error) {
      console.error('Error loading poltrona:', error);
      toast.error("Erro ao carregar informações da poltrona");
    } finally {
      setLoading(false);
    }
  };

  const generateDynamicQRCode = async (poltronaId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('mercadopago-create-dynamic-payment', {
        body: { poltronaId }
      });

      if (error) throw error;

      if (data.success) {
        setPayment({
          paymentId: data.paymentId,
          qrCode: data.qrCode,
          amount: data.amount,
          expiresAt: data.expirationDate
        });
      } else {
        toast.error(data.message || "Erro ao gerar QR Code");
      }
    } catch (error) {
      console.error('Error generating dynamic QR:', error);
      toast.error("Erro ao gerar QR Code de pagamento");
    }
  };

  const generateQRCodeImage = async (qrCodeData: string) => {
    try {
      const url = await QRCode.toDataURL(qrCodeData, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeImage(url);
    } catch (error) {
      console.error('Error generating QR image:', error);
    }
  };

  const startPaymentPolling = (paymentId: string | number) => {
    const interval = setInterval(async () => {
      setCheckingPayment(true);
      try {
        const { data, error } = await supabase
          .from('payments')
          .select('status')
          .eq('payment_id', parseInt(paymentId.toString()))
          .single();

        if (!error && data) {
          if (data.status === 'approved') {
            setPaymentStatus('approved');
            clearInterval(interval);
            toast.success("🎉 Pagamento aprovado! A poltrona será liberada em instantes.");
          } else if (data.status === 'rejected') {
            setPaymentStatus('rejected');
            clearInterval(interval);
            toast.error("Pagamento rejeitado. Por favor, tente novamente.");
          }
        }
      } catch (error) {
        console.error('Error checking payment:', error);
      } finally {
        setCheckingPayment(false);
      }
    }, 3000); // Check every 3 seconds

    // Stop polling after 10 minutes
    setTimeout(() => clearInterval(interval), 600000);
  };

  const copyQRCode = () => {
    if (payment?.qrCode) {
      navigator.clipboard.writeText(payment.qrCode);
      toast.success("Código PIX copiado!");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 flex flex-col items-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Carregando informações...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!poltrona) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-lg font-semibold mb-2">Poltrona não encontrada</p>
            <p className="text-muted-foreground">Verifique o QR Code e tente novamente.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            Poltrona de Massagem
          </CardTitle>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Badge variant="default" className="text-lg px-4 py-1">
              {poltrona.poltrona_id}
            </Badge>
            {paymentStatus === 'pending' && checkingPayment && (
              <Badge variant="secondary">
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                Verificando...
              </Badge>
            )}
            {paymentStatus === 'approved' && (
              <Badge variant="default" className="bg-success">
                <CheckCircle className="h-3 w-3 mr-1" />
                Aprovado
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {paymentStatus === 'approved' ? (
            <div className="text-center space-y-4 py-8">
              <CheckCircle className="h-20 w-20 text-success mx-auto" />
              <div>
                <p className="text-xl font-bold text-success mb-2">
                  Pagamento Aprovado!
                </p>
                <p className="text-muted-foreground">
                  Sua poltrona será liberada automaticamente.
                </p>
                <p className="text-sm text-muted-foreground mt-4">
                  Aproveite sua massagem! 🎉
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Valor:</span>
                  <span className="text-2xl font-bold text-primary">
                    R$ {poltrona.price.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Duração:</span>
                  <span className="flex items-center gap-1 text-sm">
                    <Timer className="h-4 w-4" />
                    {Math.floor(poltrona.duration / 60)} minutos
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Local:</span>
                  <span className="text-sm">{poltrona.location}</span>
                </div>
              </div>

              {qrCodeImage && payment && (
                <>
                  <div className="space-y-3">
                    <p className="text-center text-sm text-muted-foreground">
                      Escaneie o QR Code com o app do seu banco
                    </p>
                    <div className="flex items-center justify-center p-4 bg-white rounded-lg border-2 border-primary/20">
                      <img 
                        src={qrCodeImage} 
                        alt="QR Code PIX" 
                        className="w-72 h-72"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-center text-xs text-muted-foreground">
                      Ou copie o código PIX:
                    </p>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={copyQRCode}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copiar Código PIX
                    </Button>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">
                      Após o pagamento, a poltrona será liberada automaticamente em segundos.
                    </p>
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PublicPayment;
