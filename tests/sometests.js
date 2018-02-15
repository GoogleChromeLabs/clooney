function timeoutPromise(t) {
  return new Promise(resolve => setTimeout(_ => resolve('timeout'), t));
}

describe('Clooney', function () {
  it('exists', async function () {
    expect(Clooney).to.exist;
  });

  describe('RoundRobinStrategy', function () {
    beforeEach(async function () {
      this.strategy = new Clooney.RoundRobinStrategy({
        workerFile: '/base/tests/fixtures/worker.js',
        maxNumWorkers: 2,
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

      const strategy = new Clooney.RoundRobinStrategy('/base/tests/fixtures/worker.js');
      const actor1 = await strategy.spawn(MyActor);
      const actor2 = await strategy.spawn(MyActor);
      await strategy.terminate();
      return strategy.spawn(MyActor)
        .then(_ => Promise.reject())
        .catch(_ => {});
    });
  });
});
