import { Injectable, OnDestroy } from "@angular/core";
import { BehaviorSubject, Subject } from "rxjs";
import { debounceTime } from "rxjs/operators";
import { RoomDataService, RoomData } from "./room-data.service";

/* ───────────────────────────────────────────────────────────
   Production config
   ─────────────────────────────────────────────────────────── */
const DEBUG = true; // TEMPORARY: enable to debug Mews Bridge data flow
const HTTP_TIMEOUT_MS = 10000; // 10s timeout on all TB REST calls
const HTTP_RETRY_COUNT = 2; // retry failed calls twice
const PROCESS_DEBOUNCE_MS = 300; // debounce rapid onDataUpdated calls
const PERIODIC_REFRESH_MS = 30000; // 30s between full telemetry refreshes (was 15s)

function log(...args: any[]): void {
  if (DEBUG) console.log(...args);
}
function warn(...args: any[]): void {
  console.warn(...args);
}
function error(...args: any[]): void {
  console.error(...args);
}

/* ───────────────────────────────────────────────────────────
   InlineRoom — one room tracked by the hotel dashboard
   ─────────────────────────────────────────────────────────── */
export interface InlineRoom {
  id: string;
  name: string;
  mockCtx: any;
  roomData: RoomData;
  activeDialogRef: any;
}

export interface OtherDevice {
  id: string;
  name: string;
  type: string;
  status: "online" | "offline";
  room: string;
  data: any;
  lastUpdateTs?: number;
}

/* ───────────────────────────────────────────────────────────
   HotelStats — aggregated KPI data
   ─────────────────────────────────────────────────────────── */
export interface HotelStats {
  totalRooms: number;
  totalDevices: number;
  batteryAlerts: number;
  onlineDevices: number;
  offlineDevices: number;
  roomsBooked: number;
  roomsVacant: number;
  mewsStatus: string;
  mewsRoomsSynced: number;
  mewsAlertActive: boolean;
  mewsErrorMessage: string;
  mewsLastActivity: string;
  batteryAlertDevices: {
    room: string;
    device: string;
    battery: number | null;
    type: string;
  }[];
  occupancyPercent: number;
  checkInsToday: number;
  checkOutsToday: number;
  inHouseGuests: number;
  checkInsList: { room: string; guest: string; time: string }[];
  checkOutsList: {
    room: string;
    guest: string;
    time: string;
    isOverdue?: boolean;
  }[];
  otherDevicesCount: number;
}

/** Helper: create a fresh RoomData object */
function createEmptyRoomData(): RoomData {
  return {
    sensorData: {
      roomNumber: "---",
      temperature: null,
      humidity: null,
      airQuality: null,
      checkedIn: false,
      waterLeak: false,
      noise: null,
      booked: false,
      roomTitle: null,
    },
    hasData: {
      temperature: false,
      humidity: false,
      airQuality: false,
      checkedIn: false,
      waterLeak: false,
      noise: false,
      booked: false,
    },
    reservation: {
      checkIn: "",
      checkOut: "",
      guestName: "",
      reservationState: "",
      hasReservation: false,
      checkDisplay: "--",
      checkIconClass: "icon-gray",
      checkPillClass: "pill-inactive",
      bookDisplay: "--",
      bookIconClass: "icon-gray",
      bookPillClass: "pill-inactive",
      bookCellClass: "",
      checkoutRemaining: "",
      statusSummary: "",
    },
    winAgg: { total: 0, openCount: 0, anyOpen: false, display: "--" },
    trvAgg: { count: 0, avgSetPoint: 0, worstStatus: "idle", display: "--" },
    tempStatus: "normal",
    humStatus: "normal",
    airStatus: "normal",
    noiseStatus: "normal",
    roomStatus: "normal",
    alarmCount: 0,
    windowDevices: {},
    trvDevices: {},
    tempDevices: {},
    humDevices: {},
    batteryDevices: {},
    batteryLowDevices: {},
    linkQualityDevices: {},
    lastSeenDevices: {},
    offlineDevices: {},
    tamperDevices: {},
    airSensors: {},
    deviceMeta: {},
    leakDevices: {},
    noiseDevices: {},
    occupancyDevices: {},
    activeDevices: {},
    plugDevices: {},
    deviceEntityIdMap: {},
  };
}

/* ───────────────────────────────────────────────────────────
   HotelStateService — The Brain
   Owns all room + hotel-level state.
   Exposes rooms$ and hotelStats$ as observables.
   ─────────────────────────────────────────────────────────── */
@Injectable({ providedIn: "root" })
export class HotelStateService implements OnDestroy {
  /* ──── Public observables ──── */

  private _rooms$ = new BehaviorSubject<InlineRoom[]>([]);
  readonly rooms$ = this._rooms$.asObservable();

  private _hotelStats$ = new BehaviorSubject<HotelStats>(this.emptyStats());
  readonly hotelStats$ = this._hotelStats$.asObservable();

  private _otherDevices$ = new BehaviorSubject<OtherDevice[]>([]);
  readonly otherDevices$ = this._otherDevices$.asObservable();

  private _selectedHistoricalRoom$ = new BehaviorSubject<InlineRoom | null>(null);
  readonly selectedHistoricalRoom$ = this._selectedHistoricalRoom$.asObservable();

  /** Emits when HTTP calls fail — UI can subscribe to show a banner */
  private _connectionError$ = new Subject<string>();
  readonly connectionError$ = this._connectionError$.asObservable();

  /** Debounce rapid onDataUpdated → processDataUpdate calls */
  private _processDebounce$ = new Subject<any>();
  private _processSub: any = null;
  private _firstDataProcessed = false;

  /* ──── Internal state ──── */
  private roomMap = new Map<string, InlineRoom>();
  private ctxOtherDevices = new Map<string, OtherDevice>();
  private discoveredOtherDevices = new Map<string, OtherDevice>();
  private deviceProfileMap = new Map<string, string>();

  /* ──── Backend Discovery state ──── */
  private discoveredDevices = new Map<
    string,
    {
      deviceId: string;
      deviceName: string;
      roomNumber: string;
      keys: string[];
    }[]
  >();
  /** Tracks "other" alias asset IDs already queued for discovery (sync guard) */
  private triggeredOtherAssets = new Set<string>();
  /**
   * Tracks location names (room numbers) that belong to genuine room cards.
   * Populated synchronously in discoverDevicesForRoom and processDataUpdate.
   * Used by mergeDeviceDataIntoOther to skip room devices that leak into
   * the "other" alias (e.g. when alias filter type includes both Room + Public Place).
   */
  private roomLocationNames = new Set<string>();
  private discoveryDone = false;
  private lastCtx: any = null;
  private refreshTimer: any = null;

  constructor(private roomDataService: RoomDataService) {
    // Debounce processDataUpdate so rapid onDataUpdated calls batch together.
    // The first call is processed immediately; subsequent calls within the window are batched.
    this._processSub = this._processDebounce$
      .pipe(debounceTime(PROCESS_DEBOUNCE_MS))
      .subscribe({
        next: (ctx) => {
          try {
            this._doProcessDataUpdate(ctx);
          } catch (e) {
            console.error('[HotelState] _doProcessDataUpdate threw:', e);
          }
        },
        error: (e) => console.error('[HotelState] debounce stream error:', e),
      });
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    if (this._processSub) this._processSub.unsubscribe();
  }

  /**
   * HTTP GET with timeout and retry.
   * Returns a Promise that resolves with the response or rejects after retries.
   */
  private httpGetWithRetry(
    ctx: any,
    url: string,
    retries: number = HTTP_RETRY_COUNT
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const attempt = (remaining: number) => {
        const sub = ctx.http.get(url).subscribe(
          (res: any) => resolve(res),
          (err: any) => {
            warn(`HTTP ${url} failed (status=${err?.status}), retries left=${remaining}`);
            if (remaining > 0) {
              setTimeout(() => attempt(remaining - 1), 1000 * (HTTP_RETRY_COUNT - remaining + 1));
            } else {
              this._connectionError$.next(`Connection failed: ${url}`);
              reject(err);
            }
          }
        );
        // Timeout guard
        setTimeout(() => {
          if (!sub.closed) {
            sub.unsubscribe();
            if (remaining > 0) {
              attempt(remaining - 1);
            } else {
              this._connectionError$.next(`Connection timeout: ${url}`);
              reject(new Error(`Timeout: ${url}`));
            }
          }
        }, HTTP_TIMEOUT_MS);
      };
      attempt(retries);
    });
  }

  openHistoricalData(room: InlineRoom): void {
    this._selectedHistoricalRoom$.next(room);
  }

  closeHistoricalData(): void {
    this._selectedHistoricalRoom$.next(null);
  }

  /* ───────────────────────────────────────────────────────────
     extractRoomNumber — 1:1 copy from revelton-hotel.component.ts
     ─────────────────────────────────────────────────────────── */
  extractRoomNumber(name: string): string {
    if (!name) return "Unknown";
    const match2 = name.match(/_(\d+)_\d+$/);
    if (match2) return String(parseInt(match2[1], 10));
    const match1 = name.match(/_(\d+)$/);
    if (match1) return String(parseInt(match1[1], 10));
    // Fallback if the name itself is just the room number or room entity name
    const matchRoom = name.match(/Room\s*(\d+)/i);
    if (matchRoom) return String(parseInt(matchRoom[1], 10));

    // Fallback: match any standalone number in the name (e.g. "TRV 101" or "Device-101")
    const matchAnyNum = name.match(/(?:^|[\s\-_])(\d{1,4})(?:[\s\-_]|$)/);
    if (matchAnyNum) return String(parseInt(matchAnyNum[1], 10));

    return name;
  }

  /* ───────────────────────────────────────────────────────────
     processDataUpdate — debounced entry point for onDataUpdated.
     ─────────────────────────────────────────────────────────── */
  processDataUpdate(ctx: any): InlineRoom[] {
    if (!ctx || !ctx.data) return this._rooms$.value;
    this.lastCtx = ctx;
    // First call: process immediately so the UI populates without delay.
    // Subsequent calls within the debounce window are batched.
    if (!this._firstDataProcessed) {
      this._firstDataProcessed = true;
      try {
        this._doProcessDataUpdate(ctx);
      } catch (e) {
        console.error('[HotelState] Initial _doProcessDataUpdate threw:', e);
      }
    } else {
      this._processDebounce$.next(ctx);
    }
    return this._rooms$.value;
  }

  /** Actual worker (runs after debounce) */
  private _doProcessDataUpdate(ctx: any): void {
    if (!ctx || !ctx.data) return;

    const stats = { ...this._hotelStats$.value };
    const dataByRoom = new Map<string, any[]>();
    const dsByRoom = new Map<string, any[]>();
    const dsIdSetByRoom = new Map<string, Set<string>>();

    this.ctxOtherDevices.clear();

    log(`processDataUpdate: ${ctx.datasources?.length ?? 0} datasources, ${ctx.data?.length ?? 0} data items`);

    // First, scan all datasources to discover entities even if they have no telemetry data yet.
    // This is critical for discovering child devices of assets like "JLT-Office".
    if (ctx.datasources) {
      ctx.datasources.forEach((ds: any) => {
        if (!ds || !ds.entityName) return;
        const entityName = ds.entityName;
        const aliasName = (ds.aliasName || "").toLowerCase();
        const isRoomAlias = aliasName.includes("room") || aliasName.includes("guest");
        const isOtherAlias =
          aliasName.includes("other") ||
          aliasName.includes("public") ||
          aliasName.includes("office") ||
          (!isRoomAlias && ds.entityType === "ASSET");

        // Extract entity ID safely (may be a string or a {id, entityType} object)
        const rawId = ds.entityId;
        const entityId: string =
          typeof rawId === "string" ? rawId : (rawId as any)?.id;
        if (!entityId) {
          warn(
            `[HotelState] ⚠️ Could not extract entityId for datasource: ${entityName}`
          );
          return;
        }

        // Fetch device profile (fire-and-forget — don't re-trigger full processing)
        if (ds.entityType === "DEVICE" && !this.deviceProfileMap.has(entityName)) {
          this.httpGetWithRetry(ctx, `/api/device/info/${entityId}`, 1)
            .then((deviceInfo: any) => {
              if (deviceInfo?.deviceProfileName) {
                this.deviceProfileMap.set(entityName, deviceInfo.deviceProfileName);
                log(`Loaded device profile for ${entityName}: ${deviceInfo.deviceProfileName}`);
              }
            })
            .catch(() => {
              this.httpGetWithRetry(ctx, `/api/device/${entityId}`, 1)
                .then((device: any) => {
                  if (device?.type) {
                    this.deviceProfileMap.set(entityName, device.type);
                    log(`Loaded device type for ${entityName}: ${device.type}`);
                  }
                })
                .catch(() => {});
            });
        }

        log(
          `[HotelState] 🗂 DS scan: aliasName="${aliasName}" isOtherAlias=${isOtherAlias}` +
            ` entityName="${entityName}" entityType="${ds.entityType}" id="${entityId}"` +
            ` alreadyTriggered=${this.triggeredOtherAssets.has(entityId)}`
        );

        if (isOtherAlias && !this.triggeredOtherAssets.has(entityId)) {
          this.triggeredOtherAssets.add(entityId);
          log(
            `[HotelState] 🔍 Triggering discovery for "Other" Asset: "${entityName}" (ID: ${entityId})`
          );
          if (ds.entityType === "ASSET") {
            // forceOther=true ensures the asset is NEVER treated as a room card
            this.discoverDevicesForRoom(ctx, entityId, entityName, true);
          } else {
            log(
              `[HotelState]   → is a DEVICE, calling discoverKeysAndFetch directly`
            );
            this.discoverKeysAndFetch(
              ctx,
              entityName,
              entityId,
              entityName,
              ds.entityType,
              false
            );
          }
        } else if (!isOtherAlias) {
          // It's a room alias - check if we need to discover child devices for this room asset
          const roomNum = this.extractRoomNumber(entityName);
          if (roomNum !== entityName && !this.discoveredDevices.has(roomNum)) {
            if (ds.entityType === "ASSET") {
              this.discoverDevicesForRoom(ctx, entityId, entityName, false);
            }
          }
        }
      });
    }

    ctx.data.forEach((item: any) => {
      if (item.datasource && item.datasource.entityName) {
        const entityName = item.datasource.entityName;

        // Filter out the Mews Bridge device so it's not treated as a room
        // but let mews-service-room_X devices pass through — they carry per-room reservation data
        const lowerName = entityName.toLowerCase();
        const deviceType = item.datasource.deviceType || 
                           (item.datasource.entity as any)?.deviceProfileName || 
                           (item.datasource.entity as any)?.type || 
                           item.datasource.deviceProfileName || 
                           "";
        
        if (lowerName.includes("mews")) {
          // Mews detection — stripped debug spam
        }

        const profileLower = (this.deviceProfileMap.get(entityName) || deviceType || "").toLowerCase();
        const deviceTypeLower = (deviceType || "").toLowerCase();
        // Match Mews Bridge: profile includes "mews", OR device type includes "mews",
        // OR entity name includes "mews" (but not "room"), OR entity name includes "gateway" with mews keys
        const isMewsByName =
          profileLower.includes("mews") ||
          deviceTypeLower.includes("mews") ||
          (lowerName.includes("mews") && !lowerName.includes("room"));

        // Also check: does this datasource carry Mews-like telemetry keys?
        // This catches gateways where the profile name might differ.
        const mewsKeyNames = ["integrationstatus", "isonline", "roomssynced", "alertactive", "errormessage", "lastheartbeautc",
                              "integration_status", "is_online", "rooms_synced", "alert_active", "error_message", "last_heartbeat_utc"];
        const hasMewsKeys = item.dataKey?.name && mewsKeyNames.includes((item.dataKey.name || "").toLowerCase());

        const isMewsBridge = isMewsByName || (lowerName.includes("gateway") && hasMewsKeys) || hasMewsKeys;
        if (isMewsBridge) {
          if (item.data && item.data.length > 0) {
            const keyName = (item.dataKey?.name || "").toLowerCase().replace(/_/g, "");
            const val = item.data[0][1];

            if (keyName.includes("integration") && keyName.includes("status")) {
              stats.mewsStatus = String(val);
            } else if (keyName.includes("isonline") || keyName.includes("is_online") || keyName === "online") {
              if (val === 1 || val === "1" || val === true || String(val).toLowerCase() === "true")
                stats.mewsStatus = "ONLINE";
              else if (val === 0 || val === "0" || val === false || String(val).toLowerCase() === "false")
                stats.mewsStatus = "OFFLINE";
            } else if (keyName.includes("rooms") && keyName.includes("sync")) {
              stats.mewsRoomsSynced = Number(val);
            } else if (keyName.includes("alert") && keyName.includes("active")) {
              stats.mewsAlertActive =
                val === 1 || val === "1" || val === "true" || val === true;
            } else if (keyName.includes("error") && keyName.includes("message")) {
              stats.mewsErrorMessage = String(val);
            } else if (keyName.includes("lastheartbeat") || keyName.includes("last_heartbeat")) {
              if (val) {
                const date = new Date(val);
                if (!isNaN(date.getTime())) {
                  const formatter = new Intl.DateTimeFormat("en-US", {
                    timeZone: "Europe/Prague",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: false,
                  });
                  stats.mewsLastActivity = formatter.format(date);
                }
              }
            }
            // Log what we received for debugging
            console.log(`[Mews] key="${item.dataKey?.name}" val="${val}" → status=${stats.mewsStatus} rooms=${stats.mewsRoomsSynced} online=${!stats.mewsAlertActive}`);
          }
          return;
        }

        const aliasName = (item.datasource.aliasName || "").toLowerCase();
        const isRoomAlias = aliasName.includes("room") || aliasName.includes("guest");
        const isOtherAlias =
          aliasName.includes("other") ||
          aliasName.includes("public") ||
          aliasName.includes("office") ||
          (!isRoomAlias && item.datasource.entityType === "ASSET");

        let roomNumber = entityName;

        // If explicitly a room alias, try hard to extract a number.
        // If explicitly an "Other" alias, skip extraction and treat as "Other Place".
        if (isOtherAlias) {
          roomNumber = entityName; // Force to Other

          // Extract entity ID safely (may be object or string)
          const rawDsId = item.datasource.entityId;
          const dsEntityId: string =
            typeof rawDsId === "string" ? rawDsId : (rawDsId as any)?.id;

          // Trigger discovery for this place if not already queued
          if (dsEntityId && !this.triggeredOtherAssets.has(dsEntityId)) {
            this.triggeredOtherAssets.add(dsEntityId);
            const entityType = item.datasource.entityType;
            if (entityType === "ASSET") {
              // forceOther=true — never treat as a room card
              this.discoverDevicesForRoom(ctx, dsEntityId, entityName, true);
            } else {
              this.discoverKeysAndFetch(
                ctx,
                entityName,
                dsEntityId,
                entityName,
                entityType,
                false
              );
            }
          }
        } else {
          roomNumber = this.extractRoomNumber(entityName);

          // If entityName didn't yield a matched room number, try extracting from aliasName or entityLabel
          if (roomNumber === entityName) {
            if (item.datasource.aliasName) {
              const aliasRoom = this.extractRoomNumber(
                item.datasource.aliasName
              );
              if (aliasRoom !== item.datasource.aliasName) {
                roomNumber = aliasRoom;
              }
            }
            if (roomNumber === entityName && item.datasource.entityLabel) {
              const labelRoom = this.extractRoomNumber(
                item.datasource.entityLabel
              );
              if (labelRoom !== item.datasource.entityLabel) {
                roomNumber = labelRoom;
              }
            }
            if (roomNumber === entityName && item.datasource.name) {
              const nameRoom = this.extractRoomNumber(item.datasource.name);
              if (nameRoom !== item.datasource.name) {
                roomNumber = nameRoom;
              }
            }
          }
        }

        // If it's still just the entityName, it's an "Other" device
        if (roomNumber === entityName) {
          // Extract entity ID safely
          const rawOtherId = item.datasource.entityId;
          const otherEntityId: string =
            typeof rawOtherId === "string"
              ? rawOtherId
              : (rawOtherId as any)?.id;
          if (!otherEntityId) return;

          // Skip ASSET entities — they are containers whose child devices
          // are already discovered via relation queries into discoveredOtherDevices.
          // Adding the asset itself would show useless "Sensor @ General" entries.
          if (item.datasource.entityType === "ASSET") return;

          // Skip if this entity's name maps to a known room location
          const extractedOtherNum = this.extractRoomNumber(entityName);
          if (
            this.roomLocationNames.has(entityName) ||
            this.roomLocationNames.has(extractedOtherNum) ||
            this.roomMap.has(entityName) ||
            this.roomMap.has(extractedOtherNum)
          ) {
            return; // Room device leaked through "other" alias — ignore
          }

          let dev = this.ctxOtherDevices.get(otherEntityId);
          if (!dev) {
            dev = {
              id: otherEntityId,
              name: entityName,
              type: this.getDeviceType(entityName, null),
              status: "online",
              room: "Unknown",
              data: {},
            };
            this.ctxOtherDevices.set(otherEntityId, dev);
          }
          const key = item.dataKey.name;
          const val =
            item.data && item.data.length > 0 ? item.data[0][1] : null;
          const ts = item.data && item.data.length > 0 ? item.data[0][0] : null;
          dev.data[key] = val;
          if (key === "location" && val) {
            dev.room = val;
          }
          if (ts && (!dev.lastUpdateTs || ts > dev.lastUpdateTs)) {
            dev.lastUpdateTs = ts;
          }
          if (key === "active") {
            dev.status =
              val === true || val === "true" || val === 1 || val === "1"
                ? "online"
                : "offline";
          }
          return;
        }

        if (!dataByRoom.has(roomNumber)) {
          dataByRoom.set(roomNumber, []);
          dsByRoom.set(roomNumber, []);
          dsIdSetByRoom.set(roomNumber, new Set<string>());
        }

        dataByRoom.get(roomNumber)!.push(item);

        // Datasource collection per room
        const entityId = item.datasource.entityId;
        const dsSet = dsIdSetByRoom.get(roomNumber)!;
        if (!dsSet.has(entityId)) {
          dsSet.add(entityId);
          dsByRoom.get(roomNumber)!.push(item.datasource);
        }
      }
    });

    // Register all room numbers found in ctx.data into roomLocationNames so that
    // mergeDeviceDataIntoOther can filter them even before discovery responses arrive.
    dataByRoom.forEach((_, roomNumber) => {
      this.roomLocationNames.add(roomNumber);
    });

    let roomsUpdated = false;

    // Update or create rooms
    dataByRoom.forEach((filteredData, roomNumber) => {
      const datasources = dsByRoom.get(roomNumber);

      if (!this.roomMap.has(roomNumber)) {
        const mockCtx: any = {
          ...ctx,
          datasources: datasources,
          data: filteredData,
          settings: { ...ctx.settings, roomNumber: roomNumber },
          $scope: Object.create(ctx.$scope || null),
          detectChanges: () => {},
        };

        const roomData = createEmptyRoomData();
        roomData.sensorData.roomNumber = roomNumber;

        this.roomMap.set(roomNumber, {
          id: roomNumber,
          name: `Room ${roomNumber}`,
          mockCtx: mockCtx,
          roomData: roomData,
          activeDialogRef: null,
        });
        roomsUpdated = true;
      } else {
        const room = this.roomMap.get(roomNumber)!;
        room.mockCtx.data = filteredData;
        room.mockCtx.datasources = datasources;
      }
    });

    let rooms: InlineRoom[];
    if (roomsUpdated) {
      // Sort rooms numerically if possible
      rooms = Array.from(this.roomMap.values()).sort((a, b) => {
        const numA = parseInt(a.id, 10);
        const numB = parseInt(b.id, 10);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.id.localeCompare(b.id);
      });
    } else {
      rooms = Array.from(this.roomMap.values());
    }

    // Process telemetry for each room
    for (const room of rooms) {
      room.roomData = this.roomDataService.updateFromTelemetry(
        room.mockCtx,
        room.roomData
      );

      // Check if there is an ASSET datasource with a custom label (e.g., "The Shambles" or "Oslo Gate")
      const datasources = room.mockCtx?.datasources || [];
      const assetDs = datasources.find((ds: any) => ds && ds.entityType === "ASSET");
      if (assetDs && assetDs.entityLabel && assetDs.entityLabel !== assetDs.entityName) {
        room.roomData.sensorData.roomTitle = assetDs.entityLabel;
      }
    }
    this.updateHotelStats(rooms, stats);

    this._rooms$.next(rooms);
    this._hotelStats$.next(stats);
    this.emitMergedOtherDevices();
  }

  private emitMergedOtherDevices(): void {
    const merged = new Map<string, OtherDevice>();
    this.ctxOtherDevices.forEach((v, k) => merged.set(k, v));
    this.discoveredOtherDevices.forEach((v, k) => {
      if (merged.has(k)) {
        Object.assign(merged.get(k)!.data, v.data);
      } else {
        merged.set(k, v);
      }
    });
    const devices = Array.from(merged.values());
    log(
      `[HotelState] 📤 _otherDevices$.next — emitting ${devices.length} devices:`,
      devices.map((d) => `${d.name} (${d.type}) @ ${d.room}`)
    );
    this._otherDevices$.next(devices);
  }

  /* ───────────────────────────────────────────────────────────
     updateHotelStats — 1:1 copy from revelton-hotel.component.ts
     ─────────────────────────────────────────────────────────── */
  updateHotelStats(rooms: InlineRoom[], mewsStats: Partial<HotelStats>): void {
    let batteryAlerts = 0;
    let roomsBooked = 0;
    const batteryAlertDevices: {
      room: string;
      device: string;
      battery: number;
      type: string;
    }[] = [];

    let checkInsToday = 0;
    let checkOutsToday = 0;
    let inHouseGuests = 0;
    const checkInsList: { room: string; guest: string; time: string }[] = [];
    const checkOutsList: {
      room: string;
      guest: string;
      time: string;
      isOverdue?: boolean;
    }[] = [];

    const todayStr = new Date().toDateString();

    // Collect ALL unique devices across all rooms using activeDevices (the 'active' attribute)
    const allDevices = new Map<string, boolean>(); // name -> active status

    for (const room of rooms) {
      if (room.roomData.hasData.booked && room.roomData.sensorData.booked) {
        roomsBooked++;
      }

      // Calculate Mews stats
      if (room.roomData.reservation.hasReservation) {
        const checkInDate = new Date(room.roomData.reservation.checkIn);
        const checkOutDate = new Date(room.roomData.reservation.checkOut);
        const getPragueParts = (d: Date) => {
          const formatter = new Intl.DateTimeFormat("en-US", {
            timeZone: "Europe/Prague",
            year: "numeric",
            month: "numeric",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });
          const parts = formatter.formatToParts(d);
          const get = (type: string) =>
            parts.find((p) => p.type === type)?.value || "";
          return {
            dateStr: `${get("year")}-${get("month")}-${get("day")}`,
            timeStr: `${get("hour")}:${get("minute")}`,
          };
        };

        const checkInPrague = getPragueParts(checkInDate);
        const checkOutPrague = getPragueParts(checkOutDate);
        const todayPragueStr = getPragueParts(new Date()).dateStr;

        if (
          !isNaN(checkInDate.getTime()) &&
          checkInPrague.dateStr === todayPragueStr
        ) {
          checkInsToday++;
          checkInsList.push({
            room: room.roomData.sensorData.roomNumber?.toString() || "Unknown",
            guest: room.roomData.reservation.guestName || "Unknown Guest",
            time: checkInPrague.timeStr,
          });
        }
        if (
          !isNaN(checkOutDate.getTime()) &&
          checkOutPrague.dateStr === todayPragueStr
        ) {
          const now = new Date();
          const isOverdue = now > checkOutDate;
          checkOutsToday++;
          checkOutsList.push({
            room: room.roomData.sensorData.roomNumber?.toString() || "Unknown",
            guest: room.roomData.reservation.guestName || "Unknown Guest",
            time: checkOutPrague.timeStr,
            isOverdue: isOverdue,
          });
        }

        if (room.roomData.reservation.reservationState === "Started") {
          // Mock guest count: 1 for odd rooms, 2 for even rooms
          const rn = parseInt(
            room.roomData.sensorData.roomNumber?.toString() || "1"
          );
          inHouseGuests += rn % 2 === 0 ? 2 : 1;
        }
      }

      // Count battery alerts from deviceEntityIdMap
      if (room.roomData.deviceEntityIdMap) {
        for (const name of Object.keys(room.roomData.deviceEntityIdMap)) {
          if (room.roomData.batteryLowDevices?.[name]) {
            batteryAlerts++;
            batteryAlertDevices.push({
              room:
                room.roomData.sensorData.roomNumber?.toString() || "Unknown",
              device: this.formatDeviceName(name, "Device"),
              battery:
                room.roomData.batteryDevices?.[name] !== undefined
                  ? room.roomData.batteryDevices[name]
                  : null,
              type: this.getDeviceType(name, room.roomData),
            });
          }
        }
      }

      // Strictly use 'active' attribute for status
      if (room.roomData.activeDevices) {
        for (const [name, isActive] of Object.entries(
          room.roomData.activeDevices
        )) {
          allDevices.set(name, !!isActive);
        }
      }
    }

    // Count online/offline from the collected active statuses
    let onlineDevices = 0;
    let offlineDevices = 0;
    for (const [, isActive] of allDevices) {
      if (isActive) {
        onlineDevices++;
      } else {
        offlineDevices++;
      }
    }

    const totalDevices = allDevices.size;
    const totalRooms = rooms.length;
    const occupancyPercent =
      totalRooms > 0 ? Math.round((roomsBooked / totalRooms) * 100) : 0;

    this._hotelStats$.next({
      totalRooms,
      totalDevices,
      batteryAlerts,
      onlineDevices,
      offlineDevices,
      roomsBooked,
      roomsVacant: totalRooms - roomsBooked,
      mewsStatus: mewsStats.mewsStatus || "UNKNOWN",
      mewsRoomsSynced: mewsStats.mewsRoomsSynced || 0,
      mewsAlertActive: mewsStats.mewsAlertActive || false,
      mewsErrorMessage: mewsStats.mewsErrorMessage || "",
      mewsLastActivity: mewsStats.mewsLastActivity || "",
      batteryAlertDevices,
      occupancyPercent,
      checkInsToday,
      checkOutsToday,
      inHouseGuests,
      checkInsList,
      checkOutsList,
      otherDevicesCount: this._otherDevices$.value.length,
    });
  }

  /* ───────────────────────────────────────────────────────────
     formatDeviceName — 1:1 copy from revelton-hotel.component.ts
     ─────────────────────────────────────────────────────────── */
  private getDeviceType(name: string, data: RoomData | null): string {
    if (data) {
      if (data.windowDevices?.[name]) return "Window Sensor";
      if (data.trvDevices?.[name]) return "Thermostat";
      if (data.leakDevices?.[name]) return "Leak Sensor";
      if (data.noiseDevices?.[name]) return "Noise Sensor";
      if (data.airSensors?.[name]) return "Air Monitor";
    }

    const profile = this.deviceProfileMap.get(name) || "";
    const lowerProfile = profile.toLowerCase();
    if (lowerProfile.includes("am308") || lowerProfile.includes("ambience") || lowerProfile.includes("air")) {
      return "Air Monitor";
    }

    const lower = name.toLowerCase();
    if (
      lower.includes("window") ||
      lower.includes("contact") ||
      lower.startsWith("win_")
    )
      return "Window Sensor";
    if (
      lower.includes("trv") ||
      lower.includes("thermostat") ||
      lower.startsWith("trv_")
    )
      return "Thermostat";
    if (
      lower.includes("leak") ||
      lower.includes("water") ||
      lower.startsWith("wl_")
    )
      return "Leak Sensor";
    if (
      lower.includes("noise") ||
      lower.includes("sound") ||
      lower.startsWith("ns_")
    )
      return "Noise Sensor";
    if (
      lower.includes("air") ||
      lower.includes("co2") ||
      lower.includes("iaq") ||
      lower.startsWith("aq_")
    )
      return "Air Monitor";
    if (
      lower.includes("motion") ||
      lower.includes("occupancy") ||
      lower.startsWith("occ_")
    )
      return "Occupancy";
    if (
      lower.includes("light") ||
      lower.includes("lamp") ||
      lower.startsWith("lt_")
    )
      return "Light";
    if (lower.includes("plug") || lower.includes("socket")) return "Plug";

    return "Sensor";
  }

  private formatDeviceName(name: string, defaultType: string): string {
    // Pattern: type_room_X_Y  (e.g., window_room_6_2, trv_room_6_1, wl_room_5_1)
    const fullMatch = name.match(/^([a-zA-Z]+)_room_(\\d+)_(\\d+)$/i);
    if (fullMatch) {
      const prefix = fullMatch[1].toUpperCase();
      const deviceNum = fullMatch[3];
      const types: Record<string, string> = {
        WINDOW: "Window",
        WIN: "Window",
        TRV: "Thermostat",
        AQ: "Air Monitor",
        AM: "Air Monitor",
        WL: "Water Leak",
        NS: "Noise",
        NOISE: "Noise",
        OCC: "Occupancy",
      };
      return `${types[prefix] || defaultType} ${deviceNum}`;
    }

    // Pattern: type_X_Y (e.g., TRV_6_1)
    const shortMatch = name.match(/^([a-zA-Z]+)_(\\d+)_(\\d+)$/i);
    if (shortMatch) {
      const prefix = shortMatch[1].toUpperCase();
      const deviceNum = shortMatch[3];
      const types: Record<string, string> = {
        WINDOW: "Window",
        WIN: "Window",
        TRV: "Thermostat",
        AQ: "Air Monitor",
        AM: "Air Monitor",
        WL: "Water Leak",
        NS: "Noise",
        NOISE: "Noise",
        OCC: "Occupancy",
      };
      return `${types[prefix] || defaultType} ${deviceNum}`;
    }

    // Pattern: type_X (single device per room)
    const singleMatch = name.match(/^([a-zA-Z]+)_(\\d+)$/i);
    if (singleMatch) {
      const prefix = singleMatch[1].toUpperCase();
      const types: Record<string, string> = {
        WINDOW: "Window",
        WIN: "Window",
        TRV: "Thermostat",
        AQ: "Air Monitor",
        AM: "Air Monitor",
        WL: "Water Leak",
        NS: "Noise",
        NOISE: "Noise",
        OCC: "Occupancy",
      };
      return types[prefix] || defaultType;
    }

    return name;
  }

  /* ───────────────────────────────────────────────────────────
     Utility: getAirQualityLabel — delegates to RoomDataService
     ─────────────────────────────────────────────────────────── */
  getAirQualityLabel(aqi: number): string {
    return this.roomDataService.getAirQualityLabel(aqi);
  }

  /* ═══════════════════════════════════════════════════════════
     BACKEND DEVICE DISCOVERY — uses ctx.http REST API
     Same pattern as room-detail-panel.component.ts
     ═══════════════════════════════════════════════════════════ */

  /**
   * Entry point: call from component ngOnInit.
   * Discovers devices related to each Room Asset via "Contains" relations,
   * then fetches their telemetry and merges into room data.
   */
  public discoverDevices(ctx: any): void {
    if (!ctx?.http || this.discoveryDone) return;
    this.lastCtx = ctx;
    this.discoveryDone = true;

    log(`discoverDevices: ${ctx.datasources?.length ?? 0} datasources`);

    // Separate "room" assets from "other" alias assets so they are always
    // routed correctly regardless of whether their name contains a number.
    const roomAssets = new Map<
      string,
      { entityId: string; entityName: string }
    >();
    const otherAssets = new Map<
      string,
      { entityId: string; entityName: string }
    >();
    const devicesToQueryForAssets = new Map<string, string>(); // roomNumber -> deviceId

    if (ctx.datasources) {
      for (const ds of ctx.datasources) {
        if (ds.entityId) {
          const id =
            typeof ds.entityId === "string"
              ? ds.entityId
              : (ds.entityId as any).id;
          if (!id) continue;

          const aliasName = (ds.aliasName || "").toLowerCase();
          const isRoomAlias = aliasName.includes("room") || aliasName.includes("guest");
          const isOtherAlias =
            aliasName.includes("other") ||
            aliasName.includes("public") ||
            aliasName.includes("office") ||
            (!isRoomAlias && ds.entityType === "ASSET");

          if (ds.entityType === "ASSET") {
            if (isOtherAlias) {
              log(
                `  → OTHER asset: "${
                  ds.entityName || ds.entityLabel
                }" alias="${aliasName}" id=${id}`
              );
              // Force these into the "other" bucket — never treat as a room card
              otherAssets.set(id, {
                entityId: id,
                entityName: ds.entityName || ds.entityLabel || "",
              });
            } else {
              log(
                `  → ROOM asset:  "${
                  ds.entityName || ds.entityLabel
                }" alias="${aliasName}" id=${id}`
              );
              roomAssets.set(id, {
                entityId: id,
                entityName: ds.entityName || ds.entityLabel || "",
              });
            }
          } else if (ds.entityType === "DEVICE" && !isOtherAlias) {
            const entityName = ds.entityName || ds.entityLabel || "";
            const roomNumber = this.extractRoomNumber(entityName);
            if (
              roomNumber &&
              roomNumber !== entityName &&
              !devicesToQueryForAssets.has(roomNumber)
            ) {
              devicesToQueryForAssets.set(roomNumber, id);
            }
          }
        }
      }
    }

    log(`  roomAssets count:  ${roomAssets.size}`);
    log(`  otherAssets count: ${otherAssets.size}`);
    log(
      `  otherAssets names: [${Array.from(otherAssets.values())
        .map((a) => a.entityName)
        .join(", ")}]`
    );
    
    // 1. Process explicit room assets
    roomAssets.forEach((asset, assetId) => {
      this.discoverDevicesForRoom(ctx, assetId, asset.entityName, false);
    });

    // 2. Process "other" alias assets (offices, halls, public areas)
    //    forceOther=true guarantees isRoom=false even if the name has a number
    otherAssets.forEach((asset, assetId) => {
      if (!this.triggeredOtherAssets.has(assetId)) {
        this.triggeredOtherAssets.add(assetId);
        log(
          `[HotelState] 🏢 discoverDevicesForRoom (forceOther=true): "${asset.entityName}" id=${assetId}`
        );
        this.discoverDevicesForRoom(ctx, assetId, asset.entityName, true);
      }
    });

    // 3. Fallback: Find missing room assets from known devices
    devicesToQueryForAssets.forEach((deviceId, roomNumber) => {
      // If we already found an asset for this room via explicit mappings, skip
      if (
        Array.from(roomAssets.values()).some(
          (a) => this.extractRoomNumber(a.entityName) === roomNumber
        )
      )
        return;

      const url = `/api/relations/info?toId=${deviceId}&toType=DEVICE`;
      ctx.http.get(url).subscribe(
        (relations: any[]) => {
          const assetRel = relations?.find(
            (r) => r.from?.entityType === "ASSET" && r.type === "Contains"
          );
          if (assetRel && assetRel.from?.id) {
            this.discoverDevicesForRoom(
              ctx,
              assetRel.from.id,
              assetRel.fromName || `Asset_${assetRel.from.id}`,
              false
            );
          }
        },
        (err: any) =>
          warn(
            `HotelStateService: ⚠️ Failed to query parent asset for device [${deviceId}]`
          )
      );
    });

    // Set up periodic refresh (every 30s)
    if (!this.refreshTimer) {
      this.refreshTimer = setInterval(() => {
        this.refreshAllDeviceTelemetry(ctx);
      }, PERIODIC_REFRESH_MS);
    }
  }

  /**
   * Phase 1: Query relations for a single Room Asset.
   * GET /api/relations/info?fromId={assetId}&fromType=ASSET
   */
  private discoverDevicesForRoom(
    ctx: any,
    assetId: string,
    assetName: string,
    forceOther: boolean = false
  ): void {
    const extractedRoomNumber = this.extractRoomNumber(assetName);

    // When forceOther=true the caller already knows this is a non-room asset
    // (e.g. detected via "other" alias name), so we skip the name-based heuristic
    // entirely — this prevents "Hall 1" or "Office 3" from being treated as room cards.
    const isRoom = !forceOther;
    const locationName = isRoom ? extractedRoomNumber : assetName;

    // Register this location as a room SYNCHRONOUSLY (before async calls) so that
    // mergeDeviceDataIntoOther can filter it out even if responses arrive out of order.
    if (isRoom) {
      this.roomLocationNames.add(locationName); // e.g. "1", "2"
      this.roomLocationNames.add(assetName); // e.g. "JLT-Room 1"
      this.roomLocationNames.add(extractedRoomNumber); // same as locationName for rooms
      log(
        `[HotelState] 🏠 Registered room location: "${locationName}" (asset: "${assetName}")`
      );
    }

    log(
      `[HotelState] 🔎 discoverDevicesForRoom: assetName="${assetName}" assetId="${assetId}"` +
        ` forceOther=${forceOther} isRoom=${isRoom} locationName="${locationName}"`
    );

    const url = `/api/relations/info?fromId=${assetId}&fromType=ASSET`;
    log(`[HotelState]   → GET ${url}`);

    ctx.http.get(url).subscribe(
      (relations: any[]) => {
        log(
          `[HotelState]   ← relations response for "${assetName}": ${
            relations?.length ?? 0
          } total relations`,
          relations
        );

        if (!relations || relations.length === 0) {
          warn(
            `[HotelState]   ⚠️ No relations found for asset "${assetName}" (${assetId}). ` +
              `Make sure "Contains" relations exist between this asset and its devices in ThingsBoard.`
          );
          return;
        }

        const deviceRelations = relations.filter(
          (r) => r.to?.entityType === "DEVICE" && r.type === "Contains"
        );

        log(
          `[HotelState]   📦 "${assetName}" → ${deviceRelations.length} DEVICE "Contains" relations` +
            ` (${
              relations.length - deviceRelations.length
            } non-device/non-Contains filtered out)`
        );
        log(
          `[HotelState]   device names: [${deviceRelations
            .map((r) => r.toName)
            .join(", ")}]`
        );

        if (deviceRelations.length === 0) {
          warn(
            `[HotelState]   ⚠️ Asset "${assetName}" has relations but NONE are DEVICE+Contains. ` +
              `Relation types found: [${relations
                .map((r) => `${r.type}/${r.to?.entityType}`)
                .join(", ")}]`
          );
          return;
        }

        // Phase 2: For each device, discover its keys and fetch telemetry
        for (const rel of deviceRelations) {
          const deviceId = rel.to?.id;
          const deviceName =
            rel.toName || `device_${deviceId?.substring(0, 8)}`;
          if (!deviceId) continue;

          log(
            `[HotelState]   🔑 discoverKeysAndFetch: "${deviceName}" id=${deviceId} isRoom=${isRoom} location="${locationName}"`
          );
          this.discoverKeysAndFetch(
            ctx,
            locationName,
            deviceId,
            deviceName,
            "DEVICE",
            isRoom
          );
        }
      },
      (err: any) => {
        error(
          `HotelStateService: ❌ Failed to query relations for [${assetName}] (${assetId}):`,
          err?.status,
          err?.message,
          err
        );
      }
    );

    // Only fetch the asset's own telemetry for genuine room assets.
    // Room assets carry Mews reservation data (checkIn, checkOut, guestName etc.)
    // that is stored directly on the asset entity.
    // For "other" assets (offices, public places) fetching the asset itself would
    // just create a useless "Sensor @ General" entry in the Other Devices panel.
    if (isRoom) {
      this.discoverKeysAndFetch(
        ctx,
        locationName,
        assetId,
        assetName,
        "ASSET",
        isRoom
      );
    }
  }

  /**
   * Phase 2+3: Get telemetry keys for an entity, then fetch latest values.
   * GET /api/plugins/telemetry/{entityType}/{id}/keys/timeseries
   * GET /api/plugins/telemetry/{entityType}/{id}/values/timeseries?keys=...
   */
  private discoverKeysAndFetch(
    ctx: any,
    locationName: string,
    entityId: string,
    entityName: string,
    entityType: string = "DEVICE",
    isRoom: boolean = true
  ): void {
    const keysUrl = `/api/plugins/telemetry/${entityType}/${entityId}/keys/timeseries`;

    ctx.http.get(keysUrl).subscribe(
      (keys: string[]) => {
        if (!keys || keys.length === 0) {
          // Even if no timeseries keys, still fetch attributes!
          this.fetchDeviceData(
            ctx,
            locationName,
            entityId,
            entityName,
            [],
            entityType,
            isRoom
          );
          return;
        }

        // Store discovery info for periodic refresh
        if (!this.discoveredDevices.has(locationName)) {
          this.discoveredDevices.set(locationName, []);
        }
        // Avoid duplicates
        const existing = this.discoveredDevices.get(locationName)!;
        let storedEntity = existing.find((d) => d.deviceId === entityId);
        if (!storedEntity) {
          storedEntity = {
            deviceId: entityId,
            deviceName: entityName,
            roomNumber: locationName,
            keys: [],
          };
          (storedEntity as any).entityType = entityType; // Save entityType for refresh
          (storedEntity as any).isRoom = isRoom; // Save isRoom flag
          existing.push(storedEntity);
        }
        storedEntity.keys = keys;

        // Fetch latest values (Telemetry + Attributes)
        this.fetchDeviceData(
          ctx,
          locationName,
          entityId,
          entityName,
          keys,
          entityType,
          isRoom
        );
      },
      (err: any) => {
        warn(
          `HotelStateService: ⚠️ Failed to get keys for [${entityName}]:`,
          err?.status
        );
        // Fallback: try fetching attributes anyway
        this.fetchDeviceData(
          ctx,
          locationName,
          entityId,
          entityName,
          [],
          entityType,
          isRoom
        );
      }
    );
  }

  /**
   * Wrapper to fetch both Telemetry and Attributes.
   */
  private fetchDeviceData(
    ctx: any,
    locationName: string,
    entityId: string,
    entityName: string,
    keys: string[],
    entityType: string = "DEVICE",
    isRoom: boolean = true
  ): void {
    if (keys && keys.length > 0) {
      this.fetchDeviceTelemetry(
        ctx,
        locationName,
        entityId,
        entityName,
        keys,
        entityType,
        isRoom
      );
    }
    this.fetchDeviceAttributes(
      ctx,
      locationName,
      entityId,
      entityName,
      "SERVER_SCOPE",
      entityType,
      isRoom
    );
    this.fetchDeviceAttributes(
      ctx,
      locationName,
      entityId,
      entityName,
      "SHARED_SCOPE",
      entityType,
      isRoom
    );
    this.fetchDeviceAttributes(
      ctx,
      locationName,
      entityId,
      entityName,
      "CLIENT_SCOPE",
      entityType,
      isRoom
    );
  }

  /**
   * Phase 3: Fetch latest telemetry values and merge into room data.
   * GET /api/plugins/telemetry/{entityType}/{id}/values/timeseries?keys=...
   * Response: { "temperature": [{"ts": 123, "value": "22.5"}], ... }
   */
  private fetchDeviceTelemetry(
    ctx: any,
    locationName: string,
    entityId: string,
    entityName: string,
    keys: string[],
    entityType: string = "DEVICE",
    isRoom: boolean = true
  ): void {
    const keysParam = keys.join(",");
    const url = `/api/plugins/telemetry/${entityType}/${entityId}/values/timeseries?keys=${keysParam}`;

    ctx.http.get(url).subscribe(
      (telemetry: any) => {
        if (!telemetry || Object.keys(telemetry).length === 0) {
          return;
        }

        // Convert TB REST response → ctx.data format
        if (isRoom) {
          this.mergeDeviceDataIntoRoom(
            locationName,
            entityId,
            entityName,
            telemetry,
            entityType
          );
        } else {
          this.mergeDeviceDataIntoOther(
            locationName,
            entityId,
            entityName,
            telemetry,
            entityType
          );
        }
      },
      (err: any) => {
        warn(
          `HotelStateService: ⚠️ Failed to fetch telemetry for [${entityName}]:`,
          err?.status
        );
      }
    );
  }

  /**
   * Phase 3.5: Fetch device attributes and merge into room data.
   * GET /api/plugins/telemetry/{entityType}/{id}/values/attributes/{scope}
   * Response: [{ "key": "active", "value": true, "lastUpdateTs": 123 }, ...]
   */
  private fetchDeviceAttributes(
    ctx: any,
    locationName: string,
    entityId: string,
    entityName: string,
    scope: string,
    entityType: string = "DEVICE",
    isRoom: boolean = true
  ): void {
    const url = `/api/plugins/telemetry/${entityType}/${entityId}/values/attributes/${scope}`;

    ctx.http.get(url).subscribe(
      (attributes: any[]) => {
        if (
          !attributes ||
          !Array.isArray(attributes) ||
          attributes.length === 0
        ) {
          return;
        }

        // Convert [{key: "active", value: true, lastUpdateTs: 123}]
        // to {"active": [{"ts": 123, "value": true}]}
        const formattedData: any = {};
        for (const attr of attributes) {
          formattedData[attr.key] = [
            { ts: attr.lastUpdateTs || Date.now(), value: attr.value },
          ];
        }

        // Merge using the exact same pipeline
        if (isRoom) {
          this.mergeDeviceDataIntoRoom(
            locationName,
            entityId,
            entityName,
            formattedData,
            entityType
          );
        } else {
          this.mergeDeviceDataIntoOther(
            locationName,
            entityId,
            entityName,
            formattedData,
            entityType
          );
        }
      },
      (err: any) => {
        // Silently ignore if a scope has no attributes or fails (404)
      }
    );
  }

  private mergeDeviceDataIntoOther(
    locationName: string,
    entityId: string,
    entityName: string,
    telemetry: any,
    entityType: string = "DEVICE"
  ): void {
    log(
      `[HotelState] 💾 mergeDeviceDataIntoOther: "${entityName}" (${entityId})` +
        ` location="${locationName}" keys=[${Object.keys(telemetry || {}).join(
          ", "
        )}]`
    );

    // ── Guard: skip devices whose location is already a room card ──────────
    // This prevents room devices from appearing in the Other Devices panel when
    // the "other" alias filter type includes both Room and Public Place assets.
    const extractedNum = this.extractRoomNumber(locationName);
    const isKnownRoom =
      this.roomLocationNames.has(locationName) ||
      this.roomLocationNames.has(extractedNum) ||
      this.roomMap.has(locationName) ||
      this.roomMap.has(extractedNum);

    if (isKnownRoom) {
      log(
        `[HotelState] 🚫 mergeDeviceDataIntoOther SKIPPED "${entityName}" ` +
          `— location "${locationName}" is a room (extracted="${extractedNum}")`
      );
      return;
    }
    // ── End guard ───────────────────────────────────────────────────────────

    let dev = this.discoveredOtherDevices.get(entityId);
    let isNew = false;
    if (!dev) {
      dev = {
        id: entityId,
        name: entityName,
        type: this.getDeviceType(entityName, null),
        status: "online",
        room: locationName === entityName ? "Unknown" : locationName,
        data: {},
      };
      this.discoveredOtherDevices.set(entityId, dev);
      isNew = true;
    }

    let updated = false;
    for (const key of Object.keys(telemetry)) {
      const entries = telemetry[key];
      if (!Array.isArray(entries) || entries.length === 0) continue;

      const latest = entries[0];
      const val = latest.value;
      const ts = latest.ts;

      if (dev.data[key] !== val) {
        dev.data[key] = val;
        updated = true;
      }

      if (key === "location" && val) {
        if (dev.room !== val) {
          dev.room = val;
          updated = true;
        }
      }

      if (ts && (!dev.lastUpdateTs || ts > dev.lastUpdateTs)) {
        dev.lastUpdateTs = ts;
        updated = true;
      }

      if (key === "active") {
        const newStatus =
          val === true || val === "true" || val === 1 || val === "1"
            ? "online"
            : "offline";
        if (dev.status !== newStatus) {
          dev.status = newStatus;
          updated = true;
        }
      }
    }

    if (updated || isNew) {
      if (isNew) {
        log(
          `[HotelState] ➕ Added new "Other" device: "${entityName}" type="${
            dev!.type
          }" location="${locationName}" (${entityId})`
        );
      }
      log(
        `[HotelState] 📡 emitMergedOtherDevices — discoveredOther=${this.discoveredOtherDevices.size}` +
          ` ctxOther=${this.ctxOtherDevices.size}`
      );
      this.emitMergedOtherDevices();
    }
  }

  /**
   * Convert REST telemetry response to ctx.data items and run through RoomDataService.
   * REST format: { "temperature": [{"ts": 123, "value": "22.5"}], "humidity": [...] }
   * ctx.data format: [{ dataKey: {name}, data: [[ts, val]], datasource: {entityName} }]
   */
  private mergeDeviceDataIntoRoom(
    roomNumber: string,
    entityId: string,
    entityName: string,
    telemetry: any,
    entityType: string = "DEVICE"
  ): void {
    // Ensure room exists
    if (!this.roomMap.has(roomNumber)) {
      const roomData = createEmptyRoomData();
      roomData.sensorData.roomNumber = roomNumber;
      this.roomMap.set(roomNumber, {
        id: roomNumber,
        name: `Room ${roomNumber}`,
        mockCtx: { settings: { roomNumber }, datasources: [], data: [] },
        roomData,
        activeDialogRef: null,
      });
    }

    const room = this.roomMap.get(roomNumber)!;

    // Build mock ctx.data items — exactly the format RoomDataService expects
    const mockDataItems: any[] = [];

    for (const key of Object.keys(telemetry)) {
      const entries = telemetry[key];
      if (!Array.isArray(entries) || entries.length === 0) continue;

      // TB REST returns: [{"ts": 1234, "value": "22.5"}]
      const latest = entries[0];
      const ts = latest.ts || Date.now();
      const value = latest.value;

      mockDataItems.push({
        dataKey: { name: key },
        data: [[ts, value]],
        datasource: {
          entityId: entityId,
          entityName: entityName,
          entityType: entityType,
          deviceType: this.deviceProfileMap.get(entityName),
        },
      });
    }

    if (mockDataItems.length === 0) return;

    // Feed through RoomDataService — same pipeline as onDataUpdated
    const mockCtx: any = { data: mockDataItems };
    room.roomData = this.roomDataService.updateFromTelemetry(
      mockCtx,
      room.roomData
    );

    // Publish updated rooms
    const rooms = Array.from(this.roomMap.values()).sort((a, b) => {
      const numA = parseInt(a.id, 10);
      const numB = parseInt(b.id, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.id.localeCompare(b.id);
    });
    this.updateHotelStats(rooms, this._hotelStats$.value);
    this._rooms$.next(rooms);
  }

  /**
   * Periodic refresh: re-fetch latest telemetry for all discovered devices.
   */
  private refreshAllDeviceTelemetry(ctx: any): void {
    if (!ctx || !ctx.http) return;
    this.discoveredDevices.forEach((devices, locationName) => {
      for (const d of devices) {
        const entityType = (d as any).entityType || "DEVICE";
        const isRoom = (d as any).isRoom !== false;
        this.fetchDeviceData(
          ctx,
          locationName,
          d.deviceId,
          d.deviceName,
          d.keys,
          entityType,
          isRoom
        );
      }
    });
  }

  /* ──── Private helpers ──── */

  private emptyStats(): HotelStats {
    return {
      totalRooms: 0,
      totalDevices: 0,
      batteryAlerts: 0,
      onlineDevices: 0,
      offlineDevices: 0,
      roomsBooked: 0,
      roomsVacant: 0,
      mewsStatus: "UNKNOWN",
      mewsRoomsSynced: 0,
      mewsAlertActive: false,
      mewsErrorMessage: "",
      mewsLastActivity: "",
      batteryAlertDevices: [],
      occupancyPercent: 0,
      checkInsToday: 0,
      checkOutsToday: 0,
      inHouseGuests: 0,
      checkInsList: [],
      checkOutsList: [],
      otherDevicesCount: 0,
    };
  }
}
