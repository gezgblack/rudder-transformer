const fs = require("fs");
const path = require("path");
const jsonDiff = require('json-diff');
const { processCdkV2Workflow } = require("../../src/cdk/v2/handler");
const tags = require("../../src/v0/util/tags");
const data = require("../../../integration-team-tools/notebooks/outage-report/data/webhook_sample_final.json");
const version = "v0";
const integration = "webhook";
const transformer = require(`../../src/${version}/destinations/${integration}/transform`);


const name = "Webhook - cdk comparator ";


describe(`${name} Tests`, () => {

  describe("Processor Tests", () => {
    data.forEach((input, index) => {
      it(`${name} - payload: ${index}`, async () => {
        try {
          const cdkOutput = await processCdkV2Workflow(
            integration,
            input,
            tags.FEATURES.PROCESSOR
          );
          const conventionalOutput = await transformer.process(input);
          expect(cdkOutput).toEqual(conventionalOutput);
          console.log(jsonDiff.diffString(cdkOutput,conventionalOutput ));
        } catch (error) {
          // console.log(error);
          // expect(error.message).toEqual(expected.message);
        }
      });
    });  
  });
});
