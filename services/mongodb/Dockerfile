FROM mongo:latest

WORKDIR /docker-entrypoint-initdb.d/

COPY init-mongo.js /docker-entrypoint-initdb.d/
COPY sensor_locations.json /docker-entrypoint-initdb.d/