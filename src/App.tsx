import { useEffect, useState, type ChangeEvent } from "react";
import "./App.css";
import { getStoredJwt, setStoredJwt } from "./os-api";
import type { ITask } from "./task";
import { uploadManually } from "./upload-manually";

const SUPPORTED_UPLOAD_STATUSES = [
  "created",
  "committed",
  "examine_passed",
  "examine_failed",
  "examine_skipped",
] as const;

const SUPPORTED_LANGUAGES = ["zh-CN", "en"] as const;
const DEFAULT_LANGUAGE = "zh-CN";
const LANGUAGE_STORAGE_KEY = "manual-upload-language";
const EMPTY_RECORD: Record<string, unknown> = {};

type SupportedUploadStatus = (typeof SUPPORTED_UPLOAD_STATUSES)[number];
type Language = (typeof SUPPORTED_LANGUAGES)[number];
type SummaryRowKey =
  | "taskName"
  | "taskId"
  | "surveyId"
  | "collectorCode"
  | "payloadDigest"
  | "uploadStatus"
  | "resultStatus"
  | "createdAt"
  | "updatedAt"
  | "examinedAt"
  | "answers"
  | "optionsDisplay"
  | "varMaps";
type ValidationError =
  | { type: "missingRequiredKey"; path: string }
  | { type: "missingRequiredForCommitted"; path: string }
  | { type: "missingRequiredForExamine"; path: string };
type AppMessage =
  | { type: "jwtSaved" }
  | { type: "jwtCleared" }
  | { type: "invalidTaskTuple" }
  | { type: "loadTaskBeforeUpload" }
  | { type: "uploading" }
  | { type: "uploadFinished" }
  | { type: "loadJsonFailed"; detail?: string }
  | { type: "uploadFailed"; detail?: string };

const COPY = {
  "zh-CN": {
    documentTitle: "手动上传",
    title: "手动上传",
    languageLabel: "语言",
    languages: {
      "zh-CN": "简体中文",
      en: "English",
    },
    fields: {
      jwt: "JWT",
      taskFile: "任务 JSON 文件",
    },
    placeholders: {
      jwt: "在这里粘贴 OS API JWT",
    },
    helperText: {
      selectedFile: "已选择文件",
      chooseFile:
        "请选择一个顶层结构为 `[taskInfo, taskResult]` 元组的 `.json` 文件。",
      validationHeading: "关键字段校验未通过：",
      emptyState: "暂未加载任务。选择一个 JSON 文件后，这里会显示上传元数据预览。",
    },
    actions: {
      saveJwt: "保存 JWT",
      upload: "上传",
    },
    summaryTitle: "已加载任务摘要",
    summaryLabels: {
      taskName: "任务名称",
      taskId: "任务 ID",
      surveyId: "问卷 ID",
      collectorCode: "采集器代码",
      payloadDigest: "Payload Digest",
      uploadStatus: "上传状态",
      resultStatus: "结果状态",
      createdAt: "创建时间",
      updatedAt: "更新时间",
      examinedAt: "审核时间",
      answers: "答案数",
      optionsDisplay: "展示选项数",
      varMaps: "变量映射数",
    },
    statusLabels: {
      created: "已创建",
      committed: "已提交",
      examine_passed: "审核通过",
      examine_failed: "审核失败",
      examine_skipped: "跳过审核",
    },
    messages: {
      jwtSaved: "JWT 已保存在本地。",
      jwtCleared: "JWT 已清空。",
      invalidTaskTuple:
        "所选 JSON 的顶层结构必须是 `[taskInfo, taskResult]` 元组。",
      loadTaskBeforeUpload: "请先加载一个有效的 JSON 任务文件再上传。",
      uploading: "正在上传...",
      uploadFinished: "上传完成。",
      loadJsonFailed: "无法加载 JSON 文件",
      uploadFailed: "上传失败",
    },
    validationMessages: {
      missingRequiredKey: "缺少必需字段",
      missingRequiredForCommitted: "已提交状态缺少必需字段",
      missingRequiredForExamine: "审核状态缺少必需字段",
    },
    emptyValue: "—",
  },
  en: {
    documentTitle: "Manual Upload",
    title: "Manual Upload",
    languageLabel: "Language",
    languages: {
      "zh-CN": "简体中文",
      en: "English",
    },
    fields: {
      jwt: "JWT",
      taskFile: "Task JSON File",
    },
    placeholders: {
      jwt: "Paste OS API JWT here",
    },
    helperText: {
      selectedFile: "Selected file",
      chooseFile:
        "Choose a `.json` file with a top-level `[taskInfo, taskResult]` tuple.",
      validationHeading: "Essential key check failed:",
      emptyState:
        "No task loaded yet. Select a JSON file to preview its upload metadata here.",
    },
    actions: {
      saveJwt: "Save JWT",
      upload: "Upload",
    },
    summaryTitle: "Loaded Task Summary",
    summaryLabels: {
      taskName: "Task Name",
      taskId: "Task ID",
      surveyId: "Survey ID",
      collectorCode: "Collector Code",
      payloadDigest: "Payload Digest",
      uploadStatus: "Upload Status",
      resultStatus: "Result Status",
      createdAt: "Created At",
      updatedAt: "Updated At",
      examinedAt: "Examined At",
      answers: "Answers",
      optionsDisplay: "Options Display",
      varMaps: "Var Maps",
    },
    statusLabels: {
      created: "Created",
      committed: "Committed",
      examine_passed: "Examine Passed",
      examine_failed: "Examine Failed",
      examine_skipped: "Examine Skipped",
    },
    messages: {
      jwtSaved: "JWT saved locally.",
      jwtCleared: "JWT cleared.",
      invalidTaskTuple:
        "Selected JSON must be a top-level [taskInfo, taskResult] tuple.",
      loadTaskBeforeUpload: "Load a valid JSON task file before uploading.",
      uploading: "Uploading...",
      uploadFinished: "Upload finished.",
      loadJsonFailed: "Unable to load JSON file",
      uploadFailed: "Upload failed",
    },
    validationMessages: {
      missingRequiredKey: "Missing required key",
      missingRequiredForCommitted:
        "Missing required key for committed upload",
      missingRequiredForExamine: "Missing required key for examine upload",
    },
    emptyValue: "—",
  },
} as const;

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

function isLanguage(value: string | null): value is Language {
  return (
    typeof value === "string" &&
    (SUPPORTED_LANGUAGES as readonly string[]).includes(value)
  );
}

function getStoredLanguage(): Language {
  if (typeof window === "undefined") {
    return DEFAULT_LANGUAGE;
  }

  try {
    const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isLanguage(storedLanguage) ? storedLanguage : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

function setStoredLanguage(language: Language) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Ignore storage failures so the UI remains usable.
  }
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
  const uploadStatus = taskInfo.uploadStatus;
  const errors: ValidationError[] = [];

  if (!getStringValue(taskInfo, "task_name")) {
    errors.push({
      type: "missingRequiredKey",
      path: "task[0].task_name",
    });
  }
  if (!getStringValue(taskInfo, "created_at")) {
    errors.push({
      type: "missingRequiredKey",
      path: "task[0].created_at",
    });
  }
  if (!getStringValue(taskInfo, "payload_digest")) {
    errors.push({
      type: "missingRequiredKey",
      path: "task[0].payload_digest",
    });
  }
  if (!getStringValue(taskResult, "collector_code")) {
    errors.push({
      type: "missingRequiredKey",
      path: "task[1].collector_code",
    });
  }
  if (!result) {
    errors.push({
      type: "missingRequiredKey",
      path: "task[1].result",
    });
    return errors;
  }

  if (!Array.isArray(result.options_display_info)) {
    errors.push({
      type: "missingRequiredKey",
      path: "task[1].result.options_display_info",
    });
  }
  if (!isRecord(result.query_params)) {
    errors.push({
      type: "missingRequiredKey",
      path: "task[1].result.query_params",
    });
  }
  if (!Array.isArray(result.var_map_info)) {
    errors.push({
      type: "missingRequiredKey",
      path: "task[1].result.var_map_info",
    });
  }
  if (typeof result.time_consuming !== "number") {
    errors.push({
      type: "missingRequiredKey",
      path: "task[1].result.time_consuming",
    });
  }
  if (!Array.isArray(result.answers)) {
    errors.push({
      type: "missingRequiredKey",
      path: "task[1].result.answers",
    });
  }

  if (
    uploadStatus === "committed" &&
    !getStringValue(taskResult, "updated_at")
  ) {
    errors.push({
      type: "missingRequiredForCommitted",
      path: "task[1].updated_at",
    });
  }

  if (
    (uploadStatus === "examine_passed" ||
      uploadStatus === "examine_failed" ||
      uploadStatus === "examine_skipped") &&
    !getStringValue(taskInfo, "examined_at")
  ) {
    errors.push({
      type: "missingRequiredForExamine",
      path: "task[0].examined_at",
    });
  }

  return errors;
}

function formatUploadStatus(language: Language, status: unknown) {
  if (isSupportedUploadStatus(status)) {
    return COPY[language].statusLabels[status];
  }

  return typeof status === "string" && status.trim()
    ? status
    : COPY[language].emptyValue;
}

function getSummaryRows(task: ITask, language: Language) {
  const [taskInfo, taskResult] = task as unknown as [
    Record<string, unknown>,
    Record<string, unknown>,
  ];
  const result = isRecord(taskResult.result) ? taskResult.result : undefined;
  const emptyValue = COPY[language].emptyValue;

  return [
    {
      key: "taskName" as const,
      value: getStringValue(taskInfo, "task_name") ?? emptyValue,
    },
    {
      key: "taskId" as const,
      value: getStringValue(taskInfo, "task_id") ?? emptyValue,
    },
    {
      key: "surveyId" as const,
      value: getStringValue(taskInfo, "survey_id") ?? emptyValue,
    },
    {
      key: "collectorCode" as const,
      value: getStringValue(taskResult, "collector_code") ?? emptyValue,
    },
    {
      key: "payloadDigest" as const,
      value: getStringValue(taskInfo, "payload_digest") ?? emptyValue,
    },
    {
      key: "uploadStatus" as const,
      value: formatUploadStatus(language, taskInfo.uploadStatus),
    },
    {
      key: "resultStatus" as const,
      value:
        result && typeof result.status === "string" && result.status.trim()
          ? result.status
          : emptyValue,
    },
    {
      key: "createdAt" as const,
      value: getStringValue(taskInfo, "created_at") ?? emptyValue,
    },
    {
      key: "updatedAt" as const,
      value: getStringValue(taskResult, "updated_at") ?? emptyValue,
    },
    {
      key: "examinedAt" as const,
      value: getStringValue(taskInfo, "examined_at") ?? emptyValue,
    },
    {
      key: "answers" as const,
      value: String(getArrayValue(result ?? EMPTY_RECORD, "answers")?.length ?? 0),
    },
    {
      key: "optionsDisplay" as const,
      value: String(
        getArrayValue(result ?? EMPTY_RECORD, "options_display_info")?.length ?? 0
      ),
    },
    {
      key: "varMaps" as const,
      value: String(
        getArrayValue(result ?? EMPTY_RECORD, "var_map_info")?.length ?? 0
      ),
    },
  ] satisfies Array<{ key: SummaryRowKey; value: string }>;
}

function formatValidationError(language: Language, error: ValidationError) {
  const copy = COPY[language];

  switch (error.type) {
    case "missingRequiredKey":
      return `${copy.validationMessages.missingRequiredKey}: ${error.path}`;
    case "missingRequiredForCommitted":
      return `${copy.validationMessages.missingRequiredForCommitted}: ${error.path}`;
    case "missingRequiredForExamine":
      return `${copy.validationMessages.missingRequiredForExamine}: ${error.path}`;
  }
}

function formatMessage(language: Language, message: AppMessage) {
  const copy = COPY[language];

  switch (message.type) {
    case "jwtSaved":
      return copy.messages.jwtSaved;
    case "jwtCleared":
      return copy.messages.jwtCleared;
    case "invalidTaskTuple":
      return copy.messages.invalidTaskTuple;
    case "loadTaskBeforeUpload":
      return copy.messages.loadTaskBeforeUpload;
    case "uploading":
      return copy.messages.uploading;
    case "uploadFinished":
      return copy.messages.uploadFinished;
    case "loadJsonFailed":
      return message.detail
        ? `${copy.messages.loadJsonFailed}: ${message.detail}`
        : copy.messages.loadJsonFailed;
    case "uploadFailed":
      return message.detail
        ? `${copy.messages.uploadFailed}: ${message.detail}`
        : copy.messages.uploadFailed;
  }
}

function isErrorMessage(message: AppMessage) {
  return (
    message.type === "invalidTaskTuple" ||
    message.type === "loadTaskBeforeUpload" ||
    message.type === "loadJsonFailed" ||
    message.type === "uploadFailed"
  );
}

function App() {
  const [language, setLanguage] = useState<Language>(() => getStoredLanguage());
  const [jwt, setJwt] = useState(() => getStoredJwt());
  const [message, setMessage] = useState<AppMessage | null>(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [task, setTask] = useState<ITask | null>(null);
  const [fileError, setFileError] = useState<AppMessage | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>(
    []
  );

  const copy = COPY[language];
  const hasJwt = jwt.trim().length > 0;
  const canUpload = hasJwt && task !== null && validationErrors.length === 0;

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = copy.documentTitle;
    setStoredLanguage(language);
  }, [copy.documentTitle, language]);

  const handleSave = () => {
    setStoredJwt(jwt);
    setMessage({ type: jwt.trim() ? "jwtSaved" : "jwtCleared" });
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    setMessage(null);

    if (!file) {
      setSelectedFileName("");
      setTask(null);
      setFileError(null);
      setValidationErrors([]);
      return;
    }

    setSelectedFileName(file.name);

    try {
      const fileText = await file.text();
      const parsedJson: unknown = JSON.parse(fileText);

      if (!isTaskTuple(parsedJson)) {
        setTask(null);
        setFileError({ type: "invalidTaskTuple" });
        setValidationErrors([]);
        return;
      }

      const nextTask = parsedJson;
      const nextValidationErrors = validateTask(nextTask);

      setTask(nextTask);
      setFileError(null);
      setValidationErrors(nextValidationErrors);
    } catch (error) {
      setTask(null);
      setFileError({
        type: "loadJsonFailed",
        detail: error instanceof Error ? error.message : undefined,
      });
      setValidationErrors([]);
    }
  };

  const handleUpload = async () => {
    if (!task) {
      setMessage({ type: "loadTaskBeforeUpload" });
      return;
    }

    try {
      setStoredJwt(jwt);
      setMessage({ type: "uploading" });
      await uploadManually(task);
      setMessage({ type: "uploadFinished" });
    } catch (error) {
      setMessage({
        type: "uploadFailed",
        detail: error instanceof Error ? error.message : undefined,
      });
    }
  };

  return (
    <main className="app-shell">
      <section className="panel">
        <div className="panel-grid">
          <section className="panel-section">
            <div className="panel-header">
              <h1>{copy.title}</h1>
              <div className="language-switcher">
                <span>{copy.languageLabel}</span>
                <div className="language-buttons">
                  {SUPPORTED_LANGUAGES.map((nextLanguage) => (
                    <button
                      key={nextLanguage}
                      type="button"
                      className={language === nextLanguage ? "is-active" : ""}
                      onClick={() => setLanguage(nextLanguage)}
                      aria-pressed={language === nextLanguage}
                    >
                      {copy.languages[nextLanguage]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <label className="field">
              <span>{copy.fields.jwt}</span>
              <textarea
                className="jwt-input"
                value={jwt}
                onChange={(event) => setJwt(event.target.value)}
                placeholder={copy.placeholders.jwt}
                rows={6}
              />
            </label>

            <label className="field">
              <span>{copy.fields.taskFile}</span>
              <input
                className="file-input"
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
              />
            </label>

            {selectedFileName ? (
              <p className="meta-text">
                {copy.helperText.selectedFile}: {selectedFileName}
              </p>
            ) : (
              <p className="meta-text">{copy.helperText.chooseFile}</p>
            )}

            <div className="actions">
              <button type="button" onClick={handleSave}>
                {copy.actions.saveJwt}
              </button>
              <button type="button" onClick={handleUpload} disabled={!canUpload}>
                {copy.actions.upload}
              </button>
            </div>

            {fileError ? (
              <p className="message error">{formatMessage(language, fileError)}</p>
            ) : null}
            {validationErrors.length > 0 ? (
              <div className="message error">
                <p>{copy.helperText.validationHeading}</p>
                <ul className="error-list">
                  {validationErrors.map((error) => {
                    const renderedError = formatValidationError(language, error);
                    return <li key={renderedError}>{renderedError}</li>;
                  })}
                </ul>
              </div>
            ) : null}
            {message ? (
              <p className={`message ${isErrorMessage(message) ? "error" : ""}`}>
                {formatMessage(language, message)}
              </p>
            ) : null}
          </section>

          <section className="panel-section preview-panel">
            <h2>{copy.summaryTitle}</h2>
            {task ? (
              <dl className="summary-grid">
                {getSummaryRows(task, language).map((row) => (
                  <div key={row.key} className="summary-item">
                    <dt>{copy.summaryLabels[row.key]}</dt>
                    <dd>{row.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <div className="empty-state">{copy.helperText.emptyState}</div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

export default App;
