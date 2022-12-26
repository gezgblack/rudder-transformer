import { check } from "k6";
import http from "k6/http";

import uuid from "./uuid.js";

export const options = {
  scenarios: {
    scenario: {
      executor: "constant-arrival-rate",

      // Our test should last X seconds in total
      duration: "1m",

      // It should start X iterations per `timeUnit`. Note that iterations starting points
      // will be evenly spread across the `timeUnit` period.
      rate: 5,

      // It should start `rate` iterations per second
      timeUnit: "1s",

      // It should preallocate X VUs before starting the test
      preAllocatedVUs: 10,

      // It is allowed to spin up to X maximum VUs to sustain the defined
      // constant arrival rate.
      maxVUs: 100
    }
  }
};

const workspaceId = __ENV.WORKSPACE_ID || "2JIryJwEQVBhtXihKzFarELIX7X";
const hostUrl =
  __ENV.HOST_URL ||
  "http://transformer.rudder-us-east-1a-blue.svc.cluster.local:80";
const url = `${hostUrl}/customTransform`;

const versionIds = [
  "2JJBHfFshI2kXdgVBVW0h73zq0u",
  "2JIyGhcqALLnylXdS3Xl5Sfq0I5",
  "2JIyMRR8JqyR4j6Ys5a8weK5U0N",
  "2JIyRdzwav3MW4KgzHnfYpIJwX5",
  "2JIyW2FBbZWjiyC3Zm3Woc2TWx",
  "2JIyZiseYSwFcrKzQ2eG4RcByea",
  "2JIye7Kc2JJjh8I77xDesRJNIvs",
  "2JIyRdzwav3MW4KgzHnfYpIJwX6",
  "2JIyRdzwav3MW4KgzHnfYpIJwX7",
  "2JIyRdzwav3MW4KgzHnfYpIJwX8"
];

const maxBatchSize = parseInt(__ENV.MAX_BATCH_SIZE || 200);

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

export default function(data) {
  const requests = [];

  versionIds.forEach((versionId, i) => {
    // const size = randomIntBetween(150, maxBatchSize);
    // const direction = randomItem([-1, 1]);

    // let payloads;

    // if (direction === 1) {
    //   payloads = data.payloads.slice(0, maxBatchSize);
    // } else {
    //   payloads = data.payloads
    //     .slice()
    //     .reverse()
    //     .slice(0, maxBatchSize);
    // }
    const { payloads } = data;

    for (let j = 0; j < payloads.length; j++) {
      const uuid4 = uuid.v4();
      payloads[j].message.messageId = uuid4;
      payloads[j].metadata.messageId = uuid4;
      payloads[j].destination.Transformations[0].VersionID = versionId;
    }

    const req = {
      method: "POST",
      url,
      body: JSON.stringify(payloads),
      params: {
        headers: { "Content-Type": "application/json" }
      }
    };

    requests.push(req);
  });

  const responses = http.batch(requests);

  responses.forEach(response => {
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
  });
}
