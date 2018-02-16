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
export declare type Actor = Function;
export declare type ActorSource = string;
export interface Terminatable {
    terminate(): void;
}
/**
 * ActorContainer can run actors. This interface is implemented by Web Workers.
 */
export declare type ActorContainer = Endpoint & Terminatable;
export interface Strategy {
    /**
     * `spawn` instantiates the given source in an actor container of the strategy’s choice.
     * @returns The return type is the type of the given source, but every method is implicitly async.
     */
    spawn(actor: Actor, opts: Object): Promise<Object>;
    /**
     * `terminate` calls `terminate()` on all existing containers of the strategy.
     */
    terminate(): Promise<void>;
}
export interface StrategyOptions {
    /**
     * Path of the file to use for workers. The default value is clooney.js (determined via `document.currentScript.src`).
     */
    workerFile?: string;
    /**
     * Maximum number of containers the strategy is allowed to spin up. Default is 1.
     */
    maxNumContainers?: number;
    /**
     * Asynchronous function to create a new actor container. Default is a call to `new Worker(path)`.
     */
    newContainerFunc?: (path: string) => Promise<ActorContainer>;
}
/**
 * `RoundRobingStrategy` creates up to n containers and cycles through the containers with every `spawn` call.
 */
export declare class RoundRobinStrategy implements Strategy {
    private _containers;
    private _nextIndex;
    private _options;
    static readonly defaultOptions: StrategyOptions;
    constructor(opts?: StrategyOptions);
    private _initOrGetContainer(i);
    private _getNextContainer(opts);
    spawn<T>(actor: Actor, opts?: Object): Promise<T>;
    terminate(): Promise<void>;
    readonly terminated: boolean;
}
export declare let defaultStrategy: RoundRobinStrategy;
export declare function spawn<T>(actor: Actor, opts?: Object): Promise<T>;
export declare function makeContainer(endpoint?: Endpoint | Window): void;
