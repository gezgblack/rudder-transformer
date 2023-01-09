import uuid from "./uuid.js";

import { check } from "k6";
import exec from 'k6/execution';
import http from "k6/http";

const workspaceId = __ENV.WORKSPACE_ID || "2JIryJwEQVBhtXihKzFarELIX7X";
const host = __ENV.HOST_URL || "http://transformer.rudder-us-east-1a-blue.svc.cluster.local:80";
const url = `${host}/customTransform`;

const maxBatchSize = parseInt(__ENV.MAX_BATCH_SIZE || 90);
const base_msgs = JSON.parse(open("./base_msgs.json"));
const base_meta = JSON.parse(open("./base_meta.json"));
const base_dst = JSON.parse(open("./base_dst.json"));

export function setup() {
  const payloadsByVersion = {};
  let someVid;

  Object.keys(exec.test.options.scenarios).forEach(key => {
    const vid = exec.test.options.scenarios[key].env.VID;

    payloadsByVersion[vid] = [];
    someVid = vid;
  });

  const baseMsgs = JSON.parse(JSON.stringify(base_msgs));
  const minMsgsPerBaseType = parseInt(maxBatchSize / baseMsgs.length, 10);

  for (let i = 0; i < baseMsgs.length; i++) {
    const msgDupCount =
      i === baseMsgs.length - 1
        ? maxBatchSize - payloadsByVersion[someVid].length
        : minMsgsPerBaseType;

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

      Object.keys(exec.test.options.scenarios).forEach(key => {
        const payloadByVersion = JSON.parse(JSON.stringify(payload));
        const vid = exec.test.options.scenarios[key].env.VID;
        const uuid4 = uuid.v4();

        payloadByVersion.message.messageId = uuid4;
        payloadByVersion.metadata.messageId = uuid4;
        payloadByVersion.destination.Transformations[0].VersionID = vid;
        payloadsByVersion[vid].push(payloadByVersion);
      });
    }
  }

  Object.keys(payloadsByVersion).forEach(key => {
    payloadsByVersion[key] = JSON.stringify(payloadsByVersion[key]);
  });

  return { payloads: payloadsByVersion };
}

export function scenario(data) {
  const { payloads } = data;

  const response = http.post(url, payloads[__ENV.VID], {
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
