import { Context } from 'koa';
import MiscService from '../services/misc';
import PreTransformationDestinationService from '../services/destination/preTransformation';
import PostTransformationDestinationService from '../services/destination/postTransformation';
import {
  ProcessorTransformRequest,
  RouterTransformRequestData,
  RouterTransformRequest,
  ProcessorTransformResponse,
} from '../types/index';
import ServiceSelector from '../helpers/serviceSelector';
import ControllerUtility from './util';
import stats from '../util/stats';
import logger from '../logger';
import { getIntegrationVersion } from '../util/utils';
import tags from '../v0/util/tags';

export default class DestinationController {
  public static async destinationTransformAtProcessor(ctx: Context) {
    const startTime = new Date();
    logger.debug(
      'Native(Process-Transform):: Requst to transformer::',
      JSON.stringify(ctx.request.body),
    );
    let resplist: ProcessorTransformResponse[];
    let requestMetadata = MiscService.getRequestMetadata(ctx);
    let events = ctx.request.body as ProcessorTransformRequest[];
    const metaTags = MiscService.getMetaTags(events[0].metadata);
    const { version, destination }: { version: string; destination: string } = ctx.params;
    const integrationService = ServiceSelector.getDestinationService(events);
    try {
      integrationService.init();
      events = PreTransformationDestinationService.preProcess(
        events,
        ctx,
      ) as ProcessorTransformRequest[];
      resplist = await integrationService.processorRoutine(
        events,
        destination,
        version,
        requestMetadata,
      );
    } catch (error) {
      resplist = events.map((ev) => {
        const metaTO = integrationService.getTags(
          destination,
          ev.metadata.destinationId,
          ev.metadata.workspaceId,
          tags.FEATURES.PROCESSOR,
        );
        metaTO.metadata = ev.metadata;
        const errResp = PostTransformationDestinationService.handleFailedEventsAtProcessorDest(
          error,
          metaTO,
        );
        return errResp;
      });
    }
    ctx.body = resplist;
    ControllerUtility.postProcess(ctx);
    logger.debug(
      'Native(Process-Transform):: Response from transformer::',
      JSON.stringify(ctx.body),
    );
    stats.timing('dest_transform_request_latency', startTime, {
      destination,
      version,
      ...metaTags,
    });
    stats.increment('dest_transform_requests', 1, {
      destination,
      version,
      ...metaTags,
    });
    return ctx;
  }

  public static async destinationTransformAtRouter(ctx: Context) {
    logger.debug(
      'Native(Router-Transform):: Requst to transformer::',
      JSON.stringify(ctx.request.body),
    );
    let requestMetadata = MiscService.getRequestMetadata(ctx);
    const routerRequest = ctx.request.body as RouterTransformRequest;
    const destination = routerRequest.destType;
    let events = routerRequest.input;
    const integrationService = ServiceSelector.getDestinationService(events);
    try {
      events = PreTransformationDestinationService.preProcess(
        events,
        ctx,
      ) as RouterTransformRequestData[];
      const resplist = await integrationService.routerRoutine(
        events,
        destination,
        getIntegrationVersion(),
        requestMetadata,
      );
      ctx.body = { output: resplist };
    } catch (error) {
      const metaTO = integrationService.getTags(
        destination,
        events[0].metadata.destinationId,
        events[0].metadata.workspaceId,
        tags.FEATURES.ROUTER,
      );
      metaTO.metadatas = events.map((ev) => {
        return ev.metadata;
      });
      const errResp = PostTransformationDestinationService.handleFailureEventsAtRouterDest(
        error,
        metaTO,
      );
      ctx.body = { output: [errResp] };
    }
    ControllerUtility.postProcess(ctx);
    logger.debug(
      'Native(Router-Transform):: Response from transformer::',
      JSON.stringify(ctx.body),
    );
    return ctx;
  }

  public static batchProcess(ctx: Context) {
    logger.debug(
      'Native(Process-Transform-Batch):: Requst to transformer::',
      JSON.stringify(ctx.request.body),
    );
    let requestMetadata = MiscService.getRequestMetadata(ctx);
    const routerRequest = ctx.request.body as RouterTransformRequest;
    const destination = routerRequest.destType;
    let events = routerRequest.input;
    const integrationService = ServiceSelector.getDestinationService(events);
    try {
      events = PreTransformationDestinationService.preProcess(
        events,
        ctx,
      ) as RouterTransformRequestData[];
      const resplist = integrationService.batchRoutine(
        events,
        destination,
        getIntegrationVersion(),
        requestMetadata,
      );
      ctx.body = resplist;
    } catch (error) {
      const metaTO = integrationService.getTags(
        destination,
        events[0].metadata.destinationId,
        events[0].metadata.workspaceId,
        tags.FEATURES.BATCH,
      );
      metaTO.metadatas = events.map((ev) => {
        return ev.metadata;
      });
      const errResp = PostTransformationDestinationService.handleFailureEventsAtBatchDest(
        error,
        metaTO,
      );
      ctx.body = [errResp];
    }
    ControllerUtility.postProcess(ctx);
    logger.debug(
      'Native(Process-Transform-Batch):: Response from transformer::',
      JSON.stringify(ctx.body),
    );
    return ctx;
  }
}