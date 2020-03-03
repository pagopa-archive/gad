import * as express from "express";
import { pki } from "node-forge";

const CLIENT_CERTIFICATE_HEADER_NAME = "x-arr-clientcert";

// TODO: Add memoization
function isClientCertificateValid(
  caCertificateBase64: string,
  clientCertificateBase64: string
): boolean {
  try {
    const caCertificate = pki.certificateFromPem(caCertificateBase64);
    const clientCertificate = pki.certificateFromPem(
      `-----BEGIN CERTIFICATE-----${clientCertificateBase64}-----END CERTIFICATE-----`
    );

    return caCertificate.verify(clientCertificate);
  } catch (e) {
    return false;
  }
}

export function requireClientCertificate(
  caCertificateBase64: string,
  clientCertificateVerifiedHeader: string
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
        !isClientCertificateValid(caCertificateBase64, clientCertificateBase64)
      ) {
        res.status(403).send("Invalid client certificate");
      } else {
        // tslint:disable-next-line: no-object-mutation
        req.headers[clientCertificateVerifiedHeader] = "true";
        next();
      }
    } else {
      res.status(403).send("Client certificate required");
    }
  };
}
