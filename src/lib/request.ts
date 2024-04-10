import { createAlova } from "alova";
import ReactHook from "alova/react";
import GlobalFetch from "alova/GlobalFetch";
import mockAdapter from "@/mock";
import qs from "qs";
import { tryParseHydroResponse } from "./error";

const BASE_URL = process.env.API_BASE_URL ?? "/api";
const DISABLE_CACHE = process.env.DISABLE_CACHE === "true";
const IS_DEV = process.env.NODE_ENV === "development";
const NEED_MOCK = IS_DEV || process.env.NEED_MOCK === "true"; // DEV环境下默认启用Mock，或者也可以手动启用（用于Vercel）

export interface AlovaResponse<T = Hydro.HydroResponse> {
  status: number;
  statusText: string;
  header: Headers;
  data: T;
}

export const alovaInstance = createAlova({
  baseURL: BASE_URL,
  statesHook: ReactHook,
  timeout: 1000,
  localCache: DISABLE_CACHE ? null : { GET: 60000 },
  requestAdapter: NEED_MOCK ? mockAdapter : GlobalFetch(),
  // requestAdapter: mockAdapter, // FIXME： 由于跨域没有配置好 先全部使用mock
  beforeRequest(method) {
    // 缺省状态下默认添加 Accept: application/json
    const acc = method.config.headers["Accept"];
    if (!acc) method.config.headers["Accept"] = "application/json";
  },
  async responded(resp) {
    // 添加全局响应劫持器 处理响应并抛出错误（使其可以正常与缓存机制运作）
    const data = await tryParseHydroResponse(resp);

    // 尝试解析UserContext
    if (data?.UserContext) {
      try {
        data.UserContext = JSON.parse(data.UserContext);
      } catch (e) {
        console.error(e);
        data.UserContext = null;
      }
    }
    const _resp: AlovaResponse = {
      status: resp.status,
      statusText: resp.statusText,
      header: resp.headers,
      data,
    };
    return _resp;
  },
});

export const request = {
  get: <T = Hydro.HydroResponse>(...args: Parameters<typeof alovaInstance.Get<AlovaResponse<T>>>) => {
    const [url, config = {}] = args;
    return alovaInstance.Get(url, {
      ...config,
      headers: {
        Accept: "application/json",
        ...(config.headers ?? {}),
      },
      mode: "cors",
    });
  },
  post: <T = Hydro.HydroResponse>(...args: Parameters<typeof alovaInstance.Post<AlovaResponse<T>>>) => {
    let [url, data, config = {}] = args;
    let contentType = config.headers?.["Content-Type"] ?? "application/x-www-form-urlencoded";
    if (data instanceof FormData) contentType = "multipart/form-data";
    if (contentType === "application/x-www-form-urlencoded") {
      data = qs.stringify(data);
    }
    return alovaInstance.Post(url, data, {
      ...config,
      headers: {
        Accept: "application/json",
        "Content-Type": contentType,
        ...(config.headers ?? {}),
      },
      mode: "cors",
    });
  },
};
