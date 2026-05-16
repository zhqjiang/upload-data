import OSApi, { type IRequestParams } from "@choiceform/os-api";
import axios from "axios";

const JWT_STORAGE_KEY = "os-api-jwt";

export function getStoredJwt() {
  if (typeof localStorage === "undefined") {
    return "";
  }

  return localStorage.getItem(JWT_STORAGE_KEY) ?? "";
}

export function setStoredJwt(jwt: string) {
  if (typeof localStorage === "undefined") {
    return;
  }

  const trimmedJwt = jwt.trim();
  if (trimmedJwt) {
    localStorage.setItem(JWT_STORAGE_KEY, trimmedJwt);
    return;
  }

  localStorage.removeItem(JWT_STORAGE_KEY);
}

async function getJwt() {
  const jwt = getStoredJwt();

  if (!jwt) {
    throw new Error("Missing OS API JWT. Enter one in the app first.");
  }

  return jwt;
}

export function getOptions() {
  const host = "https://osapi.choiceform.com";

  const instance = axios.create({});

  const options = {
    host,
    request: async <T, U>(params: IRequestParams<U>): Promise<T> => {
      let resp;
      if (params.method === "GET") {
        const { data, ...rest } = params;
        const opt = {
          ...rest,
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
