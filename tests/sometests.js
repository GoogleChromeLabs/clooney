describe('Clooney', function () {
  before(function () {
    this.testStrategy = new Clooney.RoundRobinStrategy('/base/tests/fixtures/worker.js');
  });

  it('exists', async function () {
    expect(Clooney).to.exist;
  });

  it('can load workers', async function () {
    class MyActor {
      gimme42() {
        return 42;
      }
    }

    const actor = await this.testStrategy.spawn(MyActor);
    expect(await actor.gimme42()).to.equal(42);
  });
});
