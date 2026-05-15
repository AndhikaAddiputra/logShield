export const config = {
  port: Number(process.env.PORT || 4000),
  couchUrl: stripTrailingSlash(process.env.COUCHDB_URL || "http://localhost:5984"),
  couchDbName: process.env.COUCHDB_DB_NAME || "logshield",
  couchUser: process.env.COUCHDB_USER || "admin",
  couchPassword: process.env.COUCHDB_PASSWORD || "password",
  aiEngineUrl: stripTrailingSlash(process.env.AI_ENGINE_URL || "http://127.0.0.1:8000"),
  mqttBrokerUrl: process.env.MQTT_BROKER_URL || "mqtt://localhost:1883",
  mqttStockTopic: process.env.MQTT_STOCK_TOPIC || "logshield/stock/+",
  jwtSecret: process.env.JWT_SECRET || "dev-logshield-secret-change-me",
  authHashSecret: process.env.AUTH_HASH_SECRET || process.env.JWT_SECRET || "dev-logshield-secret-change-me",
  encryptionKey: process.env.ENCRYPTION_KEY || "dev-logshield-encryption-key-change-me",
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
