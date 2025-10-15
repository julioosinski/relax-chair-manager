import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useRealtimePayments = () => {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const channel = supabase
      .channel('realtime-payments')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'payments'
        },
        (payload) => {
          const payment = payload.new as any;
          if (payment.status === 'approved') {
            // Play notification sound (optional)
            const audio = new Audio('/notification.mp3');
            audio.play().catch(() => {}); // Fail silently if no audio file
            
            toast.success(
              `💰 Novo pagamento aprovado!`,
              {
                description: `Poltrona ${payment.poltrona_id} - R$ ${payment.amount.toFixed(2)}`,
                duration: 5000,
              }
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payments'
        },
        (payload) => {
          const payment = payload.new as any;
          if (payment.status === 'approved') {
            toast.success(
              `✅ Pagamento confirmado!`,
              {
                description: `Poltrona ${payment.poltrona_id}`,
                duration: 3000,
              }
            );
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
        }
      });

    return () => {
      supabase.removeChannel(channel);
      setIsConnected(false);
    };
  }, []);

  return { isConnected };
};
