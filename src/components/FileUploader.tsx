import React from "react";

type Props = {
  onJsonLoaded: (obj: any) => void;
};
export default function FileUploader({ onFileSelected }: { onFileSelected: (file: File) => void }) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelected(e.target.files[0]);
    }
  };

  return (
    <div>
      <input type="file" accept=".json" onChange={handleChange} />
    </div>
  );
}