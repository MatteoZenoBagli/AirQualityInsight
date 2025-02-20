# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-02-20

### Added
- Initial implementation of air quality monitoring system
- GraphQL Node Express server
  - Express.js server with GraphQL support for data management
  - Air monitoring sensor simulation system
  - GraphQL API for real-time data access and analysis
  - Development scripts with hot-reload support via nodemon
- Python Sensor Simulator
  - Initial release of AirQualitySensor Python Docker container simulator
  - Basic sensor simulation functionality
  - Docker container configuration for isolated execution
  - Continuous data generation for air quality metrics
  - Docker Compose support for easy deployment and scaling
- MongoDB Database
  - Initial database setup with `sensordata` database
  - Created `sensors` collection with schema validation
    - Added fields: sensor_id, name, location (GeoJSON Point), ip, active, last_seen
    - Created unique index on sensor_id
    - Created 2dsphere index on location field for geospatial queries
  - Created `measurements` collection with schema validation
    - Added fields: sensor_id, timestamp, temperature, humidity, pressure, pm25, pm10, voc, co2
    - Created compound index on (sensor_id, timestamp)
    - Created index on timestamp for time-based queries
  - Added sample data population script
    - 5 sensors around Bologna:
      - Piazza Maggiore (city center)
      - University of Bologna
      - Bologna Central Station
      - Two Towers
      - Giardini Margherita
    - 24 hours of sample measurements for each sensor

### Dependencies
- express@4.18.2 - Web framework
- express-graphql@0.12.0 - GraphQL middleware for Express
- graphql@14.7.0 - GraphQL runtime
- nodemon@3.0.1 (dev) - Development utility for hot-reload
- Python 3.x
- Docker
- Docker Compose

### Technical Notes
- Project uses Node.js with Express as web framework
- Implemented GraphQL-based architecture for efficient querying
- Configured development environment with hot-reload support
- Project structure organized in src/ directory
- Python-based sensor simulation
- Dockerized environment for consistent execution
- Configuration for detached container operation
- Real-time data generation capabilities

### Data Model Details
#### Sensors Collection
- sensor_id (string): Unique identifier
- name (string): Descriptive name
- location (object): GeoJSON Point with coordinates
- ip (string): IP address
- active (boolean): Current status
- last_seen (date): Last reporting time

#### Measurements Collection
- sensor_id (string): Reference to sensor
- timestamp (date): Time of measurement
- temperature (double): Celsius
- humidity (double): Percentage
- pressure (double): hPa
- pm25 (double): µg/m³
- pm10 (double): µg/m³
- voc (double): ppb
- co2 (double): ppm

### Indexes
- sensors.sensor_id (unique)
- sensors.location (2dsphere)
- measurements.(sensor_id, timestamp)
- measurements.timestamp

### Scripts
- init-mongo.js: Database and collections initialization
- populate-and-query.js: Sample data population and query examples

[1.0.0]: https://github.com/username/air-quality-insight/releases/tag/v1.0.0
