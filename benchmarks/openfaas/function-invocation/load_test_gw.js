import { check } from "k6";
import http from "k6/http";

import uuid from "./uuid.js";

export const options = {
  scenarios: {
    scenario1: {
      executor: "constant-arrival-rate",
      duration: "1m",
      rate: 65,
      timeUnit: "1s",
      preAllocatedVUs: 35,
      maxVUs: 60,
      exec: "scenario1",
      env: { FUNCTION: "fn-x" }
    }
  }
};

const hostUrl = __ENV.HOST_URL || "http://gateway.openfaas.svc.cluster.local:8080";
const url = `${hostUrl}/function`;

const workspaceId = __ENV.WORKSPACE_ID || "2JIryJwEQVBhtXihKzFarELIX7X";
const maxBatchSize = parseInt(__ENV.MAX_BATCH_SIZE || 10);

const base_msgs = JSON.parse(open("./base_msgs.json"));
const base_meta = JSON.parse(open("./base_meta.json"));
const base_dst = JSON.parse(open("./base_dst.json"));

export function setup() {
  const payloads = [];

  const baseMsgs = JSON.parse(JSON.stringify(base_msgs));
  const minMsgsPerBaseType = parseInt(maxBatchSize / baseMsgs.length, 10);

  for (let i = 0; i < baseMsgs.length; i += 1) {
    const msgDupCount =
      i === baseMsgs.length - 1
        ? minMsgsPerBaseType
        : maxBatchSize - payloads.length;

    for (let j = 0; j < msgDupCount; j += 1) {
      const msg = JSON.parse(JSON.stringify(baseMsgs[i]));

      const meta = JSON.parse(JSON.stringify(base_meta));
      meta.workspaceId = workspaceId;
      meta.sourceId = `s${i}`;
      meta.sourceDefinitionId = `sD${i}`;
      meta.sourceType = `sT${i}`;
      meta.destinationId = `d${i}`;
      meta.destinationDefinitionId = `dD${i}`;
      meta.destinationType = `dT${i}`;

      const dest = JSON.parse(JSON.stringify(base_dst));

      const payload = {};
      payload.message = msg;
      payload.metadata = meta;
      payload.destination = dest;

      payloads.push(payload);
    }
  }

  return { payloads };
}

export function scenario1(data) {
  const { payloads } = data;

  for (let j = 0; j < payloads.length; j += 1) {
    const uuid4 = uuid.v4();
    payloads[j].message.messageId = uuid4;
    payloads[j].metadata.messageId = uuid4;
    payloads[j].destination.Transformations[0].VersionID = __ENV.FUNCTION;
  }

  const functionUrl = `${url}/${__ENV.FUNCTION}`.trim();

  const response = http.post(functionUrl, JSON.stringify(payloads), {
    headers: { "Content-Type": "application/json" }
  });

  check(response, {
    "transformation success": r => {
      let allSuccess = true;

      // try {
      //   JSON.parse(r.body).forEach(tR => {
      //     if (tR.statusCode != 200) {
      //       allSuccess = false;
      //       throw Error();
      //     }
      //   });
      // } catch (error) {
      //   allSuccess = false;
      // }

      return allSuccess && r.status === 200;
    }
  });
}
