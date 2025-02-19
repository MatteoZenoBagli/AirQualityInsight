# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-02-20

### Added
- Initial implementation of air quality monitoring system
- Express.js server with GraphQL support for data management
- Air monitoring sensor simulation system
- GraphQL API for real-time data access and analysis
- Development scripts with hot-reload support via nodemon
- Initial release of AirQualitySensor Python Docker container simulator
- Basic sensor simulation functionality
- Docker container configuration for isolated execution
- Continuous data generation for air quality metrics
- Docker Compose support for easy deployment and scaling

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

[1.0.0]: https://github.com/username/air-quality-insight/releases/tag/v1.0.0