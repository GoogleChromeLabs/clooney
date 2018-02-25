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

function timeoutPromise(t) {
  return new Promise(resolve => setTimeout(_ => resolve('timeout'), t));
}

describe('Clooney', function () {
  it('exists', async function () {
    expect(Clooney).to.exist;
  });

  it('has a default strategy', async function () {
    class MyActor {
      aNumber() {
        return 42;
      }
    }

    const instance = await Clooney.spawn(MyActor);
    expect(await instance.aNumber()).to.equal(42);
  });

  it('respects asRemoteValue', function (done) {
    const obj = {
      myCallback() {
        done();
      }
    };

    class MyActor {
      async callTheCallback(obj) {
        await obj.myCallback();
      }
    }

    Clooney.spawn(MyActor)
      .then(actor => actor.callTheCallback(Clooney.asRemoteValue(obj)));
  });

  it('proxies functions by default', function (done) {
    class MyActor {
      async callCallback(cb) {
        await cb();
      }
    }

    Clooney.spawn(MyActor)
      .then(actor => actor.callCallback(_ => done()));
  });

  it('can handle message event listeners', function () {
    const {port1,port2} = new MessageChannel();
    class MyActor {
      constructor() {
        this.lastMessage = new Promise(resolve => this.resolve = resolve);
      }
      onMessage(ev) {
        this.resolve(ev.data);
      }
    }
    return Clooney.spawn(MyActor)
      .then(async actor => {
        port1.addEventListener('message', actor.onMessage.bind(actor));
        port1.start();
        port2.postMessage('message');
        expect(await actor.lastMessage).to.equal('message');
      });
  });

  it('can handle custom event listeners', function () {
    const {port1} = new MessageChannel();
    class MyActor {
      constructor() {
        this.lastEvent = new Promise(resolve => this.resolve = resolve);
      }
      onMyEvent(ev) {
        this.resolve(ev.detail);
      }
    }
    return Clooney.spawn(MyActor)
      .then(async actor => {
        port1.addEventListener('my-event', actor.onMyEvent.bind(actor));
        port1.dispatchEvent(new CustomEvent('my-event', {detail: {message: 'message'}}));
        expect((await actor.lastEvent).message).to.equal('message');
      });
  });

  it('can pass arguments to the constructor of an actor', function () {
    class MyActor {
      constructor(_number, _string) {
        this.number = _number;
        this.string = _string;
      }
    }

    return Clooney.spawn(MyActor, [42, 'hai'])
      .then(async actor => {
        expect(await actor.number).to.equal(42);
        expect(await actor.string).to.equal('hai');
      });
  });

  it('can pass objects with functions to the constructor of an actor', function (done) {
    class MyActor {
      constructor(obj) {
        obj.getThing();
      }
    }

    const obj = {
      getThing() {
        done();
      }
    };

    Clooney.spawn(MyActor, [obj])
  });

  describe('RoundRobinStrategy', function () {
    beforeEach(async function () {
      this.strategy = new Clooney.RoundRobinStrategy({
        maxNumContainers: 2,
      });
    });

    afterEach(async function () {
      if(this.strategy && !this.strategy.terminated) {
        await this.strategy.terminate();
      }
    })

    it('can load actors', async function () {
      class MyActor {
        gimme42() {return 42;}
      }

      const actor = await this.strategy.spawn(MyActor);
      expect(await actor.gimme42()).to.equal(42);
    });

    it('can handle blocking actors', async function () {
      class BadActor {
        block() {while(true);}
        gimme42() {return 42;}
      }

      class GoodActor {
        gimme42() {return 42;}
      }

      const badActor = await this.strategy.spawn(BadActor);
      const goodActor = await this.strategy.spawn(GoodActor);
      badActor.block();
      expect(await goodActor.gimme42()).to.equal(42);

      const blockCheck = Promise.race([badActor.gimme42(), timeoutPromise(100)])
      expect(await blockCheck).to.equal('timeout');
    });

    it('can be terminated', async function () {
      class MyActor {}

      const strategy = new Clooney.RoundRobinStrategy();
      const actor1 = await strategy.spawn(MyActor);
      const actor2 = await strategy.spawn(MyActor);
      await strategy.terminate();
      return strategy.spawn(MyActor)
        .then(_ => Promise.reject())
        .catch(_ => {});
    });

    it('uses the worker func', function (done) {
      async function newWorkerFunc() {
        done();
        return new Worker(Clooney.defaultWorkerSrc);
      }
      class MyActor {}
      const strategy = new Clooney.RoundRobinStrategy({newWorkerFunc});
      strategy.spawn(MyActor);
    });
  });
});
