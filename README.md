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
<script>
  // Disgusting monkey patch — courtesy of @developit
  var oldWorker = Worker;
  Worker = function(url, opts) {
    const blob = new Blob([`importScripts(${JSON.stringify(url)})`]);
    return new oldWorker(URL.createObjectURL(blob), opts);
  }
</script>
<script src="https://cdn.jsdelivr.net/npm/clooneyjs@0.1.1/clooney.bundle.min.js"></script>
```

---
License Apache-2.0
