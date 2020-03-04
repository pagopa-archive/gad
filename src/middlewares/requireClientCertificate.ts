import * as express from "express";
import { pki } from "node-forge";
import { Logger } from "winston";

const CLIENT_CERTIFICATE_HEADER_NAME = "x-arr-clientcert";

// TODO: Add memoization
function isClientCertificateValid(
  caCertificateBase64: string,
  clientCertificateBase64: string,
  logger: Logger
): boolean {
  try {
    const caCertificate = pki.certificateFromPem(caCertificateBase64);
    const clientCertificate = pki.certificateFromPem(
      `-----BEGIN CERTIFICATE-----${clientCertificateBase64}-----END CERTIFICATE-----`
    );

    return caCertificate.verify(clientCertificate);
  } catch (e) {
    logger.debug(
      `Error verifying client certificate|CA_CERTIFICATE_BASE64=${caCertificateBase64}|CLIENT_CERTIFICATE_BASE64=${clientCertificateBase64}|ERROR=${e.message}`
    );
    return false;
  }
}

export function requireClientCertificate(
  caCertificateBase64: string,
  clientCertificateVerifiedHeader: string,
  logger: Logger
): express.Handler {
  return (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    const clientCertificateBase64 = req.get(CLIENT_CERTIFICATE_HEADER_NAME);

    if (
      clientCertificateBase64 !== undefined &&
      clientCertificateBase64 !== ""
    ) {
      if (
        !isClientCertificateValid(
          caCertificateBase64,
          clientCertificateBase64,
          logger
        )
      ) {
        logger.debug(
          `Invalid client certificate received|CLIENT_CERTIFICATE_BASE64=${clientCertificateBase64}`
        );
        res.status(403).send("Invalid client certificate");
      } else {
        // tslint:disable-next-line: no-object-mutation
        req.headers[clientCertificateVerifiedHeader] = "true";
        next();
      }
    } else {
      logger.debug("No client certificate received");
      res.status(403).send("Client certificate required");
    }
  };
}
