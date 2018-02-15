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
export declare type Actor = Object;
export interface ClooneyWorker {
    spawn<T>(actor: Actor, opts: Object): Promise<T>;
}
export interface Strategy {
    getWorker(opts: Object): Promise<ClooneyWorker>;
    terminate(): Promise<void>;
}
export interface RoundRobinStrategyOptions {
    workerFile?: string;
    maxNumWorkers?: number;
}
export declare class RoundRobinStrategy implements Strategy {
    private _workers;
    private _nextIndex;
    private _options;
    static readonly defaultOptions: RoundRobinStrategyOptions;
    constructor(opts?: RoundRobinStrategyOptions);
    private _initOrGetWorker(i);
    getWorker(opts: Object): Promise<ClooneyWorker>;
    spawn<T>(actor: Actor, opts?: Object): Promise<T>;
    terminate(): Promise<void>;
    readonly terminated: boolean;
}
export declare function spawn<T>(actor: Actor, opts?: Object): Promise<T>;
export declare function makeWorker(endpoint?: Endpoint | Window): void;
