#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include "HX711.h"
#include <Servo.h>

// LCD
LiquidCrystal_I2C lcd(0x27, 16, 2);

// HX711
#define DT D5
#define SCK D6
HX711 scale;

// OUTPUTS
#define LED_LOW D4
#define LED_AIR D3
#define BUZZER D0
#define SERVO_PIN D7

// Servo
Servo myServo;

// Calibration
float calibration_factor = 50.0;

// WiFi
const char* ssid = "srinu";
const char* password = "123456789";
const char* serverUrl = "http://10.56.253.2:3000/data";

// Timing
unsigned long lastBeep = 0;
bool buzzerState = false;
unsigned long lastSend = 0;

void setup() {
  Serial.begin(9600);

  Wire.begin(D2, D1);

  lcd.init();
  lcd.backlight();

  // -------- WiFi --------
  lcd.setCursor(0, 0);
  lcd.print("Connecting WiFi");

  WiFi.begin(ssid, password);

  int dots = 0;

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);

    lcd.setCursor(dots, 1);
    lcd.print(".");
    dots++;

    if (dots > 15) {
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("Connecting WiFi");
      dots = 0;
    }
  }

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Connected!");
  lcd.setCursor(0, 1);
  lcd.print(WiFi.localIP());

  delay(2000);
  lcd.clear();

  // -------- HX711 --------
  lcd.setCursor(0, 0);
  lcd.print("IV Monitor");

  scale.begin(DT, SCK);
  scale.set_scale(calibration_factor);
  scale.tare();

  // -------- OUTPUTS --------
  pinMode(LED_LOW, OUTPUT);
  pinMode(LED_AIR, OUTPUT);
  pinMode(BUZZER, OUTPUT);

  myServo.attach(SERVO_PIN);
  myServo.write(0);  // initial position

  digitalWrite(LED_LOW, LOW);
  digitalWrite(LED_AIR, LOW);
  digitalWrite(BUZZER, LOW);

  delay(2000);
  lcd.clear();
}

void loop() {

  // HX711 check
  if (!scale.is_ready()) {
    lcd.setCursor(0, 0);
    lcd.print("HX711 ERROR   ");
    lcd.setCursor(0, 1);
    lcd.print("Check Wiring  ");
    return;
  }

  float weight = scale.get_units(5);

  // -------- DISPLAY --------
  lcd.setCursor(0, 0);
  lcd.print("Weight:       ");
  lcd.setCursor(0, 1);
  lcd.print("              ");

  lcd.setCursor(0, 0);
  lcd.print("Weight:");
  lcd.setCursor(0, 1);
  lcd.print(weight, 1);
  lcd.print(" g");

  // -------- LOGIC --------
  if (weight > 100) {
    // NORMAL
    digitalWrite(LED_LOW, LOW);
    digitalWrite(LED_AIR, LOW);
    digitalWrite(BUZZER, LOW);

    myServo.write(0);

    lcd.setCursor(10, 0);
    lcd.print("OK ");

  } 
  else if (weight > 50) {
    // WARNING
    digitalWrite(LED_LOW, HIGH);
    digitalWrite(LED_AIR, LOW);
    digitalWrite(BUZZER, LOW);

    myServo.write(0);

    lcd.setCursor(10, 0);
    lcd.print("MID");

  } 
  else {
    // LOW ALERT
    digitalWrite(LED_LOW, HIGH);
    digitalWrite(LED_AIR, LOW);

    lcd.setCursor(10, 0);
    lcd.print("LOW");

    // Servo clamps IV
    myServo.write(180);

    // Non-blocking buzzer
    if (millis() - lastBeep > 500) {
      lastBeep = millis();
      buzzerState = !buzzerState;
      digitalWrite(BUZZER, buzzerState);
    }
  }

  // -------- SEND DATA EVERY 3 SEC --------
  if (millis() - lastSend > 3000) {
    lastSend = millis();

    Serial.print("Weight: ");
    Serial.println(weight);

    if (WiFi.status() == WL_CONNECTED) {
      WiFiClient client;
      HTTPClient http;

      http.begin(client, serverUrl);
      http.addHeader("Content-Type", "application/json");

      String json = "{\"weight\":" + String(weight) + "}";

      int response = http.POST(json);

      Serial.print("Server Response: ");
      Serial.println(response);

      http.end();
    } else {
      Serial.println("WiFi Disconnected");
    }
  }

  delay(200);
}