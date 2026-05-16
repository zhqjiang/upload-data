import type {
  IUploadCommittedOfflineResponseParams,
  IUploadCreatedOfflineResponseParams,
  IUploadOtherOfflineResponseParams,
} from "@choiceform/os-api";
import type { ITask } from "./task";
import { getOsApi } from "./os-api";

const UPLOADABLE_STATUSES = [
  "created",
  "committed",
  "examine_passed",
  "examine_failed",
  "examine_skipped",
] as const;

type UploadableStatus = (typeof UPLOADABLE_STATUSES)[number];

function isUploadableStatus(status: string): status is UploadableStatus {
  return (UPLOADABLE_STATUSES as readonly string[]).includes(status);
}

async function formatParamsWithoutUploading(task: ITask) {
  const [taskInfo, taskResult] = task;
  const { task_name, created_at, payload_digest, examined_at } = taskInfo;

  const newResult = taskResult.result;
  const status = newResult.status;

  if (!isUploadableStatus(status)) {
    throw new Error(`Unsupported upload status: ${status}`);
  }

  const commitParams = {
    // 提交时的常规属性
    status,
    created_at,
    options_display_info: newResult.options_display_info,
    query_params: newResult.query_params,
    var_map_info: newResult.var_map_info,
    cost_time: newResult.time_consuming,
    answers: newResult.answers,

    // 离线端特有属性
    code: taskResult.collector_code,
    payload_digest,
    recording_res_keys: [] as string[],
    img_res_key: "",
    remark: task_name,
  };

  switch (commitParams.status) {
    case "created": {
      // 未完成回复仍要提交的，不包括通过了甄别节点的
      return {
        ...commitParams,
        status: commitParams.status,
      } satisfies IUploadCreatedOfflineResponseParams;
    }
    case "committed": {
      // 完成回复的
      return {
        ...commitParams,
        committed_at: taskResult.updated_at!,
        examined_at,
        status: commitParams.status,
      } satisfies IUploadCommittedOfflineResponseParams;
    }
    default: {
      // 通过了甄别节点但还未完成的，没有配额或者配额检查通过是 examine_passed
      return {
        ...commitParams,
        examined_at: examined_at!,
        status: commitParams.status,
      } satisfies IUploadOtherOfflineResponseParams;
    }
  }
}

export async function uploadManually(task: ITask) {
  const params = await formatParamsWithoutUploading(task);
  const api = await getOsApi();
  return api.response.upload(params);
}
