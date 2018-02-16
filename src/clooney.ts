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
import {Comlink, Endpoint} from 'comlink'; // eslint-disable-line no-unused-vars

export {Comlink} from 'comlink';

const thisScriptSrc: string = 'document' in self ? document.currentScript! && (document.currentScript as HTMLScriptElement).src : '';

export type Actor = Function;
export type ActorSource = string;

export interface Terminatable {
  terminate(): void;
}

/**
 * ActorContainer can run actors. This interface is implemented by Web Workers.
 */
export type ActorContainer = Endpoint & Terminatable;

// TODO: Refactor this into a proper type that implements ActorContainer.
interface ClooneyWorker {
  spawn(actor: ActorSource, opts: Object): Promise<Object>;
}

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
export class RoundRobinStrategy implements Strategy {
  private _containers: [ActorContainer, ClooneyWorker][];
  private _nextIndex: number = 0;
  private _options: StrategyOptions;

  static get defaultOptions(): StrategyOptions {
    return {
      workerFile: thisScriptSrc,
      maxNumContainers: 1,
      newContainerFunc: async (path: string) => new Worker(path),
    };
  }

  constructor(opts: StrategyOptions = {}) {
    this._options = {...RoundRobinStrategy.defaultOptions, ...opts};
    this._containers = new Array(this._options.maxNumContainers).fill(null);
  }

  private async _initOrGetContainer(i: number): Promise<ClooneyWorker> {
    if (i >= this._containers.length)
      throw Error('No worker available');
    if (!this._containers[i]) {
      const worker = await this._options.newContainerFunc!(this._options.workerFile!);
      this._containers[i] = [worker, Comlink.proxy(worker) as any as ClooneyWorker];
    }
    return this._containers[i][1];
  }

  private async _getNextContainer(opts: Object): Promise<ClooneyWorker> {
    const w = await this._initOrGetContainer(this._nextIndex);
    this._nextIndex = (this._nextIndex + 1) % this._options.maxNumContainers!;
    return w;
  }

  async spawn<T>(actor: Actor, opts: Object = {}): Promise<T> {
    const worker = await this._getNextContainer(opts);
    return await worker.spawn(actor.toString(), opts) as T;
  }

  async terminate() {
    this._containers.forEach(containers => containers && containers[0].terminate());
    this._containers.length = 0;
  }

  get terminated() {
    return this._containers.length <= 0;
  }
}

export let defaultStrategy = new RoundRobinStrategy();
export async function spawn<T>(actor: Actor, opts: Object = {}): Promise<T> {
  return defaultStrategy.spawn<T>(actor, opts);
}

export function makeContainer(endpoint: Endpoint | Window = self): void {
  Comlink.expose({
    async spawn(actorCode: string): Promise<Actor> {
      const actor = (new Function(`return ${actorCode};`))();
      return Comlink.proxyValue(new actor()) as Actor; // eslint-disable-line new-cap
    },
  }, endpoint);
}

function isWorker(): boolean {
  // I’d have to import lib.webworker.d.ts to have access to
  // WorkerGlobalScope, but I can’t because it conflicts with lib.dom.d.ts.
  const wgs: any = (self as any)['WorkerGlobalScope'];
  return wgs && self instanceof wgs;
}

// TODO: Find a way to opt-out of autostart
if (isWorker())
  makeContainer();
