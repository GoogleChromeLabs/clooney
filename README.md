# Clooney

Clooney is an actor (ayooo) library for the web. Classes given to Clooney will be instantiated and run in a worker, keeping the main thread responsive.

```
https://cdn.jsdelivr.net/npm/clooneyjs@0.1.0/clooney.bundle.min.js
```

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

---
License Apache-2.0
