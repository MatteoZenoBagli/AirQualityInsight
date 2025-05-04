# BOLOGNA HEATMAP PROJECT ROADMAP

## PHASE 1: SETUP AND DESIGN
- [ X ] 1.1. Define detailed project specifications
- [ X ] 1.2. Identify sensor measurement parameters
- [ X ] 1.3. Define MongoDB data structure
- [ X ] 1.4. Configure Docker development environment
- [ X ] 1.5. Set up Git repository

## PHASE 2: BACKEND IMPLEMENTATION
- [ X ] 2.1. Install and configure Kafka broker
- [ X ] 2.2. Create Kafka topics for sensor data
- [ X ] 2.3. Develop Python sensor with acquisition logic
- [ X ] 2.4. Implement sensor-Kafka connection
- [ X ] 2.5. Configure MongoDB with collections and indexes

## PHASE 3: SERVER DEVELOPMENT
- [ X ] 3.1. Implement basic Node.js server
- [ X ] 3.2. Develop Kafka consumer in the server
- [ X ] 3.3. Create logic for saving data to MongoDB
- [ X ] 3.4. Implement REST API for frontend
- [ X ] 3.5. Develop endpoints for geolocated data
- [  ] 3.6. Implement aggregation logic for heatmap

## PHASE 4: FRONTEND DEVELOPMENT
- [ X ] 4.1. Set up Vite + Vue project
- [  ] 4.2. Integrate maps library (Leaflet/Mapbox)
- [  ] 4.3. Implement heatmap component
- [  ] 4.4. Develop UI for temporal filters
- [  ] 4.5. Create main control panel
- [  ] 4.6. Implement real-time visualization

## PHASE 5: INTEGRATION AND TESTING
- [  ] 5.1. Connect all components
- [  ] 5.2. Test complete data flow