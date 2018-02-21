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
    console.log(await instance.doExpensiveCalculation(5, 23));
  })();
</script>
```

## API
Clooney’s job is to take _actors_ (class definitions) and _spawn_ those actors in _containers_ ([Web Workers][Web Worker]). You can use that instance as if it was a local instance (this is magic provided by [Comlink]).

### `Clooney.spawn(class)`
This call is equivalent to `Clooney.defaultStrategy.spawn(class)`. Clooney creates an instance of `RoundRobinStrategy` as the default strategy.

### Strategies
Strategies decide how many containers are spun up and where a new instance is created.

```typescript
export interface Strategy {
  /**
   * `spawn` instantiates the given actor in an actor container of the strategy’s choice.
   * @returns The return type is the type as T, but every method is implicitly async.
   */
  spawn<T>(actor: new () => T, opts: Object): Promise<T>;
  /**
   * `terminate` calls `terminate()` on all existing containers of the strategy.
   */
  terminate(): Promise<void>;
}
```

#### `Clooney.RoundRobinStrategy(opts)`
`RoundRobingStrategy` creates up to n containers and cycles through the containers with every `spawn` call. `RoundRobinStrategy` is the default strategy.

### Strategy Options

- `maxNumContainers`: Maximum number of containers to create (default: 1)
- `newWorkerFunc`: Asynchronous function that creates a new container (default: `new Worker(Clooney.defaultWorkerSrc)`)

### `Clooney.asRemoteValue(obj)`

`asRemoteValue` marks a value. If a marked value is used as an parameter or return value, it will not be transferred but instead proxied. This is necessary, for example, for callbacks.

```js
class MyActor {
  async callCallback(cb) {
    await cb('ohai');
  }
}

const actor = await Clooney.spawn(MyActor);
await actor.callCallback(Clooney.asRemoteValue(msg => console.log(msg))); // logs 'ohai'
```

## CDN
If you want to use Clooney from a CDN, you need to work around the same-origin restrictions that workers have:

```html
<script src="https://cdn.jsdelivr.net/npm/clooneyjs@0.4.1/clooney.bundle.min.js"></script>
<script>
  async function newWorkerFunc() {
    const blob = await fetch(Clooney.defaultWorkerSrc).then(resp => resp.blob())
    return new Worker(URL.createObjectURL(blob));
  }

  const strategy = new Clooney.RoundRobinStrategy({newWorkerFunc});
  // Business as usual using strategy.spawn() ...
</script>
```

[Comlink]: https://github.com/GoogleChromeLabs/comlink
[Web Worker]: https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API

---
License Apache-2.0
