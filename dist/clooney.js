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
import { Comlink } from 'comlinkjs'; // eslint-disable-line no-unused-vars
// Automatically proxy functions
Comlink.transferHandlers.set('FUNCTION', {
    canHandle(obj) {
        return obj instanceof Function;
    },
    serialize(obj) {
        const { port1, port2 } = new MessageChannel();
        Comlink.expose(obj, port1);
        return port2;
    },
    deserialize(obj) {
        return Comlink.proxy(obj);
    },
});
// Automatically proxy events
Comlink.transferHandlers.set('EVENT', {
    canHandle(obj) {
        return obj instanceof Event;
    },
    serialize(obj) {
        return {
            targetId: obj && obj.target && obj.target.id,
            targetClassList: obj && obj.target && obj.target.classList && [...obj.target.classList],
            detail: obj && obj.detail,
            data: obj && obj.data,
        };
    },
    deserialize(obj) {
        return obj;
    },
});
export { Comlink } from 'comlinkjs';
/**
 * `asRemoteValue` marks a value. If a marked value is used as an parameter or return value, it will not be transferred but instead proxied.
 */
export const asRemoteValue = Comlink.proxyValue;
/**
 * `defaultWorkerSrc` is the path passed to the `new Worker()` call. It’s recommended to not change this variable but instead overload `newWorkerFunc`.
 */
export let defaultWorkerSrc = 'document' in self ? document.currentScript && document.currentScript.src : '';
export const defaultOpts = {
    maxNumContainers: 1,
    newWorkerFunc: async () => new Worker(defaultWorkerSrc),
};
/**
 * `RoundRobingStrategy` creates up to n containers and cycles through the containers with every `spawn` call.
 */
export class RoundRobinStrategy {
    constructor(opts = {}) {
        this._nextIndex = 0;
        this._options = Object.assign({}, defaultOpts, opts);
        this._containers = new Array(this._options.maxNumContainers).fill(null);
    }
    async _initOrGetContainer(i) {
        if (i >= this._containers.length)
            throw Error('No worker available');
        if (!this._containers[i]) {
            const worker = await this._options.newWorkerFunc();
            const remote = Comlink.proxy(worker);
            this._containers[i] = {
                spawn: remote.spawn.bind(spawn),
                terminate: worker.terminate.bind(worker),
            };
        }
        return this._containers[i];
    }
    async _getNextContainer(opts) {
        const w = await this._initOrGetContainer(this._nextIndex);
        this._nextIndex = (this._nextIndex + 1) % this._options.maxNumContainers;
        return w;
    }
    async spawn(actor, constructorArgs = [], opts = {}) {
        const container = await this._getNextContainer(opts);
        return await container.spawn(actor.toString(), constructorArgs);
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
export async function spawn(actor, constructorArgs = [], opts = {}) {
    return defaultStrategy.spawn(actor, constructorArgs, opts);
}
export function makeContainer(endpoint = self) {
    Comlink.expose({
        async spawn(actorCode, constructorArgs) {
            const actor = (new Function(`return ${actorCode};`))();
            return Comlink.proxyValue(new actor(...constructorArgs)); // eslint-disable-line new-cap
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
