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
import { Comlink } from 'comlink';
;
export class RoundRobinStrategy {
    constructor(workerFile) {
        this._nextIndex = 0;
        this._workerFile = workerFile;
        this._workers = new Array(this.numWorkers).fill(null);
    }
    get numWorkers() {
        return navigator.hardwareConcurrency || 1;
    }
    _initOrGetWorker(i) {
        if (i >= this._workers.length)
            throw Error('No worker available');
        if (!this._workers[i]) {
            const worker = new Worker(this._workerFile);
            this._workers[i] = [worker, Comlink.proxy(worker)];
        }
        return this._workers[i][1];
    }
    getWorker(opts) {
        const w = this._initOrGetWorker(this._nextIndex);
        this._nextIndex = (this._nextIndex + 1) % this.numWorkers;
        return Promise.resolve(w);
    }
    async spawn(actor, opts = {}) {
        const worker = await this.getWorker(opts);
        return await worker.spawn(actor.toString(), opts);
    }
    async terminate() {
        this._workers.forEach(worker => worker && worker[0].terminate());
        this._workers.length = 0;
    }
    get terminated() {
        return this._workers.length <= 0;
    }
}
export function makeWorker() {
    Comlink.expose({
        async spawn(actorCode) {
            const actor = (new Function(`return ${actorCode};`))();
            return Comlink.proxyValue(new actor());
        }
    }, self);
}
