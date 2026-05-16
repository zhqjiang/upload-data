import axios from "axios";

export function getOptions() {
  const host = "https://osapi.choiceform.com";
  // const host = "/api";

  const instance = axios.create({});

  const options = {
    host,
    request: async <T, U>(params: IRequestParams<U>): Promise<T> => {
      let resp;
      if (params.method === "GET") {
        const data = params.data;
        delete params.data;
        const opt = {
          ...params,
          params: data,
        };
        resp = await instance(opt);
      } else {
        resp = await instance(params);
      }
      return resp.data;
    },
  };
  return options;
}

export async function getOsApi() {
  const jwt = await getJwt();
  const api = new OSApi(jwt, getOptions());
  return api;
}
