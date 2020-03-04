import * as dotenv from "dotenv";
import * as express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

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
    logProvider: () => logger
    // tslint:enable: object-literal-sort-keys
  })
);

app.listen(process.env.PORT || 80);