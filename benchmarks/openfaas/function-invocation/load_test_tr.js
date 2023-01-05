import { check } from "k6";
import http from "k6/http";

import uuid from "./uuid.js";

const workspaceId = __ENV.WORKSPACE_ID || "2JIryJwEQVBhtXihKzFarELIX7X";
const host = __ENV.HOST_URL || "http://transformer.dparveez";
const url = `${host}/customTransform`;

const maxBatchSize = parseInt(__ENV.MAX_BATCH_SIZE || 90);
const base_msgs = JSON.parse(open("./base_msgs.json"));
const base_meta = JSON.parse(open("./base_meta.json"));
const base_dst = JSON.parse(open("./base_dst.json"));

export function setup() {
  const payloads = [];

  const baseMsgs = JSON.parse(JSON.stringify(base_msgs));
  const minMsgsPerBaseType = parseInt(maxBatchSize / baseMsgs.length, 10);

  for (let i = 0; i < baseMsgs.length; i++) {
    const msgDupCount =
      i === baseMsgs.length - 1
        ? minMsgsPerBaseType
        : maxBatchSize - payloads.length;

    for (let j = 0; j < msgDupCount; j++) {
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

export function scenario(data) {

  const { payloads } = data;

  for (let j = 0; j < payloads.length; j++) {
    const uuid4 = uuid.v4();
    payloads[j].message.messageId = uuid4;
    payloads[j].metadata.messageId = uuid4;
    payloads[j].destination.Transformations[0].VersionID = __ENV.VID;
  }

  const response = http.post(url, JSON.stringify(payloads), {
    headers: { "Content-Type": "application/json" }
  });

  check(response, {
    "transformation success": r => {
      let allSucess = true;

      try {
        JSON.parse(r.body).forEach(tR => {
          if (tR.statusCode != 200) {
            allSucess = false;
            throw Error();
          }
        });
      } catch (error) {
        allSucess = false;
      }

      return allSucess && r.status === 200;
    }
  });
}

export function teardown() {
  console.log("DONE TESTS FOR ", __ENV.HOSTNAME);
}
