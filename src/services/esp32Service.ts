/**
 * ESP32 Hardware Integration Service
 * 
 * Communicates with physical ESP32 microcontrollers hosting a REST API endpoint.
 * Strictly adheres to honesty principles:
 * - Never fabricates fake sensor readings
 * - Accurately detects network connectivity, CORS limitations, and timeout states
 */

export interface ESP32FetchResult {
  success: boolean;
  weightKg?: number;
  rawResponse?: string;
  errorMessage?: string;
  statusCode?: number;
  isCorsOrNetworkIssue?: boolean;
}

export async function fetchESP32Weight(endpointUrl: string, timeoutMs: number = 6000): Promise<ESP32FetchResult> {
  if (!endpointUrl || !endpointUrl.startsWith('http')) {
    return {
      success: false,
      errorMessage: 'Invalid ESP32 endpoint URL. Must start with http:// or https://',
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpointUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain, */*',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        statusCode: response.status,
        errorMessage: `ESP32 returned HTTP status ${response.status} (${response.statusText})`,
      };
    }

    const contentType = response.headers.get('content-type') || '';
    let weight: number | null = null;
    let rawText = '';

    if (contentType.includes('application/json')) {
      const data = await response.json();
      rawText = JSON.stringify(data);
      // Support common JSON formats from Arduino sketches:
      // { "weight_kg": 27.4 } or { "weight": 27.4 } or { "totalWeightKg": 27.4 } or { "kg": 27.4 }
      weight = typeof data.weight_kg === 'number' ? data.weight_kg
        : typeof data.weight === 'number' ? data.weight
        : typeof data.totalWeightKg === 'number' ? data.totalWeightKg
        : typeof data.kg === 'number' ? data.kg
        : parseFloat(data.weight || data.weight_kg || data.total);
    } else {
      rawText = await response.text();
      weight = parseFloat(rawText.trim());
    }

    if (weight === null || isNaN(weight) || weight < 0) {
      return {
        success: false,
        rawResponse: rawText,
        errorMessage: `Received response from ESP32, but could not parse a valid weight number (got: "${rawText.slice(0, 50)}")`,
      };
    }

    return {
      success: true,
      weightKg: parseFloat(weight.toFixed(2)),
      rawResponse: rawText,
      statusCode: response.status,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const error = err as Error;

    if (error.name === 'AbortError') {
      return {
        success: false,
        errorMessage: `Connection timed out after ${timeoutMs / 1000}s. The ESP32 at ${endpointUrl} did not respond.`,
      };
    }

    return {
      success: false,
      isCorsOrNetworkIssue: true,
      errorMessage: `Could not reach ESP32 at ${endpointUrl}. Ensure the ESP32 is powered on, connected to your Wi-Fi, and CORS header (Access-Control-Allow-Origin: *) is enabled in the Arduino sketch.`,
    };
  }
}

/**
 * Complete production-ready Arduino C++ sketch for ESP32 + HX711 Load Cell
 */
export const ARDUINO_ESP32_FIRMWARE_SKETCH = `/*
  ==============================================================
  Smart LPG Monitor - ESP32 Firmware Sketch (HX711 Load Cell)
  ==============================================================
  Hardware:
  - ESP32 Development Board (NodeMCU / WROOM-32)
  - HX711 24-bit ADC Load Cell Amplifier
  - 40kg / 50kg Heavy-duty Load Cell or Bathroom Scale Setup
  
  Wiring:
  - HX711 DT  -> ESP32 GPIO 21
  - HX711 SCK -> ESP32 GPIO 22
  - HX711 VCC -> ESP32 5V (or 3.3V)
  - HX711 GND -> ESP32 GND
*/

#include <WiFi.h>
#include <WebServer.h>
#include "HX711.h"

// --- Wi-Fi Credentials ---
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// --- HX711 Pins ---
const int LOADCELL_DOUT_PIN = 21;
const int LOADCELL_SCK_PIN = 22;

HX711 scale;
WebServer server(80);

// Calibration factor (adjust using a known 5kg or 10kg weight)
float calibration_factor = -22800.0;

void handleGetWeight() {
  // Add CORS headers so web browser can access endpoint directly
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  
  if (server.method() == HTTP_OPTIONS) {
    server.send(204);
    return;
  }

  float reading = scale.get_units(5); // Average 5 readings
  if (reading < 0) reading = 0.0;     // Clamp negative noise

  String jsonResponse = "{\\"weight_kg\\":" + String(reading, 2) + 
                       ",\\"device\\":\\"ESP32-LPG-01\\",\\"status\\":\\"ok\\"}";
                       
  server.send(200, "application/json", jsonResponse);
}

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("\\n--- Smart LPG Scale Initializing ---");
  scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
  scale.set_scale(calibration_factor);
  scale.tare(); // Reset scale to 0 with empty platform

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\\nWiFi connected!");
  Serial.print("ESP32 IP Address: http://");
  Serial.println(WiFi.localIP());

  // Configure REST API Route
  server.on("/api/weight", HTTP_ANY, handleGetWeight);
  server.begin();
  Serial.println("HTTP REST server started on port 80");
}

void loop() {
  server.handleClient();
}
`;
