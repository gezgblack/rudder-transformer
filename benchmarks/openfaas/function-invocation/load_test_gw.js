import { check } from "k6";
import http from "k6/http";

import uuid from "./uuid.js";

export const options = {
  scenarios: {
    scenario: {
      executor: "constant-arrival-rate",

      // Our test should last X seconds in total
      duration: "10s",

      // It should start X iterations per `timeUnit`. Note that iterations starting points
      // will be evenly spread across the `timeUnit` period.
      rate: 2,

      // It should start `rate` iterations per second
      timeUnit: "1s",

      // It should preallocate X VUs before starting the test
      preAllocatedVUs: 50,

      // It is allowed to spin up to X maximum VUs to sustain the defined
      // constant arrival rate.
      maxVUs: 200
    }
  }
};

const hostUrl = __ENV.HOST_URL || "http://localhost:31112";
const url = `${hostUrl}/function`;

// basic; geolocation
const functions = [
  "fn-2jjbhffshi2kxdgvbvw0h73zq0u",
  // "fn-2jiyrdzwav3mw4kgzhnfypijwx5"
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

  functions.forEach((fn, i) => {
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
      payloads[j].destination.Transformations[0].VersionID = fn;
    }

    const req = {
      method: "POST",
      url: `${url}/${fn}`,
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

        // try {
        //   JSON.parse(r.body).forEach(tR => {
        //     if (tR.statusCode != 200) {
        //       allSucess = false;
        //       throw Error();
        //     }
        //   });
        // } catch (error) {
        //   allSucess = false;
        // }

        return r.status === 200;
      }
    });
  });
}
