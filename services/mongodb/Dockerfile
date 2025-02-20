FROM mongo:latest

WORKDIR /docker-entrypoint-initdb.d/

COPY *.js /docker-entrypoint-initdb.d/

RUN chmod 777 /docker-entrypoint-initdb.d/init-mongo.js