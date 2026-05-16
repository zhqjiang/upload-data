export type ITask = [ITaskInfo, ITaskResult];

/**
 * 任务信息
 */
interface ITaskInfo {
  /**
   * 问卷版本
   */
  payload_digest: string;
  /**
   * 答题者ip地址
   */
  ip_address: string;
  /**
   * 答题者ID
   */
  task_id: string;
  /**
   * 受访者名字
   */
  task_name: string;
  /**
   * 受访者图片
   */
  task_photo: string;
  /**
   * 录音文件的地址列表
   */
  task_record: string[];
  /**
   * 录音文件上传后的key列表
   */
  task_record_keys?: string[];
  /**
   * 是否使用了录音
   */
  record_status: boolean;
  /**
   * 用户ID
   */
  user_id: number;
  /**
   * 收集器ID
   */
  collector_id: number;
  /**
   * 问卷ID
   */
  survey_id: string;
  /**
   * 创建时间
   */
  created_at: string;
  /**
   * 更新时间
   */
  updated_at?: string;
  /**
   * 甄别通过时间，有甄别节点时才需要
   */
  examined_at?: string;
  /**
   * 为了方便排查错误和遗漏数据的问题，数据上传到服务器后不再从本地删除，用此字段标记是否已经上传
   */
  uploadStatus: "not_uploaded" | "uploaded" | "upload_failed";
}

/**
 * 任务结果信息
 */
interface ITaskResult {
  /**
   * 用户id
   */
  user_id: number;
  /**
   * 收集器id
   */
  collector_id: number;
  /**
   * 收集器code
   */
  collector_code: string;
  /**
   * 问卷id
   */
  survey_id: string;
  /**
   * 问卷名称
   */
  survey_name: string;
  /**
   * 创建时间
   */
  // created_at: string;
  /**
   * 更新时间
   */
  updated_at?: string;
  /**
   * 甄别时间
   */
  examined_at?: string;
  /**
   * 问卷结果状态
   */
  status: string;
  /**
   * 样本 id
   */
  task_id: string;
  /**
   * 答题进度
   */
  progress: number;
  /**
   * 答题结果
   */
  result: CCIResult;
  /**
   * 节点列表
   */
  nodes: CCTaskNode[];
}
