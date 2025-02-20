FROM grafana/grafana:latest

ARG GF_INSTALL_PLUGINS="grafana-mongodb-datasource"

ENV GF_PATHS_CONFIG="/etc/grafana/grafana.ini" \
    GF_PATHS_DATA="/var/lib/grafana" \
    GF_PATHS_HOME="/usr/share/grafana" \
    GF_PATHS_LOGS="/var/log/grafana" \
    GF_PATHS_PLUGINS="/var/lib/grafana/plugins" \
    GF_PATHS_PROVISIONING="/etc/grafana/provisioning"

RUN grafana-cli plugins install grafana-mongodb-datasource

COPY grafana.ini /etc/grafana/grafana.ini

COPY provisioning/dashboards /etc/grafana/provisioning/dashboards
COPY provisioning/datasources /etc/grafana/provisioning/datasources

USER grafana

ENTRYPOINT [ "/run.sh" ]