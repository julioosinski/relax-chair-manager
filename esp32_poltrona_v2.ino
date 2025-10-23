/*
 * Sistema de Poltrona de Massagem ESP32 - Versão 2.0
 * 
 * Integração completa com backend via polling system
 * - Portal de configuração WiFi
 * - Recebe notificações de pagamento via HTTP
 * - Controla relés automaticamente
 * - Heartbeat para Supabase
 * - Sistema de logs
 */

#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>

// =============================================================================
// CONFIGURAÇÃO DE HARDWARE
// =============================================================================
#define RELE_1 2
#define RELE_2 4
#define RELE_3 5
#define RELE_4 18
#define LED_STATUS 2

// =============================================================================
// VERSÃO DO FIRMWARE
// =============================================================================
const char* FIRMWARE_VERSION = "2.2.1";

// =============================================================================
// ESTRUTURA DE CONFIGURAÇÃO
// =============================================================================
struct Config {
  String poltronaId;
  String wifiSSID;
  String wifiPassword;
  String supabaseUrl;
  String supabaseKey;
  int duration;
} config;

// =============================================================================
// VARIÁVEIS GLOBAIS
// =============================================================================
WebServer server(80);
Preferences prefs;
bool massageActive = false;
unsigned long massageEndTime = 0;
unsigned long lastHeartbeat = 0;
unsigned long systemStartTime = 0;
const unsigned long HEARTBEAT_INTERVAL = 60000; // 60 segundos

// =============================================================================
// SETUP
// =============================================================================
void setup() {
  Serial.begin(115200);
  Serial.println("\n\n=================================");
  Serial.println("Sistema de Poltrona de Massagem");
  Serial.println("Versão: " + String(FIRMWARE_VERSION));
  Serial.println("=================================\n");

  systemStartTime = millis();
  
  // Configurar pinos
  setupPins();
  
  // Carregar configuração
  loadConfig();
  
  // Tentar conectar ao WiFi
  if (config.wifiSSID.length() > 0) {
    if (connectWiFi()) {
      startWebServer();
      sendLog("Sistema iniciado - WiFi conectado");
    } else {
      Serial.println("Falha ao conectar WiFi. Iniciando portal de configuração...");
      startConfigPortal();
    }
  } else {
    Serial.println("Nenhuma configuração salva. Iniciando portal de configuração...");
    startConfigPortal();
  }
}

// =============================================================================
// LOOP PRINCIPAL
// =============================================================================
void loop() {
  server.handleClient();
  
  // Verificar timeout da massagem
  if (massageActive && millis() >= massageEndTime) {
    stopMassage();
  }
  
  // Enviar heartbeat
  if (millis() - lastHeartbeat >= HEARTBEAT_INTERVAL) {
    sendHeartbeat();
    lastHeartbeat = millis();
  }
  
  // Piscar LED se não conectado
  if (WiFi.status() != WL_CONNECTED) {
    blinkLED(500);
  }
}

// =============================================================================
// CONFIGURAÇÃO DOS PINOS
// =============================================================================
void setupPins() {
  pinMode(RELE_1, OUTPUT);
  pinMode(RELE_2, OUTPUT);
  pinMode(RELE_3, OUTPUT);
  pinMode(RELE_4, OUTPUT);
  pinMode(LED_STATUS, OUTPUT);
  
  // Garantir que relés estejam desligados
  digitalWrite(RELE_1, LOW);
  digitalWrite(RELE_2, LOW);
  digitalWrite(RELE_3, LOW);
  digitalWrite(RELE_4, LOW);
  digitalWrite(LED_STATUS, LOW);
  
  Serial.println("✓ Pinos configurados");
}

// =============================================================================
// CARREGAR CONFIGURAÇÃO DA MEMÓRIA
// =============================================================================
void loadConfig() {
  prefs.begin("poltrona", false);
  
  config.poltronaId = prefs.getString("poltronaId", "");
  config.wifiSSID = prefs.getString("wifiSSID", "");
  config.wifiPassword = prefs.getString("wifiPassword", "");
  config.supabaseUrl = prefs.getString("supabaseUrl", "");
  config.supabaseKey = prefs.getString("supabaseKey", "");
  config.duration = prefs.getInt("duration", 900);
  
  Serial.println("✓ Configuração carregada:");
  Serial.println("  Poltrona ID: " + config.poltronaId);
  Serial.println("  WiFi SSID: " + config.wifiSSID);
  Serial.println("  Duração: " + String(config.duration) + "s");
}

// =============================================================================
// SALVAR CONFIGURAÇÃO NA MEMÓRIA
// =============================================================================
void saveConfig() {
  prefs.putString("poltronaId", config.poltronaId);
  prefs.putString("wifiSSID", config.wifiSSID);
  prefs.putString("wifiPassword", config.wifiPassword);
  prefs.putString("supabaseUrl", config.supabaseUrl);
  prefs.putString("supabaseKey", config.supabaseKey);
  prefs.putInt("duration", config.duration);
  
  Serial.println("✓ Configuração salva");
}

// =============================================================================
// CONECTAR AO WIFI
// =============================================================================
bool connectWiFi() {
  Serial.println("Conectando ao WiFi: " + config.wifiSSID);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(config.wifiSSID.c_str(), config.wifiPassword.c_str());
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    blinkLED(100);
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✓ WiFi conectado!");
    Serial.println("  IP: " + WiFi.localIP().toString());
    Serial.println("  RSSI: " + String(WiFi.RSSI()) + " dBm");
    digitalWrite(LED_STATUS, HIGH);
    return true;
  }
  
  Serial.println("\n✗ Falha ao conectar WiFi");
  return false;
}

// =============================================================================
// INICIAR PORTAL DE CONFIGURAÇÃO
// =============================================================================
void startConfigPortal() {
  String apSSID = "Poltrona-Massagem-" + String((uint32_t)ESP.getEfuseMac(), HEX);
  String apPassword = "12345678";
  
  Serial.println("\n=== MODO DE CONFIGURAÇÃO ===");
  Serial.println("SSID: " + apSSID);
  Serial.println("Senha: " + apPassword);
  Serial.println("URL: http://192.168.4.1");
  Serial.println("===========================\n");
  
  WiFi.mode(WIFI_AP);
  WiFi.softAP(apSSID.c_str(), apPassword.c_str());
  
  server.on("/", HTTP_GET, handleConfigPage);
  server.on("/save", HTTP_POST, handleConfigSave);
  server.begin();
  
  Serial.println("✓ Portal de configuração iniciado");
}

// =============================================================================
// PÁGINA DE CONFIGURAÇÃO
// =============================================================================
void handleConfigPage() {
  String html = R"(
<!DOCTYPE html>
<html>
<head>
  <meta charset='UTF-8'>
  <meta name='viewport' content='width=device-width, initial-scale=1'>
  <title>Configuração Poltrona</title>
  <style>
    body { font-family: Arial; margin: 20px; background: #f0f0f0; }
    .container { max-width: 500px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { color: #333; }
    label { display: block; margin-top: 15px; font-weight: bold; }
    input, select { width: 100%; padding: 8px; margin-top: 5px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
    button { background: #4CAF50; color: white; padding: 12px 20px; border: none; border-radius: 4px; cursor: pointer; margin-top: 20px; width: 100%; font-size: 16px; }
    button:hover { background: #45a049; }
    .info { background: #e7f3ff; padding: 10px; border-left: 4px solid #2196F3; margin-bottom: 20px; }
    .loading { background: #fff3cd; padding: 10px; border-left: 4px solid #ffc107; margin: 10px 0; display: none; }
    .error { background: #f8d7da; padding: 10px; border-left: 4px solid #dc3545; margin: 10px 0; display: none; }
    .hidden { display: none; }
    .link-button { background: none; border: none; color: #2196F3; text-decoration: underline; cursor: pointer; padding: 0; font-size: 14px; margin-top: 5px; }
  </style>
  <script>
    const SUPABASE_URL = 'https://pplaglcevtvlpzdnmvqd.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwbGFnbGNldnR2bHB6ZG5tdnFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzOTYxOTgsImV4cCI6MjA3NTk3MjE5OH0.XE9rN4KAWT7Ng_Y-otAFZlP3j4bdRAt5qYh-SIwuFCw';
    
    async function loadPoltronas() {
      const selectElement = document.getElementById('poltronaSelect');
      const manualDiv = document.getElementById('poltronaManual');
      const loadingDiv = document.getElementById('loading');
      const errorDiv = document.getElementById('error');
      
      try {
        loadingDiv.style.display = 'block';
        errorDiv.style.display = 'none';
        
        const response = await fetch(
          SUPABASE_URL + '/rest/v1/poltronas?select=poltrona_id,location&active=eq.true&order=poltrona_id.asc',
          {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Prefer': 'return=representation'
            }
          }
        );
        
        if (!response.ok) throw new Error('Falha ao carregar poltronas');
        
        const poltronas = await response.json();
        
        selectElement.innerHTML = '<option value="">-- Selecione uma poltrona --</option>';
        poltronas.forEach(p => {
          const option = document.createElement('option');
          option.value = p.poltrona_id;
          option.textContent = p.poltrona_id + ' - ' + p.location;
          selectElement.appendChild(option);
        });
        
        selectElement.innerHTML += '<option value="__manual__">✏️ Digitar manualmente</option>';
        
        loadingDiv.style.display = 'none';
        selectElement.style.display = 'block';
        
      } catch (error) {
        console.error('Erro:', error);
        loadingDiv.style.display = 'none';
        errorDiv.style.display = 'block';
        showManualInput();
      }
    }
    
    function handlePoltronaChange() {
      const selectElement = document.getElementById('poltronaSelect');
      if (selectElement.value === '__manual__') {
        showManualInput();
      }
    }
    
    function showManualInput() {
      document.getElementById('poltronaSelect').style.display = 'none';
      document.getElementById('poltronaManual').style.display = 'block';
    }
    
    function showDropdown() {
      document.getElementById('poltronaSelect').style.display = 'block';
      document.getElementById('poltronaManual').style.display = 'none';
      document.getElementById('manualInput').value = '';
    }
    
    window.addEventListener('load', loadPoltronas);
  </script>
</head>
<body>
  <div class='container'>
    <h1>🪑 Configuração da Poltrona</h1>
    <div class='info'>
      <strong>Firmware:</strong> )" + String(FIRMWARE_VERSION) + R"(<br>
      <strong>MAC:</strong> )" + String((uint32_t)ESP.getEfuseMac(), HEX) + R"(
    </div>
    
    <div id='loading' class='loading'>
      ⏳ Carregando poltronas disponíveis...
    </div>
    
    <div id='error' class='error'>
      ⚠️ Não foi possível carregar a lista. Use o campo manual abaixo.
    </div>
    
    <form action='/save' method='POST'>
      <label>Selecione a Poltrona:</label>
      <select id='poltronaSelect' name='poltronaId' onchange='handlePoltronaChange()' style='display:none;' required>
      </select>
      
      <div id='poltronaManual' style='display:none;'>
        <label>ID da Poltrona (Manual):</label>
        <input type='text' id='manualInput' name='poltronaId' value=')" + config.poltronaId + R"('>
        <button type='button' class='link-button' onclick='showDropdown()'>← Voltar para a lista</button>
      </div>
      
      <label>WiFi SSID:</label>
      <input type='text' name='wifiSSID' value=')" + config.wifiSSID + R"(' required>
      
      <label>WiFi Senha:</label>
      <input type='password' name='wifiPassword' value=')" + config.wifiPassword + R"(' required>
      
      <label>Supabase URL:</label>
      <input type='text' name='supabaseUrl' value=')" + (config.supabaseUrl.length() > 0 ? config.supabaseUrl : "https://pplaglcevtvlpzdnmvqd.supabase.co") + R"(' required>
      
      <label>Supabase Key:</label>
      <input type='text' name='supabaseKey' value=')" + (config.supabaseKey.length() > 0 ? config.supabaseKey : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwbGFnbGNldnR2bHB6ZG5tdnFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzOTYxOTgsImV4cCI6MjA3NTk3MjE5OH0.XE9rN4KAWT7Ng_Y-otAFZlP3j4bdRAt5qYh-SIwuFCw") + R"(' required>
      
      <label>Duração da Massagem (segundos):</label>
      <input type='number' name='duration' value=')" + String(config.duration) + R"(' required>
      
      <button type='submit'>💾 Salvar e Reiniciar</button>
    </form>
  </div>
</body>
</html>
)";
  
  server.send(200, "text/html", html);
}

// =============================================================================
// SALVAR CONFIGURAÇÃO E REINICIAR
// =============================================================================
void handleConfigSave() {
  config.poltronaId = server.arg("poltronaId");
  config.wifiSSID = server.arg("wifiSSID");
  config.wifiPassword = server.arg("wifiPassword");
  config.supabaseUrl = server.arg("supabaseUrl");
  config.supabaseKey = server.arg("supabaseKey");
  config.duration = server.arg("duration").toInt();
  
  saveConfig();
  
  String html = R"(
<!DOCTYPE html>
<html>
<head>
  <meta charset='UTF-8'>
  <meta name='viewport' content='width=device-width, initial-scale=1'>
  <title>Configuração Salva</title>
  <style>
    body { font-family: Arial; margin: 20px; background: #f0f0f0; text-align: center; }
    .container { max-width: 500px; margin: 50px auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { color: #4CAF50; }
    p { font-size: 16px; color: #666; }
  </style>
</head>
<body>
  <div class='container'>
    <h1>✓ Configuração Salva!</h1>
    <p>O ESP32 irá reiniciar em 3 segundos...</p>
    <p>Conecte-se à rede WiFi configurada e acesse o IP mostrado no Serial Monitor.</p>
  </div>
</body>
</html>
)";
  
  server.send(200, "text/html", html);
  delay(3000);
  ESP.restart();
}

// =============================================================================
// INICIAR SERVIDOR WEB (MODO NORMAL)
// =============================================================================
void startWebServer() {
  server.on("/", HTTP_GET, handleRoot);
  server.on("/status", HTTP_GET, handleStatus);
  server.on("/payment-approved", HTTP_POST, handlePaymentApproved);
  server.on("/test", HTTP_POST, handleTest);
  server.begin();
  
  Serial.println("✓ Servidor web iniciado");
  Serial.println("  Endpoints disponíveis:");
  Serial.println("    GET  /         - Página inicial");
  Serial.println("    GET  /status   - Status do sistema");
  Serial.println("    POST /payment-approved - Receber notificação de pagamento");
  Serial.println("    POST /test     - Teste de relés");
}

// =============================================================================
// PÁGINA INICIAL
// =============================================================================
void handleRoot() {
  String html = R"(
<!DOCTYPE html>
<html>
<head>
  <meta charset='UTF-8'>
  <meta name='viewport' content='width=device-width, initial-scale=1'>
  <title>Poltrona )" + config.poltronaId + R"(</title>
  <style>
    body { font-family: Arial; margin: 20px; background: #f0f0f0; }
    .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { color: #333; }
    .status { padding: 15px; margin: 10px 0; border-radius: 5px; }
    .online { background: #d4edda; color: #155724; }
    .offline { background: #f8d7da; color: #721c24; }
    .active { background: #fff3cd; color: #856404; }
    .info { margin: 10px 0; padding: 10px; background: #e7f3ff; border-left: 4px solid #2196F3; }
  </style>
</head>
<body>
  <div class='container'>
    <h1>🪑 Poltrona )" + config.poltronaId + R"(</h1>
    <div class='status online'>
      <strong>Status:</strong> ✓ Online
    </div>
    <div class='info'>
      <strong>IP:</strong> )" + WiFi.localIP().toString() + R"(<br>
      <strong>RSSI:</strong> )" + String(WiFi.RSSI()) + R"( dBm<br>
      <strong>Firmware:</strong> )" + String(FIRMWARE_VERSION) + R"(<br>
      <strong>Uptime:</strong> )" + String((millis() - systemStartTime) / 1000) + R"(s<br>
      <strong>Massagem Ativa:</strong> )" + String(massageActive ? "Sim" : "Não") + R"(
    </div>
  </div>
</body>
</html>
)";
  
  server.send(200, "text/html", html);
}

// =============================================================================
// STATUS JSON
// =============================================================================
void handleStatus() {
  StaticJsonDocument<256> doc;
  doc["poltrona_id"] = config.poltronaId;
  doc["ip"] = WiFi.localIP().toString();
  doc["rssi"] = WiFi.RSSI();
  doc["firmware_version"] = FIRMWARE_VERSION;
  doc["uptime_seconds"] = (millis() - systemStartTime) / 1000;
  doc["massage_active"] = massageActive;
  doc["online"] = true;
  
  String response;
  serializeJson(doc, response);
  server.send(200, "application/json", response);
}

// =============================================================================
// RECEBER NOTIFICAÇÃO DE PAGAMENTO
// =============================================================================
void handlePaymentApproved() {
  if (!server.hasArg("plain")) {
    server.send(400, "application/json", "{\"error\":\"No body\"}");
    return;
  }
  
  String body = server.arg("plain");
  Serial.println("Notificação recebida: " + body);
  
  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, body);
  
  if (error) {
    Serial.println("Erro ao parsear JSON: " + String(error.c_str()));
    server.send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
    return;
  }
  
  String receivedPoltronaId = doc["poltrona_id"].as<String>();
  long paymentId = doc["payment_id"];
  
  // Validar se é para esta poltrona
  if (receivedPoltronaId != config.poltronaId) {
    Serial.println("Poltrona ID não corresponde: " + receivedPoltronaId + " != " + config.poltronaId);
    server.send(400, "application/json", "{\"error\":\"Wrong poltrona_id\"}");
    return;
  }
  
  // Iniciar massagem
  startMassage(paymentId);
  
  server.send(200, "application/json", "{\"status\":\"success\",\"massage_started\":true}");
  
  // Piscar LED 3 vezes
  for (int i = 0; i < 3; i++) {
    digitalWrite(LED_STATUS, LOW);
    delay(100);
    digitalWrite(LED_STATUS, HIGH);
    delay(100);
  }
}

// =============================================================================
// TESTE DE RELÉS
// =============================================================================
void handleTest() {
  Serial.println("Teste de relés solicitado");
  
  digitalWrite(RELE_1, HIGH);
  digitalWrite(RELE_2, HIGH);
  digitalWrite(RELE_3, HIGH);
  digitalWrite(RELE_4, HIGH);
  
  delay(10000); // 10 segundos
  
  digitalWrite(RELE_1, LOW);
  digitalWrite(RELE_2, LOW);
  digitalWrite(RELE_3, LOW);
  digitalWrite(RELE_4, LOW);
  
  server.send(200, "application/json", "{\"status\":\"test_completed\"}");
  sendLog("Teste de relés executado");
}

// =============================================================================
// INICIAR MASSAGEM
// =============================================================================
void startMassage(long paymentId) {
  Serial.println("=== INICIANDO MASSAGEM ===");
  Serial.println("Payment ID: " + String(paymentId));
  Serial.println("Duração: " + String(config.duration) + "s");
  
  massageActive = true;
  massageEndTime = millis() + (config.duration * 1000);
  
  // Ligar todos os relés
  digitalWrite(RELE_1, HIGH);
  digitalWrite(RELE_2, HIGH);
  digitalWrite(RELE_3, HIGH);
  digitalWrite(RELE_4, HIGH);
  
  sendLog("Massagem iniciada - Payment ID: " + String(paymentId));
  Serial.println("✓ Relés ativados");
}

// =============================================================================
// PARAR MASSAGEM
// =============================================================================
void stopMassage() {
  Serial.println("=== FINALIZANDO MASSAGEM ===");
  
  massageActive = false;
  
  // Desligar todos os relés
  digitalWrite(RELE_1, LOW);
  digitalWrite(RELE_2, LOW);
  digitalWrite(RELE_3, LOW);
  digitalWrite(RELE_4, LOW);
  
  sendLog("Massagem finalizada");
  Serial.println("✓ Relés desativados");
}

// =============================================================================
// ENVIAR HEARTBEAT PARA SUPABASE (VERSÃO ATUALIZADA)
// =============================================================================
void sendHeartbeat() {
  if (config.supabaseUrl.length() == 0 || WiFi.status() != WL_CONNECTED) {
    return;
  }
  
  HTTPClient http;
  
  // MUDANÇA: Usar a Edge Function ao invés do REST API direto
  String url = config.supabaseUrl + "/functions/v1/esp32-heartbeat";
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", config.supabaseKey);
  http.addHeader("Authorization", "Bearer " + config.supabaseKey);
  http.setTimeout(10000); // Timeout de 10 segundos
  
  StaticJsonDocument<256> doc;
  doc["poltrona_id"] = config.poltronaId;
  doc["firmware_version"] = FIRMWARE_VERSION;
  doc["wifi_signal"] = WiFi.RSSI();
  doc["uptime_seconds"] = (millis() - systemStartTime) / 1000;
  doc["ip"] = WiFi.localIP().toString();
  
  String payload;
  serializeJson(doc, payload);
  
  // MUDANÇA: Usar POST ao invés de PATCH
  int httpCode = http.POST(payload);
  
  if (httpCode == 200 || httpCode == 201) {
    Serial.println("✓ Heartbeat enviado com sucesso");
  } else if (httpCode > 0) {
    Serial.printf("✗ Erro ao enviar heartbeat: HTTP %d\n", httpCode);
    String response = http.getString();
    Serial.println("  Resposta: " + response);
  } else {
    Serial.println("✗ Falha na conexão do heartbeat: " + http.errorToString(httpCode));
  }
  
  http.end();
}

// =============================================================================
// ENVIAR LOG PARA SUPABASE
// =============================================================================
void sendLog(String message) {
  Serial.println("LOG: " + message);
  
  if (config.supabaseUrl.length() == 0 || WiFi.status() != WL_CONNECTED) {
    return;
  }
  
  HTTPClient http;
  String url = config.supabaseUrl + "/rest/v1/logs";
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("apikey", config.supabaseKey);
  http.addHeader("Authorization", "Bearer " + config.supabaseKey);
  http.addHeader("Prefer", "return=minimal");
  
  StaticJsonDocument<256> doc;
  doc["poltrona_id"] = config.poltronaId;
  doc["message"] = message;
  
  String payload;
  serializeJson(doc, payload);
  
  int httpCode = http.POST(payload);
  
  if (httpCode != 201) {
    Serial.println("✗ Erro ao enviar log: " + String(httpCode));
  }
  
  http.end();
}

// =============================================================================
// PISCAR LED
// =============================================================================
void blinkLED(int duration) {
  digitalWrite(LED_STATUS, !digitalRead(LED_STATUS));
  delay(duration);
}
