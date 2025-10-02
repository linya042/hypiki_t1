import React, { useMemo, useState } from "react";

type ResourceItem = ReturnType<typeof import("../utils/parser").parsePlan> extends Promise<any> ? any : any;

type Props = {
  items: any[]; 
  onSelect: (item: any) => void;
};

export default function ResourceList({ items, onSelect }: Props) {
  const [q, setQ] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const providers = useMemo(() => {
    const s = new Set<string>();
    items.forEach((it) => s.add(it.provider));
    return Array.from(s).sort();
  }, [items]);

  const types = useMemo(() => {
    const s = new Set<string>();
    items.forEach((it) => s.add(it.type));
    return Array.from(s).sort();
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (actionFilter !== "all" && it.action !== actionFilter) return false;
      if (providerFilter !== "all" && it.provider !== providerFilter) return false;
      if (typeFilter !== "all" && it.type !== typeFilter) return false;
      if (q && !it.address.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [items, q, actionFilter, providerFilter, typeFilter]);

  return (
    <div className="resource-list">
      <div className="filters">
        <input placeholder="Search address..." value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
          <option value="all">All actions</option>
          <option value="create">create</option>
          <option value="update">update</option>
          <option value="delete">delete</option>
          <option value="replace">replace</option>
          <option value="no-op">no-op</option>
        </select>
        <select value={providerFilter} onChange={(e) => setProviderFilter(e.target.value)}>
          <option value="all">All providers</option>
          {providers.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">All types</option>
          {types.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="list">
        {filtered.length === 0 ? <div className="empty">No resources</div> : null}
        {filtered.map((it) => (
          <div key={it.address} className={`list-item action-${it.action}`} onClick={() => onSelect(it)}>
            <div className="addr">{it.address}</div>
            <div className="meta">
              <span className="chip">{it.action}</span>
              <span className="chip">{it.provider}</span>
              <span className="chip">{it.type}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}