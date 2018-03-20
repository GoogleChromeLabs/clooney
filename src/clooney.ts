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
import {Comlink, Endpoint} from 'comlinkjs'; // eslint-disable-line no-unused-vars

// Automatically proxy functions
Comlink.transferHandlers.set('FUNCTION', {
  canHandle(obj: any): Boolean {
    return obj instanceof Function;
  },
  serialize(obj: any): any {
    const {port1, port2} = new MessageChannel();
    Comlink.expose(obj, port1);
    return port2;
  },
  deserialize(obj: any): any {
    return Comlink.proxy(obj as Endpoint);
  },
});

// Automatically proxy events
Comlink.transferHandlers.set('EVENT', {
  canHandle(obj: any): Boolean {
    return obj instanceof Event;
  },
  serialize(obj: any): any {
    return {
      targetId: obj && obj.target && obj.target.id,
      targetClassList: obj && obj.target && obj.target.classList && [...obj.target.classList],
      detail: obj && obj.detail,
      data: obj && obj.data,
    };
  },
  deserialize(obj: any): any {
    return obj;
  },
});

export {Comlink} from 'comlinkjs';

/**
 * `asRemoteValue` marks a value. If a marked value is used as an parameter or return value, it will not be transferred but instead proxied.
 */
export const asRemoteValue: <T>(x: T) => T = Comlink.proxyValue;

/**
 * `defaultWorkerSrc` is the path passed to the `new Worker()` call. It’s recommended to not change this variable but instead overload `newWorkerFunc`.
 */
export let defaultWorkerSrc: string = 'document' in self ? document.currentScript! && (document.currentScript as HTMLScriptElement).src : '';

export type Actor = Function;
export type ActorSource = string;

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

export const defaultOpts = {
  maxNumContainers: 1,
  newWorkerFunc: async () => new Worker(defaultWorkerSrc),
};

/**
 * `RoundRobingStrategy` creates up to n containers and cycles through the containers with every `spawn` call.
 */
export class RoundRobinStrategy implements Strategy {
  private _containers: ActorContainer[];
  private _nextIndex: number = 0;
  private _options: StrategyOptions;

  constructor(opts: StrategyOptions = {}) {
    this._options = {...defaultOpts, ...opts};
    this._containers = new Array(this._options.maxNumContainers).fill(null);
  }

  private async _initOrGetContainer(i: number): Promise<ActorContainer> {
    if (i >= this._containers.length)
      throw Error('No worker available');
    if (!this._containers[i]) {
      const worker = await this._options.newWorkerFunc!();
      const remote = Comlink.proxy(worker) as any;
      this._containers[i] = {
        spawn: remote.spawn.bind(spawn),
        terminate: worker.terminate.bind(worker),
      };
    }
    return this._containers[i];
  }

  private async _getNextContainer(opts: Object): Promise<ActorContainer> {
    const w = await this._initOrGetContainer(this._nextIndex);
    this._nextIndex = (this._nextIndex + 1) % this._options.maxNumContainers!;
    return w;
  }

  async spawn<T>(actor: Actor, constructorArgs: any[] = [], opts: Object = {}): Promise<T> {
    const container = await this._getNextContainer(opts);
    return await container.spawn(actor.toString(), constructorArgs) as T;
  }

  async terminate() {
    this._containers.filter(c => c).forEach(container => container.terminate());
    this._containers.length = 0;
  }

  get terminated() {
    return this._containers.length <= 0;
  }
}

export let defaultStrategy = new RoundRobinStrategy();
export async function spawn<T>(actor: Actor, constructorArgs: any[] = [], opts: Object = {}): Promise<T> {
  return defaultStrategy.spawn<T>(actor, constructorArgs, opts);
}

export function makeContainer(endpoint: Endpoint | Window = self): void {
  Comlink.expose({
    async spawn(actorCode: string, constructorArgs: any[]): Promise<Actor> {
      const actor = (new Function(`return ${actorCode};`))();
      return Comlink.proxyValue(new actor(...constructorArgs)) as Actor; // eslint-disable-line new-cap
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
