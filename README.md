# Clooney

Clooney is an actor (ayooo) library for the web. Classes given to Clooney will be instantiated and run in a worker, keeping the main thread responsive.

## Quickstart

An example says more than 1000 words:

```html
<script src="/clooney.bundle.js"></script>
<script>
  (async function() {
    class MyRemoteClass {
      doExpensiveCalculation(a, b) {
        return a + b;
      }
    }

    const instance = await Clooney.spawn(MyRemoteClass);
    console.log(await instance.doExepensiveCalculation(5, 23));
  })();
</script>
```

## CDN

If you want to use Clooney from a CDN, you need to work around the same-origin restrictions that workers have:

```html
<script src="https://cdn.jsdelivr.net/npm/clooneyjs@0.2.0/clooney.bundle.min.js"></script>
<script>
  async function newWorkerFunc(path) {
    const blob = await fetch(path).then(resp => resp.blob())
    return new Worker(URL.createObjectURL(blob));
  }

  const strategy = new Clooney.RoundRobinStrategy({newWorkerFunc});
  // Business as usual using strategy.spawn() ...
</script>
```

---
License Apache-2.0
