/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { Endpoint } from 'comlink';
export { Comlink } from 'comlink';
/**
 * `asRemoteValue` marks a value. If a marked value is used as an parameter or return value, it will not be transferred but instead proxied.
 */
export declare const asRemoteValue: <T>(x: T) => T;
/**
 * `defaultWorkerSrc` is the path passed to the `new Worker()` call. It’s recommended to not change this variable but instead overload `newWorkerFunc`.
 */
export declare let defaultWorkerSrc: string;
export declare type Actor = Function;
export declare type ActorSource = string;
export interface TerminatableEndpoint extends Endpoint {
    terminate(): void;
}
/**
 * ActorContainer can run actors. This interface is implemented by Web Workers.
 */
export interface ActorContainer {
    spawn(actor: ActorSource, opts: Object): Promise<Object>;
    terminate(): void;
}
export interface Strategy {
    /**
     * `spawn` instantiates the given actor in an actor container of the strategy’s choice.
     * @returns The return type is the type as T, but every method is implicitly async.
     */
    spawn<T>(actor: new () => T, args: any[], opts: Object): Promise<T>;
    /**
     * `terminate` calls `terminate()` on all existing containers of the strategy.
     */
    terminate(): Promise<void>;
}
export interface StrategyOptions {
    /**
     * Maximum number of containers the strategy is allowed to spin up. Default is 1.
     */
    maxNumContainers?: number;
    /**
     * Asynchronous function to create a new worker. Default is a call to `new Worker(defaultWorkerSrc)`.
     */
    newWorkerFunc?: () => Promise<TerminatableEndpoint>;
}
export declare const defaultOpts: {
    maxNumContainers: number;
    newWorkerFunc: () => Promise<Worker>;
};
/**
 * `RoundRobingStrategy` creates up to n containers and cycles through the containers with every `spawn` call.
 */
export declare class RoundRobinStrategy implements Strategy {
    private _containers;
    private _nextIndex;
    private _options;
    constructor(opts?: StrategyOptions);
    private _initOrGetContainer(i);
    private _getNextContainer(opts);
    spawn<T>(actor: Actor, constructorArgs?: any[], opts?: Object): Promise<T>;
    terminate(): Promise<void>;
    readonly terminated: boolean;
}
export declare let defaultStrategy: RoundRobinStrategy;
export declare function spawn<T>(actor: Actor, constructorArgs?: any[], opts?: Object): Promise<T>;
export declare function makeContainer(endpoint?: Endpoint | Window): void;
