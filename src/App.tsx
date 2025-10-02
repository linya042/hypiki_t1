import React, { useState } from "react";
import FileUploader from "./components/FileUploader";
import Summary from "./components/Summary";
import ResourceList from "./components/ResourceList";
import ResourceDetails from "./components/ResourceDetails";

export default function App() {
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [normalized, setNormalized] = useState<any[]>([]);
  const [diagnostics, setDiagnostics] = useState<any[]>([]);
  const [details, setDetails] = useState<any[]>([]);
  const [terraformVersion, setTerraformVersion] = useState<string | null>(null);
  const [selected, setSelected] = useState<any | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const handleFileUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("http://localhost:5000/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Ошибка при загрузке файла");
      }

      const data = await res.json();

      setSummary(data.summary ?? {});
      setNormalized(data.resources ?? []);
      setDetails(data.objects_sample ?? [])
      setDiagnostics(data.diagnostics ?? []);
      setTerraformVersion(data.terraform_version ?? null);
      setErrors([]);
      setSelected(null);
    } catch (e: any) {
      setErrors([e.message]);
    }
  };

  return (
    <div className="app">
      <header>
        <h1>Terraform Plan Viewer (MVP)</h1>
        <div className="subtitle">
          Load terraform show -json plan.out output and inspect changes
        </div>
      </header>

      <main>
        <section className="left-col">
          {/* Передаём новый колбэк */}
          <FileUploader onFileSelected={handleFileUpload} />

          <div className="panel">
            <h2>Summary</h2>
            <Summary
              summary={summary}
              total={normalized.length}
              terraformVersion={terraformVersion}
            />
          </div>

          <div className="panel">
            <h2>Resources</h2>
            <ResourceList items={normalized} onSelect={(it) => setSelected(it)} />
          </div>
        </section>

        <section className="right-col">
          <div className="panel">
            <h2>Details</h2>
            {details.length === 0 ? (
              <div>Wait file</div>
            ) : (
              <ul>
                <div>First 5 objects </div>
                {details.map((det: any, i: number) => (
                  <li key={i}>
                    {det.severity ?? "info"} — {det.summary ?? JSON.stringify(det)}
                  </li>
                ))}
              </ul>
            )}
            
          </div>

          <div className="panel">
            <h2>Diagnostics</h2>
            {diagnostics.length === 0 ? (
              <div>No diagnostics found</div>
            ) : (
              <ul>
                {diagnostics.map((d: any, i: number) => (
                  <li key={i}>
                    {d.severity ?? "info"} — {d.summary ?? JSON.stringify(d)}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="panel">
            <h2>Parser errors</h2>
            {errors.length === 0 ? (
              <div>None</div>
            ) : (
              <ul>
                {errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>

      <footer>
        MVP: summary, filters, raw diff. TODO: virtualize list, richer diff UI,
        diagnostics ranges & links, save filters to URL.
      </footer>
    </div>
  );
}