import {
  applySensorReadingToAsset,
  createAuditLogDoc,
  createStockReadingDoc,
} from "./document-schema.js";
import { getDocument, putDocument, putExistingDocument } from "./couchdb.js";
import { config } from "./config.js";

export async function startMqttIngestion() {
  let mqtt;
  try {
    mqtt = await import("mqtt");
  } catch {
    console.warn("MQTT package is not installed; stock ingestion is available via HTTP only.");
    return null;
  }

  const client = mqtt.connect(config.mqttBrokerUrl, {
    ...(config.mqttUser ? { username: config.mqttUser } : {}),
    ...(config.mqttPassword ? { password: config.mqttPassword } : {}),
  });
  client.on("connect", () => {
    const topics = [
      config.mqttStockTopic,
      "logshield/warehouse/+/scale/+/reading",
    ].filter((topic, index, list) => topic && list.indexOf(topic) === index);

    client.subscribe(topics, (error) => {
      if (error) console.error("MQTT subscribe failed", error);
      else console.log(`MQTT stock ingestion subscribed to ${topics.join(", ")}`);
    });
  });

  client.on("message", async (_topic, message) => {
    try {
      const payload = JSON.parse(message.toString("utf8"));
      await ingestStockReading(payload, "mqtt");
    } catch (error) {
      console.error("MQTT stock ingestion failed", error);
    }
  });

  client.on("error", (error) => console.error("MQTT client error", error));
  return client;
}

export async function ingestStockReading(payload, source = "http") {
  const reading = createStockReadingDoc(payload);
  await putDocument(reading);

  let existingAsset = null;
  try {
    existingAsset = await getDocument(`asset::${reading.warehouse_id}::${reading.commodity}`);
  } catch (error) {
    if (error.statusCode !== 404) throw error;
  }

  const nextAsset = applySensorReadingToAsset(existingAsset, reading);
  await putExistingDocument(nextAsset);

  const auditLog = createAuditLogDoc({
    user_id: null,
    action: `create_stock_reading_${source}`,
    target_type: "stock_reading",
    target_id: reading._id,
    old_values: null,
    new_values: reading,
    ip_address: source,
    status: "sukses",
  });
  await putDocument(auditLog);

  return { reading, asset: nextAsset, audit_log: auditLog };
}
