import groupBy from 'lodash/groupBy';
import IntegrationDestinationService from '../../interfaces/DestinationService';
import {
  DeliveryResponse,
  ErrorDetailer,
  MetaTransferObject,
  ProcessorTransformRequest,
  ProcessorTransformResponse,
  RouterTransformRequestData,
  RouterTransformResponse,
  ProcessorTransformOutput,
  UserDeletionRequest,
  UserDeletionResponse,
} from '../../types/index';
import PostTransformationServiceDestination from './postTransformation';
import networkHandlerFactory from '../../adapters/networkHandlerFactory';
import FetchHandler from '../../helpers/fetchHandlers';
import tags from '../../v0/util/tags';

export default class NativeIntegrationDestinationService implements IntegrationDestinationService {
  public init() {}

  public getTags(
    destType: string,
    destinationId: string,
    workspaceId: string,
    feature: string,
  ): MetaTransferObject {
    const metaTO = {
      errorDetails: {
        destType: destType.toUpperCase(),
        module: tags.MODULES.DESTINATION,
        implementation: tags.IMPLEMENTATIONS.NATIVE,
        feature,
        destinationId,
        workspaceId,
        context: '[Native Integration Service] Failure During Processor Transform',
      } as ErrorDetailer,
    } as MetaTransferObject;
    return metaTO;
  }

  public async processorRoutine(
    events: ProcessorTransformRequest[],
    destinationType: string,
    version: string,
    _requestMetadata: Object,
  ): Promise<ProcessorTransformResponse[]> {
    const destHandler = FetchHandler.getDestHandler(destinationType, version);
    const respList: ProcessorTransformResponse[][] = await Promise.all(
      events.map(async (event) => {
        try {
          let transformedPayloads: ProcessorTransformOutput | ProcessorTransformOutput[] =
            await destHandler.process(event);
          return PostTransformationServiceDestination.handleSuccessEventsAtProcessorDest(
            event,
            transformedPayloads,
            destHandler,
          );
        } catch (error) {
          const metaTO = this.getTags(
            destinationType,
            event.metadata.destinationId,
            event.metadata.workspaceId,
            tags.FEATURES.PROCESSOR,
          );
          metaTO.metadata = event.metadata;
          const erroredResp =
            PostTransformationServiceDestination.handleFailedEventsAtProcessorDest(error, metaTO);
          return [erroredResp];
        }
      }),
    );
    return respList.flat();
  }

  public async routerRoutine(
    events: RouterTransformRequestData[],
    destinationType: string,
    version: string,
    _requestMetadata: Object,
  ): Promise<RouterTransformResponse[]> {
    const destHandler = FetchHandler.getDestHandler(destinationType, version);
    const allDestEvents: Object = groupBy(
      events,
      (ev: RouterTransformRequestData) => ev.destination?.ID,
    );
    const groupedEvents: RouterTransformRequestData[][] = Object.values(allDestEvents);
    const response: RouterTransformResponse[][] = await Promise.all(
      groupedEvents.map(async (destInputArray: RouterTransformRequestData[]) => {
        const metaTO = this.getTags(
          destinationType,
          destInputArray[0].metadata.destinationId,
          destInputArray[0].metadata.workspaceId,
          tags.FEATURES.ROUTER,
        );
        try {
          const routerRoutineResponse: RouterTransformResponse[] =
            await destHandler.processRouterDest(destInputArray);
          return PostTransformationServiceDestination.handleSuccessEventsAtRouterDest(
            routerRoutineResponse,
            destHandler,
            metaTO,
          );
        } catch (error) {
          metaTO.metadatas = destInputArray.map((input) => {
            return input.metadata;
          });
          const errorResp = PostTransformationServiceDestination.handleFailureEventsAtRouterDest(
            error,
            metaTO,
          );
          return [errorResp];
        }
      }),
    );
    return response.flat();
  }

  public batchRoutine(
    events: RouterTransformRequestData[],
    destinationType: string,
    version: any,
    _requestMetadata: Object,
  ): RouterTransformResponse[] {
    const destHandler = FetchHandler.getDestHandler(destinationType, version);
    if (!destHandler.batch) {
      throw new Error(`${destinationType} does not implement batch`);
    }
    const allDestEvents: Object = groupBy(
      events,
      (ev: RouterTransformRequestData) => ev.destination?.ID,
    );
    const groupedEvents: RouterTransformRequestData[][] = Object.values(allDestEvents);
    const response = groupedEvents.map((destEvents) => {
      try {
        const destBatchedRequests: RouterTransformResponse[] = destHandler.batch(destEvents);
        return destBatchedRequests;
      } catch (error) {
        const metaTO = this.getTags(
          destinationType,
          destEvents[0].metadata.destinationId,
          destEvents[0].metadata.workspaceId,
          tags.FEATURES.BATCH,
        );
        metaTO.metadatas = events.map((event) => {
          return event.metadata;
        });
        const errResp = PostTransformationServiceDestination.handleFailureEventsAtBatchDest(
          error,
          metaTO,
        );
        return [errResp];
      }
    });
    return response.flat();
  }

  public async deliveryRoutine(
    destinationRequest: ProcessorTransformOutput,
    destinationType: string,
    _requestMetadata: Object,
  ): Promise<DeliveryResponse> {
    try {
      const networkHandler = networkHandlerFactory.getNetworkHandler(destinationType);
      const rawProxyResponse = await networkHandler.proxy(destinationRequest);
      const processedProxyResponse = networkHandler.processAxiosResponse(rawProxyResponse);
      return networkHandler.responseHandler(
        {
          ...processedProxyResponse,
          rudderJobMetadata: destinationRequest.metadata,
        },
        destinationType,
      ) as DeliveryResponse;
    } catch (err) {
      const metaTO = this.getTags(
        destinationType,
        destinationRequest.metadata?.destinationId || 'Non-determininable',
        destinationRequest.metadata?.workspaceId || 'Non-determininable',
        tags.FEATURES.DATA_DELIVERY,
      );
      metaTO.metadata = destinationRequest.metadata;
      return PostTransformationServiceDestination.handleFailureEventsAtDeliveryDest(err, metaTO);
    }
  }

  public async deletionRoutine(
    requests: UserDeletionRequest[],
    rudderDestInfo: string,
  ): Promise<UserDeletionResponse[]> {
    const response = await Promise.all(
      requests.map(async (request) => {
        const { destType } = request;
        const destUserDeletionHandler: any = FetchHandler.getDeletionHandler(
          destType.toLowerCase(),
          'v0',
        );
        if (!destUserDeletionHandler || !destUserDeletionHandler.processDeleteUsers) {
          return {
            statusCode: 404,
            error: `${destType}: Doesn't support deletion of users`,
          } as UserDeletionResponse;
        }
        try {
          const result: UserDeletionResponse = await destUserDeletionHandler.processDeleteUsers({
            ...request,
            rudderDestInfo,
          });
          if (result) {
            return result;
          }
        } catch (error) {
          const metaTO = this.getTags(destType, 'unknown', 'unknown', tags.FEATURES.USER_DELETION);
          return PostTransformationServiceDestination.handleFailureEventsAtUserDeletion(
            error,
            metaTO,
          );
        }
      }),
    );
    return response;
  }
}