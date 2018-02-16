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
import { Comlink } from 'comlink'; // eslint-disable-line no-unused-vars
export { Comlink } from 'comlink';
const thisScriptSrc = 'document' in self ? document.currentScript && document.currentScript.src : '';
export class RoundRobinStrategy {
    constructor(opts = {}) {
        this._nextIndex = 0;
        this._options = Object.assign({}, RoundRobinStrategy.defaultOptions, opts);
        this._workers = new Array(this._options.maxNumWorkers).fill(null);
    }
    static get defaultOptions() {
        return {
            workerFile: thisScriptSrc,
            maxNumWorkers: 1,
            newWorkerFunc: async (path) => new Worker(path),
        };
    }
    async _initOrGetWorker(i) {
        if (i >= this._workers.length)
            throw Error('No worker available');
        if (!this._workers[i]) {
            const worker = await this._options.newWorkerFunc(this._options.workerFile);
            this._workers[i] = [worker, Comlink.proxy(worker)];
        }
        return this._workers[i][1];
    }
    async getWorker(opts) {
        const w = await this._initOrGetWorker(this._nextIndex);
        this._nextIndex = (this._nextIndex + 1) % this._options.maxNumWorkers;
        return w;
    }
    // The return type is the class T where every method is async.
    // Not sure if TypeScript can represent that somehow.
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
const defaultStrategy = new RoundRobinStrategy();
export async function spawn(actor, opts = {}) {
    return defaultStrategy.spawn(actor, opts);
}
export function makeWorker(endpoint = self) {
    Comlink.expose({
        async spawn(actorCode) {
            const actor = (new Function(`return ${actorCode};`))();
            return Comlink.proxyValue(new actor()); // eslint-disable-line new-cap
        },
    }, endpoint);
}
function isWorker() {
    // I’d have to import lib.webworker.d.ts to have access to
    // WorkerGlobalScope, but I can’t because it conflicts with lib.dom.d.ts.
    const wgs = self['WorkerGlobalScope'];
    return wgs && self instanceof wgs;
}
// TODO: Find a way to opt-out of autostart
if (isWorker())
    makeWorker();
