import { app } from "./app.js";
import { config } from "./config.js";
import { startDistributionSyncMarker } from "./distribution-sync.js";
import { startMqttIngestion } from "./mqtt.js";

app.listen(config.port, () => {
  console.log(`LogShield backend listening on port ${config.port}`);
  startMqttIngestion();
  startDistributionSyncMarker();
});
