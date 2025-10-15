import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PoltronaStatus {
  poltrona_id: string;
  is_online: boolean;
  last_ping: string | null;
  firmware_version: string | null;
  error_message: string | null;
}

export const usePoltronaStatus = () => {
  const [statuses, setStatuses] = useState<Record<string, PoltronaStatus>>({});

  useEffect(() => {
    // Load initial statuses
    const loadStatuses = async () => {
      const { data, error } = await supabase
        .from('poltrona_status')
        .select('*');

      if (!error && data) {
        const statusMap: Record<string, PoltronaStatus> = {};
        data.forEach((status: any) => {
          statusMap[status.poltrona_id] = status;
        });
        setStatuses(statusMap);
      }
    };

    loadStatuses();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('poltrona-status-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'poltrona_status'
        },
        (payload) => {
          const status = payload.new as PoltronaStatus;
          setStatuses(prev => ({
            ...prev,
            [status.poltrona_id]: status
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { statuses };
};
