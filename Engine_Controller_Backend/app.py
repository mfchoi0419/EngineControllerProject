# Flask web server that hosts the engine controller webpage
from flask import Flask, render_template, jsonify

# Serial communication with Arduino
import serial

# Time functions for delays/timeouts
import time

# JSON parsing for Arduino responses
import json

# Used only for demo/test status values
import random

# Used for CSV logging
import csv
import os

# Timestamp generation for log entries
from datetime import datetime

# CSV file where engine status data is logged
LOG_FILE = "engine_data_log.csv"

# Linux serial port connected to Arduino
# ttyACM0 is common for Arduino Uno on Linux/BeagleBone
SERIAL_PORT = "/dev/ttyACM0"

# Serial communication speed
# Must match Arduino Serial.begin(9600)
BAUD_RATE = 9600

# Create flask application instance
app = Flask(__name__)

# Global serial object reference
# Will hold the Arduino serial connection
arduino = None

# ------------------------------------------
# CONNECTO TO ARDUINO
# ------------------------------------------

def connect_arduino():
    global arduino
    try:

        # Open serial connection to Arduino
        arduino = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=2)
        
        # Wait for Arduino reset after serial open
        time.sleep(2)
        
        # Clear garbage startup data
        arduino.reset_input_buffer()

        print(f"Connected to Arduino on {SERIAL_PORT}")
    except Exception as e:
        # If connection fails, store None
        arduino = None
        print(f"Arduino connection failed: {e}")

# ------------------------------------------
# SEND COMMAND TO ARDUINO
# ------------------------------------------
def send_command(command, wait_for_json=True):
    global arduino

    # Reconnect automatically if serial disconnected
    if arduino is None or not arduino.is_open:
        connect_arduino()

    # If Reconnect failed
    if arduino is None:
        return {"error": "Arduino not connected"}

    try:
        # Clear previous serial data
        arduino.reset_input_buffer()

        # Send command with newline
        arduino.write((command + "\n").encode())

        # Force serial transmission immediately
        arduino.flush()

        # Some commands may not require a JSON response
        if not wait_for_json:
            return {"command": command, "sent": True}

        # Start timeout timer
        start_time = time.time()

        # Store all lines received for debugging
        lines = []

        # Wait up to 2.5 seconds for Arduino response
        while time.time() - start_time < 2.5:

            # Read line from serial
            line = arduino.readline().decode(errors="ignore").strip()

            # Ignore empty lines
            if not line:
                continue

            # Save line for debugging
            lines.append(line)

            # Arduino sends JSON wrapped in {}
            if line.startswith("{") and line.endswith("}"):
                try:
                    # Convert JSON string into Python dictionary
                    data = json.loads(line)

                    # Store raw serial lines for debugging
                    data["_raw_lines"] = lines
                    return data
                except json.JSONDecodeError:
                    # Ignore malformed JSON
                    pass

        # If no valid JSON returned before timeout
        return {"command": command, "responses": lines}

    except Exception as e:
        return {"error": str(e)}

# ------------------------------------------
# LOG ENGINE STATUS TO CSV
# ------------------------------------------
def log_status_to_csv(data):

    # Check whether CSV already exists
    file_exists = os.path.isfile(LOG_FILE)

    # Open file in append mode
    with open(LOG_FILE, mode="a", newline="") as file:
        writer = csv.writer(file)

        # Write CSV header once
        if not file_exists:
            writer.writerow([
                "timestamp",
                "temperatureF",
                "o2Voltage",
                "engineOn",
                "autoMode",
                "gasOpen",
                "oilPumpOn",
                "magnetoKillOn",
                "starterOn",
                "chokeAngle"
            ])

        # Write row of live data
        writer.writerow([
            datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            data.get("temperatureF"),
            data.get("o2Voltage"),
            data.get("engineOn"),
            data.get("autoMode"),
            data.get("gasOpen"),
            data.get("oilPumpOn"),
            data.get("magnetoKillOn"),
            data.get("starterOn"),
            data.get("chokeAngle")
        ])
# ------------------------------------------
# MAIN WEBPAGE ROUTE
# ------------------------------------------
@app.route("/")
def index():

    # Loads templates/index.html
    return render_template("index.html")

# ------------------------------------------
# ENGINE CONTROL ROUTES
# ------------------------------------------
@app.route("/api/start", methods=["POST"])
def start_engine():

    # Send START command to Arduino
    return jsonify(send_command("START"))


@app.route("/api/stop", methods=["POST"])
def stop_engine():

    # Send STOP command to Arduino
    return jsonify(send_command("STOP"))


@app.route("/api/auto_on", methods=["POST"])
def auto_on():

    # Enables automatic engine control mode
    return jsonify(send_command("AUTO_ON"))


@app.route("/api/auto_off", methods=["POST"])
def auto_off():

    # Disables automatic engine control mode
    return jsonify(send_command("AUTO_OFF"))


@app.route("/api/test_pins", methods=["POST"])
def test_pins():

    # Sequentially pulses outputs for debugging
    return jsonify(send_command("TEST_PINS"))


# ------------------------------------------
# STATUS ROUTE
# ------------------------------------------
@app.route("/api/status")
def status():
    data = send_command("STATUS")

    if data and "temperatureF" in data:
        log_status_to_csv(data)
    
    return jsonify(data)

# Testing Route
#@app.route("/api/status")
#def status():
    return jsonify({
        "engineOn": True,
        "autoMode": True,
        "gasOpen": True,
        "oilPumpOn": True,
        "magnetoKillOn": False,
        "starterOn": False,
        "chokeAngle": random.randint(30, 80),
        "temperatureF": random.uniform(80, 140),
        "o2Voltage": random.uniform(0.5, 2.5)
    })

if __name__ == "__main__":

    # Attempt Arduino connection at startup
    connect_arduino()

    # Host web server on all interfaces
    app.run(host="0.0.0.0", port=5000, debug=False)