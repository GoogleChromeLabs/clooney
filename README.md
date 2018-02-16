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

## API

Clooney’s job is to take _actors_ (class definitions) and _spawn_ those actors in _containers_ ([Web Workers][Web Worker]). Spawning an actor returns a remote handle (in the sense of [Comlink]) to that new instance.

### Strategies

Strategies decide how many containers are spun up and where a new instance is created.

```typescript
interface Strategy {
  // The return type is the same as T, but every method is async.
  spawn(actor: Actor, opts: Object): Promise<T>;
  terminate(): Promise<void>;
}
```

#### `Clooney.RoundRobinStrategy(opts)`

`RoundRobingStrategy` creates up to n containers and cycles through the containers with every `spawn` call. `RoundRobinStrategy` is the default strategy.

Default options:

```js
const strategy = new Clooney.RoundRobinStrategy({
  workerFile: thisScriptSrc,
  maxNumContainers: 1,
  newContainerFunc: async (path: string) => new Worker(path),
})
```

### `Clooney.spawn(class)`

Clooney creates an instance of `RoundRobinStrategy` as the default strategy. This call is equivalent to `Clooney.defaultStrategy.spawn(class)`.

## CDN

If you want to use Clooney from a CDN, you need to work around the same-origin restrictions that workers have:

```html
<script src="https://cdn.jsdelivr.net/npm/clooneyjs@0.2.0/clooney.bundle.min.js"></script>
<script>
  async function newContainerFunc(path) {
    const blob = await fetch(path).then(resp => resp.blob())
    return new Worker(URL.createObjectURL(blob));
  }

  const strategy = new Clooney.RoundRobinStrategy({newContainerFunc});
  // Business as usual using strategy.spawn() ...
</script>
```

[Comlink]: https://github.com/GoogleChromeLabs/comlink
[Web Worker]: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API

---
License Apache-2.0
