import { BriteCorePlugin } from './index'
import { connectToParent } from 'penpal'

jest.mock("penpal")

function fakePromise() {
  return {
    thenFn: null,
    catchFn: null,
    finallyFn: null,
    promise: null,
    reject(value) {
      if (this.catchFn) {
        value = this.catchFn(value)
      }
      if (this.finallyFn) {
        this.finallyFn(value)
      }
      if (this.promise) {
        this.promise.reject(value)
      }
    },
    resolve(value) {
      if (this.thenFn) {
        value = this.thenFn(value)
      }
      if (this.finallyFn) {
        this.finallyFn(value)
      }
      if (this.promise) {
        this.promise.resolve(value)
      }
    },
    then(fn) {
      this.thenFn = fn
      this.promise = fakePromise()
      return this.promise
    },
    catch(fn) {
      this.catchFn = fn
      this.promise = fakePromise()
      return this.promise
    },
    finally(fn) {
      this.finallyFn = fn
      this.promise = fakePromise()
      return this.promise
    }
  }
}

describe('BriteCorePlugin', () => {
  const firstButtonCallback = () => { }
  const secondButtonCallback = () => { }
  connectToParent.mockImplementation(() => ({ promise: fakePromise() }));
  let p = new BriteCorePlugin()
  const pluginOptions = {
    'button-row': {
      buttons: [{
        text: 'Button 1',
        callback: firstButtonCallback
      }, {
        text: 'Button 2',
        callback: secondButtonCallback
      }
      ]
    }
  }
  p.initialize(pluginOptions)
  const penpalCallArgs = connectToParent.mock.calls[0][0]

  it('should call `connectToParent` method from penpal', () => {
    expect(connectToParent).toHaveBeenCalledTimes(1)
  });

  it('should should have button-row handler', () => {
    expect(p).toHaveProperty("handlers")
    expect(p.handlers).toHaveProperty("button-row")
  });

  it('should expose the request handlers (handleResponse, handleError) to the parent Iframe.', () => {
    expect(penpalCallArgs).toHaveProperty("methods")
    expect(penpalCallArgs.methods).toHaveProperty("handleResponse")
    expect(penpalCallArgs.methods).toHaveProperty("handleError")
  });

  it('should expose the contextUpdate handler method to the parent Iframe', () => {
    expect(penpalCallArgs.methods).toHaveProperty("contextUpdate")
  });

  it('should expose the buttons callbacks to the Parent Iframe', () => {
    expect(penpalCallArgs.methods).toHaveProperty("firstButtonCallback")
    expect(penpalCallArgs.methods).toHaveProperty("secondButtonCallback")
  });
});

