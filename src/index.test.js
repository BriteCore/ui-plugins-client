import BriteCorePlugin from './index'
import Postmate from 'postmate'

function fakePromise () {
  return {
    thenFn: null,
    catchFn: null,
    finallyFn: null,
    promise: null,
    reject (value) {
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
    resolve (value) {
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
    then (fn) {
      this.thenFn = fn
      this.promise = fakePromise()
      return this.promise
    },
    catch (fn) {
      this.catchFn = fn
      this.promise = fakePromise()
      return this.promise
    },
    finally (fn) {
      this.finallyFn = fn
      this.promise = fakePromise()
      return this.promise
    }
  }
}

jest.mock('Postmate')


test('BriteCorePlugin has the "handlers" property', () => {
  expect(new BriteCorePlugin()).toHaveProperty('handlers')
  expect(new BriteCorePlugin().handlers).toHaveProperty('button-row')
});


test('BriteCorePlugin creates a model with the plugin interface', () => {
  let fakeCallback = () => {}
  Postmate.Model = jest.fn(() => { return fakePromise() })

  let p = new BriteCorePlugin()
  p.initialize({
    'button-row': {
      buttons: [{
        text: 'Button Label',
        callback: fakeCallback
      }]
    }
  })

  expect(Postmate.Model).toHaveBeenCalledTimes(1)
  expect(Postmate.Model).toHaveBeenCalled()
});

test('BriteCorePlugin emits events to parent iframe', () => {
  let fakeCallback = () => {}
  let aPromise = fakePromise()
  let fakeParent = {
    emit: jest.fn()
  }
  Postmate.Model = jest.fn(() => { return aPromise })

  let p = new BriteCorePlugin()
  p.initialize({
    'button-row': {
      buttons: [{
        text: 'Button Label',
        callback: fakeCallback
      }]
    }
  })
  aPromise.resolve(fakeParent)

  expect(fakeParent.emit).toHaveBeenCalledTimes(1)
})
