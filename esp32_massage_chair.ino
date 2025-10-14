/*
 * Sistema de Poltrona de Massagem com ESP32
 * Integração com Mercado Pago para pagamentos PIX via QR Code
 * 
 * Funcionalidades:
 * - Configuração WiFi via portal de captura
 * - Integração com Mercado Pago para pagamentos PIX
 * - QR Code fixo com valor determinado
 * - Validação de valor específico
 * - Controle de motores de massagem
 * - Interface web para configuração
 * - Sistema de logs
 * - Webhook para confirmação de pagamentos
 */

#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <EEPROM.h>
#include <SPIFFS.h>
#include <time.h>

// Configurações do hardware
#define MASSAGE_MOTOR_1_PIN 2
#define MASSAGE_MOTOR_2_PIN 4
#define MASSAGE_MOTOR_3_PIN 5
#define MASSAGE_MOTOR_4_PIN 18
#define LED_STATUS_PIN 2
#define BUTTON_START_PIN 19
#define BUTTON_STOP_PIN 21

// Configurações do sistema
#define POLTRONA_ID "p1"  // Será configurado via web
#define CHECK_PAYMENT_INTERVAL 10000  // 10 segundos (reduzido para webhook)
#define MASSAGE_DURATION 900000  // 15 minutos em ms
#define SUPABASE_URL "https://your-project.supabase.co"
#define SUPABASE_ANON_KEY "your-anon-key"
#define MERCADOPAGO_ACCESS_TOKEN "your-mercadopago-token"
#define WEBHOOK_PORT 8080  // Porta para webhook local

// Estruturas de dados
struct PoltronaConfig {
  String poltronaId;
  String wifiSSID;
  String wifiPassword;
  String supabaseUrl;
  String supabaseKey;
  String mercadopagoToken;
  String pixKey;
  float price;
  int duration;
  String location;
  bool active;
  String qrCodeData;  // QR Code fixo gerado
  String paymentId;   // ID do pagamento atual
};

struct PaymentData {
  int paymentId;
  String poltronaId;
  float amount;
  String status;
  String createdAt;
  String approvedAt;
};

// Variáveis globais
PoltronaConfig config;
WebServer server(80);
WebServer webhookServer(WEBHOOK_PORT);
Preferences preferences;
bool massageActive = false;
unsigned long massageStartTime = 0;
unsigned long lastPaymentCheck = 0;
String currentPaymentId = "";
bool wifiConnected = false;
bool supabaseConnected = false;
bool qrCodeGenerated = false;

// Configuração padrão
void setupDefaultConfig() {
  config.poltronaId = POLTRONA_ID;
  config.wifiSSID = "";
  config.wifiPassword = "";
  config.supabaseUrl = SUPABASE_URL;
  config.supabaseKey = SUPABASE_ANON_KEY;
  config.mercadopagoToken = MERCADOPAGO_ACCESS_TOKEN;
  config.pixKey = "";
  config.price = 10.00;
  config.duration = 900; // 15 minutos
  config.location = "";
  config.active = true;
  config.qrCodeData = "";
  config.paymentId = "";
}

// Salvar configuração na EEPROM
void saveConfig() {
  preferences.begin("poltrona", false);
  preferences.putString("poltronaId", config.poltronaId);
  preferences.putString("wifiSSID", config.wifiSSID);
  preferences.putString("wifiPassword", config.wifiPassword);
  preferences.putString("supabaseUrl", config.supabaseUrl);
  preferences.putString("supabaseKey", config.supabaseKey);
  preferences.putString("pixKey", config.pixKey);
  preferences.putFloat("price", config.price);
  preferences.putInt("duration", config.duration);
  preferences.putString("location", config.location);
  preferences.putBool("active", config.active);
  preferences.end();
}

// Carregar configuração da EEPROM
void loadConfig() {
  preferences.begin("poltrona", true);
  config.poltronaId = preferences.getString("poltronaId", POLTRONA_ID);
  config.wifiSSID = preferences.getString("wifiSSID", "");
  config.wifiPassword = preferences.getString("wifiPassword", "");
  config.supabaseUrl = preferences.getString("supabaseUrl", SUPABASE_URL);
  config.supabaseKey = preferences.getString("supabaseKey", SUPABASE_ANON_KEY);
  config.pixKey = preferences.getString("pixKey", "");
  config.price = preferences.getFloat("price", 10.00);
  config.duration = preferences.getInt("duration", 900);
  config.location = preferences.getString("location", "");
  config.active = preferences.getBool("active", true);
  preferences.end();
}

// Configurar pinos
void setupPins() {
  pinMode(MASSAGE_MOTOR_1_PIN, OUTPUT);
  pinMode(MASSAGE_MOTOR_2_PIN, OUTPUT);
  pinMode(MASSAGE_MOTOR_3_PIN, OUTPUT);
  pinMode(MASSAGE_MOTOR_4_PIN, OUTPUT);
  pinMode(LED_STATUS_PIN, OUTPUT);
  pinMode(BUTTON_START_PIN, INPUT_PULLUP);
  pinMode(BUTTON_STOP_PIN, INPUT_PULLUP);
  
  // Desligar todos os motores
  stopMassage();
}

// Conectar ao WiFi
bool connectWiFi() {
  if (config.wifiSSID == "" || config.wifiPassword == "") {
    return false;
  }
  
  WiFi.begin(config.wifiSSID.c_str(), config.wifiPassword.c_str());
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    digitalWrite(LED_STATUS_PIN, !digitalRead(LED_STATUS_PIN));
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    digitalWrite(LED_STATUS_PIN, HIGH);
    return true;
  }
  
  wifiConnected = false;
  digitalWrite(LED_STATUS_PIN, LOW);
  return false;
}

// Configurar portal de captura WiFi
void setupWiFiPortal() {
  WiFi.mode(WIFI_AP);
  WiFi.softAP("Poltrona-Massagem-" + config.poltronaId, "12345678");
  
  server.on("/", handleRoot);
  server.on("/config", HTTP_POST, handleConfig);
  server.on("/status", handleStatus);
  server.begin();
}

// Página principal do portal
void handleRoot() {
  String html = "<!DOCTYPE html><html><head><title>Configuração Poltrona</title>";
  html += "<meta name='viewport' content='width=device-width, initial-scale=1'>";
  html += "<style>body{font-family:Arial;margin:20px;background:#f0f0f0;}";
  html += ".container{max-width:500px;margin:0 auto;background:white;padding:20px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.1);}";
  html += "input,select{width:100%;padding:10px;margin:5px 0;border:1px solid #ddd;border-radius:5px;box-sizing:border-box;}";
  html += "button{background:#007bff;color:white;padding:12px 20px;border:none;border-radius:5px;cursor:pointer;width:100%;font-size:16px;}";
  html += "button:hover{background:#0056b3;} .status{background:#e8f5e8;padding:10px;border-radius:5px;margin:10px 0;}</style></head><body>";
  html += "<div class='container'><h2>🔧 Configuração da Poltrona " + config.poltronaId + "</h2>";
  
  if (wifiConnected) {
    html += "<div class='status'>✅ WiFi Conectado: " + WiFi.SSID() + "</div>";
    html += "<div class='status'>🌐 IP: " + WiFi.localIP().toString() + "</div>";
  } else {
    html += "<div class='status'>❌ WiFi Desconectado</div>";
  }
  
  html += "<form method='POST' action='/config'>";
  html += "<h3>Configurações WiFi</h3>";
  html += "<input type='text' name='wifi_ssid' placeholder='Nome da Rede WiFi' value='" + config.wifiSSID + "' required>";
  html += "<input type='password' name='wifi_password' placeholder='Senha da Rede WiFi' value='" + config.wifiPassword + "' required>";
  
  html += "<h3>Configurações Supabase</h3>";
  html += "<input type='text' name='supabase_url' placeholder='URL do Supabase' value='" + config.supabaseUrl + "' required>";
  html += "<input type='text' name='supabase_key' placeholder='Chave Anônima do Supabase' value='" + config.supabaseKey + "' required>";
  
  html += "<h3>Configurações Mercado Pago</h3>";
  html += "<input type='text' name='mercadopago_token' placeholder='Access Token do Mercado Pago' value='" + config.mercadopagoToken + "' required>";
  html += "<small>Token de acesso do Mercado Pago para gerar QR codes PIX</small>";
  
  html += "<h3>Configurações da Poltrona</h3>";
  html += "<input type='text' name='poltrona_id' placeholder='ID da Poltrona' value='" + config.poltronaId + "' required>";
  html += "<input type='text' name='pix_key' placeholder='Chave PIX' value='" + config.pixKey + "' required>";
  html += "<input type='number' name='price' placeholder='Preço (R$)' step='0.01' value='" + String(config.price, 2) + "' required>";
  html += "<input type='number' name='duration' placeholder='Duração (segundos)' value='" + String(config.duration) + "' required>";
  html += "<input type='text' name='location' placeholder='Localização' value='" + config.location + "' required>";
  html += "<select name='active'><option value='1'" + (config.active ? " selected" : "") + ">Ativa</option>";
  html += "<option value='0'" + (!config.active ? " selected" : "") + ">Inativa</option></select>";
  
  html += "<button type='submit'>💾 Salvar Configuração</button></form>";
  html += "<p><a href='/status'>📊 Ver Status</a></p></div></body></html>";
  
  server.send(200, "text/html", html);
}

// Processar configuração
void handleConfig() {
  if (server.hasArg("wifi_ssid")) {
    config.wifiSSID = server.arg("wifi_ssid");
    config.wifiPassword = server.arg("wifi_password");
    config.supabaseUrl = server.arg("supabase_url");
    config.supabaseKey = server.arg("supabase_key");
    config.mercadopagoToken = server.arg("mercadopago_token");
    config.poltronaId = server.arg("poltrona_id");
    config.pixKey = server.arg("pix_key");
    config.price = server.arg("price").toFloat();
    config.duration = server.arg("duration").toInt();
    config.location = server.arg("location");
    config.active = server.arg("active") == "1";
    
    saveConfig();
    
    String html = "<!DOCTYPE html><html><head><meta http-equiv='refresh' content='3;url=/'>";
    html += "<title>Configuração Salva</title></head><body>";
    html += "<div style='text-align:center;margin-top:50px;'>";
    html += "<h2>✅ Configuração Salva!</h2>";
    html += "<p>Reiniciando em 3 segundos...</p></div></body></html>";
    
    server.send(200, "text/html", html);
    delay(2000);
    ESP.restart();
  }
}

// Página de status
void handleStatus() {
  String html = "<!DOCTYPE html><html><head><title>Status da Poltrona</title>";
  html += "<meta name='viewport' content='width=device-width, initial-scale=1'>";
  html += "<meta http-equiv='refresh' content='5'>";
  html += "<style>body{font-family:Arial;margin:20px;background:#f0f0f0;}";
  html += ".container{max-width:600px;margin:0 auto;background:white;padding:20px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.1);}";
  html += ".status{background:#e8f5e8;padding:15px;border-radius:5px;margin:10px 0;}";
  html += ".error{background:#ffe8e8;padding:15px;border-radius:5px;margin:10px 0;}";
  html += ".info{background:#e8f4fd;padding:15px;border-radius:5px;margin:10px 0;}</style></head><body>";
  html += "<div class='container'><h2>📊 Status da Poltrona " + config.poltronaId + "</h2>";
  
  // Status WiFi
  if (wifiConnected) {
    html += "<div class='status'>✅ WiFi: " + WiFi.SSID() + " (" + WiFi.localIP().toString() + ")</div>";
  } else {
    html += "<div class='error'>❌ WiFi Desconectado</div>";
  }
  
  // Status Supabase
  if (supabaseConnected) {
    html += "<div class='status'>✅ Supabase Conectado</div>";
  } else {
    html += "<div class='error'>❌ Supabase Desconectado</div>";
  }
  
  // Status da Massagem
  if (massageActive) {
    unsigned long remaining = (massageStartTime + MASSAGE_DURATION) - millis();
    html += "<div class='info'>🔄 Massagem Ativa - Tempo restante: " + String(remaining / 1000) + "s</div>";
  } else {
    html += "<div class='info'>⏸️ Massagem Inativa</div>";
  }
  
  // Informações da Poltrona
  html += "<div class='info'>💰 Preço: R$ " + String(config.price, 2) + "</div>";
  html += "<div class='info'>⏱️ Duração: " + String(config.duration) + "s</div>";
  html += "<div class='info'>📍 Local: " + config.location + "</div>";
  html += "<div class='info'>🔑 PIX: " + config.pixKey + "</div>";
  
  // Status do QR Code
  if (qrCodeGenerated) {
    html += "<div class='status'>✅ QR Code PIX Gerado</div>";
    html += "<div class='info'>🆔 Payment ID: " + config.paymentId + "</div>";
    html += "<div class='info'>📱 QR Code: " + config.qrCodeData.substring(0, 50) + "...</div>";
  } else {
    html += "<div class='error'>❌ QR Code PIX não gerado</div>";
  }
  
  html += "<p><a href='/'>🔧 Configuração</a></p></div></body></html>";
  
  server.send(200, "text/html", html);
}

// Verificar pagamentos no Supabase
bool checkPayment() {
  if (!wifiConnected || !supabaseConnected) {
    return false;
  }
  
  HTTPClient http;
  http.begin(config.supabaseUrl + "/rest/v1/payments?poltrona_id=eq." + config.poltronaId + "&status=eq.approved&order=created_at.desc&limit=1");
  http.addHeader("apikey", config.supabaseKey);
  http.addHeader("Authorization", "Bearer " + config.supabaseKey);
  http.addHeader("Content-Type", "application/json");
  
  int httpCode = http.GET();
  
  if (httpCode == 200) {
    String payload = http.getString();
    http.end();
    
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, payload);
    
    if (doc.is<JsonArray>() && doc.size() > 0) {
      JsonObject payment = doc[0];
      String paymentId = String(payment["payment_id"].as<int>());
      
      // Verificar se é um pagamento novo
      if (paymentId != currentPaymentId) {
        currentPaymentId = paymentId;
        startMassage();
        logMessage("Pagamento aprovado - ID: " + paymentId);
        return true;
      }
    }
  } else {
    logMessage("Erro ao verificar pagamento: " + String(httpCode));
  }
  
  http.end();
  return false;
}

// Iniciar massagem
void startMassage() {
  if (!config.active) {
    logMessage("Poltrona inativa - massagem não iniciada");
    return;
  }
  
  massageActive = true;
  massageStartTime = millis();
  
  // Ativar motores de massagem
  digitalWrite(MASSAGE_MOTOR_1_PIN, HIGH);
  digitalWrite(MASSAGE_MOTOR_2_PIN, HIGH);
  digitalWrite(MASSAGE_MOTOR_3_PIN, HIGH);
  digitalWrite(MASSAGE_MOTOR_4_PIN, HIGH);
  
  logMessage("Massagem iniciada");
}

// Parar massagem
void stopMassage() {
  massageActive = false;
  massageStartTime = 0;
  
  // Desativar motores de massagem
  digitalWrite(MASSAGE_MOTOR_1_PIN, LOW);
  digitalWrite(MASSAGE_MOTOR_2_PIN, LOW);
  digitalWrite(MASSAGE_MOTOR_3_PIN, LOW);
  digitalWrite(MASSAGE_MOTOR_4_PIN, LOW);
  
  logMessage("Massagem parada");
}

// Enviar log para Supabase
void logMessage(String message) {
  if (!wifiConnected || !supabaseConnected) {
    Serial.println("LOG: " + message);
    return;
  }
  
  HTTPClient http;
  http.begin(config.supabaseUrl + "/rest/v1/logs");
  http.addHeader("apikey", config.supabaseKey);
  http.addHeader("Authorization", "Bearer " + config.supabaseKey);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Prefer", "return=minimal");
  
  DynamicJsonDocument doc(512);
  doc["poltrona_id"] = config.poltronaId;
  doc["message"] = message;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  int httpCode = http.POST(jsonString);
  http.end();
  
  if (httpCode == 201) {
    Serial.println("LOG enviado: " + message);
  } else {
    Serial.println("Erro ao enviar log: " + String(httpCode));
  }
}

// Testar conexão com Supabase
bool testSupabaseConnection() {
  if (!wifiConnected) {
    return false;
  }
  
  HTTPClient http;
  http.begin(config.supabaseUrl + "/rest/v1/poltronas?poltrona_id=eq." + config.poltronaId);
  http.addHeader("apikey", config.supabaseKey);
  http.addHeader("Authorization", "Bearer " + config.supabaseKey);
  
  int httpCode = http.GET();
  http.end();
  
  return httpCode == 200;
}

// Verificar botões físicos
void checkButtons() {
  if (digitalRead(BUTTON_START_PIN) == LOW) {
    delay(50); // Debounce
    if (digitalRead(BUTTON_START_PIN) == LOW) {
      if (!massageActive) {
        startMassage();
      }
    }
  }
  
  if (digitalRead(BUTTON_STOP_PIN) == LOW) {
    delay(50); // Debounce
    if (digitalRead(BUTTON_STOP_PIN) == LOW) {
      if (massageActive) {
        stopMassage();
      }
    }
  }
}

// Verificar se a massagem deve parar
void checkMassageTimeout() {
  if (massageActive && (millis() - massageStartTime) >= MASSAGE_DURATION) {
    stopMassage();
  }
}

// =============================================================================
// FUNÇÕES DE INTEGRAÇÃO COM MERCADO PAGO
// =============================================================================

// Gerar QR Code fixo via Mercado Pago
bool generateMercadoPagoQRCode() {
  if (!wifiConnected || !supabaseConnected) {
    logMessage("Erro: WiFi ou Supabase não conectado para gerar QR Code");
    return false;
  }

  HTTPClient http;
  http.begin("https://api.mercadopago.com/v1/payments");
  http.addHeader("Authorization", "Bearer " + config.mercadopagoToken);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Idempotency-Key", "poltrona_" + config.poltronaId + "_" + String(millis()));

  // Criar JSON para requisição
  DynamicJsonDocument doc(1024);
  doc["transaction_amount"] = config.price;
  doc["description"] = "Poltrona de Massagem - " + config.location;
  doc["payment_method_id"] = "pix";
  doc["payer"]["email"] = "cliente@exemplo.com";
  doc["external_reference"] = "poltrona_" + config.poltronaId;
  doc["notification_url"] = "https://seu-dominio.com/api/webhook/mercadopago";
  doc["auto_return"] = "approved";
  
  JsonObject metadata = doc.createNestedObject("metadata");
  metadata["poltrona_id"] = config.poltronaId;
  metadata["location"] = config.location;
  metadata["fixed_amount"] = true;

  String jsonString;
  serializeJson(doc, jsonString);

  int httpCode = http.POST(jsonString);
  
  if (httpCode == 201) {
    String payload = http.getString();
    DynamicJsonDocument responseDoc(1024);
    deserializeJson(responseDoc, payload);
    
    config.paymentId = responseDoc["id"].as<String>();
    
    // Buscar QR Code
    http.end();
    http.begin("https://api.mercadopago.com/v1/payments/" + config.paymentId + "/qr_code");
    http.addHeader("Authorization", "Bearer " + config.mercadopagoToken);
    
    int qrCode = http.GET();
    if (qrCode == 200) {
      String qrPayload = http.getString();
      DynamicJsonDocument qrDoc(512);
      deserializeJson(qrDoc, qrPayload);
      
      config.qrCodeData = qrDoc["qr_code"].as<String>();
      qrCodeGenerated = true;
      
      logMessage("QR Code gerado com sucesso - Payment ID: " + config.paymentId);
      http.end();
      return true;
    }
  }
  
  logMessage("Erro ao gerar QR Code: " + String(httpCode));
  http.end();
  return false;
}

// Verificar status do pagamento no Mercado Pago
bool checkMercadoPagoPayment() {
  if (!wifiConnected || config.paymentId == "") {
    return false;
  }

  HTTPClient http;
  http.begin("https://api.mercadopago.com/v1/payments/" + config.paymentId);
  http.addHeader("Authorization", "Bearer " + config.mercadopagoToken);

  int httpCode = http.GET();
  
  if (httpCode == 200) {
    String payload = http.getString();
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, payload);
    
    String status = doc["status"].as<String>();
    float amount = doc["transaction_amount"].as<float>();
    
    // Validar valor do pagamento
    if (abs(amount - config.price) > 0.01) {
      logMessage("ERRO: Valor do pagamento inválido - Esperado: " + String(config.price, 2) + ", Recebido: " + String(amount, 2));
      http.end();
      return false;
    }
    
    if (status == "approved" && currentPaymentId != config.paymentId) {
      currentPaymentId = config.paymentId;
      startMassage();
      logMessage("Pagamento aprovado via Mercado Pago - ID: " + config.paymentId);
      http.end();
      return true;
    }
  }
  
  http.end();
  return false;
}

// Configurar webhook local para receber notificações
void setupWebhookServer() {
  webhookServer.on("/api/payment-approved", HTTP_POST, handlePaymentApproved);
  webhookServer.on("/api/status", HTTP_GET, handleWebhookStatus);
  webhookServer.begin();
  logMessage("Webhook server iniciado na porta " + String(WEBHOOK_PORT));
}

// Handler para pagamento aprovado via webhook
void handlePaymentApproved() {
  if (webhookServer.hasArg("plain")) {
    String body = webhookServer.arg("plain");
    
    DynamicJsonDocument doc(512);
    deserializeJson(doc, body);
    
    String paymentId = doc["paymentId"].as<String>();
    String poltronaId = doc["poltronaId"].as<String>();
    
    if (poltronaId == config.poltronaId) {
      logMessage("Pagamento aprovado via webhook - ID: " + paymentId);
      startMassage();
      webhookServer.send(200, "application/json", "{\"success\": true}");
    } else {
      webhookServer.send(400, "application/json", "{\"error\": \"Poltrona ID não confere\"}");
    }
  } else {
    webhookServer.send(400, "application/json", "{\"error\": \"Body vazio\"}");
  }
}

// Handler para status do webhook
void handleWebhookStatus() {
  String status = "{";
  status += "\"poltrona_id\":\"" + config.poltronaId + "\",";
  status += "\"wifi_connected\":" + String(wifiConnected ? "true" : "false") + ",";
  status += "\"supabase_connected\":" + String(supabaseConnected ? "true" : "false") + ",";
  status += "\"qr_generated\":" + String(qrCodeGenerated ? "true" : "false") + ",";
  status += "\"massage_active\":" + String(massageActive ? "true" : "false") + ",";
  status += "\"payment_id\":\"" + config.paymentId + "\",";
  status += "\"price\":" + String(config.price, 2);
  status += "}";
  
  webhookServer.send(200, "application/json", status);
}

// Atualizar configuração da poltrona no Supabase
bool updatePoltronaConfig() {
  if (!wifiConnected || !supabaseConnected) {
    return false;
  }

  HTTPClient http;
  http.begin(config.supabaseUrl + "/rest/v1/poltronas?poltrona_id=eq." + config.poltronaId);
  http.addHeader("apikey", config.supabaseKey);
  http.addHeader("Authorization", "Bearer " + config.supabaseKey);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Prefer", "return=minimal");

  DynamicJsonDocument doc(512);
  doc["qr_code_data"] = config.qrCodeData;
  doc["payment_id"] = config.paymentId;
  doc["updated_at"] = "now()";

  String jsonString;
  serializeJson(doc, jsonString);

  int httpCode = http.PATCH(jsonString);
  http.end();
  
  return httpCode == 200 || httpCode == 204;
}

// Setup principal
void setup() {
  Serial.begin(115200);
  Serial.println("🪑 Iniciando Sistema de Poltrona de Massagem");
  
  // Configurar pinos
  setupPins();
  
  // Carregar configuração
  loadConfig();
  
  // Tentar conectar ao WiFi
  if (config.wifiSSID != "" && config.wifiPassword != "") {
    if (connectWiFi()) {
      Serial.println("✅ WiFi conectado: " + WiFi.SSID());
      supabaseConnected = testSupabaseConnection();
      if (supabaseConnected) {
        Serial.println("✅ Supabase conectado");
        
        // Gerar QR Code do Mercado Pago
        if (config.mercadopagoToken != "" && config.mercadopagoToken != MERCADOPAGO_ACCESS_TOKEN) {
          Serial.println("🔄 Gerando QR Code do Mercado Pago...");
          if (generateMercadoPagoQRCode()) {
            Serial.println("✅ QR Code gerado com sucesso");
            updatePoltronaConfig();
          } else {
            Serial.println("❌ Erro ao gerar QR Code");
          }
        }
      } else {
        Serial.println("❌ Erro ao conectar com Supabase");
      }
    } else {
      Serial.println("❌ Falha ao conectar WiFi");
    }
  } else {
    Serial.println("⚠️ Configuração WiFi não encontrada");
  }
  
  // Se não conectou, iniciar portal de captura
  if (!wifiConnected) {
    Serial.println("🌐 Iniciando portal de captura WiFi");
    setupWiFiPortal();
  }
  
  // Configurar webhook server
  setupWebhookServer();
  
  // Configurar NTP
  configTime(-3 * 3600, 0, "pool.ntp.org", "time.nist.gov");
  
  logMessage("Sistema iniciado - Poltrona " + config.poltronaId);
}

// Loop principal
void loop() {
  // Processar requisições web
  server.handleClient();
  webhookServer.handleClient();
  
  // Verificar botões físicos
  checkButtons();
  
  // Verificar timeout da massagem
  checkMassageTimeout();
  
  // Verificar pagamentos do Mercado Pago periodicamente
  if (wifiConnected && supabaseConnected && (millis() - lastPaymentCheck) >= CHECK_PAYMENT_INTERVAL) {
    if (config.paymentId != "") {
      checkMercadoPagoPayment();
    } else {
      // Fallback para verificação via Supabase (método antigo)
      checkPayment();
    }
    lastPaymentCheck = millis();
  }
  
  // Piscar LED se não conectado
  if (!wifiConnected) {
    static unsigned long lastBlink = 0;
    if (millis() - lastBlink >= 1000) {
      digitalWrite(LED_STATUS_PIN, !digitalRead(LED_STATUS_PIN));
      lastBlink = millis();
    }
  }
  
  delay(100);
}
