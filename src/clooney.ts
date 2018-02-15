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

export type Actor = Object;

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

export class RoundRobinStrategy implements Strategy {
  private _workers: [Worker, ClooneyWorker][];
  private _nextIndex: number = 0;
  private _options: RoundRobinStrategyOptions;

  static get defaultOptions(): RoundRobinStrategyOptions {
    return {
      workerFile: thisScriptSrc,
      maxNumWorkers: 1,
    };
  }

  constructor(opts: RoundRobinStrategyOptions = {}) {
    this._options = {...RoundRobinStrategy.defaultOptions, ...opts};
    this._workers = new Array(this._options.maxNumWorkers).fill(null);
  }

  private _initOrGetWorker(i: number): ClooneyWorker {
    if (i >= this._workers.length)
      throw Error('No worker available');
    if (!this._workers[i]) {
      const worker = new Worker(this._options.workerFile!);
      this._workers[i] = [worker, Comlink.proxy(worker) as any as ClooneyWorker];
    }
    return this._workers[i][1];
  }

  getWorker(opts: Object): Promise<ClooneyWorker> {
    const w = this._initOrGetWorker(this._nextIndex);
    this._nextIndex = (this._nextIndex + 1) % this._options.maxNumWorkers!;
    return Promise.resolve(w);
  }

  // The return type is the class T where every method is async.
  // Not sure if TypeScript can represent that somehow.
  async spawn<T>(actor: Actor, opts: Object = {}): Promise<T> {
    const worker = await this.getWorker(opts);
    return await worker.spawn(actor.toString(), opts) as T;
  }

  async terminate() {
    this._workers.forEach(worker => worker && worker[0].terminate());
    this._workers.length = 0;
  }

  get terminated() {
    return this._workers.length <= 0;
  }
}

const defaultStrategy = new RoundRobinStrategy();
export async function spawn<T>(actor: Actor, opts: Object = {}): Promise<T> {
  return defaultStrategy.spawn<T>(actor, opts);
}

export function makeWorker(endpoint: Endpoint | Window = self): void {
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
  makeWorker();
