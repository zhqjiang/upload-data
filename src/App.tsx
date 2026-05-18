import { useState, type ChangeEvent } from "react";
import "./App.css";
import { getStoredJwt, setStoredJwt } from "./os-api";
import { uploadManually } from "./upload-manually";
import type { ITask } from "./task";

const SUPPORTED_UPLOAD_STATUSES = [
  "created",
  "committed",
  "examine_passed",
  "examine_failed",
  "examine_skipped",
] as const;

type SupportedUploadStatus = (typeof SUPPORTED_UPLOAD_STATUSES)[number];
const EMPTY_RECORD: Record<string, unknown> = {};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTaskTuple(value: unknown): value is ITask {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    isRecord(value[0]) &&
    isRecord(value[1])
  );
}

function getStringValue(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function getArrayValue(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return Array.isArray(value) ? value : undefined;
}

function isSupportedUploadStatus(
  status: unknown
): status is SupportedUploadStatus {
  return (
    typeof status === "string" &&
    (SUPPORTED_UPLOAD_STATUSES as readonly string[]).includes(status)
  );
}

function validateTask(task: ITask) {
  const [taskInfo, taskResult] = task as unknown as [
    Record<string, unknown>,
    Record<string, unknown>,
  ];
  const result = isRecord(taskResult.result) ? taskResult.result : undefined;
  const errors: string[] = [];

  if (!getStringValue(taskInfo, "task_name")) {
    errors.push("Missing required key: task[0].task_name");
  }
  if (!getStringValue(taskInfo, "created_at")) {
    errors.push("Missing required key: task[0].created_at");
  }
  if (!getStringValue(taskInfo, "payload_digest")) {
    errors.push("Missing required key: task[0].payload_digest");
  }
  if (!getStringValue(taskResult, "collector_code")) {
    errors.push("Missing required key: task[1].collector_code");
  }
  if (!result) {
    errors.push("Missing required key: task[1].result");
    return errors;
  }

  if (!Array.isArray(result.options_display_info)) {
    errors.push("Missing required key: task[1].result.options_display_info");
  }
  if (!isRecord(result.query_params)) {
    errors.push("Missing required key: task[1].result.query_params");
  }
  if (!Array.isArray(result.var_map_info)) {
    errors.push("Missing required key: task[1].result.var_map_info");
  }
  if (typeof result.time_consuming !== "number") {
    errors.push("Missing required key: task[1].result.time_consuming");
  }
  if (!Array.isArray(result.answers)) {
    errors.push("Missing required key: task[1].result.answers");
  }

  if (status === "committed" && !getStringValue(taskResult, "updated_at")) {
    errors.push("Missing required key for committed upload: task[1].updated_at");
  }

  if (
    (status === "examine_passed" ||
      status === "examine_failed" ||
      status === "examine_skipped") &&
    !getStringValue(taskInfo, "examined_at")
  ) {
    errors.push("Missing required key for examine upload: task[0].examined_at");
  }

  return errors;
}

function getSummaryRows(task: ITask) {
  const [taskInfo, taskResult] = task as unknown as [
    Record<string, unknown>,
    Record<string, unknown>,
  ];
  const result = isRecord(taskResult.result) ? taskResult.result : undefined;

  return [
    { label: "Task Name", value: getStringValue(taskInfo, "task_name") ?? "—" },
    { label: "Task ID", value: getStringValue(taskInfo, "task_id") ?? "—" },
    { label: "Survey ID", value: getStringValue(taskInfo, "survey_id") ?? "—" },
    {
      label: "Collector Code",
      value: getStringValue(taskResult, "collector_code") ?? "—",
    },
    {
      label: "Payload Digest",
      value: getStringValue(taskInfo, "payload_digest") ?? "—",
    },
    {
      label: "Upload Status",
      value: getStringValue(taskInfo, "uploadStatus") ?? "—",
    },
    {
      label: "Result Status",
      value:
        result && typeof result.status === "string" ? result.status : "—",
    },
    {
      label: "Created At",
      value: getStringValue(taskInfo, "created_at") ?? "—",
    },
    {
      label: "Updated At",
      value: getStringValue(taskResult, "updated_at") ?? "—",
    },
    {
      label: "Examined At",
      value: getStringValue(taskInfo, "examined_at") ?? "—",
    },
    {
      label: "Answers",
      value: String(getArrayValue(result ?? EMPTY_RECORD, "answers")?.length ?? 0),
    },
    {
      label: "Options Display",
      value: String(
        getArrayValue(result ?? EMPTY_RECORD, "options_display_info")?.length ?? 0
      ),
    },
    {
      label: "Var Maps",
      value: String(
        getArrayValue(result ?? EMPTY_RECORD, "var_map_info")?.length ?? 0
      ),
    },
  ];
}

function App() {
  const [jwt, setJwt] = useState(() => getStoredJwt());
  const [message, setMessage] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");
  const [task, setTask] = useState<ITask | null>(null);
  const [fileError, setFileError] = useState("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const hasJwt = jwt.trim().length > 0;
  const canUpload = hasJwt && task !== null && validationErrors.length === 0;

  const handleSave = () => {
    setStoredJwt(jwt);
    setMessage(jwt.trim() ? "JWT saved locally." : "JWT cleared.");
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    setMessage("");

    if (!file) {
      setSelectedFileName("");
      setTask(null);
      setFileError("");
      setValidationErrors([]);
      return;
    }

    setSelectedFileName(file.name);

    try {
      const fileText = await file.text();
      const parsedJson: unknown = JSON.parse(fileText);

      if (!isTaskTuple(parsedJson)) {
        setTask(null);
        setFileError(
          "Selected JSON must be a top-level [taskInfo, taskResult] tuple."
        );
        setValidationErrors([]);
        return;
      }

      const nextTask = parsedJson;
      const nextValidationErrors = validateTask(nextTask);

      setTask(nextTask);
      setFileError("");
      setValidationErrors(nextValidationErrors);
    } catch (error) {
      setTask(null);
      setFileError(
        error instanceof Error
          ? `Unable to load JSON file: ${error.message}`
          : "Unable to load JSON file."
      );
      setValidationErrors([]);
    }
  };

  const handleUpload = async () => {
    if (!task) {
      setMessage("Load a valid JSON task file before uploading.");
      return;
    }

    try {
      setStoredJwt(jwt);
      setMessage("Uploading...");
      await uploadManually(task);
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
        <div className="panel-grid">
          <section className="panel-section">
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

            <label className="field">
              <span>Task JSON File</span>
              <input
                className="file-input"
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
              />
            </label>

            {selectedFileName ? (
              <p className="meta-text">Selected file: {selectedFileName}</p>
            ) : (
              <p className="meta-text">
                Choose a `.json` file with a top-level `[taskInfo, taskResult]`
                tuple.
              </p>
            )}

            <div className="actions">
              <button type="button" onClick={handleSave}>
                Save JWT
              </button>
              <button type="button" onClick={handleUpload} disabled={!canUpload}>
                Upload
              </button>
            </div>

            {fileError ? <p className="message error">{fileError}</p> : null}
            {validationErrors.length > 0 ? (
              <div className="message error">
                <p>Essential key check failed:</p>
                <ul className="error-list">
                  {validationErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {message ? <p className="message">{message}</p> : null}
          </section>

          <section className="panel-section preview-panel">
            <h2>Loaded Task Summary</h2>
            {task ? (
              <dl className="summary-grid">
                {getSummaryRows(task).map((row) => (
                  <div key={row.label} className="summary-item">
                    <dt>{row.label}</dt>
                    <dd>{row.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <div className="empty-state">
                No task loaded yet. Select a JSON file to preview its upload
                metadata here.
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

export default App;
