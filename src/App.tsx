import { useState } from "react";
import "./App.css";
import { getStoredJwt, setStoredJwt } from "./os-api";
import { uploadManually } from "./upload-manually";

function App() {
  const [jwt, setJwt] = useState(() => getStoredJwt());
  const [message, setMessage] = useState("");

  const handleSave = () => {
    setStoredJwt(jwt);
    setMessage(jwt.trim() ? "JWT saved locally." : "JWT cleared.");
  };

  const handleUpload = async () => {
    try {
      setStoredJwt(jwt);
      setMessage("Uploading...");
      await uploadManually();
      setMessage("Upload finished.");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Upload failed.";
      setMessage(errorMessage);
    }
  };

  return (
    <main className="app-shell">
      <section className="panel">
        <h1>Manual Upload</h1>
        <label className="field">
          <span>JWT</span>
          <textarea
            className="jwt-input"
            value={jwt}
            onChange={(event) => setJwt(event.target.value)}
            placeholder="Paste OS API JWT here"
            rows={6}
          />
        </label>
        <div className="actions">
          <button type="button" onClick={handleSave}>
            Save JWT
          </button>
          <button type="button" onClick={handleUpload}>
            Upload
          </button>
        </div>
        {message ? <p className="message">{message}</p> : null}
      </section>
    </main>
  );
}

export default App;
