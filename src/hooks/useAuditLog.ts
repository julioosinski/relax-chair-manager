import { supabase } from "@/integrations/supabase/client";

export interface AuditLogEntry {
  action: string;
  entity_type: string;
  entity_id?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
}

export const useAuditLog = () => {
  const logAction = async (entry: AuditLogEntry) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('audit_logs').insert({
        user_id: user.id,
        ...entry,
        ip_address: null, // Could be filled by edge function
        user_agent: navigator.userAgent
      });
    } catch (error) {
      console.error('Error logging audit action:', error);
    }
  };

  return { logAction };
};
