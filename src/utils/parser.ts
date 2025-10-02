import type { TerraformPlanRaw, ResourceChangeRaw, Action } from "../types";


export function parsePlan(json: TerraformPlanRaw) {
  const errors: string[] = [];
  if (!json || typeof json !== "object") {
    errors.push("JSON is not an object");
    return { errors };
  }

  const resource_changes = Array.isArray(json.resource_changes) ? json.resource_changes : [];

  if (!Array.isArray(json.resource_changes)) {
    errors.push("resource_changes missing or not an array");
  }

  const normalized = resource_changes.map((rc: ResourceChangeRaw) => {
    const actions = rc.change?.actions ?? [];
    const action: Action =
      actions.includes("replace") || (actions.includes("delete") && actions.includes("create"))
        ? "replace"
        : actions[0] ?? "no-op";

    return {
      address: rc.address,
      module_address: rc.module_address ?? null,
      type: rc.type,
      name: rc.name,
      provider: rc.provider_name ?? guessProviderFromType(rc.type),
      action,
      raw: rc,
      before: rc.change?.before ?? null,
      after: rc.change?.after ?? null,
      after_unknown: rc.change?.after_unknown ?? null,
      replace_paths: rc.change?.replace_paths ?? null,
      actions_array: actions
    };
  });

  
  const summary = normalized.reduce<Record<string, number>>((acc, r) => {
    acc[r.action] = (acc[r.action] ?? 0) + 1;
    return acc;
  }, {});

  return { errors, normalized, summary, terraform_version: json.terraform_version ?? null, diagnostics: json.diagnostics ?? [] };
}

function guessProviderFromType(type: string) {
  const parts = type.split("_");
  return parts[0] ?? type;
}