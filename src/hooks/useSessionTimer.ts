import { useEffect, useState } from "react";

export const useSessionTimer = (sessionEndsAt: string | null) => {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  useEffect(() => {
    if (!sessionEndsAt) {
      setTimeRemaining(0);
      return;
    }

    const updateTimer = () => {
      const now = new Date().getTime();
      const end = new Date(sessionEndsAt).getTime();
      const diff = Math.max(0, Math.floor((end - now) / 1000));
      
      setTimeRemaining(diff);
      
      if (diff === 0) {
        // Sessão expirou, recarregar dados após 2 segundos
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    };

    // Atualizar imediatamente
    updateTimer();

    // Atualizar a cada segundo
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [sessionEndsAt]);

  return timeRemaining;
};

export const formatTimeRemaining = (seconds: number): string => {
  if (seconds <= 0) return "00:00";
  
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  
  return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};
