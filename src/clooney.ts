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
  spawn(actorCode: string): Promise<Actor>
}

export interface Strategy {
  getWorker(opts: Object): Promise<ClooneyWorker>;
};

export class RoundRobinStrategy implements Strategy {
  _workers: ClooneyWorker[];
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
    if(!this._workers[i]) {
      this._workers[i] = Comlink.proxy(new Worker(this._workerFile)) as any as ClooneyWorker;
    }
    return this._workers[i];
  }

  getWorker(opts: Object): Promise<ClooneyWorker> {
    const w = this._initOrGetWorker(this._nextIndex);
    this._nextIndex = (this._nextIndex + 1) % this.numWorkers;
    return Promise.resolve(w);
  }

  async spawn(actor: Actor, opts: Object = {}): Promise<Actor> {
    const worker = await this.getWorker(opts);
    return await worker.spawn(actor.toString());
  }
}
