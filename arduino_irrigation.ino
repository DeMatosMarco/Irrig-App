#include <WiFiNINA.h>
#include "DHT.h"

char ssid[] = "CampusPlex Public";
char pass[] = "CampusPlex2026";

const char* serverIP   = "10.11.79.52";
const int   serverPort = 80;
const char* serverPath = "/ArduinoProject/get_data.php";

#define DHTPIN  2
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);


const int SOIL_PIN = A1;

const int DRY_VAL = 600;
const int WET_VAL = 240;

const unsigned long INTERVAL = 10000;

WiFiClient client;
unsigned long lastSendTime = 0;

void setup() {
  Serial.begin(9600);
  while (!Serial);

  dht.begin();

  Serial.print("Connexion au WiFi : ");
  Serial.println(ssid);

  WiFi.begin(ssid, pass);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }

  Serial.println("\n✓ WiFi connecté !");
  Serial.print("IP Arduino : ");
  Serial.println(WiFi.localIP());
  Serial.println("Démarrage des mesures...\n");
}

void loop() {
  unsigned long now = millis();

  if (now - lastSendTime >= INTERVAL) {
    lastSendTime = now;

    float temperature = dht.readTemperature();
    float humAir      = dht.readHumidity(); 

    if (isnan(temperature) || isnan(humAir)) {
      Serial.println("⚠ Erreur lecture DHT11 !");
      return;
    }

    int rawSoil = analogRead(SOIL_PIN);

    int soilPercent = map(rawSoil, WET_VAL, DRY_VAL, 100, 0);
    soilPercent = constrain(soilPercent, 0, 100);

    Serial.print("Temp : ");      Serial.print(temperature); Serial.print(" °C | ");
    Serial.print("Hum air : ");   Serial.print(humAir);      Serial.print(" % | ");
    Serial.print("Sol brut : ");  Serial.print(rawSoil);     Serial.print(" -> ");
    Serial.print(soilPercent);    Serial.println(" %");

    envoyerDonnees(temperature, soilPercent);
  }
}

void envoyerDonnees(float temperature, int humidite) {
  Serial.print("Connexion au serveur ");
  Serial.print(serverIP);
  Serial.print("...");

  if (!client.connect(serverIP, serverPort)) {
    Serial.println(" ✗ Échec connexion serveur !");
    return;
  }

  String body = "humidite=" + String(humidite) + "&temperature=" + String(temperature, 2);

  client.println("POST " + String(serverPath) + " HTTP/1.1");
  client.println("Host: " + String(serverIP));
  client.println("Content-Type: application/x-www-form-urlencoded");
  client.println("Content-Length: " + String(body.length()));
  client.println("Connection: close");
  client.println();
  client.print(body);

  delay(500);
  String reponse = "";
  while (client.available()) {
    reponse += (char)client.read();
  }

  int dernierSaut = reponse.lastIndexOf('\n');
  if (dernierSaut >= 0) {
    Serial.println(" ✓ Serveur : " + reponse.substring(dernierSaut + 1));
  }

  client.stop();
}
