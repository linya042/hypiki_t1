import React, { useMemo } from "react";
import ReactJson from "@microlink/react-json-view";


function computeDiff(before: any, after: any, basePath = ""): Record<string, string> {
  const map: Record<string, string> = {};
  if (typeof before !== typeof after) {
    map[basePath || "/"] = "changed";
    return map;
  }
  if (before === null || after === null) {
    if (before === after) {
      map[basePath || "/"] = "same";
    } else {
      map[basePath || "/"] = "changed";
    }
    return map;
  }
  if (typeof before !== "object") {
    map[basePath || "/"] = before === after ? "same" : "changed";
    return map;
  }
  
  const beforeKeys = Array.isArray(before) ? before.map((_, i) => String(i)) : Object.keys(before);
  const afterKeys = Array.isArray(after) ? after.map((_, i) => String(i)) : Object.keys(after);
  const keys = Array.from(new Set([...beforeKeys, ...afterKeys]));
  keys.forEach((k) => {
    const p = basePath ? '${basePath}.${k}' : k;
    if (!(k in (before ?? {}))) {
      map[p] = "added";
    } else if (!(k in (after ?? {}))) {
      map[p] = "removed";
    } else {
      Object.assign(map, computeDiff(before[k], after[k], p));
    }
  });
  return map;
}

type Props = {
  item: any | null;
};

export default function ResourceDetails({ item }: Props) {
  const diffMap = useMemo(() => {
    if (!item) return {};
    return computeDiff(item.before, item.after);
  }, [item]);

  if (!item) {
    return <div className="details empty">Select resource to see details</div>;
  }

  const keysChanged = Object.keys(diffMap).filter((k) => diffMap[k] !== "same");

  return (
    <div className="details">
      <h3>{item.address}</h3>
      <div className="badges">
        <span className="badge">{item.action}</span>
        <span className="badge">{item.provider}</span>
        {item.replace_paths && item.replace_paths.length > 0 && (
          <span className="badge replace">replace ({item.replace_paths.length})</span>
        )}
        {item.after_unknown && Object.keys(item.after_unknown).length > 0 && (
          <span className="badge unknown">unknown</span>
        )}
      </div>

      <div className="detail-sections">
        <div className="json-side">
          <div className="section-title">Before</div>
          <div className="json-box">
            <ReactJson src={item.before ?? {}} name={false} collapsed={1} enableClipboard={false} displayDataTypes={false} />
          </div>
        </div>

        <div className="json-side">
          <div className="section-title">After</div>
          <div className="json-box">
            <ReactJson src={item.after ?? {}} name={false} collapsed={1} enableClipboard={false} displayDataTypes={false} />
          </div>
        </div>
      </div>

      <div className="detail-meta">
        <h4>Diff summary</h4>
        {keysChanged.length === 0 ? <div>No differences detected</div> : (
          <ul className="diff-list">
            {keysChanged.slice(0, 200).map((k) => (
              <li key={k}><code>{k}</code> — <strong>{diffMap[k]}</strong></li>
            ))}
            {keysChanged.length > 200 && <li>... and {keysChanged.length - 200} more</li>}
          </ul>
        )}
      </div>

      <div className="detail-raw">
        <h4>Raw resource JSON</h4>
        <ReactJson src={item.raw} name={false} collapsed={2} enableClipboard={false} displayDataTypes={false} />
      </div>
    </div>
  );
}