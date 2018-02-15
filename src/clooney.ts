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
import {Comlink} from 'comlink';

export type Actor = Object;

export interface ClooneyWorker {
  spawn<T>(actor: Actor, opts: Object): Promise<T>;
}

export interface Strategy {
  getWorker(opts: Object): Promise<ClooneyWorker>;
  terminate(): Promise<void>;
};

export class RoundRobinStrategy implements Strategy {
  _workers: [Worker, ClooneyWorker][];
  _workerFile: string;
  _nextIndex: number = 0;

  get numWorkers(): number {
    return navigator.hardwareConcurrency || 1;
  }

  constructor(workerFile: string) {
    this._workerFile = workerFile;
    this._workers = new Array(this.numWorkers).fill(null);
  }

  _initOrGetWorker(i: number): ClooneyWorker {
    if (i >= this._workers.length)
      throw Error('No worker available');
    if(!this._workers[i]) {
      const worker = new Worker(this._workerFile);
      this._workers[i] = [worker, Comlink.proxy(worker) as any as ClooneyWorker];

    }
    return this._workers[i][1];
  }

  getWorker(opts: Object): Promise<ClooneyWorker> {
    const w = this._initOrGetWorker(this._nextIndex);
    this._nextIndex = (this._nextIndex + 1) % this.numWorkers;
    return Promise.resolve(w);
  }

  async spawn<T>(actor: Actor, opts: Object = {}): Promise<T> {
    const worker = await this.getWorker(opts);
    return await worker.spawn(actor.toString(), opts) as T;
  }

  async terminate() {
    this._workers.forEach(worker => worker && worker[0].terminate())
    this._workers.length = 0;
  }

  get terminated() {
    return this._workers.length <= 0;
  }
}

export function makeWorker(): void {
  Comlink.expose({
    async spawn(actorCode: string): Promise<Actor> {
      const actor = (new Function(`return ${actorCode};`))();
      return Comlink.proxyValue(new actor()) as Actor;
    }
  }, self);
}
