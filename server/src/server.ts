import { networkInterfaces } from "node:os";
import app from "./app.js";

const port = Number(process.env.PORT ?? 4000);

function lanIpv4Addresses(): string[] {
  const ips = new Set<string>();
  for (const iface of Object.values(networkInterfaces())) {
    if (!iface) continue;
    for (const addr of iface) {
      if (addr.family !== "IPv4" || addr.internal) continue;
      ips.add(addr.address);
    }
  }
  return [...ips];
}

app.listen(port, "0.0.0.0", () => {
  console.log(`API listening on http://localhost:${port}`);
  for (const ip of lanIpv4Addresses()) {
    console.log(`  Expo Go / móvil (misma Wi‑Fi): http://${ip}:${port}/api`);
  }
});
