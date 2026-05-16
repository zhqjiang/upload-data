import type { ITask } from "./task";

export const exampleJsonData: ITask = [
  {
    task_id: "3dce62f2-4150-4791-ae0e-61f46b8c6fe4",
    task_name: "w",
    task_photo: "",
    task_record: [],
    record_status: false,
    user_id: 458,
    collector_id: 12990,
    survey_id: "7e349386-65da-414c-9ee9-453ba51d4e25",
    created_at: "2025-09-30T05:31:57.697Z",
    uploadStatus: "not_uploaded",
    ip_address: "0.0.0.0",
    payload_digest: "a51d4e25-20250930-053135-uRYWMn6l",
  },
  {
    user_id: 458,
    collector_id: 12990,
    collector_code: "7wIQfQCt",
    survey_id: "7e349386-65da-414c-9ee9-453ba51d4e25",
    survey_name: "simple",
    updated_at: "2025-09-30T05:31:57.710Z",
    task_id: "3dce62f2-4150-4791-ae0e-61f46b8c6fe4",
    progress: 0,
    status: "offline",
    result: {
      backend_request_params: {},
      webhook_params: {},
      answers: [
        {
          type: "select",
          node_id: "8a635bac-3aec-47dc-8eee-37700f491600",
          items: [
            {
              value: "",
              other: false,
              type: "option",
              option_id: "e568274d-26e4-468a-8067-18b8bfc8c262",
              content: "男",
            },
          ],
          start_time: "2025-09-30T05:31:56.277Z",
          cost_time: 1178,
          loop_ctxs: [],
        },
        {
          type: "end",
          node_id: "46a62746-4415-4922-abc7-5dc52070bb9b",
          start_time: "2025-09-30T05:31:57.665Z",
          cost_time: 0,
        },
      ],
      var_map_info: [],
      options_display_info: [],
      query_params: {
        offline_task_id: "3dce62f2-4150-4791-ae0e-61f46b8c6fe4",
        offline_survey_id: "7e349386-65da-414c-9ee9-453ba51d4e25",
        sid: "7wIQfQCt",
      },
      time_consuming: 2,
      status: "committed",
    },
    nodes: [
      { title: "simple", description: "" },
      {
        title: "您的性别?",
        description: "",
        value: "",
        options: [{ text: "男", value: "" }],
      },
      { title: "谢谢您的参与", description: "", value: "", options: [] },
    ],
  },
];
