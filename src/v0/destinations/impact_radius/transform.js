const get = require("get-value");
const sha1 = require("js-sha1");
const { EventType } = require("../../../constants");
const { CONFIG_CATEGORIES, MAPPING_CONFIG } = require("./config");
const {
  checkConfigurationError,
  populateProductProperties,
  populateAdditionalParameters
} = require("./util");
const {
  defaultRequestConfig,
  defaultPostRequestConfig,
  removeUndefinedAndNullValues,
  simpleProcessRouterDest,
  isAppleFamily,
  constructPayload,
  isDefinedAndNotNull
} = require("../../util");
const {
  ConfigurationError,
  TransformationError,
  InstrumentationError
} = require("../../util/errorTypes");

const responseBuilder = (payload, endpoint, Config) => {
  if (payload) {
    const response = defaultRequestConfig();
    response.endpoint = endpoint;
    response.headers = {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Config.accountSID}:${Config.apiKey}`
    };
    response.method = defaultPostRequestConfig.requestMethod;
    response.body.FORM = removeUndefinedAndNullValues(payload);
    return response;
  }
  throw new TransformationError(
    "Payload could not be populated due to wrong input"
  );
};

/**
 * This function is used to build the response for identify/page call.
 * @param {*} message
 * @param {*} category
 * @param {*} Config
 * @returns
 */
const identifyResponseBuilder = (message, category, Config) => {
  const { campaignId } = Config;

  const payload = constructPayload(message, MAPPING_CONFIG[category.name]);
  payload.CustomerEmail = isDefinedAndNotNull(payload.CustomerEmail)
    ? sha1(payload.CustomerEmail)
    : payload.CustomerEmail;
  payload.CampaignId = campaignId;

  const os = get(message, "context.os.name");
  if (os && isAppleFamily(os.toLowerCase())) {
    payload.AppleIfv = get(message, "context.device.id");
    payload.AppleIfa = get(message, "context.device.advertisingId");
  } else if (os.toLowerCase() === "android") {
    payload.AndroidId = get(message, "context.device.id");
    payload.GoogAId = get(message, "context.device.advertisingId");
  }
  return responseBuilder(payload, category.endpoint, Config);
};

/**
 * This function is used to build the response for track call.
 * @param {*} message
 * @param {*} category
 * @param {*} Config
 * @returns
 */
const trackResponseBuilder = (message, category, Config) => {
  const {
    campaignId,
    eventTypeId,
    impactAppId,
    rudderToImpactProperty
  } = Config;
  let payload = constructPayload(message, MAPPING_CONFIG[category.name]);
  payload.CampaignId = campaignId;
  payload.EventTypeId = eventTypeId;
  payload.ImpactAppId = impactAppId;
  payload.EventCode = "INSTALL";
  payload.CustomerEmail = isDefinedAndNotNull(payload.CustomerEmail)
    ? sha1(payload.CustomerEmail)
    : payload.CustomerEmail;
  const os = get(message, "context.os.name");
  if (os && isAppleFamily(os.toLowerCase())) {
    payload.AppleIfv = get(message, "context.device.id");
    payload.AppleIfa = get(message, "context.device.advertisingId");
  } else if (os.toLowerCase() === "android") {
    payload.AndroidId = get(message, "context.device.id");
    payload.GoogAId = get(message, "context.device.advertisingId");
  }
  const productProperties = populateProductProperties(message.properties);
  const additionalParameters = populateAdditionalParameters(
    rudderToImpactProperty
  );
  payload = { ...payload, ...productProperties, ...additionalParameters };
  const endpoint = `${category.baseUrl}/${Config.accountSID}/Conversions`;
  return responseBuilder(payload, endpoint, Config);
};

const processEvent = async (message, destination) => {
  if (!message.type) {
    throw new InstrumentationError("Event type is required");
  }
  if (!checkConfigurationError(destination.Config)) {
    const configField = checkConfigurationError(destination.Config);
    throw new ConfigurationError(`${configField} is a required field`);
  }

  const messageType = message.type.toLowerCase();
  let response;
  let category;
  switch (messageType) {
    case EventType.IDENTIFY:
    case EventType.PAGE:
      category = CONFIG_CATEGORIES.IDENTIFY;
      response = identifyResponseBuilder(message, category, destination.Config);
      break;
    case EventType.TRACK:
      category = CONFIG_CATEGORIES.TRACK;
      response = trackResponseBuilder(message, category, destination.Config);
      break;
    default:
      throw new InstrumentationError(
        `Event type ${messageType} is not supported`
      );
  }
  return response;
};

const process = async event => {
  return processEvent(event.message, event.destination);
};

const processRouterDest = async (inputs, reqMetadata) => {
  const respList = await simpleProcessRouterDest(inputs, process, reqMetadata);
  return respList;
};

module.exports = { process, processRouterDest };