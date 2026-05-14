export const config = {
  port: Number(process.env.PORT || 4000),
  couchUrl: stripTrailingSlash(process.env.COUCHDB_URL || "http://localhost:5984"),
  couchDbName: process.env.COUCHDB_DB_NAME || "logshield",
  couchUser: process.env.COUCHDB_USER || "admin",
  couchPassword: process.env.COUCHDB_PASSWORD || "password",
  mqttBrokerUrl: process.env.MQTT_BROKER_URL || "mqtt://localhost:1883",
  mqttStockTopic: process.env.MQTT_STOCK_TOPIC || "logshield/stock/+",
  jwtSecret: process.env.JWT_SECRET || "dev-logshield-secret-change-me",
  devLogin: {
    email: process.env.DEV_LOGIN_EMAIL || "athar@athar.com",
    username: process.env.DEV_LOGIN_USERNAME || "athar",
    nik: process.env.DEV_LOGIN_NIK || "1234123412341234",
    password: process.env.DEV_LOGIN_PASSWORD || "atharathar",
    couchRole: process.env.DEV_LOGIN_COUCH_ROLE || "field_officer",
  },
};

function stripTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}
