import { z } from "zod";

/**
 * Schema de validação para Poltrona
 */
export const poltronaSchema = z.object({
  poltrona_id: z
    .string()
    .trim()
    .min(1, "ID da poltrona é obrigatório")
    .max(20, "ID deve ter no máximo 20 caracteres")
    .regex(/^[a-zA-Z0-9_-]+$/, "Use apenas letras, números, _ e -"),
  
  ip: z
    .string()
    .trim()
    .regex(
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
      "IP inválido (formato: 192.168.0.1)"
    ),
  
  pix_key: z
    .string()
    .trim()
    .min(1, "Chave PIX é obrigatória")
    .max(200, "Chave PIX muito longa")
    .refine(
      (val) => {
        // Email
        if (val.includes("@")) return z.string().email().safeParse(val).success;
        // Telefone (11 dígitos)
        if (/^\d{11}$/.test(val)) return true;
        // CPF (11 dígitos)
        if (/^\d{11}$/.test(val)) return true;
        // CNPJ (14 dígitos)
        if (/^\d{14}$/.test(val)) return true;
        // Chave aleatória (UUID)
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)) return true;
        return false;
      },
      "Chave PIX inválida (use email, telefone, CPF, CNPJ ou chave aleatória)"
    ),
  
  price: z
    .number()
    .positive("Valor deve ser maior que zero")
    .max(1000, "Valor máximo é R$ 1000")
    .multipleOf(0.01, "Use até 2 casas decimais"),
  
  duration: z
    .number()
    .int("Duração deve ser um número inteiro")
    .min(60, "Duração mínima é 60 segundos")
    .max(3600, "Duração máxima é 3600 segundos (1 hora)"),
  
  location: z
    .string()
    .trim()
    .min(1, "Localização é obrigatória")
    .max(100, "Localização deve ter no máximo 100 caracteres"),
  
  active: z.boolean()
});

export type PoltronaFormData = z.infer<typeof poltronaSchema>;

/**
 * Schema de validação para Login
 */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Email inválido")
    .max(255, "Email muito longo"),
  
  password: z
    .string()
    .min(6, "Senha deve ter no mínimo 6 caracteres")
    .max(100, "Senha muito longa")
});

export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Schema de validação para configurações do sistema
 */
export const systemConfigSchema = z.object({
  systemName: z.string().trim().min(1).max(100),
  systemVersion: z.string().regex(/^\d+\.\d+\.\d+$/, "Versão inválida (use X.Y.Z)"),
  maintenanceMode: z.boolean(),
  emailNotifications: z.boolean(),
  smsNotifications: z.boolean(),
  webhookNotifications: z.boolean(),
  sessionTimeout: z.number().int().min(5).max(120),
  maxLoginAttempts: z.number().int().min(3).max(10),
  requireTwoFactor: z.boolean()
});

export type SystemConfigData = z.infer<typeof systemConfigSchema>;
