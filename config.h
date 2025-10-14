/*
 * Arquivo de Configuração - Sistema de Poltrona de Massagem ESP32
 * 
 * Personalize as configurações abaixo conforme seu hardware e ambiente
 */

#ifndef CONFIG_H
#define CONFIG_H

// =============================================================================
// CONFIGURAÇÕES DE HARDWARE
// =============================================================================

// Pinos dos motores de massagem (conectados via relés)
#define MASSAGE_MOTOR_1_PIN 2
#define MASSAGE_MOTOR_2_PIN 4
#define MASSAGE_MOTOR_3_PIN 5
#define MASSAGE_MOTOR_4_PIN 18

// Pinos de controle
#define LED_STATUS_PIN 2
#define BUTTON_START_PIN 19
#define BUTTON_STOP_PIN 21

// =============================================================================
// CONFIGURAÇÕES DO SISTEMA
// =============================================================================

// ID padrão da poltrona (será configurado via web)
#define DEFAULT_POLTRONA_ID "p1"

// Intervalo de verificação de pagamentos (milissegundos)
#define CHECK_PAYMENT_INTERVAL 5000

// Duração padrão da massagem (milissegundos)
#define DEFAULT_MASSAGE_DURATION 900000  // 15 minutos

// Preço padrão (R$)
#define DEFAULT_PRICE 10.00

// Duração padrão (segundos)
#define DEFAULT_DURATION 900  // 15 minutos

// =============================================================================
// CONFIGURAÇÕES DE REDE
// =============================================================================

// Nome da rede WiFi do portal de captura
#define PORTAL_SSID_PREFIX "Poltrona-Massagem"

// Senha do portal de captura
#define PORTAL_PASSWORD "12345678"

// Timeout de conexão WiFi (milissegundos)
#define WIFI_TIMEOUT 20000

// =============================================================================
// CONFIGURAÇÕES DO SUPABASE
// =============================================================================

// URL base do Supabase (substitua pelo seu projeto)
#define SUPABASE_URL "https://your-project.supabase.co"

// Chave anônima do Supabase (substitua pela sua chave)
#define SUPABASE_ANON_KEY "your-anon-key"

// =============================================================================
// CONFIGURAÇÕES DE DEBUG
// =============================================================================

// Habilitar logs detalhados no Serial
#define DEBUG_MODE true

// Baud rate do Serial
#define SERIAL_BAUD 115200

// =============================================================================
// CONFIGURAÇÕES DE SEGURANÇA
// =============================================================================

// Timeout de sessão web (milissegundos)
#define WEB_SESSION_TIMEOUT 300000  // 5 minutos

// Máximo de tentativas de conexão WiFi
#define MAX_WIFI_ATTEMPTS 20

// =============================================================================
// CONFIGURAÇÕES DE MASSAGEM
// =============================================================================

// Padrões de massagem (opcional - para futuras implementações)
#define MASSAGE_PATTERN_1 0b10101010  // Padrão alternado
#define MASSAGE_PATTERN_2 0b11001100  // Padrão em pares
#define MASSAGE_PATTERN_3 0b11110000  // Padrão sequencial

// Intensidade máxima dos motores (0-255)
#define MAX_MOTOR_INTENSITY 255

// =============================================================================
// CONFIGURAÇÕES DE INTERFACE WEB
// =============================================================================

// Título da página web
#define WEB_TITLE "Sistema de Poltrona de Massagem"

// Versão do sistema
#define SYSTEM_VERSION "1.0.0"

// Autor do sistema
#define SYSTEM_AUTHOR "Sistema de Poltronas"

// =============================================================================
// CONFIGURAÇÕES DE EEPROM
// =============================================================================

// Nome do namespace para Preferences
#define PREFERENCES_NAMESPACE "poltrona"

// Chaves para armazenamento
#define KEY_POLTRONA_ID "poltronaId"
#define KEY_WIFI_SSID "wifiSSID"
#define KEY_WIFI_PASSWORD "wifiPassword"
#define KEY_SUPABASE_URL "supabaseUrl"
#define KEY_SUPABASE_KEY "supabaseKey"
#define KEY_PIX_KEY "pixKey"
#define KEY_PRICE "price"
#define KEY_DURATION "duration"
#define KEY_LOCATION "location"
#define KEY_ACTIVE "active"

// =============================================================================
// CONFIGURAÇÕES DE NTP
// =============================================================================

// Servidores NTP para sincronização de tempo
#define NTP_SERVER_1 "pool.ntp.org"
#define NTP_SERVER_2 "time.nist.gov"

// Fuso horário (UTC-3 para Brasil)
#define TIMEZONE_OFFSET -3 * 3600

// =============================================================================
// CONFIGURAÇÕES DE LED
// =============================================================================

// Padrões de piscada do LED
#define LED_BLINK_FAST 200    // Piscada rápida (erro)
#define LED_BLINK_SLOW 1000   // Piscada lenta (aguardando)
#define LED_BLINK_NORMAL 500  // Piscada normal (conectado)

// =============================================================================
// CONFIGURAÇÕES DE BOTÕES
// =============================================================================

// Tempo de debounce para botões (milissegundos)
#define BUTTON_DEBOUNCE_TIME 50

// Tempo mínimo de pressão do botão (milissegundos)
#define BUTTON_MIN_PRESS_TIME 100

// =============================================================================
// CONFIGURAÇÕES DE HTTP
// =============================================================================

// Timeout para requisições HTTP (milissegundos)
#define HTTP_TIMEOUT 10000

// Tamanho máximo do buffer JSON
#define JSON_BUFFER_SIZE 2048

// =============================================================================
// CONFIGURAÇÕES DE LOG
// =============================================================================

// Níveis de log
#define LOG_LEVEL_ERROR 0
#define LOG_LEVEL_WARNING 1
#define LOG_LEVEL_INFO 2
#define LOG_LEVEL_DEBUG 3

// Nível de log atual
#define CURRENT_LOG_LEVEL LOG_LEVEL_INFO

// =============================================================================
// MACROS ÚTEIS
// =============================================================================

// Macro para debug condicional
#if DEBUG_MODE
  #define DEBUG_PRINT(x) Serial.print(x)
  #define DEBUG_PRINTLN(x) Serial.println(x)
#else
  #define DEBUG_PRINT(x)
  #define DEBUG_PRINTLN(x)
#endif

// Macro para logs com nível
#define LOG_ERROR(x) if(CURRENT_LOG_LEVEL >= LOG_LEVEL_ERROR) { Serial.println("[ERROR] " + String(x)); }
#define LOG_WARNING(x) if(CURRENT_LOG_LEVEL >= LOG_LEVEL_WARNING) { Serial.println("[WARNING] " + String(x)); }
#define LOG_INFO(x) if(CURRENT_LOG_LEVEL >= LOG_LEVEL_INFO) { Serial.println("[INFO] " + String(x)); }
#define LOG_DEBUG(x) if(CURRENT_LOG_LEVEL >= LOG_LEVEL_DEBUG) { Serial.println("[DEBUG] " + String(x)); }

#endif // CONFIG_H
