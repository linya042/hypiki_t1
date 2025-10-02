import React, { useState, useEffect } from "react";

type Props = {
  summary: Record<string, number>;
  total: number;
  terraformVersion?: string | null;
};

export default function Summary({ }: Props) {
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [total, setTotal] = useState<number>(0);
  const [terraformVersion, setTerraformVersion] = useState<string | null>(null);

  // Слушаем события или обновления от родительского компонента
  useEffect(() => {
    // Пример: слушаем кастомное событие с данными
    const handleDataUpdate = (event: CustomEvent) => {
      const data = event.detail;
      setSummary({
        create: data.create ?? 0,
        update: data.update ?? 0,
        delete: data.delete ?? 0,
        replace: data.replace ?? 0,
        "no-op": data["no-op"] ?? 0
      });
      setTotal(data.total_changes ?? 0);
      setTerraformVersion(data.terraform_version ?? null);
    };

    window.addEventListener('terraformDataUpdate', handleDataUpdate as EventListener);
    
    return () => {
      window.removeEventListener('terraformDataUpdate', handleDataUpdate as EventListener);
    };
  }, []);

  // Или получаем данные из localStorage/sessionStorage
  useEffect(() => {
    const savedData = localStorage.getItem('terraformPlanData');
    if (savedData) {
      try {
        const data = JSON.parse(savedData);
        setSummary({
          create: data.create ?? 0,
          update: data.update ?? 0,
          delete: data.delete ?? 0,
          replace: data.replace ?? 0,
          "no-op": data["no-op"] ?? 0
        });
        setTotal(data.total_changes ?? 0);
        setTerraformVersion(data.terraform_version ?? null);
      } catch (err) {
        console.error("Ошибка парсинга сохраненных данных:", err);
      }
    }
  }, []);

  const actionKeys = ["create", "update", "delete", "replace", "no-op"];

  return (
    <div className="summary">
      <div className="summary-row">
        <div className="summary-card total">
          <div className="label">Total changes</div>
          <div className="value">{total}</div>
        </div>
        {actionKeys.map((k) => (
          <div key={k} className="summary-card">
            <div className="label">{k}</div>
            <div className="value">{summary[k] ?? 0}</div>
          </div>
        ))}
        <div className="summary-card">
          <div className="label">Terraform</div>
          <div className="value">{terraformVersion ?? "unknown"}</div>
        </div>
      </div>
    </div>
  );
}