import type { InfrastructureProfile } from "@/privacy/profile";

export function createDemoProfile(): InfrastructureProfile {
  return {
    technologies: [
      { name: "AWS", region: "eu-west-1" },
      { name: "Azure", region: "westeurope" },
      { name: "Ubuntu", version: "24.04" },
      { name: "Next.js", version: "15" },
    ],
    internal_hostname: "prod-web-01.internal",
    private_ip: "10.0.14.22",
    ssh_keys: ["SYNTHETIC-DEMO-KEY-NOT-A-REAL-SECRET"],
  };
}
