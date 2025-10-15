import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const POLLING_INTERVAL = 30000; // 30 segundos

export const usePaymentPolling = () => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const pollPayments = async () => {
      try {
        console.log('Checking pending payments...');
        
        const { data, error } = await supabase.functions.invoke('check-payment-polling');
        
        if (error) {
          console.error('Error polling payments:', error);
          return;
        }

        if (data?.approved > 0) {
          console.log(`✅ ${data.approved} payment(s) approved and processed`);
        }
      } catch (error) {
        console.error('Payment polling error:', error);
      }
    };

    // Poll immediately on mount
    pollPayments();

    // Set up interval
    intervalRef.current = setInterval(pollPayments, POLLING_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
};
