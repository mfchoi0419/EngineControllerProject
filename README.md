# Engine Controller Project

Remote engine control and monitoring system for a small internal combustion engine used in a combined heat and power (CHP) biodigester application.

## Overview

This project uses a Raspberry Pi/BeagleBone-hosted web interface to communicate with an Arduino Uno over serial USB in order to remotely control and monitor a Honda GX35 engine.

The system was developed for a senior design project focused on biodigester thermal management and electrical generation using biogas fuel.

Features:
- Remote electric start/top
- Choke servo control
- Gas solenoid control
- Oil pump control
- Magneto kill control
- Temperature monitoring
- O2 sensor integration
- Real-time web dashboard
- Local WiFi hotspot operation without internet

## System Architecture

Frontend:
- HTML
- CSS
- JavaScript

Backend:
- Python Flask Server
- Serial Communication over USB

Host Devices:
- Raspberry Pi Model 3 b
- BeagleBone Black

## Hardware Components
- Honda GX35 engine
- Arduino Uno
- Raspberry Pi / BeagleBone Black
- MOSFET switching circuits
- Relay-controlled starter system
- Thermistor temperature sensors
- O2 sensor system
- Oil cooling pump
- Fuel shutoff solenoid


## Features

### Remote Engine Start
The web interface sends commands to the backend Flask server, which transmits serial commands to the Arduino for starter actuation.

### Sensor Monitoring
The systemm readss:
- Engine temperature
- Oil temperature
- O2 sensor voltage

Data is displayed live through the browser interface.

### Offline Operation
The Raspberry Pi can host its own WiFi hotspot, allowing local engine control without internet access.


## Repository Structure
```text
Engine_Controller/            -> Arduino firmware
Engine_Controller_Backend/    -> Flask backend + web server
PCB_Design/                   -> PCB and hardware design files
