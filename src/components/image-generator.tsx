'use client';

import { useEffect, useState } from "react";

export default function GeneratePage() {
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState("");
  const [loading, setLoading] = useState(false);
  type HistoryImage = {
    id: string;
    imageUrl: string;
    prompt: string;
    createdAt: string;
  };
  const [history, setHistory] = useState<HistoryImage[]>([]); // เก็บภาพที่เคยเจน

  // ดึงประวัติรูปจาก API
  const loadHistory = async () => {
    const res = await fetch("/api/history");
    const data = await res.json();
    setHistory(data.images || []);
  };

  const generateImage = async () => {
    setLoading(true);
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });

    const data = await res.json();
    setImage(data.imageUrl);
    setLoading(false);
    loadHistory(); // รีโหลดรูปใหม่
  };

  useEffect(() => {
    loadHistory();
  }, []);

  return (
    <div className="p-10 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">IMAGE GENERATOR </h1>

      <input
        className="border p-2 w-full mb-4"
        placeholder="Enter prompt"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded"
        onClick={generateImage}
        disabled={loading}
      >
        {loading ? "Generating..." : "Generate"}
      </button>

      {image && (
        <div className="mt-6">
          <p className="text-sm text-gray-500 mb-2">Latest:</p>
          <img src={image} alt="Generated" className="rounded shadow-md w-full max-w-md" />
        </div>
      )}

      {/* แสดงภาพที่เคยเจน */}
      {history.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-bold mb-4">ALL IMAGES</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {history.map((img) => (
              <div key={img.id} className="border p-3 rounded shadow">
                <img src={img.imageUrl} alt={img.prompt} className="rounded mb-2" />
                <p className="text-sm font-medium">{img.prompt}</p>
                <p className="text-xs text-gray-500">{new Date(img.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
