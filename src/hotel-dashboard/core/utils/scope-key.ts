/**
 * Short stable key for a widget's datasource set. Browser-stored state (topology
 * cache, control-panel config, alert archive) is keyed by it so one hotel never
 * reads another hotel's entries.
 */
export function datasourceScopeKey(ctx: any): string {
  const ids: string[] = (ctx?.datasources || [])
    .map((ds: any) =>
      typeof ds.entityId === "string" ? ds.entityId : ds.entityId?.id
    )
    .filter(Boolean)
    .sort();
  // djb2 hash → short, stable key regardless of how many UUIDs are joined.
  let h = 5381;
  const s = ids.join("|");
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
}
