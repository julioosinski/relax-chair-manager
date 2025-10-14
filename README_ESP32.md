# Sistema de Poltrona de Massagem - ESP32

Este código implementa um sistema completo de poltrona de massagem controlada por ESP32, integrado com Supabase para gerenciamento de pagamentos PIX.

## 🚀 Funcionalidades

- **Configuração WiFi via Portal de Captura**: Interface web para configurar credenciais WiFi
- **Integração Supabase**: Comunicação em tempo real com banco de dados
- **Verificação de Pagamentos**: Verifica automaticamente pagamentos PIX aprovados
- **Controle de Motores**: Gerencia 4 motores de massagem independentes
- **Interface Web**: Configuração e monitoramento via navegador
- **Sistema de Logs**: Registra todas as atividades no Supabase
- **Botões Físicos**: Controle manual para iniciar/parar massagem
- **LED de Status**: Indica estado da conexão e sistema

## 🔧 Hardware Necessário

### Componentes Principais
- **ESP32 DevKit** (ou similar)
- **4x Motores de Massagem** (Vibradores 12V)
- **4x Relés 12V** (para controlar motores)
- **2x Botões** (Iniciar/Parar)
- **1x LED** (Status)
- **Resistores** (220Ω para LED, 10kΩ para botões)
- **Fonte 12V** (para motores)
- **Fonte 5V** (para ESP32)

### Conexões
```
ESP32          | Componente
---------------|------------------
GPIO 2         | Motor 1 (via relé)
GPIO 4         | Motor 2 (via relé)
GPIO 5         | Motor 3 (via relé)
GPIO 18        | Motor 4 (via relé)
GPIO 2         | LED Status (+ resistor 220Ω)
GPIO 19        | Botão Iniciar (pull-up interno)
GPIO 21        | Botão Parar (pull-up interno)
3.3V           | VCC dos botões
GND            | GND comum
```

## 📋 Instalação

### 1. Preparar o Ambiente
```bash
# Instalar Arduino IDE
# Instalar ESP32 Board Package
# Instalar bibliotecas necessárias:
# - ArduinoJson
# - HTTPClient (já incluída)
# - WebServer (já incluída)
# - Preferences (já incluída)
```

### 2. Configurar o Código
1. Abra o arquivo `esp32_massage_chair.ino` no Arduino IDE
2. Configure as constantes no início do código:
   ```cpp
   #define SUPABASE_URL "https://seu-projeto.supabase.co"
   #define SUPABASE_ANON_KEY "sua-chave-anonima"
   ```
3. Ajuste os pinos conforme seu hardware
4. Compile e faça upload para o ESP32

### 3. Configuração Inicial
1. Conecte o ESP32 à alimentação
2. O ESP32 criará uma rede WiFi: `Poltrona-Massagem-p1`
3. Conecte-se à rede (senha: `12345678`)
4. Acesse `http://192.168.4.1` no navegador
5. Configure:
   - Credenciais WiFi
   - URL e chave do Supabase
   - ID da poltrona
   - Chave PIX
   - Preço e duração
   - Localização

## 🔄 Como Funciona

### Fluxo de Pagamento
1. **Cliente faz PIX** para a chave configurada
2. **Sistema web** registra pagamento no Supabase
3. **ESP32 verifica** pagamentos a cada 5 segundos
4. **Pagamento aprovado** → Massagem inicia automaticamente
5. **Tempo configurado** → Massagem para automaticamente

### Controles Disponíveis
- **Botão Físico**: Iniciar/parar massagem manualmente
- **Interface Web**: Monitorar status e configurações
- **API Supabase**: Gerenciar via sistema web

## 🌐 Interface Web

### Página Principal (`/`)
- Formulário de configuração
- Status da conexão WiFi
- Status da conexão Supabase

### Página de Status (`/status`)
- Status em tempo real
- Informações da poltrona
- Tempo restante da massagem
- Auto-refresh a cada 5 segundos

## 📊 Integração com Supabase

### Tabelas Utilizadas
- **poltronas**: Configurações das poltronas
- **payments**: Registro de pagamentos
- **logs**: Logs de atividades

### Endpoints Utilizados
```sql
-- Verificar pagamentos aprovados
GET /rest/v1/payments?poltrona_id=eq.{id}&status=eq.approved

-- Enviar logs
POST /rest/v1/logs

-- Verificar configuração da poltrona
GET /rest/v1/poltronas?poltrona_id=eq.{id}
```

## 🔧 Configurações Avançadas

### Personalizar Verificação de Pagamentos
```cpp
#define CHECK_PAYMENT_INTERVAL 5000  // 5 segundos
```

### Ajustar Duração da Massagem
```cpp
#define MASSAGE_DURATION 900000  // 15 minutos em ms
```

### Configurar Pinos
```cpp
#define MASSAGE_MOTOR_1_PIN 2
#define MASSAGE_MOTOR_2_PIN 4
// ... outros pinos
```

## 🐛 Solução de Problemas

### WiFi não conecta
- Verifique credenciais na interface web
- Reinicie o ESP32
- Use o portal de captura para reconfigurar

### Supabase não conecta
- Verifique URL e chave anônima
- Confirme se o projeto está ativo
- Verifique políticas RLS

### Motores não funcionam
- Verifique conexões dos relés
- Confirme alimentação 12V
- Teste botões físicos

### Massagem não para
- Verifique configuração de duração
- Use botão de parada física
- Reinicie o sistema

## 📱 Monitoramento

### Logs no Serial
```cpp
Serial.println("LOG: Mensagem de debug");
```

### Logs no Supabase
```sql
SELECT * FROM logs 
WHERE poltrona_id = 'p1' 
ORDER BY created_at DESC;
```

### Status via Web
Acesse `http://{ip-do-esp32}/status` para monitoramento em tempo real.

## 🔒 Segurança

- Portal de captura com senha padrão
- Comunicação HTTPS com Supabase
- Validação de dados de entrada
- Timeout automático de massagem

## 📈 Próximas Melhorias

- [ ] Suporte a múltiplos perfis de massagem
- [ ] Integração com sensores de presença
- [ ] Sistema de notificações
- [ ] Backup de configurações
- [ ] Interface mobile responsiva
- [ ] Sistema de manutenção preventiva

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique os logs no Serial Monitor
2. Consulte a documentação do Supabase
3. Teste as conexões de hardware
4. Verifique configurações de rede

---

**Desenvolvido para o Sistema de Poltronas de Massagem**  
*Integração completa com Supabase e controle via ESP32*
