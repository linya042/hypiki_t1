
export type Action = "create" | "update" | "delete" | "replace" | "no-op" | string;

export interface ResourceChangeRaw {
  address: string;
  module_address?: string;
  mode?: string;
  type: string;
  name: string;
  index?: any;
  provider_name?: string;
  change?: {
    actions: Action[]; // e.g. ["update"], ["create"], ["delete"], ["no-op"], ["delete","create"] (replace)
    before?: any;
    after?: any;
    after_unknown?: Record<string, any> | null;
    before_sensitive?: boolean | undefined;
    after_sensitive?: boolean | undefined;
    replace_paths?: string[] | null;
  };
}

export interface TerraformPlanRaw {
  format_version?: string;
  terraform_version?: string;
  resource_changes?: ResourceChangeRaw[];
  planned_values?: any;
  diagnostics?: any[];
}