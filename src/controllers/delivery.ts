import { Context } from 'koa';
import MiscService from '../services/misc';
import { DeliveryResponse, ProcessorTransformOutput } from '../types/index';
import ServiceSelector from '../helpers/serviceSelector';
import DeliveryTestService from '../services/delivertTest/deliveryTest';
import ControllerUtility from './util';
import logger from '../logger';
import PostTransformationServiceDestination from '../services/destination/postTransformation';
import tags from '../v0/util/tags';

export default class DeliveryController {
  public static async deliverToDestination(ctx: Context) {
    logger.debug('Native(Delivery):: Request to transformer::', JSON.stringify(ctx.request.body));
    let deliveryResponse: DeliveryResponse;
    let requestMetadata = MiscService.getRequestMetadata(ctx);
    let event = ctx.request.body as ProcessorTransformOutput;
    const { version, destination }: { version: string; destination: string } = ctx.params;
    const integrationService = ServiceSelector.getNativeDestinationService();
    try {
      deliveryResponse = await integrationService.deliveryRoutine(
        event,
        destination,
        requestMetadata,
      );
    } catch (error) {
      const metaTO = integrationService.getTags(
        destination,
        event.metadata?.destinationId || 'Non-determininable',
        event.metadata?.workspaceId || 'Non-determininable',
        tags.FEATURES.DATA_DELIVERY,
      );
      metaTO.metadata = event.metadata;
      deliveryResponse = PostTransformationServiceDestination.handleFailureEventsAtDeliveryDest(
        error,
        metaTO,
      );
    }
    ctx.body = { output: deliveryResponse };
    ControllerUtility.deliveryPostProcess(ctx, deliveryResponse.status);
    logger.debug('Native(Delivery):: Response from transformer::', JSON.stringify(ctx.body));
    return ctx;
  }

  public static async testDestinationDelivery(ctx: Context) {
    logger.debug(
      'Native(Delivery-Test):: Request to transformer::',
      JSON.stringify(ctx.request.body),
    );
    const { version, destination }: { version: string; destination: string } = ctx.params;
    const { deliveryPayload, destinationRequestPayload } = ctx.request.body as any;
    const response = await DeliveryTestService.deliverTestRoutine(
      destination,
      destinationRequestPayload,
      deliveryPayload,
    );
    ctx.body = { output: response };
    ControllerUtility.postProcess(ctx);
    logger.debug('Native(Delivery-Test):: Response from transformer::', JSON.stringify(ctx.body));
    return ctx;
  }
}