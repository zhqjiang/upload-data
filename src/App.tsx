import "./App.css";
import { uploadManually } from "./upload-manually";

function App() {
  const handleUpload = () => {
    uploadManually();
  };
  return (
    <>
      <button type="button" onClick={handleUpload}>
        upload
      </button>
    </>
  );
}

export default App;
