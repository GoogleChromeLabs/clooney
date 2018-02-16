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
/**
 * `RoundRobingStrategy` creates up to n containers and cycles through the containers with every `spawn` call.
 */
export class RoundRobinStrategy {
    constructor(opts = {}) {
        this._nextIndex = 0;
        this._options = Object.assign({}, RoundRobinStrategy.defaultOptions, opts);
        this._containers = new Array(this._options.maxNumContainers).fill(null);
    }
    static get defaultOptions() {
        return {
            workerFile: thisScriptSrc,
            maxNumContainers: 1,
            newContainerFunc: async (path) => new Worker(path),
        };
    }
    async _initOrGetContainer(i) {
        if (i >= this._containers.length)
            throw Error('No worker available');
        if (!this._containers[i]) {
            const worker = await this._options.newContainerFunc(this._options.workerFile);
            this._containers[i] = [worker, Comlink.proxy(worker)];
        }
        return this._containers[i][1];
    }
    async _getNextContainer(opts) {
        const w = await this._initOrGetContainer(this._nextIndex);
        this._nextIndex = (this._nextIndex + 1) % this._options.maxNumContainers;
        return w;
    }
    async spawn(actor, opts = {}) {
        const worker = await this._getNextContainer(opts);
        return await worker.spawn(actor.toString(), opts);
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
export async function spawn(actor, opts = {}) {
    return defaultStrategy.spawn(actor, opts);
}
export function makeContainer(endpoint = self) {
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
    makeContainer();
