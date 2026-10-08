const SIM_WORDS = ["mews", "sim", "virtual", "gateway", "bridge"];

export function isMewsOrSimulationDevice(name: string, type?: string, profile?: string): boolean {
  const lowerName = (name || "").toLowerCase().trim();
  const lowerType = (type || "").toLowerCase().trim();
  if (
    SIM_WORDS.some((w) => lowerName.includes(w) || lowerType.includes(w)) ||
    /^rst-[a-z0-9]+-room-\d+$/.test(lowerName) ||
    /^rst-room-\d+$/.test(lowerName)
  ) {
    return true;
  }

  const lowerProfile = (profile || "").toLowerCase().trim();
  if (SIM_WORDS.some((w) => lowerProfile.includes(w)) || lowerProfile.includes("room asset") || lowerProfile === "room") {
    return true;
  }

  // Room asset naming pattern (RST-KLV-Room-6, room_101, ...) without a physical sensor keyword
  if (/(?:^|[-_])room[-_]?\d+(?:[-_].*)?$/i.test(lowerName)) {
    const hasPhysicalSensorKeyword =
      lowerName.includes("trv") ||
      lowerName.includes("thermo") ||
      lowerName.includes("win") ||
      lowerName.includes("leak") ||
      lowerName.includes("wl") ||
      lowerName.includes("noise") ||
      lowerName.includes("ws303") ||
      lowerName.includes("ws302") ||
      lowerName.includes("air") ||
      lowerName.includes("am_") ||
      lowerName.includes("-am-") ||
      lowerName.includes("_am_") ||
      lowerName.includes("plug") ||
      lowerName.includes("socket") ||
      lowerName.includes("occ") ||
      lowerName.includes("presence") ||
      lowerName.includes("lock") ||
      lowerName.includes("light");
    if (!hasPhysicalSensorKeyword) {
      return true;
    }
  }

  return false;
}

export function isBatteryExemptDevice(name: string, type?: string, profile?: string): boolean {
  if (isMewsOrSimulationDevice(name, type, profile)) {
    return true;
  }

  const lowerName = (name || "").toLowerCase().trim();
  const lowerType = (type || "").toLowerCase().trim();
  const lowerProfile = (profile || "").toLowerCase().trim();
  return [lowerName, lowerType, lowerProfile].some((s) => s.includes("ws523") || s.includes("socket"));
}
