declare module 'react-native-google-nearby-connection' {
    export const CommonStatusCodes: Record<string, number>;
    export const ConnectionsStatusCodes: Record<string, number>;
    export const Payload: { BYTES: number; FILE: number; STREAM: number };
    export const PayloadTransferUpdate: { FAILURE: number; IN_PROGRESS: number; SUCCESS: number };
    export const Strategy: { P2P_CLUSTER: number; P2P_STAR: number };

    interface EventSubscription {
        remove: () => void;
    }

    class NearbyConnection {
        static endpoints(): Promise<any>;
        static payloads(): Promise<any>;
        static removePayload(serviceId: string, endpointId: string, payloadId: string): Promise<void>;
        static sendFile(serviceId: string, endpointId: string, uri: string, metadata?: string): Promise<void>;
        static saveFile(serviceId: string, endpointId: string, payloadId: string): Promise<{ path: string; originalFilename: string; metadata: string }>;
        static sendBytes(serviceId: string, endpointId: string, bytes: string): Promise<void>;
        static readBytes(serviceId: string, endpointId: string, payloadId: string): Promise<{ type: number; bytes: string; payloadId: string; filename?: string; metadata?: string; streamType?: string }>;
        static openMicrophone(serviceId: string, endpointId: string, metadata?: string): Promise<void>;
        static closeMicrophone(serviceId: string, endpointId: string): Promise<void>;
        static startPlayingAudioStream(serviceId: string, endpointId: string, payloadId: string): Promise<void>;
        static stopPlayingAudioStream(serviceId: string, endpointId: string, payloadId: string): Promise<void>;
        static startAdvertising(localEndpointName: string, serviceId: string, strategy?: number): Promise<void>;
        static stopAdvertising(serviceId: string): Promise<void>;
        static isAdvertising(): Promise<boolean>;
        static startDiscovering(serviceId: string, strategy?: number): Promise<void>;
        static stopDiscovering(serviceId: string): Promise<void>;
        static isDiscovering(): Promise<boolean>;
        static acceptConnection(serviceId: string, endpointId: string): Promise<void>;
        static rejectConnection(serviceId: string, endpointId: string): Promise<void>;
        static connectToEndpoint(serviceId: string, endpointId: string): Promise<void>;
        static disconnectFromEndpoint(serviceId: string, endpointId: string): Promise<void>;

        // Event listeners
        static onDiscoveryStarting(listener: (event: any) => void): EventSubscription;
        static onDiscoveryStarted(listener: (event: any) => void): EventSubscription;
        static onDiscoveryStartFailed(listener: (event: any) => void): EventSubscription;
        static onAdvertisingStarting(listener: (event: any) => void): EventSubscription;
        static onAdvertisingStarted(listener: (event: any) => void): EventSubscription;
        static onAdvertisingStartFailed(listener: (event: any) => void): EventSubscription;
        static onConnectionInitiatedToEndpoint(listener: (event: any) => void): EventSubscription;
        static onConnectedToEndpoint(listener: (event: any) => void): EventSubscription;
        static onEndpointConnectionFailed(listener: (event: any) => void): EventSubscription;
        static onDisconnectedFromEndpoint(listener: (event: any) => void): EventSubscription;
        static onEndpointDiscovered(listener: (event: any) => void): EventSubscription;
        static onEndpointLost(listener: (event: any) => void): EventSubscription;
        static onReceivePayload(listener: (event: any) => void): EventSubscription;
        static onPayloadTransferUpdate(listener: (event: any) => void): EventSubscription;
        static onSendPayloadFailed(listener: (event: any) => void): EventSubscription;
    }

    export default NearbyConnection;
}
