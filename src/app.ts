import dotenv from "dotenv";
import express, { Request, Response } from "express";
import { ClientRequest } from "http";
import { createProxyMiddleware } from "http-proxy-middleware";
import querystring from "querystring";

import { makeGetRequiredENVVar } from "./envs";
import { logger } from "./logs";
import { requireClientCertificate } from "./middlewares/requireClientCertificate";

dotenv.config();

const getRequiredENVVar = makeGetRequiredENVVar(logger);

const CA_CERTIFICATE_BASE64 = getRequiredENVVar("GAD_CA_CERTIFICATE_BASE64");
const CLIENT_CERTIFICATE_VERIFIED_HEADER = getRequiredENVVar(
  "GAD_CLIENT_CERTIFICATE_VERIFIED_HEADER"
);
const PROXY_TARGET = getRequiredENVVar("GAD_PROXY_TARGET");
const PROXY_CHANGE_ORIGIN =
  getRequiredENVVar("GAD_PROXY_CHANGE_ORIGIN") === "true";

function roundrobin(ips: ReadonlyArray<string>): () => string {
  // tslint:disable-next-line: no-let
  let index = 0;

  return () => {
    if (index >= ips.length) {
      index = 0;
    }
    return ips[index++];
  };
}

const app = express();

app.use(
  requireClientCertificate(
    CA_CERTIFICATE_BASE64,
    CLIENT_CERTIFICATE_VERIFIED_HEADER,
    logger
  )
);

app.use(
  createProxyMiddleware({
    // tslint:disable: object-literal-sort-keys
    target: PROXY_TARGET,
    changeOrigin: PROXY_CHANGE_ORIGIN,
    logProvider: () => logger,
    onProxyReq: (proxyReq: ClientRequest, req: Request, res: Response) => {
      if (!req.body || !Object.keys(req.body).length) {
        return;
      }

      const contentType = proxyReq.getHeader("Content-Type");
      const writeBody = (bodyData: string) => {
        proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      };

      if (contentType === "application/json") {
        writeBody(JSON.stringify(req.body));
      }

      if (contentType === "application/x-www-form-urlencoded") {
        writeBody(querystring.stringify(req.body));
      }
    }
    // tslint:enable: object-literal-sort-keys
  })
);

app.listen(process.env.PORT || 80);
