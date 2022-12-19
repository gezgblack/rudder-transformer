import {  ProcessorRequest, RouterRequestData } from "../types/index";
import  MiscService  from "../services/misc.service";
import { INTEGRATION_SERVICE } from "../routes/utils/constants";
import CDKV1DestinationService from "../services/destination/cdkV1Integration.destination.service";
import CDKV2DestinationService from "../services/destination/cdkV2Integration.destination.service";
import IntegrationDestinationService from "../interfaces/IntegrationDestinationService";
import NativeIntegrationDestinationService from "../services/destination/nativentegration.destination.service";
import IntegrationSourceService from "../interfaces/IntegrationSourceService";
import NativeIntegrationSourceService from "../services/source/nativeIntegration.source.service";

export class ServiceSelector {
  private static sourceHandlerMap: Map<string, any> = new Map();
  private static destHandlerMap: Map<string, any> = new Map();
  private static serviceMap: Map<string, any> = new Map();

  private static isCdkDestination(destinationDefinitionConfig: Object) {
    return !!destinationDefinitionConfig?.["cdkEnabled"];
  }

  private static isCdkV2Destination(destinationDefinitionConfig: Object) {
    return !!destinationDefinitionConfig?.["cdkV2Enabled"];
  }

  private static fetchCachedService(serviceType: string) {
    let service: any;
    if (this.serviceMap.has(serviceType)) {
      service = this.serviceMap.get(serviceType);
    } else {
      switch (serviceType) {
        case INTEGRATION_SERVICE.CDK_V1_DEST:
          this.serviceMap.set(
            INTEGRATION_SERVICE.CDK_V1_DEST,
            new CDKV1DestinationService()
          );
          break;
        case INTEGRATION_SERVICE.CDK_V2_DEST:
          this.serviceMap.set(
            INTEGRATION_SERVICE.CDK_V2_DEST,
            new CDKV2DestinationService()
          );
          break;
        case INTEGRATION_SERVICE.NATIVE_DEST:
          this.serviceMap.set(
            INTEGRATION_SERVICE.NATIVE_DEST,
            new NativeIntegrationDestinationService()
          );
          break;
        case INTEGRATION_SERVICE.NATIVE_SOURCE:
          this.serviceMap.set(
            INTEGRATION_SERVICE.NATIVE_SOURCE,
            new NativeIntegrationSourceService()
          );
      }
      service = this.serviceMap.get(serviceType);
    }
    return service;
  }

  public static getDestHandler(dest: string, version: string) {
    let destinationHandler: any;
    if (this.destHandlerMap.get(dest)) {
      destinationHandler = this.destHandlerMap.get(dest);
    } else {
      destinationHandler = MiscService.getDestHandler(dest, version);
      this.destHandlerMap.set(dest, destinationHandler);
    }
    return destinationHandler;
  }

  public static getSourceHandler(source: string, version: string) {
    let sourceHandler: any;
    if (this.sourceHandlerMap.get(source)) {
      sourceHandler = this.destHandlerMap.get(source);
    } else {
      sourceHandler = MiscService.getSourceHandler(source, version);
      this.sourceHandlerMap.set(source, sourceHandler);
    }
    return sourceHandler;
  }

  public static getNativeIntegrationServiceDest(): IntegrationDestinationService {
    return this.fetchCachedService(INTEGRATION_SERVICE.NATIVE_DEST);
  }

  public static getNativeIntegrationServiceSource(): IntegrationSourceService {
    return this.fetchCachedService(INTEGRATION_SERVICE.NATIVE_SOURCE);
  }

  public static getDestinationService(
    events: ProcessorRequest[] | RouterRequestData[]
  ): IntegrationDestinationService {
    const destinationDefinitionConfig: Object =
      events[0].destination.DestinationDefinition.Config;
    if (this.isCdkDestination(destinationDefinitionConfig)) {
      return this.fetchCachedService(INTEGRATION_SERVICE.CDK_V1_DEST);
    } else if (this.isCdkV2Destination(destinationDefinitionConfig)) {
      return this.fetchCachedService(INTEGRATION_SERVICE.CDK_V2_DEST);
    } else {
      return this.fetchCachedService(INTEGRATION_SERVICE.NATIVE_DEST);
    }
  }

  public static getSourceService(arg: unknown) {
    // Implement source event based descision logic for selecting service
  }
}