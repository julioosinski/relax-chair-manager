import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

export type UserRole = 'admin' | 'user' | null;

interface UseUserRoleReturn {
  role: UserRole;
  isAdmin: boolean;
  isLoading: boolean;
  checkRole: () => Promise<void>;
}

/**
 * Hook para verificar o role do usuário atual
 * Busca do banco de dados a role do usuário
 */
export const useUserRole = (user: User | null): UseUserRoleReturn => {
  const [role, setRole] = useState<UserRole>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkRole = async () => {
    if (!user) {
      setRole(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user role:', error);
        setRole(null);
        return;
      }

      setRole(data?.role || 'user');
    } catch (error) {
      console.error('Error checking user role:', error);
      setRole(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkRole();
  }, [user?.id]);

  return {
    role,
    isAdmin: role === 'admin',
    isLoading,
    checkRole
  };
};
